# Parser Usage Guide

This guide provides comprehensive information on using the Parser Stack, including common patterns, best practices, configuration options, and performance tuning.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Basic Usage](#basic-usage)
3. [Advanced Configuration](#advanced-configuration)
4. [Language-Specific Guides](#language-specific-guides)
5. [Mixed-Language Files](#mixed-language-files)
6. [Performance Tuning](#performance-tuning)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Quick Start

### Installation

```bash
npm install @felix/code-intelligence
```

### Basic Example

```typescript
import { ParserFactory } from '@felix/code-intelligence/code-parser';

// Create parser factory
const factory = new ParserFactory();

// Parse a file
const result = await factory.parseDocument('/path/to/file.js');

console.log('Components found:', result.components.length);
console.log('Relationships found:', result.relationships.length);
```

## Basic Usage

### Creating a Parser Factory

The `ParserFactory` is your main entry point:

```typescript
import { ParserFactory } from '@felix/code-intelligence/code-parser';

const factory = new ParserFactory();
```

The factory automatically registers all available parsers and sets up language detection.

### Parsing Files

#### Simple File Parsing

```typescript
// Parse with default options
const result = await factory.parseDocument('/path/to/file.js');

// Access results
console.log('File:', result.metadata.filePath);
console.log('Parsing level:', result.metadata.parsingLevel);
console.log('Backend used:', result.metadata.backend);
console.log('Components:', result.components.length);
```

#### Parsing with Content

```typescript
const content = `
function hello(name) {
  return \`Hello, \${name}!\`;
}

class Greeter {
  greet(name) {
    return hello(name);
  }
}
`;

const result = await factory.parseDocument('/virtual/file.js', content);
```

### Understanding Results

#### DocumentParsingResult Structure

```typescript
interface DocumentParsingResult {
  components: IComponent[];           // Extracted code components
  relationships: AggregatedRelationship[]; // Component relationships
  segmentation: SegmentationResult;   // File segmentation info
  linking: LinkingResult;            // Cross-file relationships
  metadata: {
    filePath: string;
    totalBlocks: number;
    parsingLevel: 'semantic' | 'structural' | 'basic';
    backend: 'ast' | 'tree-sitter' | 'detectors-only' | 'hybrid';
    processingTimeMs: number;
    warnings: string[];
  };
}
```

#### Component Types

```typescript
interface IComponent {
  id: string;                    // Unique component identifier
  name: string;                  // Component name
  type: ComponentType;           // FUNCTION, CLASS, VARIABLE, etc.
  language: string;              // Programming language
  filePath: string;              // Source file path
  location: Location;            // Line/column information
  metadata?: Record<string, any>; // Additional metadata
}
```

#### Relationship Types

```typescript
interface IRelationship {
  sourceId: string;              // Source component ID
  targetId: string;              // Target component ID
  type: RelationshipType;        // CALLS, IMPORTS, EXTENDS, etc.
  metadata?: Record<string, any>; // Additional metadata
}
```

## Advanced Configuration

### Parse Options

```typescript
interface ParseDocumentOptions {
  enableSegmentation?: boolean;     // Enable file segmentation (default: true)
  enableInitialLinking?: boolean;   // Enable cross-file linking (default: true)
  enableAggregation?: boolean;      // Enable relationship aggregation (default: true)
  confidenceThreshold?: number;     // Filter low-confidence results (default: 0.5)
  workspaceRoot?: string;          // Workspace root for path resolution
  forceParser?: string;            // Force specific parser language
  segmentationOnly?: boolean;      // Return only segmentation results
}

// Example usage
const result = await factory.parseDocument('/path/to/file.js', content, {
  enableSegmentation: true,
  confidenceThreshold: 0.7,
  workspaceRoot: '/path/to/project'
});
```

### Custom Parser Registration

Add support for new languages or override existing parsers:

```typescript
import { CustomLanguageParser } from './CustomLanguageParser';

// Register a custom parser
const customParser = new CustomLanguageParser();
factory.registerParser(customParser);

// Add custom extension mapping
factory.addExtensionMapping('.custom', 'mylanguage');

// Add custom shebang mapping
factory.addShebangMapping('mycli', 'mylanguage');

// Add custom filename mapping
factory.addFilenameMapping('myconfig', 'mylanguage');
```

## Language-Specific Guides

### JavaScript/TypeScript

The JavaScript parser provides comprehensive AST analysis:

```typescript
// Supports all JS/TS extensions
const jsExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];

// Detects modern JavaScript patterns
const modernJs = `
import React from 'react';

const MyComponent = ({ name }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('Component mounted');
  }, []);

  return <div>Hello {name}!</div>;
};

export default MyComponent;
`;

const result = await factory.parseDocument('/src/MyComponent.jsx', modernJs);
// Detects: imports, React components, hooks, JSX, exports
```

**Features:**
- ES6+ syntax support
- React component detection
- Hook usage analysis
- Import/export relationships
- TypeScript type information
- Framework-specific patterns

### Python

Python parser uses AST analysis for comprehensive symbol extraction:

```python
# Example Python code
class DataProcessor:
    def __init__(self, config):
        self.config = config

    def process(self, data):
        """Process the input data"""
        return self._transform(data)

    def _transform(self, data):
        return data.upper()

def main():
    processor = DataProcessor({'mode': 'strict'})
    result = processor.process("hello world")
    print(result)

if __name__ == "__main__":
    main()
```

**Features:**
- Class and method extraction
- Docstring parsing
- Import resolution
- Type hint analysis
- Decorator detection
- Module structure analysis

### PHP

PHP parser handles mixed PHP/HTML content:

```php
<?php
namespace App\Controllers;

use App\Models\User;

class UserController extends BaseController
{
    public function index()
    {
        $users = User::all();
        return view('users.index', compact('users'));
    }

    public function show($id)
    {
        $user = User::find($id);
        return view('users.show', compact('user'));
    }
}
?>
<html>
<body>
    <h1>Users</h1>
    <?php foreach ($users as $user): ?>
        <p><?= $user->name ?></p>
    <?php endforeach; ?>
</body>
</html>
```

**Features:**
- Namespace detection
- Class inheritance analysis
- Method visibility parsing
- Mixed PHP/HTML support
- Laravel/Symfony patterns
- Use statement tracking

### HTML with Mixed Content

HTML parser with delegation to embedded languages:

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        .highlight {
            background: yellow;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div id="app"></div>

    <script>
        class AppManager {
            constructor() {
                this.element = document.getElementById('app');
            }

            render() {
                this.element.innerHTML = '<h1>Hello World</h1>';
            }
        }

        const app = new AppManager();
        app.render();
    </script>
</body>
</html>
```

**Features:**
- HTML structure parsing
- CSS extraction from `<style>` tags
- JavaScript extraction from `<script>` tags
- Attribute analysis
- Component boundary detection

### Markdown with Code Blocks

Markdown parser with language-specific code block analysis:

````markdown
# API Documentation

## Authentication

Use JWT tokens for authentication:

```javascript
const token = jwt.sign({ userId: 123 }, 'secret');
```

## Database Models

Here's the User model:

```python
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True)

    def __repr__(self):
        return f'<User {self.username}>'
```

## Configuration

Example configuration file:

```json
{
  "database": {
    "host": "localhost",
    "port": 5432
  }
}
```
````

**Features:**
- Markdown structure parsing
- Code block language detection
- Embedded code analysis
- Documentation extraction
- Link and reference tracking

## Mixed-Language Files

### Vue Single File Components

```vue
<template>
  <div class="user-profile">
    <h1>{{ user.name }}</h1>
    <p>{{ user.email }}</p>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'UserProfile',
  props: {
    user: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    return {
      formattedName: computed(() => props.user.name.toUpperCase())
    };
  }
});
</script>

<style scoped>
.user-profile {
  padding: 20px;
  border: 1px solid #ccc;
}
</style>
```

**Parsing Result:**
- Template section → HTML parsing
- Script section → JavaScript/TypeScript parsing
- Style section → CSS parsing
- Component metadata extraction

### PHP with Embedded HTML

```php
<?php
class PageRenderer {
    private $title;

    public function __construct($title) {
        $this->title = $title;
    }

    public function render($content) {
        echo $this->getHeader() . $content . $this->getFooter();
    }

    private function getHeader() {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <title>{$this->title}</title>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 800px; margin: 0 auto; }
            </style>
        </head>
        <body>
            <div class='container'>
        ";
    }

    private function getFooter() {
        return "
            </div>
            <script>
                console.log('Page loaded');
            </script>
        </body>
        </html>
        ";
    }
}
?>
```

**Features:**
- PHP class and method extraction
- Embedded HTML structure analysis
- CSS from style tags
- JavaScript from script tags
- String interpolation tracking

## Performance Tuning

### Optimization Strategies

#### 1. Selective Parsing

Parse only what you need:

```typescript
// Segmentation only (fastest)
const result = await factory.parseDocument(filePath, content, {
  segmentationOnly: true
});

// Disable relationship extraction
const result = await factory.parseDocument(filePath, content, {
  enableInitialLinking: false,
  enableAggregation: false
});

// Set confidence threshold to filter low-quality results
const result = await factory.parseDocument(filePath, content, {
  confidenceThreshold: 0.8
});
```

#### 2. Caching

Enable and configure caching:

```typescript
// The parser factory includes built-in caching
// Results are automatically cached based on file content hash

// For large codebases, consider external caching
import { IncrementalParseCache } from '@felix/code-intelligence/code-parser/services';

const cache = IncrementalParseCache.getInstance();
await cache.initialize();

// Cache will be used automatically by parsers
```

#### 3. Parallel Processing

Process multiple files concurrently:

```typescript
const files = ['/file1.js', '/file2.py', '/file3.php'];

// Process files in parallel
const results = await Promise.all(
  files.map(file => factory.parseDocument(file))
);

// Process with concurrency limit
const concurrency = 4;
const chunks = [];
for (let i = 0; i < files.length; i += concurrency) {
  chunks.push(files.slice(i, i + concurrency));
}

const allResults = [];
for (const chunk of chunks) {
  const chunkResults = await Promise.all(
    chunk.map(file => factory.parseDocument(file))
  );
  allResults.push(...chunkResults);
}
```

#### 4. Memory Management

```typescript
// For large codebases, parse files in batches
const batchSize = 100;
const files = getAllFiles();

for (let i = 0; i < files.length; i += batchSize) {
  const batch = files.slice(i, i + batchSize);

  // Process batch
  const results = await Promise.all(
    batch.map(file => factory.parseDocument(file))
  );

  // Process results immediately
  await processResults(results);

  // Allow garbage collection
  if (global.gc) {
    global.gc();
  }
}
```

### Performance Monitoring

```typescript
// Enable timing information
const startTime = Date.now();
const result = await factory.parseDocument(filePath);
const parseTime = Date.now() - startTime;

console.log(`Parsed ${result.components.length} components in ${parseTime}ms`);
console.log(`Backend: ${result.metadata.backend}`);
console.log(`Parsing level: ${result.metadata.parsingLevel}`);

// Check segmentation efficiency
console.log(`Segmented into ${result.metadata.totalBlocks} blocks`);
console.log(`Segmentation confidence: ${result.metadata.segmentation?.confidence}`);
```

## Best Practices

### 1. Error Handling

Always handle parsing errors gracefully:

```typescript
try {
  const result = await factory.parseDocument(filePath);

  // Check for warnings
  if (result.metadata.warnings.length > 0) {
    console.warn('Parse warnings:', result.metadata.warnings);
  }

  // Process results
  processComponents(result.components);

} catch (error) {
  console.error('Parse failed:', error);

  // Fallback to basic parsing
  try {
    const fallback = await factory.parseDocument(filePath, undefined, {
      segmentationOnly: true
    });
    console.log('Fallback parsing succeeded');
  } catch (fallbackError) {
    console.error('Fallback parsing also failed:', fallbackError);
  }
}
```

### 2. Language Detection

Be explicit about language when possible:

```typescript
// Let auto-detection work
const result = await factory.parseDocument('/unknown/file');

// Force specific parser when auto-detection might fail
const result = await factory.parseDocument('/config/file', content, {
  forceParser: 'json'
});

// Check detection confidence
const detection = factory.detectLanguage('/path/to/file');
if (detection && detection.confidence < 0.7) {
  console.warn('Low confidence language detection');
}
```

### 3. Workspace Configuration

Set up workspace context for better analysis:

```typescript
// Set workspace root for relative path resolution
const result = await factory.parseDocument('/project/src/file.js', content, {
  workspaceRoot: '/project'
});

// This enables better import resolution and cross-file relationships
```

### 4. Progressive Enhancement

Start with basic parsing and add features as needed:

```typescript
// Basic parsing first
let result = await factory.parseDocument(filePath, content, {
  enableInitialLinking: false,
  enableAggregation: false
});

// Add relationships if needed
if (needsRelationships) {
  result = await factory.parseDocument(filePath, content, {
    enableInitialLinking: true,
    enableAggregation: true
  });
}
```

### 5. Resource Management

Clean up resources properly:

```typescript
// Clear caches periodically for long-running processes
const cache = IncrementalParseCache.getInstance();
await cache.clearOldEntries();

// Monitor memory usage in long-running processes
const used = process.memoryUsage();
console.log('Memory usage:', {
  rss: Math.round(used.rss / 1024 / 1024) + ' MB',
  heapUsed: Math.round(used.heapUsed / 1024 / 1024) + ' MB'
});
```

## Troubleshooting

### Common Issues

#### 1. Language Not Detected

**Problem**: Parser returns empty results or wrong language

**Solutions**:
```typescript
// Check supported extensions
console.log('Supported extensions:', factory.getSupportedExtensions());

// Check detection result
const detection = factory.detectLanguage(filePath, content);
console.log('Detection result:', detection);

// Force parser if detection fails
const result = await factory.parseDocument(filePath, content, {
  forceParser: 'javascript'
});
```

#### 2. Low-Quality Results

**Problem**: Missing components or relationships

**Solutions**:
```typescript
// Check parsing level
console.log('Parsing level:', result.metadata.parsingLevel);

// Lower confidence threshold
const moreResults = await factory.parseDocument(filePath, content, {
  confidenceThreshold: 0.3
});
```

#### 3. Performance Issues

**Problem**: Slow parsing performance

**Solutions**:
```typescript
// Profile parsing time
console.time('parse');
const result = await factory.parseDocument(filePath);
console.timeEnd('parse');

// Use segmentation-only for faster results
const quickResult = await factory.parseDocument(filePath, content, {
  segmentationOnly: true
});

// Disable expensive features
const fasterResult = await factory.parseDocument(filePath, content, {
  enableInitialLinking: false,
  enableAggregation: false
});
```

#### 4. Memory Issues

**Problem**: High memory usage or out-of-memory errors

**Solutions**:
```typescript
// Process files in smaller batches
const batchSize = 50; // Reduce batch size

// Clear caches more frequently
const cache = IncrementalParseCache.getInstance();
await cache.clearAll();

// Disable caching for very large codebases
// (This requires custom parser configuration)
```

### Debug Information

Enable detailed logging for troubleshooting:

```typescript
// Get parser statistics
const stats = factory.getStats();
console.log('Parser statistics:', stats);

// Check specific parser capabilities
const jsParser = factory.getParser('javascript');
if (jsParser) {
  console.log('JavaScript parser extensions:', jsParser.getSupportedExtensions());
}

// Validate content manually
const isValidJs = jsParser?.validateContent(content);
console.log('Content valid for JavaScript:', isValidJs);
```

### Getting Help

1. **Check logs**: Look for warnings in `result.metadata.warnings`
2. **Verify file format**: Ensure file content matches expected language
3. **Test with simpler content**: Isolate complex parsing issues
4. **Check dependencies**: Ensure required tools (Tree-sitter grammars) are installed
5. **Review configuration**: Verify parser options and workspace setup

This guide should help you effectively use the Parser Stack for various code analysis tasks. For more specific use cases or advanced scenarios, refer to the API Reference documentation.
