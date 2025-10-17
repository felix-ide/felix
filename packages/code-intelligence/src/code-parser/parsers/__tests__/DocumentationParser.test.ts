import { DocumentationParser } from '../DocumentationParser.js';
// Import component/relationship enums directly to avoid loading package index with ESM-only modules
import { ComponentType, RelationshipType } from '../../../code-analysis-types/entities/core-types.js';

describe('DocumentationParser', () => {
  let parser: DocumentationParser;

  beforeEach(() => {
    parser = new DocumentationParser();
  });

  describe('Basic functionality', () => {
    it('should be created with correct language and extensions', () => {
      expect(parser.language).toBe('documentation');
      expect(parser.getSupportedExtensions()).toEqual(['.md', '.markdown', '.mdx', '.html', '.htm', '.rst', '.txt']);
    });

    it('should detect if it can parse supported files', () => {
      expect(parser.canParseFile('test.md')).toBe(true);
      expect(parser.canParseFile('test.html')).toBe(true);
      expect(parser.canParseFile('test.rst')).toBe(true);
      expect(parser.canParseFile('test.txt')).toBe(true);
      expect(parser.canParseFile('test.js')).toBe(false);
    });
  });

  describe('Markdown parsing', () => {
    it('should parse basic markdown structure', async () => {
      const content = `# Main Heading

This is a paragraph.

## Sub Heading

Here's a code example:

\`\`\`javascript
function hello() {
  console.error("Hello, world!");
}
\`\`\`

- List item 1
- List item 2

[Link text](https://example.com)

![Image alt](image.jpg)
`;

      const components = parser.detectComponents(content, '/test/doc.md');
      
      // Should have file component
      expect(components.length).toBeGreaterThan(0);
      const fileComponent = components[0];
      expect(fileComponent).toBeDefined();
      expect(fileComponent!.type).toBe(ComponentType.FILE);
      expect(fileComponent!.metadata.format).toBe('markdown');
      
      // Should have sections
      const sections = components.filter(c => c.type === ComponentType.DOC_SECTION);
      expect(sections.length).toBeGreaterThan(0);
      
      // Should have code example
      const codeComponents = components.filter(c => 
        c.type === ComponentType.FUNCTION && c.metadata.isExample
      );
      expect(codeComponents.length).toBe(1);
      expect(codeComponents[0]?.language).toBe('javascript');
    });

    it('should generate table of contents', async () => {
      const content = `# Chapter 1

Some content.

## Section 1.1

More content.

### Subsection 1.1.1

Even more content.

# Chapter 2

Final content.
`;

      const components = parser.detectComponents(content, '/test/doc.md');
      const fileComponent = components[0];
      
      expect(fileComponent).toBeDefined();
      expect(fileComponent!.metadata.tableOfContents).toBeDefined();
      const toc = fileComponent!.metadata.tableOfContents;
      expect(toc).toHaveLength(2); // Two main chapters
      expect(toc[0].title).toBe('Chapter 1');
      expect(toc[0].children).toHaveLength(1); // One section
      expect(toc[0].children[0].title).toBe('Section 1.1');
      expect(toc[0].children[0].children).toHaveLength(1); // One subsection
    });

    it('should extract frontmatter', async () => {
      const content = `---
title: Test Document
author: Test Author
date: 2024-01-01
---

# Main Content

This is the document body.
`;

      const components = parser.detectComponents(content, '/test/doc.md');
      const fileComponent = components[0];
      
      expect(fileComponent).toBeDefined();
      expect(fileComponent!.metadata.frontmatter).toBeDefined();
      expect(fileComponent!.metadata.frontmatter.title).toBe('Test Document');
      expect(fileComponent!.metadata.frontmatter.author).toBe('Test Author');
      expect(fileComponent!.metadata.frontmatter.date).toBe('2024-01-01');
    });
  });

  describe('HTML parsing', () => {
    it('should parse basic HTML structure', async () => {
      const content = `<!DOCTYPE html>
<html>
<head>
  <title>Test Document</title>
</head>
<body>
  <h1>Main Heading</h1>
  <p>This is a paragraph.</p>
  
  <h2>Sub Heading</h2>
  <pre><code class="language-javascript">
function hello() {
  console.error("Hello!");
}
  </code></pre>
  
  <a href="https://example.com">Link</a>
</body>
</html>`;

      const components = parser.detectComponents(content, '/test/doc.html');
      
      // Should have file component
      expect(components.length).toBeGreaterThan(0);
      const fileComponent = components[0];
      expect(fileComponent).toBeDefined();
      expect(fileComponent!.type).toBe(ComponentType.FILE);
      expect(fileComponent!.metadata.format).toBe('html');
      
      // Should have sections for headings
      const sections = components.filter(c => c.type === ComponentType.DOC_SECTION);
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('RST parsing', () => {
    it('should parse basic RST structure', async () => {
      const content = `Main Heading
============

This is a paragraph.

Sub Heading
-----------

Here's a code example:

.. code-block:: python

   def hello():
       print("Hello, world!")

- List item 1
- List item 2
`;

      const components = parser.detectComponents(content, '/test/doc.rst');
      
      // Should have file component
      expect(components.length).toBeGreaterThan(0);
      const fileComponent = components[0];
      expect(fileComponent).toBeDefined();
      expect(fileComponent!.type).toBe(ComponentType.FILE);
      expect(fileComponent!.metadata.format).toBe('rst');
    });
  });

  describe('Relationship detection', () => {
    it('should detect containment relationships', async () => {
      const content = `# Main Section

This is the main content.

## Subsection

This is a subsection.

\`\`\`javascript
function example() {
  return "test";
}
\`\`\`
`;

      const components = parser.detectComponents(content, '/test/doc.md');
      const relationships = parser.detectRelationships(components, content);
      
      // Should have containment relationships
      const containmentRels = relationships.filter(r => r.type === RelationshipType.CONTAINS);
      expect(containmentRels.length).toBeGreaterThan(0);
    });

    it('should detect link relationships', async () => {
      const content = `# Section 1

See [Section 2](#section-2) for more details.

# Section 2

This is section 2.
`;

      const components = parser.detectComponents(content, '/test/doc.md');
      const relationships = parser.detectRelationships(components, content);
      
      // Should have reference relationships for internal links
      const refRels = relationships.filter(r => r.type === RelationshipType.REFERENCES);
      expect(refRels.length).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('should validate markdown syntax', () => {
      const validMarkdown = `# Title\n\nContent with \`code\`.`;
      const errors = parser.validateSyntax(validMarkdown);
      expect(errors).toHaveLength(0);
    });

    it('should detect unclosed code blocks', () => {
      const invalidMarkdown = `# Title\n\n\`\`\`javascript\nfunction test() {\n// Missing closing backticks`;
      const errors = parser.validateSyntax(invalidMarkdown);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]?.code).toBe('MD_UNCLOSED_CODE_BLOCK');
    });

    it('should detect unknown code languages', () => {
      const markdownWithUnknownLang = `# Title\n\n\`\`\`unknownlang\ncode here\n\`\`\``;
      const errors = parser.validateSyntax(markdownWithUnknownLang);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]?.code).toBe('UNKNOWN_CODE_LANGUAGE');
    });
  });

  describe('Search index generation', () => {
    it('should generate search index from content', async () => {
      const content = `# Introduction

This document explains the API functionality.

## Authentication

Users must authenticate using API keys.

\`\`\`javascript
const api = new ApiClient(apiKey);
\`\`\`
`;

      const components = parser.detectComponents(content, '/test/doc.md');
      const fileComponent = components[0];
      
      expect(fileComponent).toBeDefined();
      expect(fileComponent!.metadata.searchIndex).toBeDefined();
      const searchIndex = fileComponent!.metadata.searchIndex;
      expect(searchIndex.length).toBeGreaterThan(0);
      
      // Should contain keywords from headings and content
      const allKeywords = searchIndex.flatMap((item: any) => item.keywords);
      expect(allKeywords).toContain('api');
      expect(allKeywords).toContain('authentication');
    });
  });
});
