import { logger } from '../../../shared/logger.js';
import type { SourceResolutionStatus, TargetResolutionStatus } from './ResolutionTypes.js';

export async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  handler: (item: T) => Promise<R>,
  onChunkComplete?: () => Promise<void>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const settled = await Promise.allSettled(chunk.map(handler));
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value);
      } else {
        logger.debug('Relationship resolution handler rejected', outcome.reason);
      }
    }
    if (onChunkComplete) {
      try {
        await onChunkComplete();
      } catch (error) {
        logger.warn('Failed to flush relationship updates', error);
      }
    }
  }
  return results;
}

export function summarizeTargetStatuses(statuses: TargetResolutionStatus[]) {
  return statuses.reduce(
    (acc, status) => {
      acc[status] += 1;
      return acc;
    },
    {
      resolved: 0,
      skippedExternal: 0,
      skippedIgnored: 0,
      skippedJunk: 0,
      skippedStdlib: 0,
      unresolved: 0
    }
  );
}

export function summarizeSourceStatuses(statuses: SourceResolutionStatus[]) {
  return statuses.reduce(
    (acc, status) => {
      if (status === 'external') {
        acc.skippedExternal += 1;
      } else {
        acc[status] += 1;
      }
      return acc;
    },
    {
      resolved: 0,
      skippedExternal: 0,
      unresolved: 0
    }
  );
}
