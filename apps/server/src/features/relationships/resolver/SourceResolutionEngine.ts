import path from 'path';

import type { IRelationship } from '@felix/code-intelligence';

import { ResolutionContext } from './ResolutionContext.js';
import type { SourceResolutionStatus } from './ResolutionTypes.js';
import { classifySpecifier, sanitizeSpecifier } from './ResolutionSpecUtils.js';

export class SourceResolutionEngine {
  constructor(private readonly context: ResolutionContext) {}

  async resolve(relationship: IRelationship): Promise<SourceResolutionStatus> {
    try {
      const db = this.context.getDatabaseManager();
      let sourcePattern = relationship.sourceId || '';
      const metadata = (relationship.metadata || {}) as Record<string, any>;
      relationship.metadata = metadata;

      if (metadata.isExternal === true) {
        return 'external';
      }

      if (sourcePattern.startsWith('RESOLVE:')) {
        const sanitized = sanitizeSpecifier(sourcePattern.replace('RESOLVE:', ''));
        const classification = classifySpecifier(sanitized);
        if (classification === 'junk') return 'unresolved';
        if (classification === 'bare') {
          this.context.markExternal(relationship);
          return 'external';
        }
      }

      if (sourcePattern.startsWith('EXTERNAL:')) {
        sourcePattern = sourcePattern.replace('EXTERNAL:', '');
        const name = sourcePattern.split('/').pop()?.split('.')[0];
        const components = await db.getComponentRepository().searchComponents({ name });
        if (components.items && components.items.length > 0 && components.items[0]) {
          const resolvedSource = components.items[0];
          this.context.queueSourceUpdate({ id: relationship.id, resolved_source_id: resolvedSource.id });
        }
        return 'external';
      }

      if (sourcePattern.startsWith('RESOLVE:')) {
        sourcePattern = sourcePattern.replace('RESOLVE:', '');
        let resolvedPath = metadata.resolvedPath as string | undefined;

        if (!resolvedPath) {
          const targetComponent = await db.getComponentRepository().getComponent(relationship.targetId);
          const specifier = sanitizeSpecifier(metadata.specifier || sourcePattern);
          if (targetComponent?.filePath && specifier) {
            if (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')) {
              try {
                resolvedPath = path.resolve(path.dirname(targetComponent.filePath), specifier);
              } catch (error) {
                metadata.resolutionError = String(error);
              }
            }
          }
        }

        let resolvedSourceId: string | null = null;
        if (resolvedPath) {
          const id = await this.context.getComponentIdByFilePath(resolvedPath);
          if (id) resolvedSourceId = id;
        }

        if (!resolvedSourceId) {
          const simpleName = sourcePattern.split(/[\\/]/).pop();
          if (simpleName) {
            const id = await this.context.getComponentIdByName(simpleName);
            if (id) resolvedSourceId = id;
          }
        }

        if (resolvedSourceId) {
          this.context.queueSourceUpdate({ id: relationship.id, resolved_source_id: resolvedSourceId });
          return 'resolved';
        }

        return 'unresolved';
      }

      return 'unresolved';
    } catch (error) {
      const metadata = { ...(relationship.metadata || {}), resolutionError: String(error) };
      relationship.metadata = metadata;
      return 'unresolved';
    }
  }
}
