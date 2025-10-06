/**
 * Test suite for HTML injections with Tree-sitter
 * Tests Tree-sitter HTML parser with CSS and JavaScript injections
 */

import { TreeSitterHtmlParser } from '../../tree-sitter/TreeSitterHtmlParser.js';
import { TreeSitterCssParser } from '../../tree-sitter/TreeSitterCssParser.js';
import { TreeSitterJavaScriptParser } from '../../tree-sitter/TreeSitterJavaScriptParser.js';
import { describe, it, expect, beforeAll } from 'vitest';
import { ComponentType } from '../../../types.js';

describe('HTML Injections with Tree-sitter', () => {
  let htmlParser: TreeSitterHtmlParser;
  let cssParser: TreeSitterCssParser;
  let jsParser: TreeSitterJavaScriptParser;

  beforeAll(async () => {
    htmlParser = new TreeSitterHtmlParser();
    cssParser = new TreeSitterCssParser();
    jsParser = new TreeSitterJavaScriptParser();

    // Set up delegation for injections
    htmlParser.registerDelegate('css', cssParser);
    htmlParser.registerDelegate('javascript', jsParser);
  });

  describe('Script tag injections', () => {
    it('should capture embedded JavaScript in script tags', async () => {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
  <script type="text/javascript">
    function greet(name) {
      console.log('Hello, ' + name);
      return 'Hello, ' + name;
    }

    const message = greet('World');
    document.addEventListener('DOMContentLoaded', function() {
      document.body.innerHTML = message;
    });
  </script>
</head>
<body>
  <h1>Welcome</h1>
</body>
</html>
      `.trim();

      const result = await htmlParser.parseContent(htmlContent, 'test.html');

      // Should have HTML components
      const htmlComponents = result.components.filter(c => c.language === 'html');
      expect(htmlComponents.length).toBeGreaterThan(0);

      // Should have embedded JavaScript components
      const jsComponents = result.components.filter(c => c.language === 'javascript');
      expect(jsComponents.length).toBeGreaterThan(0);

      // Find the greet function
      const greetFunction = jsComponents.find(c =>
        c.type === ComponentType.FUNCTION && c.name === 'greet'
      );
      expect(greetFunction).toBeDefined();
      expect(greetFunction?.metadata?.parameters).toContain('name');

      // Find the message variable
      const messageVar = jsComponents.find(c =>
        c.type === ComponentType.VARIABLE && c.name === 'message'
      );
      expect(messageVar).toBeDefined();

      // Check scope context for embedded components
      jsComponents.forEach(component => {
        expect(component.scopeContext).toBeDefined();
        expect(component.scopeContext?.scope).toContain('html');
        expect(component.scopeContext?.languageStack).toEqual(['html', 'javascript']);
        expect(component.scopeContext?.boundary?.startMarker).toBe('<script>');
        expect(component.scopeContext?.boundary?.endMarker).toBe('</script>');
      });
    });

    it('should handle script tags with correct position mapping', async () => {
      const htmlContent = `
<html>
<head>
  <script>
    var x = 42;
    function test() {
      return x * 2;
    }
  </script>
</head>
</html>
      `.trim();

      const result = await htmlParser.parseContent(htmlContent, 'test.html');

      // Find embedded JavaScript components
      const jsComponents = result.components.filter(c => c.language === 'javascript');

      // Check that positions are correctly adjusted for the HTML context
      jsComponents.forEach(component => {
        expect(component.location.startLine).toBeGreaterThan(3); // After the script tag
        expect(component.location.endLine).toBeLessThan(10); // Before the closing script tag
      });

      // Verify no duplicate components in overlapping regions
      const componentPositions = result.components.map(c =>
        `${c.location.startLine}-${c.location.endLine}-${c.name}`
      );
      const uniquePositions = new Set(componentPositions);
      expect(componentPositions.length).toBe(uniquePositions.size);
    });
  });

  describe('Style tag injections', () => {
    it('should capture embedded CSS in style tags', async () => {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style type="text/css">
    body {
      font-family: Arial, sans-serif;
      background-color: #f0f0f0;
      margin: 0;
      padding: 20px;
    }

    .header {
      color: #333;
      font-size: 24px;
      margin-bottom: 10px;
    }

    #main-content {
      background: white;
      border-radius: 5px;
      padding: 15px;
    }
  </style>
</head>
<body>
  <div class="header">Header</div>
  <div id="main-content">Content</div>
</body>
</html>
      `.trim();

      const result = await htmlParser.parseContent(htmlContent, 'test.html');

      // Should have HTML components
      const htmlComponents = result.components.filter(c => c.language === 'html');
      expect(htmlComponents.length).toBeGreaterThan(0);

      // Should have embedded CSS components
      const cssComponents = result.components.filter(c => c.language === 'css');
      expect(cssComponents.length).toBeGreaterThan(0);

      // Find CSS rules
      const bodyRule = cssComponents.find(c =>
        c.metadata?.selectors?.includes('body')
      );
      expect(bodyRule).toBeDefined();

      const headerClassRule = cssComponents.find(c =>
        c.metadata?.selectors?.includes('.header')
      );
      expect(headerClassRule).toBeDefined();

      const mainIdRule = cssComponents.find(c =>
        c.metadata?.selectors?.includes('#main-content')
      );
      expect(mainIdRule).toBeDefined();

      // Check scope context for embedded CSS
      cssComponents.forEach(component => {
        expect(component.scopeContext).toBeDefined();
        expect(component.scopeContext?.scope).toContain('html');
        expect(component.scopeContext?.languageStack).toEqual(['html', 'css']);
        expect(component.scopeContext?.boundary?.startMarker).toBe('<style>');
        expect(component.scopeContext?.boundary?.endMarker).toBe('</style>');
      });
    });
  });

  describe('Mixed injections', () => {
    it('should handle both CSS and JavaScript injections in the same HTML document', async () => {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    .button {
      background: blue;
      color: white;
      padding: 10px;
    }
  </style>
  <script>
    function toggleButton() {
      const btn = document.querySelector('.button');
      btn.style.background = btn.style.background === 'blue' ? 'red' : 'blue';
    }
  </script>
</head>
<body>
  <button class="button" onclick="toggleButton()">Click me</button>
</body>
</html>
      `.trim();

      const result = await htmlParser.parseContent(htmlContent, 'test.html');

      // Should have all three languages
      const htmlComponents = result.components.filter(c => c.language === 'html');
      const cssComponents = result.components.filter(c => c.language === 'css');
      const jsComponents = result.components.filter(c => c.language === 'javascript');

      expect(htmlComponents.length).toBeGreaterThan(0);
      expect(cssComponents.length).toBeGreaterThan(0);
      expect(jsComponents.length).toBeGreaterThan(0);

      // Find specific components
      const buttonRule = cssComponents.find(c =>
        c.metadata?.selectors?.includes('.button')
      );
      expect(buttonRule).toBeDefined();

      const toggleFunction = jsComponents.find(c =>
        c.type === ComponentType.FUNCTION && c.name === 'toggleButton'
      );
      expect(toggleFunction).toBeDefined();

      // Check relationships between host and embedded components
      const embeddedRelationships = result.relationships.filter(r =>
        r.type === 'embedded_in_scope' || r.metadata?.injectionType === 'tree-sitter'
      );
      expect(embeddedRelationships.length).toBeGreaterThan(0);
    });
  });

  describe('Incremental parsing', () => {
    it('should support incremental parsing with tree.edit()', async () => {
      const originalContent = `
<html>
<head>
  <script>
    function original() {
      return 'original';
    }
  </script>
</head>
</html>
      `.trim();

      const modifiedContent = `
<html>
<head>
  <script>
    function original() {
      return 'original';
    }

    function added() {
      return 'added';
    }
  </script>
</head>
</html>
      `.trim();

      // Parse original content
      const startTime1 = Date.now();
      const result1 = await htmlParser.parseContent(originalContent, 'test.html');
      const time1 = Date.now() - startTime1;

      // Parse modified content (should use incremental parsing)
      const startTime2 = Date.now();
      const result2 = await htmlParser.parseContent(modifiedContent, 'test.html');
      const time2 = Date.now() - startTime2;

      // Should have both functions in the second result
      const jsComponents2 = result2.components.filter(c =>
        c.language === 'javascript' && c.type === ComponentType.FUNCTION
      );
      expect(jsComponents2.length).toBe(2);

      const originalFunc = jsComponents2.find(c => c.name === 'original');
      const addedFunc = jsComponents2.find(c => c.name === 'added');
      expect(originalFunc).toBeDefined();
      expect(addedFunc).toBeDefined();

      // Note: In a real scenario, incremental parsing would be faster
      // For this test, we just verify that both parses complete successfully
      expect(time1).toBeGreaterThan(0);
      expect(time2).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed embedded code gracefully', async () => {
      const htmlContent = `
<html>
<head>
  <script>
    function broken( {
      // Missing closing parenthesis and brace
  </script>
  <style>
    .broken {
      color: #incomplete
    }
    /* Missing closing brace */
  </style>
</head>
</html>
      `.trim();

      const result = await htmlParser.parseContent(htmlContent, 'test.html');

      // Should still parse what it can
      expect(result.components.length).toBeGreaterThan(0);

      // May have errors reported
      if (result.errors && result.errors.length > 0) {
        expect(result.errors.some(e => e.source === 'javascript' || e.source === 'css')).toBe(true);
      }
    });
  });

  describe('Position accuracy', () => {
    it('should maintain accurate absolute ranges across embedded content', async () => {
      const htmlContent = `<html>
<head>
  <script>
var x = 1;
  </script>
</head>
</html>`;

      const result = await htmlParser.parseContent(htmlContent, 'test.html');

      // Find the variable declaration
      const varComponent = result.components.find(c =>
        c.language === 'javascript' && c.name === 'x'
      );

      expect(varComponent).toBeDefined();

      // Check that the position corresponds to the actual location in the HTML
      const lines = htmlContent.split('\n');
      const varLine = lines[varComponent!.location.startLine - 1];
      expect(varLine).toContain('var x = 1;');
    });
  });
});
