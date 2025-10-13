# Individual Parser Documentation

This directory contains detailed documentation for each language parser in the Parser Stack. Each parser implements the `ILanguageParser` interface and provides language-specific parsing capabilities.

## Available Parsers

### Core Language Parsers

1. **[JavaScript/TypeScript Parser](./javascript-parser.md)** - Comprehensive AST-based parsing for modern JavaScript and TypeScript
2. **[Python Parser](./python-parser.md)** - Full Python AST analysis with import resolution
3. **[PHP Parser](./php-parser.md)** - Mixed PHP/HTML parsing with namespace support
4. **[Java Parser](./java-parser.md)** - Java class and method extraction with inheritance tracking
5. **[HTML Parser](./html-parser.md)** - HTML structure parsing with embedded language support
6. **[CSS Parser](./css-parser.md)** - CSS rule and selector extraction

### Specialized Parsers

7. **[Markdown Parser](./markdown-parser.md)** - Markdown structure with embedded code block analysis
8. **[JSON Parser](./json-parser.md)** - JSON structure validation and key extraction
9. **[Documentation Parser](./documentation-parser.md)** - Generic documentation format support (RST, plain text)

### Tree-sitter Parsers

10. **[Tree-sitter HTML Parser](./tree-sitter-html.md)** - High-performance HTML parsing with injections
11. **[Tree-sitter CSS Parser](./tree-sitter-css.md)** - Incremental CSS parsing
12. **[Tree-sitter JavaScript Parser](./tree-sitter-javascript.md)** - Fast JavaScript/TypeScript parsing

## Parser Capabilities Comparison

| Parser | Language | AST Support | Incremental | Mixed-Language | Relationships |
|--------|----------|-------------|-------------|----------------|---------------|
| JavaScript | JS/TS | ✅ | ✅ | ✅ | ✅ |
| Python | Python | ✅ | ✅ | ❌ | ✅ |
| PHP | PHP | ✅ | ❌ | ✅ | ✅ |
| Java | Java | ✅ | ❌ | ❌ | ✅ |
| HTML | HTML | ✅ | ✅ | ✅ | ✅ |
| CSS | CSS | ✅ | ✅ | ✅ | ✅ |
| Markdown | Markdown | ✅ | ❌ | ✅ | ✅ |
| JSON | JSON | ✅ | ❌ | ❌ | ❌ |
| Documentation | Various | ✅ | ❌ | ❌ | ❌ |
| Tree-sitter HTML | HTML | ✅ | ✅ | ✅ | ✅ |
| Tree-sitter CSS | CSS | ✅ | ✅ | ✅ | ✅ |
| Tree-sitter JS | JS/TS | ✅ | ✅ | ✅ | ✅ |

## Key Features

### AST Support
- Full Abstract Syntax Tree parsing
- Semantic analysis capabilities
- Type information extraction

### Incremental Parsing
- Efficient updates for changed content
- Cached AST reuse
- Performance optimization for large files

### Mixed-Language Support
- Embedded language detection
- Delegation to appropriate parsers
- Cross-language relationship tracking

### Relationship Extraction
- Import/export analysis
- Function call tracking
- Inheritance relationships
- Usage patterns

## Usage Examples

### Basic Parser Usage

```typescript
import { ParserFactory } from '@felix/code-intelligence/code-parser';

const factory = new ParserFactory();

// Parse JavaScript file
const jsResult = await factory.parseDocument('/src/app.js');

// Parse Python file
const pyResult = await factory.parseDocument('/src/main.py');

// Parse mixed HTML file
const htmlResult = await factory.parseDocument('/templates/page.html');
```

### Language-Specific Options

```typescript
// JavaScript with JSX support
const jsxResult = await factory.parseDocument('/src/Component.jsx', undefined, {
  parserOptions: {
    includeJsx: true,
    includeTypeScript: true
  }
});

// Python with import resolution
const pyResult = await factory.parseDocument('/src/module.py', undefined, {
  parserOptions: {
    resolveImports: true,
    includeDocstrings: true
  }
});

// PHP with HTML support
const phpResult = await factory.parseDocument('/src/template.php', undefined, {
  parserOptions: {
    mixedMode: true,
    includeHtml: true
  }
});
```

### Enabling Specific Parsers

```typescript
// Use Tree-sitter for performance
const treeSitterResult = await factory.parseDocument('/large/file.js', undefined, {
  preferTreeSitter: true
});
```

## Common Patterns

### Error Handling

```typescript
const result = await factory.parseDocument(filePath);

// Check for parser-specific errors
if (result.errors.length > 0) {
  result.errors.forEach(error => {
    console.error(`${error.source}: ${error.message} at ${error.location?.startLine}`);
  });
}

// Check for parser warnings
if (result.metadata?.warnings) {
  result.metadata.warnings.forEach(warning => {
    console.warn(`Parser warning: ${warning}`);
  });
}
```

### Component Filtering

```typescript
import { ComponentType } from '@felix/code-intelligence/code-parser';

const result = await factory.parseDocument(filePath);

// Filter by component type
const functions = result.components.filter(c => c.type === ComponentType.FUNCTION);
const classes = result.components.filter(c => c.type === ComponentType.CLASS);

// Filter by language (for mixed-language files)
const jsComponents = result.components.filter(c => c.language === 'javascript');
const htmlComponents = result.components.filter(c => c.language === 'html');

// Filter by metadata
const publicMethods = result.components.filter(c =>
  c.type === ComponentType.METHOD &&
  c.metadata?.visibility === 'public'
);
```

### Relationship Analysis

```typescript
import { RelationshipType } from '@felix/code-intelligence/code-parser';

const result = await factory.parseDocument(filePath);

// Find function calls
const calls = result.relationships.filter(r => r.type === RelationshipType.CALLS);

// Find import relationships
const imports = result.relationships.filter(r => r.type === RelationshipType.IMPORTS);

// Find inheritance relationships
const inheritance = result.relationships.filter(r =>
  r.type === RelationshipType.EXTENDS || r.type === RelationshipType.IMPLEMENTS
);

// Cross-language relationships (for mixed files)
const crossLang = result.relationships.filter(r => {
  const source = result.components.find(c => c.id === r.sourceId);
  const target = result.components.find(c => c.id === r.targetId);
  return source?.language !== target?.language;
});
```

## Performance Considerations

### Parser Selection Strategy

The Parser Stack automatically selects the best parser based on:

1. **File extension** - Primary detection method
2. **Content validation** - Secondary validation
3. **Performance requirements** - Tree-sitter for large files

### Optimization Tips

1. **Use segmentation-only for fast scanning**:
   ```typescript
   const quickResult = await factory.parseDocument(filePath, undefined, {
     segmentationOnly: true
   });
   ```

2. **Enable caching for repeated parsing**:
   ```typescript
   // Caching is enabled by default
   // Results are cached based on file content hash
   ```

3. **Batch processing for multiple files**:
   ```typescript
   const results = await Promise.all(
     files.map(file => factory.parseDocument(file))
   );
   ```

4. **Use confidence thresholds to filter results**:
   ```typescript
   const result = await factory.parseDocument(filePath, undefined, {
     confidenceThreshold: 0.8
   });
   ```

## Adding Custom Parsers

To add a new language parser:

1. **Extend BaseLanguageParser**:
   ```typescript
   import { BaseLanguageParser } from '@felix/code-intelligence/code-parser';

   class MyLanguageParser extends BaseLanguageParser {
     constructor() {
       super('mylang', ['.ml', '.mylang']);
     }

     async detectComponents(content: string, filePath: string): Promise<IComponent[]> {
       // Implementation
     }

     async detectRelationships(components: IComponent[], content: string): Promise<IRelationship[]> {
       // Implementation
     }
   }
   ```

2. **Register with factory**:
   ```typescript
   const factory = new ParserFactory();
   factory.registerParser(new MyLanguageParser());
   ```

3. **Add documentation** following the pattern in this directory.

For detailed implementation guides, see the individual parser documentation files in this directory.