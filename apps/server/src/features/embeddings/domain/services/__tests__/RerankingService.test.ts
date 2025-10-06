import { RerankingService, RerankableItem, DEFAULT_RERANK_CONFIG } from '../RerankingService';

describe('RerankingService', () => {
  let service: RerankingService;

  beforeEach(() => {
    service = new RerankingService();
  });

  describe('rerank', () => {
    it('should sort items by final score', () => {
      const items: RerankableItem[] = [
        { id: '1', name: 'foo', similarity: 0.5 },
        { id: '2', name: 'bar', similarity: 0.8 },
        { id: '3', name: 'baz', similarity: 0.3 }
      ];

      const reranked = service.rerank(items, 'test');

      // Should be sorted by similarity (since no other factors match)
      expect(reranked[0]!.id).toBe('2'); // Highest similarity
      expect(reranked[1]!.id).toBe('1');
      expect(reranked[2]!.id).toBe('3'); // Lowest similarity
    });

    it('should boost exact name matches', () => {
      const items: RerankableItem[] = [
        { id: '1', name: 'getUserById', similarity: 0.5 },
        { id: '2', name: 'getUser', similarity: 0.6 },
        { id: '3', name: 'user', similarity: 0.7 }
      ];

      const reranked = service.rerank(items, 'getUserById');

      // Exact match should win despite lower similarity
      expect(reranked[0]!.id).toBe('1');
    });

    it('should boost partial name matches', () => {
      const items: RerankableItem[] = [
        { id: '1', name: 'getUserById', similarity: 0.5 },
        { id: '2', name: 'updateUserProfile', similarity: 0.5 },
        { id: '3', name: 'deletePost', similarity: 0.5 }
      ];

      const reranked = service.rerank(items, 'user');

      // Items with 'user' in name should rank higher
      expect(reranked[0]!.id).toBe('1');
      expect(reranked[1]!.id).toBe('2');
      expect(reranked[2]!.id).toBe('3');
    });

    it('should handle camelCase word extraction', () => {
      const items: RerankableItem[] = [
        { id: '1', name: 'getUserById', similarity: 0.5 },
        { id: '2', name: 'getProductById', similarity: 0.5 },
        { id: '3', name: 'unrelated', similarity: 0.5 }
      ];

      const reranked = service.rerank(items, 'get user');

      // Should match 'get' and 'user' in camelCase
      expect(reranked[0]!.id).toBe('1');
    });

    it('should apply type boost', () => {
      const items: RerankableItem[] = [
        { id: '1', name: 'test', type: 'variable', similarity: 0.5 },
        { id: '2', name: 'test', type: 'function', similarity: 0.5 },
        { id: '3', name: 'test', type: 'class', similarity: 0.5 }
      ];

      const reranked = service.rerank(items, 'test');

      // Functions and classes should rank higher than variables
      const variableIndex = reranked.findIndex(i => i.id === '1');
      const functionIndex = reranked.findIndex(i => i.id === '2');
      const classIndex = reranked.findIndex(i => i.id === '3');

      expect(functionIndex).toBeLessThan(variableIndex);
      expect(classIndex).toBeLessThan(variableIndex);
    });

    it('should apply recency boost', () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const items: RerankableItem[] = [
        { id: '1', name: 'old', similarity: 0.5, metadata: { updatedAt: monthAgo } },
        { id: '2', name: 'recent', similarity: 0.5, metadata: { updatedAt: now } },
        { id: '3', name: 'medium', similarity: 0.5, metadata: { updatedAt: weekAgo } }
      ];

      const reranked = service.rerank(items, 'test');

      // More recent items should rank higher
      expect(reranked[0]!.id).toBe('2'); // Most recent
      expect(reranked[1]!.id).toBe('3'); // Week ago
      expect(reranked[2]!.id).toBe('1'); // Month ago
    });

    it('should apply relationship boost', () => {
      const items: RerankableItem[] = [
        { 
          id: '1', 
          name: 'isolated', 
          similarity: 0.5,
          metadata: { relationships: [] }
        },
        { 
          id: '2', 
          name: 'connected', 
          similarity: 0.5,
          metadata: { relationships: Array(10).fill({}), inverseRelationships: Array(5).fill({}) }
        },
        { 
          id: '3', 
          name: 'somewhat_connected', 
          similarity: 0.5,
          metadata: { relationships: Array(3).fill({}) }
        }
      ];

      const reranked = service.rerank(items, 'test');

      // More connected items should rank higher
      expect(reranked[0]!.id).toBe('2'); // Most connections
      expect(reranked[1]!.id).toBe('3'); // Some connections
      expect(reranked[2]!.id).toBe('1'); // No connections
    });

    it('should use custom configuration', () => {
      const items: RerankableItem[] = [
        { id: '1', name: 'exactMatch', similarity: 0.3 },
        { id: '2', name: 'highSimilarity', similarity: 0.9 }
      ];

      // Custom config that heavily weights name matching
      const customConfig = {
        weights: {
          similarity: 0.1,
          nameMatch: 0.9
        }
      };

      const reranked = service.rerank(items, 'exactMatch', customConfig);

      // With custom weights, exact name match should win
      expect(reranked[0]!.id).toBe('1');
    });

    it('should preserve all original item properties', () => {
      const items = [
        { 
          id: '1', 
          name: 'test', 
          similarity: 0.5,
          customField: 'value',
          nested: { data: 'test' }
        }
      ];

      const reranked = service.rerank(items, 'test');

      expect(reranked[0]).toHaveProperty('customField', 'value');
      expect(reranked[0]).toHaveProperty('nested.data', 'test');
    });
  });

  describe('forComponents', () => {
    it('should create a component-optimized reranker', () => {
      const componentReranker = RerankingService.forComponents();
      
      const items: RerankableItem[] = [
        { id: '1', name: 'variable', type: 'variable', similarity: 0.5 },
        { id: '2', name: 'function', type: 'function', similarity: 0.5 }
      ];

      const reranked = componentReranker.rerank(items, 'test');

      // Component reranker should prefer functions over variables
      expect(reranked[0]!.id).toBe('2');
    });

    it('should allow custom config overrides', () => {
      const componentReranker = RerankingService.forComponents({
        boosts: {
          preferredTypes: ['variable'] // Override to prefer variables
        }
      });

      const items: RerankableItem[] = [
        { id: '1', name: 'variable', type: 'variable', similarity: 0.5 },
        { id: '2', name: 'function', type: 'function', similarity: 0.5 }
      ];

      const reranked = componentReranker.rerank(items, 'test');

      // Should now prefer variables
      expect(reranked[0]!.id).toBe('1');
    });
  });

  describe('forUniversalSearch', () => {
    it('should create a universal search reranker', () => {
      const universalReranker = RerankingService.forUniversalSearch();
      
      const items: RerankableItem[] = [
        { id: '1', name: 'lowSim', similarity: 0.3 },
        { id: '2', name: 'highSim', similarity: 0.9 }
      ];

      const reranked = universalReranker.rerank(items, 'test');

      // Universal search should heavily weight similarity
      expect(reranked[0]!.id).toBe('2');
    });
  });

  describe('extractWords', () => {
    it('should extract words from camelCase', () => {
      const service = new RerankingService();
      // Access private method through type assertion for testing
      const extractWords = (service as any).extractWords.bind(service);

      expect(extractWords('getUserById')).toEqual(['get', 'user', 'by', 'id']);
      expect(extractWords('XMLHttpRequest')).toEqual(['xml', 'http', 'request']);
      expect(extractWords('IOError')).toEqual(['io', 'error']);
    });

    it('should handle snake_case and kebab-case', () => {
      const service = new RerankingService();
      const extractWords = (service as any).extractWords.bind(service);

      expect(extractWords('get_user_by_id')).toEqual(['get', 'user', 'by', 'id']);
      expect(extractWords('get-user-by-id')).toEqual(['get', 'user', 'by', 'id']);
    });

    it('should filter out single characters', () => {
      const service = new RerankingService();
      const extractWords = (service as any).extractWords.bind(service);

      expect(extractWords('a b c test')).toEqual(['test']);
      expect(extractWords('x_y_component')).toEqual(['component']);
    });
  });

  describe('edge cases', () => {
    it('should handle empty items array', () => {
      const reranked = service.rerank([], 'test');
      expect(reranked).toEqual([]);
    });

    it('should handle items without names', () => {
      const items: RerankableItem[] = [
        { id: '1', similarity: 0.5 },
        { id: '2', similarity: 0.8 }
      ];

      const reranked = service.rerank(items, 'test');
      
      expect(reranked).toHaveLength(2);
      expect(reranked[0]!.id).toBe('2'); // Higher similarity
    });

    it('should handle items without similarity scores', () => {
      const items: RerankableItem[] = [
        { id: '1', name: 'exactMatch', similarity: 0 },
        { id: '2', name: 'other', similarity: 0 }
      ];

      const reranked = service.rerank(items, 'exactMatch');
      
      // Should still work with name matching
      expect(reranked[0]!.id).toBe('1');
    });

    it('should handle empty query', () => {
      const items: RerankableItem[] = [
        { id: '1', name: 'foo', similarity: 0.5 },
        { id: '2', name: 'bar', similarity: 0.8 }
      ];

      const reranked = service.rerank(items, '');
      
      // Should fall back to similarity
      expect(reranked[0]!.id).toBe('2');
    });
  });
});