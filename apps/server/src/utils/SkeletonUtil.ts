import type { IComponent } from '@felix/code-intelligence';
import { SkeletonGenerator } from '@felix/code-intelligence';
import type { CodeIndexer } from '../features/indexing/api/CodeIndexer.js';

/**
 * Build a human-readable skeleton string for a component using the shared generator when possible.
 * Falls back to a minimal header for non-container symbols (functions, methods, variables).
 */
export async function makeSkeletonTextForComponent(indexer: CodeIndexer, comp: IComponent): Promise<string> {
  try {
    const gen = new SkeletonGenerator();
    const type = String((comp as any)?.type || '').toLowerCase();
    const filePath = (comp as any)?.filePath;
    const location = (comp as any)?.location;
    const headerOnly = () => `${type.toUpperCase()} ${comp.name || ''} (${location?.startLine ?? '?'}-${location?.endLine ?? '?'})`;

    if (!filePath || !location) {
      return headerOnly();
    }

    // Load all components in the same file for richer skeletons
    const siblings = await indexer.getComponentsByFile(filePath);

    if (['class', 'interface', 'enum'].includes(type)) {
      const cls = gen.generateClassSkeleton(comp as any, siblings as any);
      return gen.formatSkeleton(cls);
    }

    if (type === 'file') {
      const sk = gen.generateFileSkeleton(siblings as any);
      return gen.formatSkeleton(sk);
    }

    // Fallback for functions/methods/variables: concise header with line range
    return headerOnly();
  } catch {
    const location = (comp as any)?.location;
    const type = String((comp as any)?.type || '').toLowerCase();
    return `${type.toUpperCase()} ${comp.name || ''} (${location?.startLine ?? '?'}-${location?.endLine ?? '?'})`;
  }
}

