import * as MainExports from '../index';
import * as ReactExports from '../react/ExtendedMarkdownRenderer';

describe('Package Exports', () => {
  describe('Main exports', () => {
    it('should export ExtendedMarkdownParser', () => {
      expect(MainExports.ExtendedMarkdownParser).toBeDefined();
      expect(typeof MainExports.ExtendedMarkdownParser).toBe('function');
    });

    it('should export ExtendedMarkdownRenderer', () => {
      expect(MainExports.ExtendedMarkdownRenderer).toBeDefined();
      expect(typeof MainExports.ExtendedMarkdownRenderer).toBe('function');
    });

    it('should export individual renderers', () => {
      expect(MainExports.MermaidRenderer).toBeDefined();
      expect(MainExports.ExcalidrawRenderer).toBeDefined();
    });
  });

  describe('Type exports', () => {
    it('should export necessary types', () => {
      // TypeScript will catch these at compile time
      const parserOptions: MainExports.ParserOptions = {};
      const markdownExtension: MainExports.MarkdownExtension = {
        name: 'test',
        test: () => false,
        transform: (node) => node,
      };
      
      expect(parserOptions).toBeDefined();
      expect(markdownExtension).toBeDefined();
    });
  });

  describe('React exports', () => {
    it('should have correct props interface', () => {
      const props: ReactExports.ExtendedMarkdownRendererProps = {
        content: '# Test',
      };
      
      expect(props).toBeDefined();
    });
  });
});