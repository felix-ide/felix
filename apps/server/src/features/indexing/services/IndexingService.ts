import fs from 'fs';
import os from 'os';
import type { ParseResult, IComponent } from '@felix/code-intelligence';
import { IndexMetadata } from '../../storage/entities/index/IndexMetadata.entity.js';
import type { DatabaseManager } from '../../storage/DatabaseManager.js';
import { logger } from '../../../shared/logger.js';
import type { FileIndexingResult, IndexingResult, FileIndexingService } from './FileIndexingService.js';
import type { ComponentSearchService } from '../../search/services/ComponentSearchService.js';
import type { RelationshipService } from '../../relationships/services/RelationshipService.js';
import type { TaskManagementService } from '../../metadata/services/TaskManagementService.js';
import type { NoteManagementService } from '../../metadata/services/NoteManagementService.js';
import type { RuleManagementService } from '../../metadata/services/RuleManagementService.js';
import type { DocumentationResolverService } from './DocumentationResolverService.js';
import { ComponentEmbeddingQueue } from '../../embeddings/services/ComponentEmbeddingQueue.js';

export interface IndexingOptions {
  includeTests?: boolean;
  followImports?: boolean;
  maxDepth?: number;
  filePattern?: string;
  onProgress?: (message: string) => void;
  concurrency?: number; // number of files to process in parallel
}

export class IndexingService {
  constructor(
    private readonly dbManager: DatabaseManager,
    private readonly fileIndexingService: FileIndexingService,
    private readonly componentSearchService: ComponentSearchService,
    private readonly relationshipService: RelationshipService,
    private readonly taskManagementService: TaskManagementService,
    private readonly noteManagementService: NoteManagementService,
    private readonly ruleManagementService: RuleManagementService,
    private readonly documentationResolver: DocumentationResolverService
  ) {}

  async indexDirectory(directoryPath: string, options: IndexingOptions = {}): Promise<IndexingResult> {
    const startedAtMs = Date.now();
    const phase = { discovery: 0, parse: 0, resolve: 0, embed: 0, docs: 0 };
    let filesAccepted = 0;
    let embedReport: any = null;
    const errors: Array<{ filePath: string; error: string }> = [];
    const warnings: Array<{ filePath: string; message: string }> = [];
    let filesProcessed = 0;
    let componentCount = 0;
    let relationshipCount = 0;
    const componentEmbeddingQueue = new ComponentEmbeddingQueue(this.componentSearchService);

    try {
      const tDisc = Date.now();
      const files = await this.fileIndexingService.discoverFiles(directoryPath, {
        includeTests: options.includeTests,
        filePattern: options.filePattern
      });
      filesAccepted = files.length;
      phase.discovery = Date.now() - tDisc;

      const defaultCores = Math.max(1, (os.cpus()?.length || 4) - 1);
      const defaultConcurrency = Math.min(Math.max(defaultCores, 1), 8);
      const envConc = Number(process.env.INDEX_CONCURRENCY || '0');
      const concurrency = Math.max(1, options.concurrency || (envConc > 0 ? envConc : defaultConcurrency));

      const runPool = async <T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> => {
        const results: R[] = [];
        let i = 0;
        const inFlight: Promise<void>[] = [];
        const runOne = async () => {
          const idx = i++;
          if (idx >= items.length) return;
          const item = items[idx]!;
          try {
            const r = await worker(item);
            results[idx] = r;
          } finally {
            await runOne();
          }
        };
        for (let k = 0; k < Math.min(limit, items.length); k++) inFlight.push(runOne());
        await Promise.all(inFlight);
        return results;
      };

      const tParse = Date.now();
      // Single-path parse+persist with concurrency on main thread (workers removed)
      await runPool(files, concurrency, async (filePath) => {
        try {
          if (options.onProgress) options.onProgress(`Indexing ${filePath}...`);
          const result = await this.fileIndexingService.indexFile(filePath);
          if (result.success) {
            filesProcessed++;
            componentCount += result.components.length;
            relationshipCount += result.relationships.length;
            componentEmbeddingQueue.enqueue(result.components);
          } else if (result.errors && result.errors.length > 0) {
            const severe = result.errors.find(e => (e as any).severity === 'error');
            if (severe) errors.push({ filePath, error: severe.message || 'Unknown error' });
          }
        } catch (error) {
          errors.push({ filePath, error: error instanceof Error ? error.message : 'Unknown error' });
        }
        return undefined as any;
      });
      phase.parse = Date.now() - tParse;

      const tResolve = Date.now();
      await this.relationshipService.resolveCrossFileRelationships();
      phase.resolve = Date.now() - tResolve;
    } catch (error) {
      errors.push({ filePath: directoryPath, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    try {
      if (options.onProgress) {
        options.onProgress('Finalising embeddings...');
      }
      const tEmbed = Date.now();
      const queueMetrics = await componentEmbeddingQueue.flush();
      const residualMetrics = await this.generateRemainingComponentEmbeddings();
      const nonComponentEmbeds = await this.generateAllEmbeddings(['task', 'note', 'rule']);
      embedReport = {
        components: {
          queue: queueMetrics,
          residual: residualMetrics
        },
        ...nonComponentEmbeds
      };
      phase.embed = Date.now() - tEmbed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ filePath: directoryPath, error: message });
      logger.warn('Embedding finalisation failed:', error);
      if (!embedReport) {
        embedReport = {
          components: {
            queue: componentEmbeddingQueue.snapshot(),
            residual: { total: 0, processed: 0, failed: 0, error: message }
          }
        };
      }
      phase.embed = phase.embed || 0;
    }

    let documentationReport: { created: number; inspected: number } | null = null;
    const documentationLimit = Number(process.env.DOC_LINK_RESOLVE_LIMIT || '10000');
    try {
      const tDocs = Date.now();
      documentationReport = await this.documentationResolver.resolveAll({ limitPerKind: documentationLimit });
      phase.docs = Date.now() - tDocs;
    } catch (error) {
      logger.warn('Documentation link resolution failed:', error);
      phase.docs = phase.docs || 0;
    }

    const endTime = Date.now();
    const processingTime = endTime - startedAtMs;

    // Output final stats via logger (respects LOG_LEVEL)
    logger.info('\n📊 Indexing Complete:');
    logger.info(`📁 Files processed: ${filesProcessed}`);
    logger.info(`🧩 Components indexed: ${componentCount}`);
    logger.info(`🔗 Relationships created: ${relationshipCount}`);
    logger.info(`⏱️  Total time: ${(processingTime / 1000).toFixed(2)}s`);
    logger.info(`🕒 Started: ${new Date(startedAtMs).toISOString()}`);
    logger.info(`🕛 Ended:   ${new Date(endTime).toISOString()}`);

    // Phase timings (compact)
    try {
      const fmt = (ms: number) => `${(ms/1000).toFixed(2)}s`;
      logger.info('⏱️  Phase timings:');
      logger.info(`   • Discovery: ${fmt(phase.discovery)} (accepted=${filesAccepted})`);
      logger.info(`   • Parse+Persist: ${fmt(phase.parse)} (files=${filesProcessed}, comps=${componentCount}, rels=${relationshipCount})`);
      logger.info(`   • Resolve: ${fmt(phase.resolve)}`);
      const queueSummary = embedReport?.components?.queue || {};
      const residualSummary = embedReport?.components?.residual || {};
      const componentEmbedsProcessed = (queueSummary.processed ?? 0) + (residualSummary.processed ?? 0);
      logger.info(
        `   • Embeddings: ${fmt(phase.embed)}${embedReport ? ` (components=${componentEmbedsProcessed}, tasks=${embedReport.tasks?.processed ?? 0}, notes=${embedReport.notes?.processed ?? 0}, rules=${embedReport.rules?.processed ?? 0})` : ''}`
      );
      logger.info(`   • Documentation: ${fmt(phase.docs)}${documentationReport ? ` (created=${documentationReport.created}, inspected=${documentationReport.inspected})` : ''}`);
    } catch {}

    const errorsLogged = errors.length > 0;
    const warningsLogged = warnings.length > 0;

    logger.info(`❌ Errors: ${errors.length}`);
    if (warningsLogged) {
      logger.info(`⚠️  Warnings: ${warnings.length}`);
    }

    if (errorsLogged) {
      try {
        const limitEnv = process.env.ORAICLE_INDEX_ERROR_LIMIT || '25';
        const limit = Math.max(1, Number.isNaN(Number(limitEnv)) ? 25 : Number(limitEnv));
        const showAll = ['on','true','1'].includes((process.env.ORAICLE_SHOW_ALL_INDEX_ERRORS || '').toLowerCase());
        const sample = showAll ? errors : errors.slice(0, limit);
        logger.info(`— Showing ${showAll ? sample.length : Math.min(limit, errors.length)} error(s):`);
        for (const e of sample) {
          logger.info(`   • ${e.filePath}: ${e.error}`);
        }
        const counts = new Map<string, number>();
        for (const e of errors) counts.set(e.error, (counts.get(e.error) || 0) + 1);
        const top = Array.from(counts.entries()).sort((a,b) => b[1]-a[1]).slice(0,5);
        if (top.length > 0) {
          logger.info('— Top error reasons:');
          for (const [msg, n] of top) {
            logger.info(`   • (${n}) ${msg}`);
          }
        }
        if (!showAll && errors.length > limit) {
          logger.info(`— (${errors.length - limit}) more errors hidden. Set ORAICLE_SHOW_ALL_INDEX_ERRORS=on or raise ORAICLE_INDEX_ERROR_LIMIT to see more.`);
        }
      } catch {}
    }

    if (warningsLogged) {
      try {
        const limitEnv = process.env.ORAICLE_INDEX_WARNING_LIMIT || '25';
        const limit = Math.max(1, Number.isNaN(Number(limitEnv)) ? 25 : Number(limitEnv));
        const showAll = ['on','true','1'].includes((process.env.ORAICLE_SHOW_ALL_INDEX_WARNINGS || '').toLowerCase());
        const sample = showAll ? warnings : warnings.slice(0, limit);
        logger.info(`— Showing ${showAll ? sample.length : Math.min(limit, warnings.length)} warning(s):`);
        for (const w of sample) {
          logger.info(`   • ${w.filePath}: ${w.message}`);
        }
        if (!showAll && warnings.length > limit) {
          logger.info(`— (${warnings.length - limit}) more warnings hidden. Set ORAICLE_SHOW_ALL_INDEX_WARNINGS=on or raise ORAICLE_INDEX_WARNING_LIMIT to see more.`);
        }
      } catch {}
    }

    // Get database stats
    try {
      const stats = await this.dbManager.getIndexDataSource().query(`
        SELECT
          (SELECT COUNT(*) FROM components) as total_components,
          (SELECT COUNT(DISTINCT language) FROM components) as languages,
          (SELECT COUNT(*) FROM relationships) as total_relationships,
          (SELECT COUNT(*) FROM relationships WHERE resolved_target_id IS NOT NULL) as resolved_targets,
          (SELECT COUNT(*) FROM relationships WHERE resolved_source_id IS NOT NULL) as resolved_sources,
          (SELECT COUNT(DISTINCT type) FROM components) as component_types
      `);

      const langStats = await this.dbManager.getIndexDataSource().query(`
        SELECT language, COUNT(*) as count
        FROM components
        GROUP BY language
        ORDER BY count DESC
        LIMIT 10
      `);

      const typeStats = await this.dbManager.getIndexDataSource().query(`
        SELECT type, COUNT(*) as count
        FROM components
        GROUP BY type
        ORDER BY count DESC
        LIMIT 10
      `);

      if (stats && stats[0]) {
        logger.info('\n📈 Database totals:');
        logger.info(`   Components: ${stats[0].total_components}`);
        logger.info(`   Languages: ${stats[0].languages}`);
        logger.info(`   Component types: ${stats[0].component_types}`);
        logger.info(`   Relationships: ${stats[0].total_relationships}`);
        logger.info(`   ├─ Resolved targets: ${stats[0].resolved_targets} (${((stats[0].resolved_targets / stats[0].total_relationships) * 100).toFixed(1)}%)`);
        logger.info(`   └─ Resolved sources: ${stats[0].resolved_sources} (${((stats[0].resolved_sources / stats[0].total_relationships) * 100).toFixed(1)}%)`);
      }

      if (langStats && langStats.length > 0) {
        logger.info('\n🗣️  Languages detected:');
        langStats.forEach((lang: any) => {
          logger.info(`   ${lang.language}: ${lang.count} components`);
        });
      }

      if (typeStats && typeStats.length > 0) {
        logger.info('\n🏷️  Top component types:');
        typeStats.forEach((type: any) => {
          logger.info(`   ${type.type}: ${type.count}`);
        });
      }
    } catch (err) {
      // Ignore stats errors
    }

    return {
      success: errors.length === 0,
      filesProcessed,
      componentCount,
      relationshipCount,
      errors,
      warnings,
      processingTime,
      startedAt: new Date(startedAtMs).toISOString(),
      endedAt: new Date(endTime).toISOString()
    };
  }

  async indexFile(filePath: string): Promise<ParseResult> {
    const result = await this.fileIndexingService.indexFile(filePath);
    if (!result.success) {
      const errorMsg = this.getPrimaryError(result, 'Failed to index file');
      throw new Error(errorMsg);
    }
    // Debounce cross-file resolution after single-file indexing
    this.relationshipService.scheduleCrossFileResolution();
    return this.toParseResult(result);
  }

  async updateFile(filePath: string): Promise<ParseResult> {
    const result = await this.fileIndexingService.updateFile(filePath);
    if (!result.success) {
      const errorMsg = this.getPrimaryError(result, 'Failed to update file');
      throw new Error(errorMsg);
    }
    // Debounce cross-file resolution after updating a single file
    this.relationshipService.scheduleCrossFileResolution();
    return this.toParseResult(result);
  }

  async regenerateEmbeddingsForFile(filePath: string): Promise<void> {
    try {
      const components = await this.componentSearchService.getComponentsByFile(filePath);
      if (!components || components.length === 0) return;
      await this.componentSearchService.generateEmbeddingsBatch(components);
    } catch (err) {
      logger.warn(`Failed to regenerate embeddings for ${filePath}:`, err);
    }
  }

  async removeFile(filePath: string): Promise<void> {
    try {
      const components = await this.dbManager.getComponentRepository().getComponentsByFile(filePath);
      for (const component of components) {
        await this.dbManager.getComponentRepository().deleteComponent(component.id);
      }
      logger.info(`Removed ${components.length} components from ${filePath}`);
    } catch (error) {
      logger.error(`Failed to remove file ${filePath}:`, error);
      throw error;
    }
  }

  async reconcileFilesystemChanges(options?: { since?: number; batchLimit?: number }): Promise<{ scanned: number; reindexed: number; since: number; now: number }> {
    const since = typeof options?.since === 'number' ? options.since : await this.getLastReconcileTimestamp();
    const now = Date.now();
    const batchLimit = options?.batchLimit ?? Number(process.env.RECONCILE_BATCH_LIMIT || '100');
    let reindexed = 0;
    let scanned = 0;

    try {
      const files = await this.dbManager.getComponentRepository().getDistinctFilePaths();
      for (const file of files) {
        scanned++;
        try {
          const stat = fs.statSync(file);
          const mtime = stat.mtimeMs || stat.mtime.getTime();
          if (mtime > since) {
            await this.indexFile(file);
            await this.regenerateEmbeddingsForFile(file);
            reindexed++;
            if (reindexed >= batchLimit) {
              break;
            }
          }
        } catch {
          // Ignore file-level errors, continue scanning
        }
      }
      // Debounce a resolution pass after the batch completes
      this.relationshipService.scheduleCrossFileResolution();
    } finally {
      await this.updateLastReconcileTimestamp(now).catch(() => undefined);
    }

    return { scanned, reindexed, since, now };
  }

  async generateAllEmbeddings(entityTypes: string[] = ['component', 'task', 'note', 'rule']): Promise<any> {
    const results: Record<string, { total: number; processed: number }> = {};

    if (entityTypes.includes('component')) {
      const components = await this.componentSearchService.getComponentsNeedingEmbeddings();
      if (components.length > 0) {
        await this.componentSearchService.generateEmbeddingsBatch(components);
      }
      results.components = { total: components.length, processed: components.length };
    }

    if (entityTypes.includes('task')) {
      const tasks = await this.taskManagementService.listTasks({ limit: 1000 });
      await this.taskManagementService.generateTaskEmbeddingsBatch(tasks);
      results.tasks = { total: tasks.length, processed: tasks.length };
    }

    if (entityTypes.includes('note')) {
      const notes = await this.noteManagementService.listNotes({ limit: 1000 });
      await this.noteManagementService.generateNoteEmbeddingsBatch(notes);
      results.notes = { total: notes.length, processed: notes.length };
    }

    if (entityTypes.includes('rule')) {
      const rules = await this.ruleManagementService.listRules();
      await this.ruleManagementService.generateRuleEmbeddingsBatch(rules);
      results.rules = { total: rules.length, processed: rules.length };
    }

    return results;
  }

  private async generateRemainingComponentEmbeddings(): Promise<{
    total: number;
    processed: number;
    failed: number;
    error?: string;
  }> {
    let pendingComponents: IComponent[] = [];
    try {
      pendingComponents = await this.componentSearchService.getComponentsNeedingEmbeddings();
      if (pendingComponents.length === 0) {
        return { total: 0, processed: 0, failed: 0 };
      }
      await this.componentSearchService.generateEmbeddingsBatch(pendingComponents);
      return { total: pendingComponents.length, processed: pendingComponents.length, failed: 0 };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('generateRemainingComponentEmbeddings failed:', error);
      const attempted = pendingComponents.length;
      return { total: attempted, processed: 0, failed: attempted, error: message };
    }
  }

  async clearIndex(): Promise<void> {
    await this.dbManager.clearIndexData();
  }

  private getPrimaryError(result: FileIndexingResult, fallback: string): string {
    if (result.errors && result.errors.length > 0) {
      return result.errors[0]?.message || fallback;
    }
    return fallback;
  }

  private toParseResult(result: FileIndexingResult): ParseResult {
    return {
      components: result.components,
      relationships: result.relationships,
      errors: result.errors,
      warnings: [],
      metadata: {
        filePath: result.filePath,
        language: result.language,
        parseTime: result.processingTime,
        componentCount: result.components.length,
        relationshipCount: result.relationships.length
      }
    } as ParseResult;
  }

  private async getLastReconcileTimestamp(): Promise<number> {
    try {
      const repo = this.dbManager.getIndexDataSource().getRepository(IndexMetadata);
      const row = await repo.findOne({ where: { key: 'reconcile.lastRun' } });
      return row ? Number(row.value) || 0 : 0;
    } catch {
      return 0;
    }
  }

  private async updateLastReconcileTimestamp(now: number): Promise<void> {
    const repo = this.dbManager.getIndexDataSource().getRepository(IndexMetadata);
    const record = await repo.findOne({ where: { key: 'reconcile.lastRun' } });
    if (record) {
      record.value = String(now);
      await repo.save(record);
    } else {
      await repo.insert({ key: 'reconcile.lastRun', value: String(now) });
    }
  }
}
