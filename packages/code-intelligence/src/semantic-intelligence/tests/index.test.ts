/**
 * Main Index Tests
 * 
 * Tests the main library exports and convenience functions.
 */

import {
  EmbeddingService,
  BooleanQueryParser,
  MemoryAdapter,
  cosineSimilarity,
  normalizeText,
  chunkText,
  tokenize,
  ContentOptimizer,
  WindowSizeProcessor,
  optimizeContent,
  estimateTokens,
  calculateRelevance
} from '../index';

import type {
  ContextData,
  ContextQuery,
  ContextItem
} from '../index';

import { ComponentType } from '../index';

describe('Main Library Exports', () => {
  
  describe('Core Classes', () => {
    it('should export EmbeddingService', () => {
      expect(EmbeddingService).toBeDefined();
      expect(typeof EmbeddingService).toBe('function');
    });

    it('should export BooleanQueryParser', () => {
      expect(BooleanQueryParser).toBeDefined();
      expect(typeof BooleanQueryParser).toBe('function');
      
      const parser = new BooleanQueryParser();
      expect(parser.parse).toBeDefined();
    });

    it('should export MemoryAdapter', () => {
      expect(MemoryAdapter).toBeDefined();
      expect(typeof MemoryAdapter).toBe('function');
      
      const adapter = new MemoryAdapter();
      expect(adapter.storeEmbedding).toBeDefined();
    });

    it('should export ContentOptimizer', () => {
      expect(ContentOptimizer).toBeDefined();
      expect(typeof ContentOptimizer).toBe('function');
      
      const optimizer = new ContentOptimizer({
        targetTokens: 1000,
        relevance: { maxKeywords: 8 },
        filtering: { relevanceThreshold: 0.3 },
        windowSize: { enableOptimization: true }
      });
      expect(optimizer.optimize).toBeDefined();
    });

    it('should export WindowSizeProcessor', () => {
      expect(WindowSizeProcessor).toBeDefined();
      expect(typeof WindowSizeProcessor).toBe('function');
      
      const processor = new WindowSizeProcessor({ enableOptimization: true });
      expect(processor.estimateTokens).toBeDefined();
    });
  });

  describe('Utility Functions', () => {
    it('should export similarity functions', () => {
      expect(cosineSimilarity).toBeDefined();
      expect(typeof cosineSimilarity).toBe('function');
      
      const similarity = cosineSimilarity([1, 0], [0, 1]);
      expect(typeof similarity).toBe('number');
    });

    it('should export text processing functions', () => {
      expect(normalizeText).toBeDefined();
      expect(chunkText).toBeDefined();
      expect(tokenize).toBeDefined();
      
      expect(typeof normalizeText).toBe('function');
      expect(typeof chunkText).toBe('function');
      expect(typeof tokenize).toBe('function');
    });
  });

  describe('Types and Enums', () => {
    it('should export ComponentType enum', () => {
      expect(ComponentType).toBeDefined();
      expect(ComponentType.CLASS).toBeDefined();
      expect(ComponentType.FUNCTION).toBeDefined();
      expect(ComponentType.INTERFACE).toBeDefined();
    });

    it('should export TypeScript interfaces', () => {
      // Test that types are properly exported by creating objects
      const contextItem: ContextItem = {
        id: 'test',
        name: 'TestItem',
        type: ComponentType.CLASS,
        filePath: '/test.ts'
      };
      
      const contextQuery: ContextQuery = { query: 'test' };
      
      const contextData: ContextData = {
        query: 'test',
        items: [contextItem],
        relationships: []
      };
      
      expect(contextItem.id).toBe('test');
      expect(contextQuery.query).toBe('test');
      expect(contextData.items).toHaveLength(1);
    });
  });

  describe('Convenience Functions', () => {
    const testData: ContextData = {
      query: 'authentication',
      items: [
        {
          id: 'auth-service',
          name: 'AuthService',
          type: ComponentType.CLASS,
          filePath: '/src/auth.ts',
          code: 'class AuthService { login() {} }',
          metadata: { relevanceScore: 0.8 }
        }
      ],
      relationships: []
    };

    const testQuery: ContextQuery = {
      query: 'authentication',
      componentId: 'auth-service'
    };

    it('should provide optimizeContent convenience function', async () => {
      expect(optimizeContent).toBeDefined();
      expect(typeof optimizeContent).toBe('function');
      
      const result = await optimizeContent(testData, testQuery, {
        targetTokens: 500
      });
      
      expect(result).toBeDefined();
      expect(result.optimizedData).toBeDefined();
      expect(result.finalTokens).toBeGreaterThan(0);
    });

    it('should provide estimateTokens convenience function', () => {
      expect(estimateTokens).toBeDefined();
      expect(typeof estimateTokens).toBe('function');
      
      const tokens = estimateTokens('Hello world');
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
      
      // Test with different formats
      const jsonTokens = estimateTokens('{"key": "value"}', 'json');
      const markdownTokens = estimateTokens('# Title\nContent', 'markdown');
      
      expect(jsonTokens).toBeGreaterThan(0);
      expect(markdownTokens).toBeGreaterThan(0);
    });

    it('should provide calculateRelevance convenience function', async () => {
      expect(calculateRelevance).toBeDefined();
      expect(typeof calculateRelevance).toBe('function');
      
      const item = testData.items[0];
      const relevance = await calculateRelevance(item, testQuery);
      
      expect(typeof relevance).toBe('number');
      expect(relevance).toBeGreaterThan(0);
    });

    it('should handle calculateRelevance with custom options', async () => {
      const item = testData.items[0];
      const relevance = await calculateRelevance(item, testQuery, {
        typeWeights: {
          [ComponentType.CLASS]: 2.0
        },
        matchMultipliers: {
          exactMatch: 3.0,
          nameMatch: 2.0,
          keywordRelevance: 1.5,
          codeMatch: 1.2,
          docMatch: 1.0
        }
      });
      
      expect(typeof relevance).toBe('number');
      expect(relevance).toBeGreaterThan(0);
    });
  });

  describe('Integration Testing', () => {
    it('should work together in a complete workflow', async () => {
      // 1. Create some test data
      const items: ContextItem[] = [
        {
          id: 'user-service',
          name: 'UserService',
          type: ComponentType.CLASS,
          filePath: '/src/services/UserService.ts',
          code: 'class UserService { findUser(id: string) { return db.users.find(id); } }',
          metadata: {
            description: 'Service for managing user data and operations'
          }
        },
        {
          id: 'auth-service',
          name: 'AuthService',
          type: ComponentType.CLASS,
          filePath: '/src/services/AuthService.ts',
          code: 'class AuthService { authenticate(credentials: Credentials) { return jwt.sign(credentials); } }',
          metadata: {
            description: 'Service for user authentication and authorization'
          }
        }
      ];

      const data: ContextData = {
        query: 'user authentication',
        items,
        relationships: [
          {
            id: 'rel-1',
            sourceId: 'auth-service',
            targetId: 'user-service',
            type: 'depends'
          }
        ]
      };

      const query: ContextQuery = {
        query: 'user authentication',
        componentId: 'auth-service'
      };

      // 2. Test text processing
      const normalizedQuery = normalizeText(data.query || '');
      expect(normalizedQuery).toBe('user authentication');

      const chunks = chunkText(items[0].code || '', { maxChunkSize: 50 });
      expect(chunks.length).toBeGreaterThan(1); // Code is longer than 50 chars, so multiple chunks expected

      const tokens = tokenize(normalizedQuery);
      expect(tokens).toContain('user');
      expect(tokens).toContain('authentication');

      // 3. Test relevance calculation
      const relevance = await calculateRelevance(items[0], query);
      expect(relevance).toBeGreaterThan(0);

      // 4. Test token estimation
      const tokenCount = estimateTokens(JSON.stringify(data), 'json');
      expect(tokenCount).toBeGreaterThan(0);

      // 5. Test content optimization
      const optimized = await optimizeContent(data, query, {
        targetTokens: 300,
        includeSourceCode: true,
        outputFormat: 'json'
      });

      expect(optimized.optimizedData).toBeDefined();
      expect(optimized.finalTokens).toBeLessThanOrEqual(300);
      expect(optimized.strategiesApplied).toContain('relevance-scoring');

      // 6. Test query parsing
      const parser = new BooleanQueryParser();
      const parsedQuery = parser.parse('user AND authentication');
      expect(parsedQuery.terms).toContain('user');
      expect(parsedQuery.terms).toContain('authentication');

      // 7. Test storage adapter
      const adapter = new MemoryAdapter();
      await adapter.initialize();
      await adapter.storeEmbedding('test', [0.1, 0.2, 0.3], { type: 'test' });
      const stored = await adapter.getEmbedding('test');
      expect(stored).toBeDefined();
      expect(stored!.embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('should handle edge cases gracefully', async () => {
      // Empty data
      const emptyData: ContextData = {
        query: '',
        items: [],
        relationships: []
      };
      
      const emptyQuery: ContextQuery = { query: '' };

      const optimized = await optimizeContent(emptyData, emptyQuery, {
        targetTokens: 100
      });
      
      expect(optimized.optimizedData.items).toHaveLength(0);
      expect(optimized.finalTokens).toBe(0);

      // Null/undefined handling
      expect(estimateTokens('')).toBe(0);
      expect(normalizeText('')).toBe('');
      expect(tokenize('')).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid inputs gracefully', () => {
      // Test similarity with invalid vectors
      expect(() => cosineSimilarity([], [])).not.toThrow();
      
      // Test text processing with null/undefined
      expect(() => normalizeText(null as any)).not.toThrow();
      // chunkText requires options; pass minimal options
      expect(() => chunkText(undefined as any, { maxChunkSize: 100, overlap: 10 })).not.toThrow();
      expect(() => tokenize(null as any)).not.toThrow();
    });

    it('should handle async function errors', async () => {
      const invalidItem: ContextItem = {
        id: '',
        name: '',
        type: '',
        filePath: ''
      };
      
      const invalidQuery: ContextQuery = {};
      
      // Should not throw but handle gracefully
      await expect(calculateRelevance(invalidItem, invalidQuery)).resolves.toBeDefined();
    });
  });
});
