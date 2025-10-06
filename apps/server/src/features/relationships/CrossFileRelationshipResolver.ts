import type { IRelationship } from '@felix/code-intelligence';

import { DatabaseManager } from '../storage/DatabaseManager.js';
import { logger } from '../../shared/logger.js';

import { ResolutionContext } from './resolver/ResolutionContext.js';
import { TargetResolutionEngine } from './resolver/TargetResolutionEngine.js';
import { SourceResolutionEngine } from './resolver/SourceResolutionEngine.js';
import { processInBatches, summarizeSourceStatuses, summarizeTargetStatuses } from './resolver/ResolutionBatch.js';
import type { SourceResolutionStatus, TargetResolutionStatus } from './resolver/ResolutionTypes.js';

export class CrossFileRelationshipResolver {
  private readonly context: ResolutionContext;
  private readonly targetEngine: TargetResolutionEngine;
  private readonly sourceEngine: SourceResolutionEngine;

  private resolveDebounceTimer: NodeJS.Timeout | null = null;
  private readonly resolveDebounceMs: number;
  private resolveRunning = false;
  private resolveScheduled = false;

  constructor(private readonly dbManager: DatabaseManager) {
    this.resolveDebounceMs = Number(process.env.RESOLUTION_DEBOUNCE_MS || '750');
    this.context = new ResolutionContext(dbManager);
    this.targetEngine = new TargetResolutionEngine(this.context);
    this.sourceEngine = new SourceResolutionEngine(this.context);
  }

  schedule(): void {
    try {
      if (this.resolveDebounceTimer) {
        clearTimeout(this.resolveDebounceTimer);
      }
      this.resolveDebounceTimer = setTimeout(() => {
        this.resolve().catch(() => undefined);
      }, this.resolveDebounceMs);
    } catch (error) {
      logger.warn('Failed to schedule relationship resolution', error);
    }
  }

  async resolve(): Promise<void> {
    if (this.resolveRunning) {
      this.resolveScheduled = true;
      return;
    }

    this.resolveRunning = true;
    try {
      this.context.reset();

      const repo = this.dbManager.getRelationshipRepository();
      await repo.ensureIndexes().catch(() => undefined);

      const [needsTargetResolution, needsSourceResolution] = await Promise.all([
        repo.getUnresolvedTargets(),
        repo.getUnresolvedSources()
      ]);

      logger.info(`🔗 Found ${needsTargetResolution.length} relationships needing target resolution`);
      logger.info(`🔗 Found ${needsSourceResolution.length} relationships needing source resolution`);

      await this.context.prefetchLookups(needsTargetResolution);

      const batchSize = Number(process.env.RESOLUTION_BATCH_SIZE || '800');

      const flushTargets = async () => {
        const patches = this.context.drainTargetUpdates();
        if (patches.length === 0) return;
        await this.dbManager.runWrite(async () => {
          await repo.updateRelationshipsBulk(patches as any);
        });
        const metrics = this.context.getMetrics();
        metrics.targetFlushes++;
        metrics.targetPatched += patches.length;
      };

      const targetStatuses: TargetResolutionStatus[] = await processInBatches(
        needsTargetResolution,
        batchSize,
        async relationship => this.targetEngine.resolve(relationship),
        flushTargets
      );

      const flushSources = async () => {
        const patches = this.context.drainSourceUpdates();
        if (patches.length === 0) return;
        await this.dbManager.runWrite(async () => {
          await repo.updateRelationshipsBulk(patches as any);
        });
        const metrics = this.context.getMetrics();
        metrics.sourceFlushes++;
        metrics.sourcePatched += patches.length;
      };

      const sourceStatuses: SourceResolutionStatus[] = await processInBatches(
        needsSourceResolution,
        batchSize,
        async relationship => this.sourceEngine.resolve(relationship),
        flushSources
      );

      const targetSummary = summarizeTargetStatuses(targetStatuses);
      const sourceSummary = summarizeSourceStatuses(sourceStatuses);
      const metrics = this.context.getMetrics();

      logger.info(
        `✅ Cross-file resolution: ` +
          `targets(resolved=${targetSummary.resolved}, skippedExternal=${targetSummary.skippedExternal}, ` +
          `skippedStdlib=${targetSummary.skippedStdlib}, skippedIgnored=${targetSummary.skippedIgnored}, ` +
          `skippedJunk=${targetSummary.skippedJunk}, unresolved=${targetSummary.unresolved}) ` +
          `sources(resolved=${sourceSummary.resolved}, skippedExternal=${sourceSummary.skippedExternal}, ` +
          `unresolved=${sourceSummary.unresolved}) ` +
          `perf(caches: fileId ${metrics.fileIdHits}/${metrics.fileIdMisses}, nameId ${metrics.nameIdHits}/${metrics.nameIdMisses}, ` +
          `fsExists ${metrics.fsExistsHits}/${metrics.fsExistsMisses}; ` +
          `db: targetFlushes=${metrics.targetFlushes} targetPatched=${metrics.targetPatched} ` +
          `sourceFlushes=${metrics.sourceFlushes} sourcePatched=${metrics.sourcePatched})`
      );

      await flushTargets().catch(() => undefined);
      await flushSources().catch(() => undefined);
    } catch (error) {
      logger.error('Failed to resolve cross-file relationships', error);
    } finally {
      this.resolveRunning = false;
      if (this.resolveScheduled) {
        this.resolveScheduled = false;
        await this.resolve();
      }
    }
  }
}
