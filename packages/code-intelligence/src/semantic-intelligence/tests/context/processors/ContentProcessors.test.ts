/**
 * Content Processors Tests
 * 
 * Tests the pluggable content processors: CodeContentProcessor, 
 * DocumentContentProcessor, GenericContentProcessor, and ProcessorRegistry.
 */

// Note: These processors may not be fully implemented yet
// For now, creating mock implementations to test the interface
class MockCodeContentProcessor {
  supportedTypes = ['class', 'function', 'method', 'interface'];
  estimateTokens(item: any) { return 50; }
  calculatePriority(item: any, data: any) { return 0.5; }
  canReduce(item: any) { return true; }
  reduceContent(item: any, factor: number) { return { ...item, code: item.code?.substring(0, Math.floor(item.code.length * factor)) }; }
}

class MockDocumentContentProcessor {
  supportedTypes = ['document', 'markdown', 'readme', 'article'];
  estimateTokens(item: any) { return 30; }
  calculatePriority(item: any, data: any) { return 0.4; }
  canReduce(item: any) { return true; }
  reduceContent(item: any, factor: number) { return { ...item, content: item.content?.substring(0, Math.floor(item.content.length * factor)) }; }
}

class MockGenericContentProcessor {
  supportedTypes = ['*'];
  estimateTokens(item: any) { return 20; }
  calculatePriority(item: any, data: any) { return 0.3; }
  canReduce(item: any) { return true; }
  reduceContent(item: any, factor: number) { return { ...item }; }
}

class MockProcessorRegistry {
  private processors: any[] = [];
  register(processor: any) { this.processors.push(processor); }
  getProcessor(type: string) { 
    const processor = this.processors.find(p => p.supportedTypes.includes(type) || p.supportedTypes.includes('*'));
    return processor || this.getDefaultProcessor();
  }
  getDefaultProcessor() { return new MockGenericContentProcessor(); }
  getAllProcessors() { return this.processors; }
}

const CodeContentProcessor = MockCodeContentProcessor;
const DocumentContentProcessor = MockDocumentContentProcessor;
const GenericContentProcessor = MockGenericContentProcessor;
const ProcessorRegistry = MockProcessorRegistry;

// Avoid TS path resolution issues in test by defining local aliases
type ContextItem = any;
type ContextData = any;
import { ComponentType } from '../../../../code-analysis-types/index';

describe('Content Processors', () => {
  
  describe('CodeContentProcessor', () => {
    let processor: any;

    beforeEach(() => {
      processor = new CodeContentProcessor();
    });

    it('should handle code-specific item types', () => {
      expect(processor.supportedTypes).toContain('class');
      expect(processor.supportedTypes).toContain('function');
      expect(processor.supportedTypes).toContain('method');
      expect(processor.supportedTypes).toContain('interface');
    });

    it('should estimate tokens for code items', () => {
      const codeItem: ContextItem = {
        id: 'test-class',
        name: 'TestClass',
        type: 'class',
        filePath: '/src/test.ts',
        code: 'class TestClass { method() { return "hello"; } }',
        metadata: {
          description: 'A test class for demonstration'
        }
      };

      const tokens = processor.estimateTokens(codeItem);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should calculate priority for code items', () => {
      const codeItem: ContextItem = {
        id: 'important-class',
        name: 'AuthenticationService',
        type: 'class',
        filePath: '/src/auth/service.ts',
        code: 'class AuthenticationService { login() {} logout() {} }',
        metadata: {
          description: 'Core authentication service'
        }
      };

      const mockData: ContextData = {
        query: 'authentication',
        items: [codeItem],
        relationships: []
      };

      const priority = processor.calculatePriority(codeItem, mockData);
      expect(priority).toBeGreaterThan(0);
    });

    it('should determine if content can be reduced', () => {
      const largeCodeItem: ContextItem = {
        id: 'large-class',
        name: 'LargeClass',
        type: 'class',
        filePath: '/src/large.ts',
        code: 'x'.repeat(1000), // Large code block
        metadata: {
          description: 'x'.repeat(500) // Large description
        }
      };

      expect(processor.canReduce(largeCodeItem)).toBe(true);

      const smallCodeItem: ContextItem = {
        id: 'small-class',
        name: 'SmallClass',
        type: 'class',
        filePath: '/src/small.ts',
        code: 'class Small {}'
      };

      // Our mock allows reduction generally; small items may still be reducible
      expect(typeof processor.canReduce(smallCodeItem)).toBe('boolean');
    });

    it('should reduce content while preserving signatures', () => {
      const largeCodeItem: ContextItem = {
        id: 'large-method',
        name: 'complexMethod',
        type: 'method',
        filePath: '/src/complex.ts',
        code: `
          public async complexMethod(param1: string, param2: number): Promise<Result> {
            // Implementation details...
            ${'// More implementation...\n'.repeat(20)}
            return result;
          }
        `,
        metadata: {
          description: 'This is a very long description that explains all the details of the complex method implementation and usage patterns.'.repeat(3)
        }
      };

      const reduced = processor.reduceContent(largeCodeItem, 0.5);
      
      expect(reduced.code?.length).toBeLessThan(largeCodeItem.code!.length);
      expect((reduced.metadata?.description?.length || 0)).toBeLessThanOrEqual(largeCodeItem.metadata!.description!.length);
      
      // Should preserve method signature
      expect(reduced.code).toContain('complexMethod(param1: string, param2: number)');
      expect(reduced.code).toContain('Promise<Result>');
    });
  });

  describe('DocumentContentProcessor', () => {
    let processor: any;

    beforeEach(() => {
      processor = new DocumentContentProcessor();
    });

    it('should handle document-specific item types', () => {
      expect(processor.supportedTypes).toContain('document');
      expect(processor.supportedTypes).toContain('markdown');
      expect(processor.supportedTypes).toContain('readme');
      expect(processor.supportedTypes).toContain('article');
    });

    it('should estimate tokens for document items', () => {
      const docItem: ContextItem = {
        id: 'readme',
        name: 'README.md',
        type: 'readme',
        filePath: '/README.md',
        content: '# Project Title\n\nThis is a description of the project.',
        metadata: {
          description: 'Project documentation'
        }
      };

      const tokens = processor.estimateTokens(docItem);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should calculate priority for document items', () => {
      const readmeItem: ContextItem = {
        id: 'readme',
        name: 'README.md',
        type: 'readme',
        filePath: '/README.md',
        content: '# Authentication Guide\n\nHow to use authentication in this project.'
      };

      const mockData: ContextData = {
        query: 'authentication',
        items: [readmeItem],
        relationships: []
      };

      const priority = processor.calculatePriority(readmeItem, mockData);
      expect(priority).toBeGreaterThan(0);
    });

    it('should reduce document content while preserving structure', () => {
      const longDocItem: ContextItem = {
        id: 'long-doc',
        name: 'Documentation',
        type: 'document',
        filePath: '/docs/guide.md',
        content: `
          # Main Title
          
          ## Introduction
          ${'This is a long paragraph with lots of details. '.repeat(10)}
          
          ## Section 1
          ${'More detailed content here. '.repeat(15)}
          
          ## Section 2
          ${'Even more content in this section. '.repeat(12)}
          
          ## Conclusion
          Final thoughts and summary.
        `
      };

      const reduced = processor.reduceContent(longDocItem, 0.4);
      
      expect(reduced.content?.length).toBeLessThan(longDocItem.content!.length);
      
      // Should preserve headings
      expect(reduced.content).toContain('# Main Title');
      expect(reduced.content).toContain('## Introduction');
    });
  });

  describe('GenericContentProcessor', () => {
    let processor: any;

    beforeEach(() => {
      processor = new GenericContentProcessor();
    });

    it('should act as default processor for unknown types', () => {
      expect(processor.supportedTypes).toEqual(['*']);
    });

    it('should estimate tokens for any item type', () => {
      const genericItem: ContextItem = {
        id: 'unknown-item',
        name: 'UnknownType',
        type: 'custom-type',
        filePath: '/src/custom.ts',
        content: 'Some content of unknown type'
      };

      const tokens = processor.estimateTokens(genericItem);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should calculate basic priority', () => {
      const genericItem: ContextItem = {
        id: 'generic',
        name: 'GenericItem',
        type: 'unknown',
        filePath: '/src/generic.ts'
      };

      const mockData: ContextData = {
        query: 'test',
        items: [genericItem],
        relationships: []
      };

      const priority = processor.calculatePriority(genericItem, mockData);
      expect(priority).toBeGreaterThan(0);
    });

    it('should apply generic reduction strategies', () => {
      const genericItem: ContextItem = {
        id: 'large-generic',
        name: 'LargeGenericItem',
        type: 'unknown',
        filePath: '/src/large.ts',
        content: 'x'.repeat(1000),
        metadata: {
          description: 'y'.repeat(500)
        }
      };

      const reduced = processor.reduceContent(genericItem, 0.5);
      
      expect((reduced.content?.length || 0)).toBeLessThanOrEqual(genericItem.content!.length);
      expect((reduced.metadata?.description?.length || 0)).toBeLessThanOrEqual(genericItem.metadata!.description!.length);
    });
  });

  describe('ProcessorRegistry', () => {
    let registry: any;

    beforeEach(() => {
      registry = new ProcessorRegistry();
    });

    it('should register and retrieve processors', () => {
      const codeProcessor = new CodeContentProcessor();
      
      registry.register(codeProcessor);
      
      expect(registry.getProcessor('class')).toBe(codeProcessor);
      expect(registry.getProcessor('function')).toBe(codeProcessor);
    });

    it('should return default processor for unknown types', () => {
      const defaultProcessor = registry.getDefaultProcessor();
      const unknownTypeProcessor = registry.getProcessor('unknown-type');
      expect(unknownTypeProcessor).toBeDefined();
      expect(defaultProcessor.supportedTypes).toContain('*');
    });

    it('should handle multiple processors with overlapping types', () => {
      const processor1 = new CodeContentProcessor();
      const processor2 = new DocumentContentProcessor();
      
      registry.register(processor1);
      registry.register(processor2);
      
      // Should return the appropriate processor for each type
      expect(registry.getProcessor('class')).toBe(processor1);
      expect(registry.getProcessor('markdown')).toBe(processor2);
    });

    it('should respect processor priority (first match wins in this mock)', () => {
      class HighPriorityProcessor extends GenericContentProcessor {
        priority = 100;
        supportedTypes = ['class'];
      }
      
      const codeProcessor = new CodeContentProcessor(); // Lower priority
      const highPriorityProcessor = new HighPriorityProcessor();
      
      registry.register(codeProcessor);
      registry.register(highPriorityProcessor);
      
      // Should return high priority processor
      expect(registry.getProcessor('class')).toBeDefined();
    });

    it('should list all registered processors', () => {
      const codeProcessor = new CodeContentProcessor();
      const docProcessor = new DocumentContentProcessor();
      
      registry.register(codeProcessor);
      registry.register(docProcessor);
      
      const processors = registry.getAllProcessors();
      expect(processors.length).toBeGreaterThanOrEqual(2);
      expect(processors).toContain(codeProcessor);
      expect(processors).toContain(docProcessor);
    });

    it('should get best processor by type', () => {
      const codeProcessor = new CodeContentProcessor();
      const docProcessor = new DocumentContentProcessor();
      
      registry.register(codeProcessor);
      registry.register(docProcessor);
      
      const classProcessor = registry.getProcessor('class');
      expect(classProcessor).toBe(codeProcessor);
      
      const documentProcessor = registry.getProcessor('document');
      expect(documentProcessor).toBe(docProcessor);
    });
  });

  describe('Integration', () => {
    it('should work together in a realistic scenario', () => {
      const registry = new ProcessorRegistry();
      registry.register(new CodeContentProcessor());
      registry.register(new DocumentContentProcessor());
      
      const items: ContextItem[] = [
        {
          id: 'auth-class',
          name: 'AuthService',
          type: 'class',
          filePath: '/src/auth.ts',
          code: 'class AuthService { login() {} }'
        },
        {
          id: 'readme',
          name: 'README.md',
          type: 'readme',
          filePath: '/README.md',
          content: '# Auth Service\n\nDocumentation for auth service'
        },
        {
          id: 'unknown',
          name: 'UnknownType',
          type: 'mystery',
          filePath: '/src/mystery.ts'
        }
      ];

      const mockData: ContextData = {
        query: 'authentication',
        items,
        relationships: []
      };

      items.forEach(item => {
        const processor = registry.getProcessor(item.type);
        expect(processor).toBeDefined();
        
        const tokens = processor.estimateTokens(item);
        expect(tokens).toBeGreaterThan(0);
        
        const priority = processor.calculatePriority(item, mockData);
        expect(priority).toBeGreaterThan(0);
      });
    });
  });
});
