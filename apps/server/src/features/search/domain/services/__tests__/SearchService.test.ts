import { SearchService, SearchConfig, SearchStorage, EntityGetters } from '../SearchService';
import { RerankingService } from '../../../../embeddings/domain/services/RerankingService';
import { EmbeddingService } from '../../../../../nlp/EmbeddingServiceAdapter';
import { IComponent, ITask, INote, IRule } from '@felix/code-intelligence';
import { ComponentType } from '../../../../../models/types-fixed';

// Mock implementations  
class MockEmbeddingService {
  async getEmbedding(text: string): Promise<{ embedding: number[], version: string, dimensions: number, model: string }> {
    // Simple mock embedding based on text length
    const embedding = new Array(384).fill(0);
    embedding[0] = text.length / 100;
    return { embedding, version: '1.0.0', dimensions: 384, model: 'mock' };
  }

  async getSimilarity(text1: string, text2: string): Promise<number> {
    return 0.5;
  }

  // Add all required methods from EmbeddingService
  async _generateEntityEmbedding() { return this.getEmbedding('test'); }
  async _generateEntityEmbeddings() { return []; }
  async generateComponentEmbedding() { return this.getEmbedding('test'); }
  async generateComponentEmbeddings() { return []; }
  async generateTaskEmbedding() { return this.getEmbedding('test'); }
  async generateTaskEmbeddings() { return []; }
  async generateNoteEmbedding() { return this.getEmbedding('test'); }
  async generateNoteEmbeddings() { return []; }
  async generateRuleEmbedding() { return this.getEmbedding('test'); }
  async generateRuleEmbeddings() { return []; }
  async isInitialized() { return true; }
  async initialize() { }
  async batchEmbedding() { return []; }
  async cleanup() { }
  getConfig() { return {}; }
  getStats() { return {}; }
  clearCache() { }
  warmupCache() { return Promise.resolve(); }
}

class MockSearchStorage implements SearchStorage {
  private mockResults: any[] = [];

  setMockResults(results: any[]): void {
    this.mockResults = results;
  }

  async findSimilarEntities(
    queryEmbedding: number[],
    limit: number,
    entityTypes?: ('component' | 'task' | 'note' | 'rule')[],
    getters?: EntityGetters
  ): Promise<Array<{
    entity: IComponent | ITask | INote | IRule;
    entityType: 'component' | 'task' | 'note' | 'rule';
    similarity: number;
  }>> {
    return this.mockResults.slice(0, limit);
  }
}

describe('SearchService', () => {
  let searchService: SearchService;
  let mockEmbeddingService: MockEmbeddingService;
  let mockStorage: MockSearchStorage;
  let mockGetters: EntityGetters;

  beforeEach(() => {
    mockEmbeddingService = new MockEmbeddingService();
    mockStorage = new MockSearchStorage();
    mockGetters = {
      getComponent: jest.fn(),
      getTask: jest.fn(),
      getNote: jest.fn(),
      getRule: jest.fn()
    };

    searchService = new SearchService(
      mockEmbeddingService as any, // Cast to avoid strict type checking in tests
      mockStorage,
      mockGetters
    );
  });

  describe('search', () => {
    it('should search across all entity types by default', async () => {
      const mockComponent: IComponent = {
        id: 'comp1',
        name: 'TestComponent',
        type: ComponentType.FUNCTION,
        language: 'typescript',
        filePath: '/test.ts',
        location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 },
        code: 'function test() {}',
        metadata: {}
      };

      const mockTask = {
        id: 'task1',
        title: 'Test Task',
        description: 'A test task',
        task_status: 'todo',
        task_type: 'task',
        task_priority: 'medium',
        created_at: new Date(),
        updated_at: new Date()
      } as ITask;

      mockStorage.setMockResults([
        { entity: mockComponent, entityType: 'component', similarity: 0.8 },
        { entity: mockTask, entityType: 'task', similarity: 0.6 }
      ]);

      const results = await searchService.search('test query');

      expect(results).toHaveLength(2);
      expect(results[0]!.entityType).toBe('component');
      expect(results[1]!.entityType).toBe('task');
    });

    it('should filter by entity types when specified', async () => {
      const mockComponent: IComponent = {
        id: 'comp1',
        name: 'TestComponent',
        type: ComponentType.FUNCTION,
        language: 'typescript',
        filePath: '/test.ts',
        location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 },
        code: 'function test() {}',
        metadata: {}
      };

      mockStorage.setMockResults([
        { entity: mockComponent, entityType: 'component', similarity: 0.8 }
      ]);

      const results = await searchService.search('test', {
        entityTypes: ['component']
      });

      expect(results).toHaveLength(1);
      expect(results[0]!.entityType).toBe('component');
    });

    it('should apply limit correctly', async () => {
      const mockResults = Array.from({ length: 10 }, (_, i) => ({
        entity: {
          id: `comp${i}`,
          name: `Component${i}`,
          type: ComponentType.FUNCTION,
          language: 'typescript',
          filePath: '/test.ts',
          location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 },
          code: 'function test() {}',
          metadata: {}
        } as IComponent,
        entityType: 'component' as const,
        similarity: 0.9 - i * 0.05
      }));

      mockStorage.setMockResults(mockResults);

      const results = await searchService.search('test', { limit: 5 });

      expect(results).toHaveLength(5);
    });

    it('should apply reranking to results', async () => {
      const mockComponent1: IComponent = {
        id: 'comp1',
        name: 'exactMatch',
        type: ComponentType.FUNCTION,
        language: 'typescript',
        filePath: '/test.ts',
        location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 },
        code: 'function test() {}',
        metadata: {}
      };

      const mockComponent2: IComponent = {
        id: 'comp2',
        name: 'otherComponent',
        type: ComponentType.FUNCTION,
        language: 'typescript',
        filePath: '/test.ts',
        location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 },
        code: 'function test() {}',
        metadata: {}
      };

      mockStorage.setMockResults([
        { entity: mockComponent1, entityType: 'component', similarity: 0.5 },
        { entity: mockComponent2, entityType: 'component', similarity: 0.8 }
      ]);

      const results = await searchService.search('exactMatch');

      // Despite lower similarity, exact name match should rank higher
      expect(results[0]!.entity).toEqual(mockComponent1);
      expect(results[0]!.finalScore).toBeDefined();
      expect(results[0]!.scoringFactors).toBeDefined();
    });

    it('should throw error if embedding generation fails', async () => {
      jest.spyOn(mockEmbeddingService, 'getEmbedding').mockResolvedValue(null as any);

      await expect(searchService.search('test')).rejects.toThrow('Failed to generate query embedding');
    });

    it('should use custom reranking config when provided', async () => {
      const mockComponent: IComponent = {
        id: 'comp1',
        name: 'TestComponent',
        type: ComponentType.FUNCTION,
        language: 'typescript',
        filePath: '/test.ts',
        location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 },
        code: 'function test() {}',
        metadata: {}
      };

      mockStorage.setMockResults([
        { entity: mockComponent, entityType: 'component', similarity: 0.8 }
      ]);

      const customConfig: SearchConfig = {
        rerankConfig: {
          weights: {
            similarity: 0.9,
            nameMatch: 0.1
          }
        }
      };

      const results = await searchService.search('test', customConfig);

      expect(results).toHaveLength(1);
      expect(results[0]!.finalScore).toBeDefined();
    });
  });

  describe('findSimilar', () => {
    it('should find similar components', async () => {
      const sourceComponent: IComponent = {
        id: 'source',
        name: 'SourceComponent',
        type: ComponentType.CLASS,
        language: 'typescript',
        filePath: '/source.ts',
        location: { startLine: 1, endLine: 50, startColumn: 0, endColumn: 0 },
        code: 'class SourceComponent {}',
        metadata: {}
      };

      const similarComponent: IComponent = {
        id: 'similar',
        name: 'SimilarComponent',
        type: ComponentType.CLASS,
        language: 'typescript',
        filePath: '/similar.ts',
        location: { startLine: 1, endLine: 40, startColumn: 0, endColumn: 0 },
        code: 'class SimilarComponent {}',
        metadata: {}
      };

      mockStorage.setMockResults([
        { entity: similarComponent, entityType: 'component', similarity: 0.85 }
      ]);

      const results = await searchService.findSimilar(sourceComponent, 'component');

      expect(results).toHaveLength(1);
      expect(results[0]!.entity).toEqual(similarComponent);
    });

    it('should default to searching same entity type', async () => {
      const sourceTask = {
        id: 'source',
        title: 'Source Task',
        description: 'A source task',
        task_status: 'todo',
        task_type: 'task',
        task_priority: 'medium',
        created_at: new Date(),
        updated_at: new Date()
      } as ITask;

      const similarTask = {
        id: 'similar',
        title: 'Similar Task',
        description: 'A similar task',
        task_status: 'todo',
        task_type: 'task',
        task_priority: 'medium',
        created_at: new Date(),
        updated_at: new Date()
      } as ITask;

      mockStorage.setMockResults([
        { entity: similarTask, entityType: 'task', similarity: 0.75 }
      ]);

      const results = await searchService.findSimilar(sourceTask, 'task');

      expect(results).toHaveLength(1);
      expect(results[0]!.entityType).toBe('task');
    });
  });

  describe('searchComponents', () => {
    it('should search only components', async () => {
      const mockComponent: IComponent = {
        id: 'comp1',
        name: 'TestComponent',
        type: ComponentType.FUNCTION,
        language: 'typescript',
        filePath: '/test.ts',
        location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 },
        code: 'function test() {}',
        metadata: {}
      };

      mockStorage.setMockResults([
        { entity: mockComponent, entityType: 'component', similarity: 0.8 }
      ]);

      const results = await searchService.searchComponents('test');

      expect(results).toHaveLength(1);
      expect(results[0]!.entityType).toBe('component');
      expect(results[0]!.entity).toEqual(mockComponent);
    });
  });

  describe('searchTasks', () => {
    it('should search only tasks', async () => {
      const mockTask = {
        id: 'task1',
        title: 'Test Task',
        description: 'A test task',
        task_status: 'todo',
        task_type: 'task',
        task_priority: 'medium',
        created_at: new Date(),
        updated_at: new Date()
      } as ITask;

      mockStorage.setMockResults([
        { entity: mockTask, entityType: 'task', similarity: 0.7 }
      ]);

      const results = await searchService.searchTasks('test');

      expect(results).toHaveLength(1);
      expect(results[0]!.entityType).toBe('task');
      expect(results[0]!.entity).toEqual(mockTask);
    });
  });

  describe('searchNotes', () => {
    it('should search only notes', async () => {
      const mockNote = {
        id: 'note1',
        title: 'Test Note',
        content: 'This is a test note',
        note_type: 'note',
        created_at: new Date(),
        updated_at: new Date()
      } as INote;

      mockStorage.setMockResults([
        { entity: mockNote, entityType: 'note', similarity: 0.65 }
      ]);

      const results = await searchService.searchNotes('test');

      expect(results).toHaveLength(1);
      expect(results[0]!.entityType).toBe('note');
      expect(results[0]!.entity).toEqual(mockNote);
    });
  });

  describe('searchRules', () => {
    it('should search only rules', async () => {
      const mockRule = {
        id: 'rule1',
        name: 'Test Rule',
        description: 'A test rule',
        rule_type: 'pattern',
        guidance_text: 'Follow this pattern',
        created_at: new Date(),
        updated_at: new Date()
      } as IRule;

      mockStorage.setMockResults([
        { entity: mockRule, entityType: 'rule', similarity: 0.6 }
      ]);

      const results = await searchService.searchRules('test');

      expect(results).toHaveLength(1);
      expect(results[0]!.entityType).toBe('rule');
      expect(results[0]!.entity).toEqual(mockRule);
    });
  });

  describe('static factory methods', () => {
    it('should create a component-optimized search service', () => {
      const componentSearch = SearchService.forComponents(
        mockEmbeddingService as any,
        mockStorage,
        mockGetters
      );

      expect(componentSearch).toBeInstanceOf(SearchService);
    });

    it('should create a search service with custom reranking', () => {
      const customReranker = new RerankingService({
        weights: { similarity: 1.0 }
      });

      const customSearch = SearchService.withCustomReranking(
        mockEmbeddingService as any,
        mockStorage,
        mockGetters,
        customReranker
      );

      expect(customSearch).toBeInstanceOf(SearchService);
    });
  });

  describe('metadata extraction', () => {
    it('should extract component metadata correctly', async () => {
      const mockComponent: IComponent = {
        id: 'comp1',
        name: 'TestComponent',
        type: ComponentType.FUNCTION,
        language: 'typescript',
        filePath: '/test.ts',
        location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 },
        code: 'function test() {}',
        metadata: {
          description: 'Test component',
          complexity: 5,
          updatedAt: new Date().toISOString()
        }
      };

      mockStorage.setMockResults([
        { entity: mockComponent, entityType: 'component', similarity: 0.8 }
      ]);

      const results = await searchService.search('test');

      expect(results[0]!.finalScore).toBeDefined();
      // Metadata should be used for reranking
    });

    it('should extract task metadata correctly', async () => {
      const mockTask = {
        id: 'task1',
        title: 'High Priority Task',
        description: 'An important task',
        task_status: 'in_progress',
        task_type: 'task',
        task_priority: 'high',
        created_at: new Date(),
        updated_at: new Date()
      } as ITask;

      mockStorage.setMockResults([
        { entity: mockTask, entityType: 'task', similarity: 0.7 }
      ]);

      const results = await searchService.search('task');

      expect(results[0]!.entityType).toBe('task');
      // Priority metadata should be available for reranking
    });
  });

  describe('error handling', () => {
    it('should handle empty results gracefully', async () => {
      mockStorage.setMockResults([]);

      const results = await searchService.search('nonexistent');

      expect(results).toEqual([]);
    });

    it('should handle storage errors gracefully', async () => {
      jest.spyOn(mockStorage, 'findSimilarEntities').mockRejectedValue(new Error('Storage error'));

      await expect(searchService.search('test')).rejects.toThrow('Storage error');
    });

    it('should filter out results below similarity threshold', async () => {
      const mockComponent1: IComponent = {
        id: 'comp1',
        name: 'HighMatch',
        type: ComponentType.FUNCTION,
        language: 'typescript',
        filePath: '/test.ts',
        location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 },
        code: 'function test() {}',
        metadata: {}
      };

      const mockComponent2: IComponent = {
        id: 'comp2',
        name: 'LowMatch',
        type: ComponentType.FUNCTION,
        language: 'typescript',
        filePath: '/test.ts',
        location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 },
        code: 'function test() {}',
        metadata: {}
      };

      mockStorage.setMockResults([
        { entity: mockComponent1, entityType: 'component', similarity: 0.8 },
        { entity: mockComponent2, entityType: 'component', similarity: 0.2 }
      ]);

      const results = await searchService.search('test', {
        similarityThreshold: 0.5
      });

      // Only high similarity result should pass threshold
      expect(results.length).toBeLessThanOrEqual(1);
    });
  });
});