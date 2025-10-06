/**
 * MemoryAdapter Tests
 */

import { MemoryAdapter } from '../../storage/MemoryAdapter';
import { cosineSimilarity } from '../../search/similarity';

describe('MemoryAdapter', () => {
  let adapter: MemoryAdapter;

  beforeEach(async () => {
    adapter = new MemoryAdapter({
      maxItems: 100,
      ttl: 0 // No expiration for most tests
    });
    await adapter.initialize();
  });

  afterEach(async () => {
    await adapter.close();
  });

  describe('Initialization', () => {
    it('should initialize properly', () => {
      expect(adapter.isReady()).toBe(true);
    });

    it('should not be ready before initialization', () => {
      const newAdapter = new MemoryAdapter();
      expect(newAdapter.isReady()).toBe(false);
    });
  });

  describe('Store and Retrieve', () => {
    it('should store and retrieve single embedding', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4];
      const metadata = { type: 'test', score: 0.95 };
      
      await adapter.storeEmbedding('test-1', embedding, metadata);
      
      const result = await adapter.getEmbedding('test-1');
      expect(result).not.toBeNull();
      expect(result!.embedding).toEqual(embedding);
      expect(result!.metadata).toEqual(metadata);
    });

    it('should store multiple embeddings', async () => {
      const embeddings = [
        { entityId: 'test-1', embedding: [0.1, 0.2], metadata: { type: 'A' } },
        { entityId: 'test-2', embedding: [0.3, 0.4], metadata: { type: 'B' } },
        { entityId: 'test-3', embedding: [0.5, 0.6], metadata: { type: 'C' } }
      ];
      
      await adapter.storeEmbeddings(embeddings);
      
      for (const item of embeddings) {
        const result = await adapter.getEmbedding(item.entityId);
        expect(result).not.toBeNull();
        expect(result!.embedding).toEqual(item.embedding);
      }
    });

    it('should return null for non-existent embedding', async () => {
      const result = await adapter.getEmbedding('non-existent');
      expect(result).toBeNull();
    });

    it('should overwrite existing embedding', async () => {
      await adapter.storeEmbedding('test-1', [0.1, 0.2], { version: 1 });
      await adapter.storeEmbedding('test-1', [0.3, 0.4], { version: 2 });
      
      const result = await adapter.getEmbedding('test-1');
      expect(result!.embedding).toEqual([0.3, 0.4]);
      expect(result!.metadata).toEqual({ version: 2 });
    });
  });

  describe('Similarity Search', () => {
    beforeEach(async () => {
      // Set up test data
      await adapter.storeEmbeddings([
        { entityId: 'vec-1', embedding: [1, 0, 0], metadata: { type: 'A' } },
        { entityId: 'vec-2', embedding: [0, 1, 0], metadata: { type: 'B' } },
        { entityId: 'vec-3', embedding: [0, 0, 1], metadata: { type: 'C' } },
        { entityId: 'vec-4', embedding: [0.9, 0.1, 0], metadata: { type: 'A' } },
        { entityId: 'vec-5', embedding: [0.1, 0.9, 0], metadata: { type: 'B' } }
      ]);
    });

    it('should find similar embeddings', async () => {
      const query = [1, 0, 0];
      const results = await adapter.findSimilar(query, { limit: 3 });
      
      expect(results).toHaveLength(3);
      expect(results[0].entityId).toBe('vec-1'); // Exact match
      expect(results[0].similarity).toBe(1);
      expect(results[1].entityId).toBe('vec-4'); // Close match
    });

    it('should respect similarity threshold', async () => {
      const query = [1, 0, 0];
      const results = await adapter.findSimilar(query, { 
        limit: 10,
        threshold: 0.9 
      });
      
      // Only vec-1 has similarity >= 0.9
      expect(results.length).toBeLessThanOrEqual(2);
      results.forEach(result => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('should filter by entity types', async () => {
      const query = [0.5, 0.5, 0];
      const results = await adapter.findSimilar(query, {
        limit: 10,
        entityTypes: ['B']
      });
      
      // Should only return type B entities
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.metadata?.type).toBe('B');
      });
    });

    it('should apply custom filters', async () => {
      const query = [1, 0, 0];
      const results = await adapter.findSimilar(query, {
        limit: 10,
        filter: { type: 'A' }
      });
      
      // Should only return items matching filter
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.metadata?.type).toBe('A');
      });
    });

    it('should handle empty storage', async () => {
      await adapter.clear();
      
      const results = await adapter.findSimilar([1, 0, 0]);
      expect(results).toHaveLength(0);
    });
  });

  describe('Delete Operations', () => {
    beforeEach(async () => {
      await adapter.storeEmbeddings([
        { entityId: 'del-1', embedding: [0.1, 0.2] },
        { entityId: 'del-2', embedding: [0.3, 0.4] },
        { entityId: 'del-3', embedding: [0.5, 0.6] }
      ]);
    });

    it('should delete single embedding', async () => {
      await adapter.deleteEmbedding('del-1');
      
      const result = await adapter.getEmbedding('del-1');
      expect(result).toBeNull();
      
      // Others should remain
      expect(await adapter.getEmbedding('del-2')).not.toBeNull();
      expect(await adapter.getEmbedding('del-3')).not.toBeNull();
    });

    it('should delete multiple embeddings', async () => {
      await adapter.deleteEmbeddings(['del-1', 'del-3']);
      
      expect(await adapter.getEmbedding('del-1')).toBeNull();
      expect(await adapter.getEmbedding('del-3')).toBeNull();
      expect(await adapter.getEmbedding('del-2')).not.toBeNull();
    });

    it('should handle deleting non-existent embeddings', async () => {
      await expect(adapter.deleteEmbedding('non-existent')).resolves.not.toThrow();
    });

    it('should clear all embeddings', async () => {
      await adapter.clear();
      
      expect(await adapter.getEmbedding('del-1')).toBeNull();
      expect(await adapter.getEmbedding('del-2')).toBeNull();
      expect(await adapter.getEmbedding('del-3')).toBeNull();
    });
  });

  describe('Size Limits', () => {
    it('should respect max items limit', async () => {
      const smallAdapter = new MemoryAdapter({ maxItems: 3 });
      await smallAdapter.initialize();
      
      // Store 5 items
      for (let i = 0; i < 5; i++) {
        await smallAdapter.storeEmbedding(`item-${i}`, [i, i]);
      }
      
      // Should only keep last 3
      expect(await smallAdapter.getEmbedding('item-0')).toBeNull();
      expect(await smallAdapter.getEmbedding('item-1')).toBeNull();
      expect(await smallAdapter.getEmbedding('item-2')).not.toBeNull();
      expect(await smallAdapter.getEmbedding('item-3')).not.toBeNull();
      expect(await smallAdapter.getEmbedding('item-4')).not.toBeNull();
    });

    it('should not evict when updating existing item', async () => {
      const smallAdapter = new MemoryAdapter({ maxItems: 2 });
      await smallAdapter.initialize();
      
      await smallAdapter.storeEmbedding('A', [1, 0]);
      await smallAdapter.storeEmbedding('B', [0, 1]);
      await smallAdapter.storeEmbedding('A', [1, 1]); // Update A
      
      // Both should still exist
      expect(await smallAdapter.getEmbedding('A')).not.toBeNull();
      expect(await smallAdapter.getEmbedding('B')).not.toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire items after TTL', async () => {
      const ttlAdapter = new MemoryAdapter({ ttl: 100 }); // 100ms TTL
      await ttlAdapter.initialize();
      
      await ttlAdapter.storeEmbedding('expire-1', [0.1, 0.2]);
      
      // Should exist immediately
      expect(await ttlAdapter.getEmbedding('expire-1')).not.toBeNull();
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be expired
      expect(await ttlAdapter.getEmbedding('expire-1')).toBeNull();
    });

    it('should clean expired items during findSimilar', async () => {
      const ttlAdapter = new MemoryAdapter({ ttl: 100 });
      await ttlAdapter.initialize();
      
      await ttlAdapter.storeEmbedding('expire-1', [1, 0]);
      await ttlAdapter.storeEmbedding('expire-2', [0, 1]);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const results = await ttlAdapter.findSimilar([1, 0]);
      expect(results).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw when not initialized', async () => {
      const newAdapter = new MemoryAdapter();
      
      await expect(newAdapter.storeEmbedding('test', [1, 2])).rejects.toThrow('not initialized');
      await expect(newAdapter.getEmbedding('test')).rejects.toThrow('not initialized');
      await expect(newAdapter.findSimilar([1, 2])).rejects.toThrow('not initialized');
    });

    it('should handle operations after close', async () => {
      await adapter.close();
      
      expect(adapter.isReady()).toBe(false);
      await expect(adapter.storeEmbedding('test', [1, 2])).rejects.toThrow();
    });
  });

  describe('Statistics', () => {
    it('should provide storage statistics', async () => {
      await adapter.storeEmbeddings([
        { entityId: 'stat-1', embedding: [0.1, 0.2] },
        { entityId: 'stat-2', embedding: [0.3, 0.4] }
      ]);
      
      const stats = adapter.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxItems).toBe(100);
      expect(stats.ttl).toBe(0);
    });
  });

  describe('Clone Protection', () => {
    it('should not return mutable references', async () => {
      const embedding = [0.1, 0.2, 0.3];
      const metadata = { score: 0.95 };
      
      await adapter.storeEmbedding('test', embedding, metadata);
      
      const result1 = await adapter.getEmbedding('test');
      const result2 = await adapter.getEmbedding('test');
      
      // Modify first result
      result1!.embedding[0] = 999;
      result1!.metadata!.score = 0;
      
      // Second result should be unchanged
      expect(result2!.embedding[0]).toBe(0.1);
      expect(result2!.metadata!.score).toBe(0.95);
    });
  });
});