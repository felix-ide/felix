import { logger } from '../../../shared/logger.js';
import type { ComponentSearchService } from '../../search/services/ComponentSearchService.js';
import type { IComponent } from '@felix/code-intelligence';

export interface ComponentEmbeddingQueueOptions {
  batchSize?: number;
}

export interface ComponentEmbeddingQueueMetrics {
  enqueued: number;
  processed: number;
  failed: number;
  batches: number;
  pending: number;
  lastError?: string;
  totalDurationMs: number;
  lastBatchDurationMs?: number;
}

/**
 * Lightweight queue that schedules component embedding work while files are indexed.
 */
export class ComponentEmbeddingQueue {
  private readonly batchSize: number;
  private readonly pending: IComponent[] = [];
  private metrics: ComponentEmbeddingQueueMetrics = {
    enqueued: 0,
    processed: 0,
    failed: 0,
    batches: 0,
    pending: 0,
    totalDurationMs: 0
  };
  private processingPromise: Promise<void> | null = null;
  private stopped = false;

  constructor(
    private readonly componentSearchService: ComponentSearchService,
    options: ComponentEmbeddingQueueOptions = {}
  ) {
    const envBatch = Number(process.env.EMBED_BATCH_SIZE || '0');
    this.batchSize = options.batchSize && options.batchSize > 0
      ? options.batchSize
      : envBatch > 0
        ? envBatch
        : 128;
  }

  enqueue(components: IComponent[]): void {
    if (this.stopped || !Array.isArray(components) || components.length === 0) {
      return;
    }

    for (const component of components) {
      if (!component) continue;
      this.pending.push(component);
      this.metrics.enqueued += 1;
    }
    this.metrics.pending = this.pending.length;

    if (!this.processingPromise) {
      this.processingPromise = this.processLoop();
    }
  }

  async flush(): Promise<ComponentEmbeddingQueueMetrics> {
    this.stopped = true;
    try {
      if (this.processingPromise) {
        await this.processingPromise;
      }
    } finally {
      this.processingPromise = null;
      this.metrics.pending = this.pending.length;
    }
    return { ...this.metrics };
  }

  async drain(): Promise<ComponentEmbeddingQueueMetrics> {
    return this.flush();
  }

  snapshot(): ComponentEmbeddingQueueMetrics {
    return { ...this.metrics, pending: this.pending.length };
  }

  private async processLoop(): Promise<void> {
    while (!this.stopped && this.pending.length > 0) {
      await this.processNextBatch();
    }

    // If stopped flag was set mid-loop, drain remaining work one last time
    if (this.pending.length > 0) {
      while (this.pending.length > 0) {
        await this.processNextBatch();
      }
    }

    this.processingPromise = null;
    this.metrics.pending = this.pending.length;
  }

  private async processNextBatch(): Promise<void> {
    const batch: IComponent[] = this.pending.splice(0, this.batchSize);
    if (batch.length === 0) return;

    const batchStart = Date.now();
    this.metrics.batches += 1;

    try {
      await this.componentSearchService.generateEmbeddingsBatch(batch);
      this.metrics.processed += batch.length;
    } catch (error) {
      this.metrics.failed += batch.length;
      this.metrics.lastError = error instanceof Error ? error.message : String(error);
      logger.warn('ComponentEmbeddingQueue failed to generate embeddings batch:', error);
    } finally {
      const duration = Date.now() - batchStart;
      this.metrics.totalDurationMs += duration;
      this.metrics.lastBatchDurationMs = duration;
      this.metrics.pending = this.pending.length;
    }
  }
}
