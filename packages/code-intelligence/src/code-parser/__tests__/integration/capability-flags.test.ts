/**
 * Integration tests for capability flags and backend preferences
 * Tests metadata presence and values across different parsing backends
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { ParserFactory } from '../../ParserFactory.js';
import { JavaScriptParser } from '../../parsers/JavaScriptParser.js';
import { PythonParser } from '../../parsers/PythonParser.js';
import { PhpParser } from '../../parsers/PhpParser.js';
import { MarkdownParser } from '../../parsers/MarkdownParser.js';
import { ComponentType } from '../../types.js';

describe('Capability Flags and Backend Preferences', () => {
  let parserFactory: ParserFactory;

  beforeAll(() => {
    parserFactory = new ParserFactory();
  });

  describe('Semantic Parser Capabilities (AST backends)', () => {
    test('JavaScript/TypeScript parser should set semantic capabilities', async () => {
      const jsParser = new JavaScriptParser();

      // Test parseContent for semantic capabilities
      const result = await jsParser.parseContent(`
        class MyClass {
          constructor(name) {
            this.name = name;
          }

          getName() {
            return this.name;
          }
        }

        function createInstance(name) {
          return new MyClass(name);
        }
      `, 'test.js');

      // Check ParseResult metadata
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.parsingLevel).toBe('semantic');
      expect(result.metadata?.backend).toBe('ast');
      expect(result.metadata?.capabilities).toEqual({
        symbols: true,
        relationships: true,
        ranges: true,
        types: true,
        controlFlow: true,
        incremental: false
      });

      // Check component metadata
      const classComponent = result.components.find(c => c.type === ComponentType.CLASS);
      expect(classComponent).toBeDefined();
      expect(classComponent?.metadata.parsingLevel).toBe('semantic');
      expect(classComponent?.metadata.backend).toBe('ast');
      expect(classComponent?.metadata.capabilities).toEqual({
        symbols: true,
        relationships: true,
        ranges: true,
        types: true,
        controlFlow: true,
        incremental: false
      });

      // Check relationship metadata (confidence and provenance)
      expect(result.relationships.length).toBeGreaterThan(0);
      const relationship = result.relationships[0];
      expect(relationship.metadata.confidence).toBeGreaterThan(0.8);
      expect(relationship.metadata.provenance).toBeDefined();
      expect(relationship.metadata.provenance?.source).toBe('semantic');
      expect(relationship.metadata.provenance?.parser).toBe('javascript');
      expect(relationship.metadata.provenance?.backend).toBe('ast');
      expect(relationship.metadata.provenance?.timestamp).toBeDefined();
    });

    test('Python parser should set semantic capabilities', async () => {
      const pythonParser = new PythonParser();

      const result = await pythonParser.parseContent(`
class MyClass:
    def __init__(self, name):
        self.name = name

    def get_name(self):
        return self.name

def create_instance(name):
    return MyClass(name)
      `, 'test.py');

      // Check ParseResult metadata
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.parsingLevel).toBe('semantic');
      expect(result.metadata?.backend).toBe('ast');
      expect(result.metadata?.capabilities).toEqual({
        symbols: true,
        relationships: true,
        ranges: true,
        types: true,
        controlFlow: true,
        incremental: false
      });

      // Check component metadata
      const classComponent = result.components.find(c => c.type === ComponentType.CLASS);
      expect(classComponent).toBeDefined();
      expect(classComponent?.metadata.parsingLevel).toBe('semantic');
      expect(classComponent?.metadata.backend).toBe('ast');
      expect(classComponent?.metadata.capabilities?.types).toBe(true);
    });

    test('PHP parser should set semantic capabilities', async () => {
      const phpParser = new PhpParser();

      const result = await phpParser.parseContent(`<?php
class MyClass {
    private $name;

    public function __construct(string $name) {
        $this->name = $name;
    }

    public function getName(): string {
        return $this->name;
    }
}

function createInstance(string $name): MyClass {
    return new MyClass($name);
}
?>`, 'test.php');

      // Check ParseResult metadata
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.parsingLevel).toBe('semantic');
      expect(result.metadata?.backend).toBe('ast');
      expect(result.metadata?.capabilities).toEqual({
        symbols: true,
        relationships: true,
        ranges: true,
        types: true,
        controlFlow: true,
        incremental: false
      });

      // Check component metadata
      const classComponent = result.components.find(c => c.type === ComponentType.CLASS);
      expect(classComponent).toBeDefined();
      expect(classComponent?.metadata.parsingLevel).toBe('semantic');
      expect(classComponent?.metadata.backend).toBe('ast');
      expect(classComponent?.metadata.capabilities?.types).toBe(true);
    });
  });

  describe('Structural Parser Capabilities', () => {
    test('Markdown parser should set structural capabilities', async () => {
      const markdownParser = new MarkdownParser();

      const result = await markdownParser.parseContent(`# Main Heading

## Section 1

This is some content with **bold** text.

### Subsection

- List item 1
- List item 2

\`\`\`javascript
function example() {
  return "code block";
}
\`\`\`

## Section 2

More content here.
      `, 'test.md');

      // Check ParseResult metadata
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.parsingLevel).toBe('basic');
      expect(result.metadata?.backend).toBe('detectors-only');
      expect(result.metadata?.capabilities).toEqual({
        symbols: true,
        relationships: true,
        ranges: true,
        types: false,
        controlFlow: false,
        incremental: false
      });

      // Check component metadata
      if (result.components.length > 0) {
        const component = result.components[0];
        expect(component.metadata.parsingLevel).toBe('basic');
        expect(component.metadata.backend).toBe('detectors-only');
        expect(component.metadata.capabilities?.types).toBe(false);
        expect(component.metadata.capabilities?.controlFlow).toBe(false);
      }
    });
  });

  describe('ParserFactory parseDocument Integration', () => {
    test('Should set file-level segmentation metadata', async () => {
      const result = await parserFactory.parseDocument('test.js', `
class Example {
  method() {
    return "test";
  }
}
      `);

      // Check file-level metadata
      expect(result.metadata).toBeDefined();
      expect(result.metadata.parsingLevel).toBeDefined();
      expect(result.metadata.backend).toBeDefined();
      expect(result.metadata.segmentation).toBeDefined();
      expect(result.metadata.segmentation?.backend).toBeDefined();
      expect(result.metadata.segmentation?.confidence).toBeGreaterThan(0);

      // Check that components have per-block metadata
      expect(result.components.length).toBeGreaterThan(0);
      const component = result.components[0];
      expect(component.metadata.parsingLevel).toBeDefined();
      expect(component.metadata.backend).toBeDefined();
      expect(component.metadata.capabilities).toBeDefined();
    });

    test('Should handle segmentation-only mode', async () => {
      const result = await parserFactory.parseDocument('test.py', `
class TestClass:
    def test_method(self):
        pass
      `, { segmentationOnly: true });

      // Check that metadata is set even in segmentation-only mode
      expect(result.metadata).toBeDefined();
      expect(result.metadata.parsingLevel).toBe('basic');
      expect(result.metadata.backend).toBeDefined();

      // Should have components from segmentation
      expect(result.components.length).toBeGreaterThan(0);
      const component = result.components[0];
      expect(component.metadata.backend).toBeDefined();
    });

    test('Should handle detectors-only backend', async () => {
      const result = await parserFactory.parseDocument('unknown.xyz', `
some unknown file content
with no recognizable structure
      `, { enableSegmentation: false });

      // Should fall back to detectors-only
      expect(result.metadata.backend).toBe('detectors-only');
      expect(result.metadata.segmentation?.backend).toBe('detectors-only');
    });
  });

  describe('Precedence and Confidence Handling', () => {
    test('Should prioritize semantic over structural parsing', async () => {
      // This would be tested with a mixed file, but for now test individual parsers
      const jsResult = await parserFactory.parseDocument('mixed.js', `
// JavaScript content
class JSClass {
  method() {}
}
      `);

      const mdResult = await parserFactory.parseDocument('basic.md', `
# Markdown content
Basic markdown file
      `);

      // JavaScript should have higher parsing level
      expect(jsResult.metadata.parsingLevel).toBe('semantic');
      expect(mdResult.metadata.parsingLevel).toBe('basic');

      // Confidence should reflect parsing level
      if (jsResult.relationships.length > 0) {
        expect(jsResult.relationships[0].metadata?.confidence).toBeGreaterThan(0.8);
      }
    });
  });

  describe('Backward Compatibility', () => {
    test('Should work with parsers that do not override capability methods', async () => {
      // Use the legacy parseFile method which doesn't go through new metadata system
      const result = await parserFactory.parseFile('test.js', `
function test() {
  return "legacy";
}
      `);

      // Should still work without throwing errors
      expect(result.components).toBeDefined();
      expect(result.relationships).toBeDefined();

      // May not have new metadata fields, but should not break
      expect(Array.isArray(result.components)).toBe(true);
      expect(Array.isArray(result.relationships)).toBe(true);
    });

    test('All metadata fields should be optional', async () => {
      // Test that components can exist without the new metadata fields
      const result = await parserFactory.parseDocument('test.js', `
const x = 1;
      `);

      // Should handle cases where metadata fields might be undefined
      expect(() => {
        result.components.forEach(component => {
          // These should not throw even if undefined
          const level = component.metadata.parsingLevel;
          const backend = component.metadata.backend;
          const capabilities = component.metadata.capabilities;
        });
      }).not.toThrow();
    });
  });
});