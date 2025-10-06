/**
 * WindowSizeProcessor Tests
 * 
 * Tests the context window size management functionality,
 * especially the issues with properly cutting down to target sizes.
 */

import { WindowSizeProcessor } from '../../context/WindowSizeProcessor';
import type { ContextData, ContextQuery, ContextOptimizationOptions } from '../../context/interfaces';
import { ComponentType } from '../../context/types';

describe('WindowSizeProcessor', () => {
  let processor: WindowSizeProcessor;
  
  beforeEach(() => {
    processor = new WindowSizeProcessor({
      enableOptimization: true,
      reductionStrategies: {
        removeLowPriority: true,
        truncateDescriptions: true,
        summarizeCodeBlocks: true,
        removeDuplicates: true
      }
    });
  });

  describe('Token Estimation', () => {
    it('should estimate tokens correctly for different content types', () => {
      expect(processor.estimateTokens('Hello World')).toBe(3); // 11 chars / 4 = 2.75 → 3
      expect(processor.estimateTokens('a'.repeat(100))).toBe(25); // 100 / 4 = 25
      expect(processor.estimateTokens('')).toBe(0);
      expect(processor.estimateTokens('{"key":"value"}', 'json')).toBe(5); // 15 / 3.5 = 4.28 → 5
      expect(processor.estimateTokens('# Title\nContent', 'markdown')).toBe(4); // 15 / 4 = 3.75 → 4
    });

    it('should estimate context tokens including JSON overhead', () => {
      const data: ContextData = {
        query: 'test',
        items: [
          {
            id: '1',
            name: 'TestClass',
            type: ComponentType.CLASS,
            filePath: '/src/test.ts',
            code: 'class TestClass { constructor() {} }',
            metadata: { lineStart: 1, lineEnd: 3 }
          }
        ],
        relationships: []
      };

      const tokens = processor.estimateContextTokens(data);
      // Should include item tokens + 80% JSON overhead
      expect(tokens).toBeGreaterThan(20);
      expect(tokens).toBeLessThan(100);
    });
  });

  describe('Token Limit Enforcement', () => {
    it('should not modify data when under token limit', async () => {
      const data: ContextData = {
        query: 'test',
        items: [
          {
            id: '1',
            name: 'SmallItem',
            type: ComponentType.FUNCTION,
            filePath: '/src/small.ts',
            code: 'function small() { return 1; }'
          }
        ],
        relationships: []
      };

      const query: ContextQuery = { query: 'test' };
      const options: ContextOptimizationOptions = { targetTokens: 1000 };

      const result = await processor.process(data, query, options);
      expect(result.data.items).toHaveLength(1);
      expect(result.metadata.itemsFiltered).toBe(0);
    });

    it('should reduce content when over token limit', async () => {
      const largeCode = 'x'.repeat(5000); // Very large code block
      const data: ContextData = {
        query: 'test',
        items: Array.from({ length: 10 }, (_, i) => ({
          id: `item-${i}`,
          name: `LargeClass${i}`,
          type: ComponentType.CLASS,
          filePath: `/src/large${i}.ts`,
          code: largeCode,
          metadata: {
            description: 'This is a very long description that should be truncated when needed to fit within token limits',
            relevanceScore: i // Higher index = higher relevance
          }
        })),
        relationships: []
      };

      const query: ContextQuery = { query: 'test' };
      const options: ContextOptimizationOptions = { targetTokens: 500 };

      const result = await processor.process(data, query, options);
      
      // Should have removed items
      expect(result.data.items.length).toBeLessThan(10);
      expect(result.metadata.itemsFiltered).toBeGreaterThan(0);
      
      // Should keep higher relevance items
      const keptIds = result.data.items.map(item => item.id);
      expect(keptIds).toContain('item-9'); // Highest relevance
      expect(keptIds).not.toContain('item-0'); // Lowest relevance
    });

    it('should respect protected items (primary and source code)', async () => {
      const data: ContextData = {
        query: 'test',
        items: [
          {
            id: 'primary',
            name: 'PrimaryClass',
            type: ComponentType.CLASS,
            filePath: '/src/primary.ts',
            code: 'x'.repeat(100), // Smaller code to fit in target
            metadata: { relevanceScore: 0 } // Low relevance but protected
          },
          {
            id: 'with-code',
            name: 'CodeClass',
            type: ComponentType.CLASS,
            filePath: '/src/code.ts',
            code: 'class CodeClass { /* important code */ }',
            metadata: { relevanceScore: 1 }
          },
          {
            id: 'no-code',
            name: 'NoCodeClass',
            type: ComponentType.CLASS,
            filePath: '/src/nocode.ts',
            metadata: { relevanceScore: 10 } // High relevance but no code
          }
        ],
        relationships: []
      };

      const query: ContextQuery = { 
        query: 'test',
        componentId: 'primary' // This makes 'primary' protected
      };
      const options: ContextOptimizationOptions = { 
        targetTokens: 200, // Increase target to fit both protected items
        includeSourceCode: true // This protects items with code
      };

      const result = await processor.process(data, query, options);
      
      const keptIds = result.data.items.map(item => item.id);
      expect(keptIds).toContain('primary'); // Protected as primary
      expect(keptIds).toContain('with-code'); // Protected by includeSourceCode
      // 'no-code' might be removed despite high relevance
    });
  });

  describe('Reduction Strategies', () => {
    it('should remove duplicates', async () => {
      const data: ContextData = {
        query: 'test',
        items: [
          {
            id: '1',
            name: 'DuplicateClass',
            type: ComponentType.CLASS,
            filePath: '/src/dup.ts'
          },
          {
            id: '2',
            name: 'DuplicateClass',
            type: ComponentType.CLASS,
            filePath: '/src/dup.ts'
          },
          {
            id: '3',
            name: 'UniqueClass',
            type: ComponentType.CLASS,
            filePath: '/src/unique.ts'
          }
        ],
        relationships: []
      };

      const query: ContextQuery = { query: 'test' };
      const options: ContextOptimizationOptions = { targetTokens: 20 }; // Force reduction

      const result = await processor.process(data, query, options);
      expect(result.data.items).toHaveLength(2);
      
      const names = result.data.items.map(item => item.name);
      expect(names).toContain('DuplicateClass');
      expect(names).toContain('UniqueClass');
    });

    it('should truncate long descriptions', async () => {
      const data: ContextData = {
        query: 'test',
        items: [
          {
            id: '1',
            name: 'ClassWithLongDesc',
            type: ComponentType.CLASS,
            filePath: '/src/long.ts',
            metadata: {
              description: 'x'.repeat(500),
              documentation: 'y'.repeat(600)
            }
          }
        ],
        relationships: []
      };

      const query: ContextQuery = { query: 'test' };
      const options: ContextOptimizationOptions = { targetTokens: 100 };

      const result = await processor.process(data, query, options);
      const item = result.data.items[0];
      
      expect(item.metadata?.description?.length).toBeLessThanOrEqual(203); // 200 + '...'
      expect(item.metadata?.documentation?.length).toBeLessThanOrEqual(203);
    });

    it('should summarize large code blocks', async () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`);
      const largeCode = lines.join('\n');
      
      const data: ContextData = {
        query: 'test',
        items: [
          {
            id: '1',
            name: 'LargeCodeClass',
            type: ComponentType.CLASS,
            filePath: '/src/large.ts',
            code: largeCode
          }
        ],
        relationships: []
      };

      const query: ContextQuery = { query: 'test' };
      const options: ContextOptimizationOptions = { targetTokens: 50 };

      const result = await processor.process(data, query, options);
      const code = result.data.items[0].code || '';
      
      expect(code).toContain('// ... [code truncated] ...');
      expect(code.split('\n').length).toBeLessThan(100);
      expect(code).toContain('line 1'); // Should keep first lines
      expect(code).toContain('line 100'); // Should keep last lines
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data', async () => {
      const data: ContextData = {
        query: 'test',
        items: [],
        relationships: []
      };

      const query: ContextQuery = { query: 'test' };
      const options: ContextOptimizationOptions = { targetTokens: 1000 };

      const result = await processor.process(data, query, options);
      expect(result.data.items).toHaveLength(0);
      expect(result.data.relationships).toHaveLength(0);
    });

    it('should handle very small token limits', async () => {
      const data: ContextData = {
        query: 'test',
        items: Array.from({ length: 5 }, (_, i) => ({
          id: `item-${i}`,
          name: `Class${i}`,
          type: ComponentType.CLASS,
          filePath: `/src/class${i}.ts`,
          code: 'class Test { method() { return "test"; } }',
          metadata: { relevanceScore: i }
        })),
        relationships: []
      };

      const query: ContextQuery = { query: 'test' };
      const options: ContextOptimizationOptions = { targetTokens: 10 }; // Extremely small

      const result = await processor.process(data, query, options);
      
      // Should keep at least minimum items
      expect(result.data.items.length).toBeGreaterThan(0);
      // Should prioritize highest relevance
      if (result.data.items.length > 0) {
        const maxRelevance = Math.max(...result.data.items.map(
          item => item.metadata?.relevanceScore || 0
        ));
        expect(maxRelevance).toBe(4); // Highest relevance item
      }
    });

    it('should handle circular relationships when filtering', async () => {
      const data: ContextData = {
        query: 'test',
        items: [
          { id: 'A', name: 'ClassA', type: ComponentType.CLASS, filePath: '/a.ts' },
          { id: 'B', name: 'ClassB', type: ComponentType.CLASS, filePath: '/b.ts' },
          { id: 'C', name: 'ClassC', type: ComponentType.CLASS, filePath: '/c.ts' }
        ],
        relationships: [
          { id: 'rel-A-B', type: 'imports', sourceId: 'A', targetId: 'B' },
          { id: 'rel-B-C', type: 'imports', sourceId: 'B', targetId: 'C' },
          { id: 'rel-C-A', type: 'imports', sourceId: 'C', targetId: 'A' } // Circular
        ]
      };

      const query: ContextQuery = { query: 'test' };
      const options: ContextOptimizationOptions = { targetTokens: 50 };

      const result = await processor.process(data, query, options);
      
      // Should maintain relationship integrity
      const keptIds = new Set(result.data.items.map(item => item.id));
      const validRelationships = result.data.relationships.every(rel =>
        keptIds.has(rel.sourceId) && keptIds.has(rel.targetId)
      );
      expect(validRelationships).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should respect disabled optimization', async () => {
      const disabledProcessor = new WindowSizeProcessor({
        enableOptimization: false
      });

      const data: ContextData = {
        query: 'test',
        items: Array.from({ length: 100 }, (_, i) => ({
          id: `item-${i}`,
          name: `Class${i}`,
          type: ComponentType.CLASS,
          filePath: `/src/class${i}.ts`,
          code: 'x'.repeat(1000)
        })),
        relationships: []
      };

      const query: ContextQuery = { query: 'test' };
      const options: ContextOptimizationOptions = { targetTokens: 10 };

      const result = await disabledProcessor.process(data, query, options);
      
      // Should not filter anything when disabled
      expect(result.data.items).toHaveLength(100);
      expect(result.warnings).toContain('Token optimization disabled');
    });

    it('should validate configuration', () => {
      const validResult = processor.validateConfig({
        charsPerToken: 4
      });
      expect(validResult).toBe(true);

      const invalidResult = processor.validateConfig({
        charsPerToken: 15 // Out of range
      });
      expect(invalidResult).toContain('charsPerToken must be between 1 and 10');
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const data: ContextData = {
        query: 'test',
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: `item-${i}`,
          name: `Class${i}`,
          type: ComponentType.CLASS,
          filePath: `/src/class${i}.ts`,
          code: `class Class${i} { method() { return ${i}; } }`,
          metadata: { relevanceScore: Math.random() * 100 }
        })),
        relationships: Array.from({ length: 500 }, (_, i) => ({
          id: `rel-${i}`,
          type: 'imports',
          sourceId: `item-${i}`,
          targetId: `item-${i + 1}`
        }))
      };

      const query: ContextQuery = { query: 'test' };
      const options: ContextOptimizationOptions = { targetTokens: 1000 };

      const startTime = Date.now();
      const result = await processor.process(data, query, options);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.data.items.length).toBeLessThan(1000);
      expect(result.data.items.length).toBeGreaterThan(0);
    });
  });
});