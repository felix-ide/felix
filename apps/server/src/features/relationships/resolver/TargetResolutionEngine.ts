import path from 'path';

import type { IRelationship } from '@felix/code-intelligence';

import { ResolutionContext } from './ResolutionContext.js';
import type { TargetResolutionStatus } from './ResolutionTypes.js';
import { classifySpecifier, sanitizeSpecifier } from './ResolutionSpecUtils.js';

export class TargetResolutionEngine {
  constructor(private readonly context: ResolutionContext) {}

  async resolve(relationship: IRelationship): Promise<TargetResolutionStatus> {
    try {
      const db = this.context.getDatabaseManager();
      const rawTarget = relationship.targetId || '';
      const metadata = (relationship.metadata || {}) as Record<string, any>;
      relationship.metadata = metadata;

      const targetPattern = rawTarget.startsWith('RESOLVE:') ? rawTarget.slice('RESOLVE:'.length) : rawTarget;
      const importKind: string | undefined = metadata.importKind || metadata.importType;
      const specifier: string | undefined = metadata.specifier || metadata.moduleName || metadata.filePath;
      const importedName: string | undefined = metadata.importedName || metadata.itemName;

      const sourceComponent = await db.getComponentRepository().getComponent(relationship.sourceId);
      if (!sourceComponent) {
        return 'unresolved';
      }

      const importPath = sanitizeSpecifier(specifier || targetPattern || '');
      const classification = classifySpecifier(importPath);

      if (classification === 'junk') {
        return 'skippedJunk';
      }

      if (classification === 'bare') {
        const lang = (sourceComponent.language || '').toLowerCase();
        if (lang === 'typescript' || lang === 'javascript') {
          const workspaceRoot = db.getProjectPath();
          try {
            const resolved = await this.context.getTsResolver().resolveModule(importPath, sourceComponent.filePath, workspaceRoot);
            if (
              !resolved.isExternal &&
              resolved.resolvedPath &&
              resolved.resolvedPath.startsWith(workspaceRoot) &&
              !this.context.getIgnorePatterns().shouldIgnore(resolved.resolvedPath)
            ) {
              metadata.resolvedPath = resolved.resolvedPath;
              metadata.resolutionMethod = resolved.resolutionMethod;
            } else {
              const externalId = await this.context.upsertExternalComponent({
                kind: 'module',
                name: importPath,
                ecosystem: 'npm',
                language: lang
              });
              metadata.isExternal = true;
              this.context.queueTargetUpdate({
                id: relationship.id,
                resolved_target_id: externalId,
                metadata
              });
              return 'resolved';
            }
          } catch (error) {
            const externalId = await this.context.upsertExternalComponent({
              kind: 'module',
              name: importPath,
              ecosystem: 'npm',
              language: lang
            });
            metadata.isExternal = true;
            metadata.resolutionError = String(error);
            this.context.queueTargetUpdate({
              id: relationship.id,
              resolved_target_id: externalId,
              metadata
            });
            return 'resolved';
          }
        } else if (this.context.isStdlibOrVendor(sourceComponent.language, importPath)) {
          const externalId = await this.context.upsertExternalComponent({
            kind: 'stdlib',
            name: importPath,
            language: sourceComponent.language
          });
          metadata.isExternal = true;
          metadata.externalKind = 'stdlib';
          this.context.queueTargetUpdate({ id: relationship.id, resolved_target_id: externalId, metadata });
          return 'resolved';
        } else {
          this.context.markExternal(relationship);
          return 'skippedExternal';
        }
      }

      let resolvedPath: string | undefined = metadata.resolvedPath as string | undefined;

      if (!resolvedPath && importPath) {
        if (classification === 'namespace' && importPath.includes('\\')) {
          try {
          const namespacePath = await this.context.getComposerResolver().resolveNamespace(importPath);
            if (namespacePath) {
              resolvedPath = namespacePath;
              metadata.resolvedPath = namespacePath;
              metadata.resolutionMethod = 'composer';
            }
          } catch (error) {
            metadata.composerError = String(error);
          }
        }

        if (!resolvedPath && classification === 'namespace') {
          const externalId = await this.context.upsertExternalComponent({
            kind: 'module',
            name: importPath,
            ecosystem: 'composer',
            language: sourceComponent.language
          });
          metadata.isExternal = true;
          metadata.externalKind = 'composer';
          this.context.queueTargetUpdate({ id: relationship.id, resolved_target_id: externalId, metadata });
          return 'resolved';
        }

        if (!resolvedPath && classification === 'path') {
          const sourceDir = path.dirname(sourceComponent.filePath);
          resolvedPath = path.resolve(sourceDir, importPath);

          if (!this.context.fsExists(resolvedPath)) {
            resolvedPath = TargetResolutionEngine.trySourceFallbacks(resolvedPath, this.context);
          }
        }
      } else if (!resolvedPath && classification === 'bare') {
        this.context.markExternal(relationship);
        return 'skippedExternal';
      }

      if (resolvedPath && this.context.getIgnorePatterns().shouldIgnore(resolvedPath)) {
        return 'skippedIgnored';
      }

      const searchCriteria: Record<string, any> = {};

      if (rawTarget.startsWith('CLASS:')) {
        searchCriteria.name = rawTarget.replace('CLASS:', '');
      } else if (rawTarget.startsWith('MODULE:')) {
        searchCriteria.name = rawTarget.replace('MODULE:', '').split('.').pop();
      } else if (rawTarget.startsWith('FILE:')) {
        searchCriteria.filePath = rawTarget.replace('FILE:', '');
      } else {
        if (importKind === 'namespace' || importKind === 'default') {
          if (resolvedPath) searchCriteria.filePath = resolvedPath;
        } else if (
          importKind === 'named' ||
          importKind === 'use' ||
          importKind === 'from_import' ||
          importKind === 'module' ||
          importKind === 'include' ||
          importKind === 'require'
        ) {
          searchCriteria.name = importedName || targetPattern.split(':').pop();
          if (resolvedPath) searchCriteria.filePath = resolvedPath;
        } else {
          searchCriteria.name = importedName || targetPattern.split(/[.:]/).pop();
          if (resolvedPath) searchCriteria.filePath = resolvedPath;
        }
      }

      if (searchCriteria.filePath) {
        const id = await this.context.getComponentIdByFilePath(searchCriteria.filePath);
        if (id) {
          metadata.needsResolution = false;
          metadata.resolvedFrom = relationship.targetId;
          metadata.originalTarget = relationship.targetId;
          this.context.queueTargetUpdate({ id: relationship.id, resolved_target_id: id, metadata });
          return 'resolved';
        }
      }

      const potentialTargets = await db.getComponentRepository().searchComponents({
        ...searchCriteria,
        limit: 10
      });

      if (potentialTargets.items.length > 0) {
        const resolvedTarget = potentialTargets.items.find((c: any) => String(c.type).toLowerCase() !== 'file') || potentialTargets.items[0]!;
        metadata.needsResolution = false;
        metadata.resolvedFrom = relationship.targetId;
        metadata.originalTarget = relationship.targetId;
        this.context.queueTargetUpdate({ id: relationship.id, resolved_target_id: resolvedTarget.id, metadata });
        return 'resolved';
      }

      if (resolvedPath && this.context.isStdlibOrVendor(sourceComponent.language, importPath)) {
        this.context.markExternal(relationship);
        return 'skippedStdlib';
      }

      return 'unresolved';
    } catch (error) {
      const metadata = { ...(relationship.metadata || {}), resolutionError: String(error) };
      relationship.metadata = metadata;
      return 'unresolved';
    }
  }

  private static trySourceFallbacks(initialPath: string, context: ResolutionContext): string {
    let resolvedPath = initialPath;
    if (!context.fsExists(resolvedPath)) {
      if (resolvedPath.includes('/dist/')) {
        const srcJs = resolvedPath.replace('/dist/', '/src/');
        if (context.fsExists(srcJs)) {
          resolvedPath = srcJs;
        } else if (resolvedPath.endsWith('.js')) {
          const srcTs = srcJs.replace(/\.js$/, '.ts');
          const srcTsx = srcJs.replace(/\.js$/, '.tsx');
          if (context.fsExists(srcTs)) {
            resolvedPath = srcTs;
          } else if (context.fsExists(srcTsx)) {
            resolvedPath = srcTsx;
          }
        }
      }

      if (!context.fsExists(resolvedPath) && resolvedPath.endsWith('.js')) {
        const tsPath = resolvedPath.replace(/\.js$/, '.ts');
        if (context.fsExists(tsPath)) {
          resolvedPath = tsPath;
        } else {
          const tsxPath = resolvedPath.replace(/\.js$/, '.tsx');
          if (context.fsExists(tsxPath)) {
            resolvedPath = tsxPath;
          } else if (resolvedPath.includes('/dist/')) {
            const srcTsPath = resolvedPath.replace('/dist/', '/src/').replace(/\.js$/, '.ts');
            if (context.fsExists(srcTsPath)) {
              resolvedPath = srcTsPath;
            }
          }
        }
      }
    }

    return resolvedPath;
  }
}
