import { ExtendedMarkdownParser } from '../../core/parser';

describe('ExtendedMarkdownParser', () => {
  let parser: ExtendedMarkdownParser;

  beforeEach(() => {
    parser = new ExtendedMarkdownParser();
  });

  describe('parse', () => {
    it('should parse standard markdown', () => {
      const content = '# Hello\n\nThis is a paragraph.';
      const ast = parser.parse(content);
      
      expect(ast.type).toBe('root');
      expect(ast.children).toHaveLength(2);
      expect(ast.children[0].type).toBe('heading');
      expect(ast.children[1].type).toBe('paragraph');
    });

    it('should identify mermaid code blocks', () => {
      const content = '```mermaid\ngraph TD\n  A --> B\n```';
      const ast = parser.parse(content);
      
      const codeBlock = ast.children[0] as any;
      expect(codeBlock.type).toBe('code');
      expect(codeBlock.lang).toBe('mermaid');
      expect(codeBlock.data?.hProperties?.className).toContain('language-mermaid');
      expect(codeBlock.data?.hProperties?.className).toContain('extended-markdown-mermaid');
    });

    it('should identify excalidraw code blocks with valid JSON', () => {
      const content = '```excalidraw\n{"type": "excalidraw", "elements": []}\n```';
      const ast = parser.parse(content);
      
      const codeBlock = ast.children[0] as any;
      expect(codeBlock.type).toBe('code');
      expect(codeBlock.lang).toBe('excalidraw');
      expect(codeBlock.data?.hProperties?.className).toContain('language-excalidraw');
      expect(codeBlock.data?.hProperties?.className).toContain('extended-markdown-excalidraw');
    });

    it('should mark excalidraw blocks with invalid JSON as errors', () => {
      const content = '```excalidraw\n{invalid json}\n```';
      const ast = parser.parse(content);
      
      const codeBlock = ast.children[0] as any;
      expect(codeBlock.type).toBe('code');
      expect(codeBlock.lang).toBe('excalidraw');
      expect(codeBlock.data?.hProperties?.className).toContain('extended-markdown-excalidraw-error');
      expect(codeBlock.data?.hProperties?.['data-error']).toBe('Invalid JSON content');
    });

    it('should handle mixed content', () => {
      const content = `
# Title

Some text

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

More text

\`\`\`excalidraw
{"elements": []}
\`\`\`
`;
      const ast = parser.parse(content);
      
      const blocks = parser.extractExtendedBlocks(ast);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].type).toBe('mermaid');
      expect(blocks[1].type).toBe('excalidraw');
    });
  });

  describe('extractExtendedBlocks', () => {
    it('should extract all mermaid and excalidraw blocks', () => {
      const content = `
\`\`\`mermaid
graph TD
\`\`\`

\`\`\`javascript
console.log('test');
\`\`\`

\`\`\`excalidraw
{"elements": []}
\`\`\`
`;
      const ast = parser.parse(content);
      const blocks = parser.extractExtendedBlocks(ast);
      
      expect(blocks).toHaveLength(2);
      expect(blocks[0].type).toBe('mermaid');
      expect(blocks[0].content).toBe('graph TD');
      expect(blocks[1].type).toBe('excalidraw');
      expect(blocks[1].content).toBe('{"elements": []}');
    });

    it('should return empty array when no extended blocks exist', () => {
      const content = '# Just regular markdown\n\nNo special blocks here.';
      const ast = parser.parse(content);
      const blocks = parser.extractExtendedBlocks(ast);
      
      expect(blocks).toHaveLength(0);
    });
  });

  describe('registerExtension', () => {
    it('should allow registering custom extensions', () => {
      const customExtension = {
        name: 'custom',
        test: (node: any) => node.type === 'code' && node.lang === 'custom',
        transform: (node: any) => ({
          ...node,
          data: {
            ...node.data,
            custom: true,
          },
        }),
      };

      parser.registerExtension(customExtension);

      const content = '```custom\nCustom content\n```';
      const ast = parser.parse(content);
      
      const codeBlock = ast.children[0] as any;
      expect(codeBlock.data?.custom).toBe(true);
    });
  });

  describe('stringify', () => {
    it('should convert AST back to markdown', () => {
      const content = '# Hello\n\nThis is a paragraph.';
      const ast = parser.parse(content);
      const result = parser.stringify(ast);
      
      // The output might have slight formatting differences
      expect(result).toContain('# Hello');
      expect(result).toContain('This is a paragraph.');
    });
  });
});