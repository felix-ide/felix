import * as fs from 'fs';
import path from 'path';

import type { IRelationship } from '@felix/code-intelligence';
import { TSModuleResolver } from '@felix/code-intelligence';

import { DatabaseManager } from '../../storage/DatabaseManager.js';
import { DEFAULT_CONFIG } from '../../../cli/helpers.js';
import { IgnorePatterns } from '../../../utils/IgnorePatterns.js';
import { ComposerNamespaceResolver } from '../services/ComposerNamespaceResolver.js';
import { StdLibCatalog } from '../services/StdLibCatalog.js';
import { logger } from '../../../shared/logger.js';

import type { PendingRelationshipUpdate, ResolutionMetrics } from './ResolutionTypes.js';
import { createDefaultMetrics } from './ResolutionTypes.js';

export class ResolutionContext {
  private ignorePatterns?: IgnorePatterns;
  private composerResolver?: ComposerNamespaceResolver;
  private tsResolver?: TSModuleResolver;

  private componentIdByFilePath = new Map<string, string>();
  private componentIdByName = new Map<string, string>();
  private fsExistsCache = new Map<string, boolean>();

  private pendingTargetUpdates: PendingRelationshipUpdate[] = [];
  private pendingSourceUpdates: PendingRelationshipUpdate[] = [];
  private pendingMetaUpdates: PendingRelationshipUpdate[] = [];

  private metrics: ResolutionMetrics = createDefaultMetrics();

  constructor(private readonly dbManager: DatabaseManager) {}

  getDatabaseManager(): DatabaseManager {
    return this.dbManager;
  }

  getMetrics(): ResolutionMetrics {
    return this.metrics;
  }

  reset(): void {
    this.componentIdByFilePath.clear();
    this.componentIdByName.clear();
    this.fsExistsCache.clear();
    this.pendingTargetUpdates = [];
    this.pendingSourceUpdates = [];
    this.pendingMetaUpdates = [];
    this.metrics = createDefaultMetrics();
  }

  async prefetchLookups(needsTargetResolution: IRelationship[]): Promise<void> {
    const candidateNames = new Set<string>();
    const candidatePaths = new Set<string>();

    for (const rel of needsTargetResolution) {
      const metadata = (rel.metadata || {}) as any;
      const importedName = metadata.importedName || metadata.itemName;
      if (importedName && typeof importedName === 'string') candidateNames.add(importedName);
      const target = rel.targetId || '';
      if (target.startsWith('RESOLVE:')) {
        const simple = target.slice(8).split(/[\\/]/).pop()?.split('.')[0];
        if (simple) candidateNames.add(simple);
      }
      if (metadata.resolvedPath && typeof metadata.resolvedPath === 'string') {
        candidatePaths.add(metadata.resolvedPath);
      }
    }

    try {
      if (candidateNames.size > 0) {
        const map = await this.dbManager
          .getComponentRepository()
          .getComponentIdsByNames(Array.from(candidateNames));
        for (const [name, id] of map) this.componentIdByName.set(name, id);
      }
      if (candidatePaths.size > 0) {
        const map = await this.dbManager
          .getComponentRepository()
          .getComponentIdsByFilePaths(Array.from(candidatePaths));
        for (const [p, id] of map) this.componentIdByFilePath.set(p, id);
      }
    } catch (error) {
      // Prefetch failures are non-fatal, just log and continue
      logger.warn('Failed to prefetch component lookups', error);
    }
  }

  getIgnorePatterns(): IgnorePatterns {
    if (!this.ignorePatterns) {
      const customPatterns = new Set<string>([
        ...DEFAULT_CONFIG.defaultExcludes.flatMap(dir => [dir, `**/${dir}`, `**/${dir}/**`]),
        ...DEFAULT_CONFIG.excludeExtensions.map(ext => `**/*${ext}`)
      ]);
      this.ignorePatterns = new IgnorePatterns(this.dbManager.getProjectPath(), {
        customPatterns: Array.from(customPatterns),
        respectGitignore: true,
        useIndexIgnore: true
      });
    }
    return this.ignorePatterns;
  }

  getComposerResolver(): ComposerNamespaceResolver {
    if (!this.composerResolver) {
      this.composerResolver = new ComposerNamespaceResolver(this.dbManager.getProjectPath());
    }
    return this.composerResolver;
  }

  getTsResolver(): TSModuleResolver {
    if (!this.tsResolver) {
      this.tsResolver = new TSModuleResolver();
    }
    return this.tsResolver;
  }

  fsExists(candidatePath: string): boolean {
    if (this.fsExistsCache.has(candidatePath)) {
      this.metrics.fsExistsHits++;
      return this.fsExistsCache.get(candidatePath)!;
    }
    this.metrics.fsExistsMisses++;
    const exists = fs.existsSync(candidatePath);
    this.fsExistsCache.set(candidatePath, exists);
    return exists;
  }

  async getComponentIdByFilePath(filePath: string): Promise<string | null> {
    if (!filePath) return null;
    const cached = this.componentIdByFilePath.get(filePath);
    if (cached !== undefined) {
      this.metrics.fileIdHits++;
      return cached || null;
    }
    const result = await this.dbManager.getComponentRepository().searchComponents({ filePath, limit: 1 });
    const id = result.items.length > 0 ? result.items[0]!.id : '';
    this.componentIdByFilePath.set(filePath, id);
    this.metrics.fileIdMisses++;
    return id || null;
  }

  async getComponentIdByName(name: string): Promise<string | null> {
    if (!name) return null;
    const cached = this.componentIdByName.get(name);
    if (cached !== undefined) {
      this.metrics.nameIdHits++;
      return cached || null;
    }
    const result = await this.dbManager.getComponentRepository().searchComponents({ name, limit: 1 });
    const id = result.items.length > 0 ? result.items[0]!.id : '';
    this.componentIdByName.set(name, id);
    this.metrics.nameIdMisses++;
    return id || null;
  }

  queueTargetUpdate(update: PendingRelationshipUpdate): void {
    this.pendingTargetUpdates.push(update);
  }

  queueSourceUpdate(update: PendingRelationshipUpdate): void {
    this.pendingSourceUpdates.push(update);
  }

  queueMetadataUpdate(update: PendingRelationshipUpdate): void {
    this.pendingMetaUpdates.push(update);
  }

  drainTargetUpdates(): PendingRelationshipUpdate[] {
    const payload = [...this.pendingTargetUpdates, ...this.pendingMetaUpdates];
    this.pendingTargetUpdates = [];
    this.pendingMetaUpdates = [];
    return payload;
  }

  drainSourceUpdates(): PendingRelationshipUpdate[] {
    const payload = [...this.pendingSourceUpdates];
    this.pendingSourceUpdates = [];
    return payload;
  }

  markExternal(relationship: IRelationship): void {
    const metadata = { ...(relationship.metadata || {}), isExternal: true };
    this.queueMetadataUpdate({ id: relationship.id, metadata });
  }

  async upsertExternalComponent(params: {
    kind: 'module' | 'stdlib';
    name: string;
    ecosystem?: 'npm' | 'composer' | 'pypi' | 'maven' | 'nuget' | 'go';
    language?: string;
  }): Promise<string> {
    const { kind, name, ecosystem = 'npm', language = 'unknown' } = params;
    const id =
      kind === 'module'
        ? `external:module:${ecosystem}:${name}`
        : `stdlib:${(language || 'unknown').toLowerCase()}:${name}`;
    const type = kind === 'module' ? 'external_module' : 'stdlib_symbol';
    const filePath =
      kind === 'module'
        ? `__externals__/${ecosystem}/${name}`
        : `__stdlib__/${(language || 'unknown').toLowerCase()}/${name}`;
    const metadata: Record<string, any> = { isExternal: true };

    if (kind === 'module') {
      metadata.externalKind = ecosystem;
      if (ecosystem === 'npm') metadata.registryUrl = `https://www.npmjs.com/package/${name}`;
      if (ecosystem === 'composer') metadata.registryUrl = `https://packagist.org/packages/${name}`;
      if (ecosystem === 'pypi') metadata.registryUrl = `https://pypi.org/project/${name}/`;
    } else {
      const lang = (language || '').toLowerCase();
      metadata.runtime = lang;
      if (lang === 'typescript' || lang === 'javascript' || lang === 'node') metadata.docsUrl = `https://nodejs.org/api/${name}.html`;
      if (lang === 'php') metadata.docsUrl = `https://www.php.net/manual/en/class.${name.toLowerCase()}.php`;
      if (lang === 'python') metadata.docsUrl = `https://docs.python.org/3/library/${name}.html`;
    }

    try {
      await this.dbManager.getComponentRepository().storeComponent({
        id,
        name,
        type: type as any,
        language: language || 'unknown',
        filePath,
        location: { startLine: 1, endLine: 1, startColumn: 0, endColumn: 0 },
        metadata
      } as any);
    } catch (error) {
      logger.debug('Failed to persist external component (likely already exists)', error);
    }

    return id;
  }

  isStdlibOrVendor(language: string, spec: string): boolean {
    const lang = (language || '').toLowerCase();
    if (lang === 'php' && (spec.startsWith('PhpParser\\') || spec.includes('PhpParser\\'))) {
      return true;
    }
    return StdLibCatalog.isStdlib(language, spec);
  }
}
