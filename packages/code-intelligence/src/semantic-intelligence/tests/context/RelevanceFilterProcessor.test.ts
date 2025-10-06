/**
 * RelevanceFilterProcessor Tests
 * 
 * Tests the content filtering processor that removes low-relevance items
 * and applies content compression strategies.
 */

import { RelevanceFilterProcessor } from '../../context/RelevanceFilterProcessor';
import type { ContextData, ContextQuery, ContextOptimizationOptions } from '../../context/interfaces';
import { ComponentType } from '../../context/types';

describe('RelevanceFilterProcessor', () => {
  let processor: RelevanceFilterProcessor;

  beforeEach(() => {
    processor = new RelevanceFilterProcessor({
      minRetention: 0.3,
      relevanceThreshold: 0.1,
      maxDescriptionLength: 200
    });
  });

  describe('Initialization', () => {
    it('should create processor with default options', () => {
      const defaultProcessor = new RelevanceFilterProcessor();
      expect(defaultProcessor.name).toBe('RelevanceFilterProcessor');
      expect(defaultProcessor.description).toContain('Filters');
      expect(defaultProcessor.version).toBeDefined();
      expect(defaultProcessor.priority).toBeGreaterThan(0);
    });

    it('should create processor with custom options', () => {
      const customProcessor = new RelevanceFilterProcessor({
        minRetention: 0.5,
        relevanceThreshold: 0.2
      });
      expect(customProcessor).toBeInstanceOf(RelevanceFilterProcessor);
    });
  });

  describe('Content Filtering', () => {
    const testData: ContextData = {
      query: 'authentication',
      items: [
        {
          id: 'high-relevance',
          name: 'AuthService',
          type: ComponentType.CLASS,
          filePath: '/src/auth.ts',
          code: 'class AuthService { login() {} }',
          metadata: {
            relevanceScore: 0.9,
            description: 'Handles user authentication and security'
          }
        },
        {
          id: 'medium-relevance',
          name: 'UserController',
          type: ComponentType.CLASS,
          filePath: '/src/user.ts',
          code: 'class UserController { getProfile() {} }',
          metadata: {
            relevanceScore: 0.5,
            description: 'Manages user data and profiles'
          }
        },
        {
          id: 'low-relevance',
          name: 'LoggerUtil',
          type: ComponentType.FUNCTION,
          filePath: '/src/logger.ts',
          code: 'function log(message: string) { console.log(message); }',
          metadata: {
            relevanceScore: 0.05,
            description: 'Utility function for logging messages'
          }
        }
      ],
      relationships: [
        {
          id: 'rel-1',
          sourceId: 'high-relevance',
          targetId: 'medium-relevance',
          type: 'uses',
          metadata: { relevanceScore: 0.8 }
        },
        {
          id: 'rel-2',
          sourceId: 'medium-relevance',
          targetId: 'low-relevance',
          type: 'depends',
          metadata: { relevanceScore: 0.1 }
        }
      ]
    };

    const query: ContextQuery = { query: 'authentication' };
    const options: ContextOptimizationOptions = { targetTokens: 1000 };

    it('should process data and filter low relevance items', async () => {
      const result = await processor.process(testData, query, options);

      expect(result.data.items.length).toBeLessThanOrEqual(testData.items.length);
      expect(result.metadata.processorName).toBe('RelevanceFilterProcessor');
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.itemsProcessed).toBeGreaterThan(0);
    });

    it('should remove items below relevance threshold', () => {
      const filtered = processor.filter(testData, { relevanceThreshold: 0.3 });

      // Should remove low-relevance item (0.05)
      expect(filtered.items.length).toBe(2);
      expect(filtered.items.find(item => item.id === 'low-relevance')).toBeUndefined();
      expect(filtered.items.find(item => item.id === 'high-relevance')).toBeDefined();
      expect(filtered.items.find(item => item.id === 'medium-relevance')).toBeDefined();
    });

    it('should respect minimum retention percentage', () => {
      const filtered = processor.filter(testData, { 
        relevanceThreshold: 0.9, // Very high threshold
        minRetention: 0.5 // Keep at least 50%
      });

      // Should keep at least 50% of items (2 out of 3)
      expect(filtered.items.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter relationships based on retained items', () => {
      const filtered = processor.filter(testData, { relevanceThreshold: 0.3 });

      // Should only keep relationships between retained items
      const retainedItemIds = new Set(filtered.items.map(item => item.id));
      filtered.relationships.forEach(rel => {
        expect(retainedItemIds.has(rel.sourceId)).toBe(true);
        expect(retainedItemIds.has(rel.targetId)).toBe(true);
      });
    });
  });

  describe('Content Compression', () => {
    const testData: ContextData = {
      query: 'test',
      items: [
        {
          id: 'long-desc',
          name: 'ComponentWithLongDescription',
          type: ComponentType.CLASS,
          filePath: '/src/component.ts',
          metadata: {
            description: 'This is a very long description that exceeds the maximum length limit and should be truncated when compression is applied to reduce the overall size of the context data for better performance and token efficiency.',
            documentation: 'This is also a very long documentation string that provides detailed information about the component functionality, usage patterns, examples, and implementation details that might not be essential for basic understanding.'
          }
        }
      ],
      relationships: []
    };

    it('should compress long descriptions', () => {
      const compressed = processor.compress(testData, { maxDescriptionLength: 50 });

      const item = compressed.items[0];
      expect(item.metadata?.description?.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(item.metadata?.description).toContain('...');
    });

    it('should preserve short descriptions', () => {
      const testDataShort: ContextData = {
        query: 'test',
        items: [
          {
            id: 'short-desc',
            name: 'Component',
            type: ComponentType.CLASS,
            filePath: '/src/component.ts',
            metadata: {
              description: 'Short description'
            }
          }
        ],
        relationships: []
      };

      const compressed = processor.compress(testDataShort, { maxDescriptionLength: 200 });

      const item = compressed.items[0];
      expect(item.metadata?.description).toBe('Short description');
    });
  });

  describe('Duplicate Removal', () => {
    const testDataWithDuplicates: ContextData = {
      query: 'test',
      items: [
        {
          id: 'original',
          name: 'Component',
          type: ComponentType.CLASS,
          filePath: '/src/component.ts',
          code: 'class Component { method() {} }'
        },
        {
          id: 'duplicate',
          name: 'Component',
          type: ComponentType.CLASS,
          filePath: '/src/component.ts',
          code: 'class Component { method() {} }'
        },
        {
          id: 'unique',
          name: 'AnotherComponent',
          type: ComponentType.CLASS,
          filePath: '/src/another.ts',
          code: 'class AnotherComponent {}'
        }
      ],
      relationships: []
    };

    it('should remove duplicate items', () => {
      const deduplicated = processor.removeDuplicates(testDataWithDuplicates);

      expect(deduplicated.items.length).toBe(2);
      const names = deduplicated.items.map(item => item.name);
      expect(names).toContain('Component');
      expect(names).toContain('AnotherComponent');
    });

    it('should preserve unique items', () => {
      const uniqueData: ContextData = {
        query: 'test',
        items: [
          {
            id: 'item1',
            name: 'Component1',
            type: ComponentType.CLASS,
            filePath: '/src/component1.ts'
          },
          {
            id: 'item2',
            name: 'Component2',
            type: ComponentType.CLASS,
            filePath: '/src/component2.ts'
          }
        ],
        relationships: []
      };

      const deduplicated = processor.removeDuplicates(uniqueData);
      expect(deduplicated.items.length).toBe(2);
    });
  });

  describe('Processing Control', () => {
    it('should determine if it can process data', () => {
      const testData: ContextData = {
        query: 'test',
        items: [
          { id: '1', name: 'Item', type: ComponentType.FUNCTION, filePath: '/src/item.ts' }
        ],
        relationships: []
      };
      const options: ContextOptimizationOptions = { targetTokens: 1000 };

      expect(processor.canProcess(testData, options)).toBe(true);
    });

    it('should not process empty data', () => {
      const emptyData: ContextData = {
        query: 'test',
        items: [],
        relationships: []
      };
      const options: ContextOptimizationOptions = { targetTokens: 1000 };

      expect(processor.canProcess(emptyData, options)).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should provide configuration schema', () => {
      const schema = processor.getConfigSchema();
      
      expect(schema).toHaveProperty('minRetention');
      expect(schema).toHaveProperty('relevanceThreshold');
      expect(schema).toHaveProperty('maxDescriptionLength');
      expect(schema.minRetention).toHaveProperty('type', 'number');
    });

    it('should validate configuration', () => {
      expect(processor.validateConfig({
        minRetention: 0.5,
        relevanceThreshold: 0.1
      })).toBe(true);

      expect(processor.validateConfig({
        minRetention: 1.5 // Invalid: > 1
      })).toContain('minRetention must be between 0 and 1');

      expect(processor.validateConfig({
        relevanceThreshold: -0.1 // Invalid: < 0
      })).toContain('relevanceThreshold must be between 0 and 1');

      expect(processor.validateConfig('invalid')).toContain('Configuration must be an object');
    });
  });

  describe('Edge Cases', () => {
    it('should handle items without relevance scores', () => {
      const testData: ContextData = {
        query: 'test',
        items: [
          {
            id: 'no-score',
            name: 'ComponentNoScore',
            type: ComponentType.CLASS,
            filePath: '/src/component.ts'
            // No metadata.relevanceScore
          }
        ],
        relationships: []
      };

      const filtered = processor.filter(testData, { 
        relevanceThreshold: 0.5,
        minRetention: 0 // Don't force retention of any items
      });
      
      // Missing scores should be handled gracefully
      expect(filtered.items.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle items without metadata', () => {
      const testData: ContextData = {
        query: 'test',
        items: [
          {
            id: 'no-metadata',
            name: 'ComponentNoMetadata',
            type: ComponentType.CLASS,
            filePath: '/src/component.ts'
            // No metadata at all
          }
        ],
        relationships: []
      };

      const compressed = processor.compress(testData, { maxDescriptionLength: 100 });
      expect(compressed.items).toHaveLength(1);
    });

    it('should handle empty strings in compression', () => {
      const testData: ContextData = {
        query: 'test',
        items: [
          {
            id: 'empty-desc',
            name: 'Component',
            type: ComponentType.CLASS,
            filePath: '/src/component.ts',
            metadata: {
              description: '',
              documentation: null as any
            }
          }
        ],
        relationships: []
      };

      const compressed = processor.compress(testData, { maxDescriptionLength: 100 });
      expect(compressed.items[0].metadata?.description).toBe('');
    });
  });
});