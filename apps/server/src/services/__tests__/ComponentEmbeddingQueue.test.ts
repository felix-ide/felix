import type { IComponent } from '@felix/code-intelligence';
import type { ComponentSearchService } from '../../features/search/services/ComponentSearchService.js';
import { ComponentEmbeddingQueue } from '../../features/embeddings/services/ComponentEmbeddingQueue.js';

describe('ComponentEmbeddingQueue', () => {
  const makeComponent = (id: string): IComponent => ({
    id,
    name: id,
    type: 'function' as any,
    language: 'typescript',
    filePath: `src/${id}.ts`,
    location: { startLine: 1, endLine: 1, startColumn: 0, endColumn: 0 },
    code: `function ${id}() { return ${id.length}; }`,
    metadata: {}
  });

  it('processes enqueued components according to batch size', async () => {
    const generateEmbeddingsBatch = jest.fn().mockResolvedValue(undefined);
    const mockService = { generateEmbeddingsBatch } as unknown as ComponentSearchService;

    const queue = new ComponentEmbeddingQueue(mockService, { batchSize: 2 });
    queue.enqueue([makeComponent('a'), makeComponent('b'), makeComponent('c')]);

    const metrics = await queue.flush();

    expect(generateEmbeddingsBatch).toHaveBeenCalledTimes(2);
    expect(generateEmbeddingsBatch).toHaveBeenNthCalledWith(1, [
      expect.objectContaining({ id: 'a' }),
      expect.objectContaining({ id: 'b' })
    ]);
    expect(generateEmbeddingsBatch).toHaveBeenNthCalledWith(2, [
      expect.objectContaining({ id: 'c' })
    ]);
    expect(metrics.processed).toBe(3);
    expect(metrics.pending).toBe(0);
  });

  it('handles additional enqueues while a batch is in flight', async () => {
    let releaseFirstBatch: () => void = () => undefined;
    const firstBatchPromise = new Promise<void>((resolve) => {
      releaseFirstBatch = resolve;
    });

    const generateEmbeddingsBatch = jest
      .fn()
      .mockImplementationOnce(async () => {
        await firstBatchPromise;
      })
      .mockResolvedValue(undefined);

    const mockService = { generateEmbeddingsBatch } as unknown as ComponentSearchService;

    const queue = new ComponentEmbeddingQueue(mockService, { batchSize: 2 });

    queue.enqueue([makeComponent('x')]);
    queue.enqueue([makeComponent('y'), makeComponent('z')]);

    releaseFirstBatch();

    const metrics = await queue.flush();

    expect(generateEmbeddingsBatch).toHaveBeenCalledTimes(2);
    expect(metrics.processed).toBe(3);
    expect(metrics.pending).toBe(0);
  });

  it('records failures without preventing subsequent batches', async () => {
    const error = new Error('embedding failed');
    const generateEmbeddingsBatch = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined);

    const mockService = { generateEmbeddingsBatch } as unknown as ComponentSearchService;
    const queue = new ComponentEmbeddingQueue(mockService, { batchSize: 2 });

    queue.enqueue([makeComponent('m'), makeComponent('n'), makeComponent('o')]);

    const metrics = await queue.flush();

    expect(generateEmbeddingsBatch).toHaveBeenCalledTimes(2);
    expect(metrics.processed).toBe(1);
    expect(metrics.failed).toBe(2);
    expect(metrics.pending).toBe(0);
  });
});
