# Extended Markdown Parser

A reusable library for parsing and rendering extended markdown with support for Mermaid and Excalidraw diagrams.

## Features

- Standard markdown parsing with GitHub Flavored Markdown
- Mermaid diagram support
- Excalidraw diagram support
- Pluggable renderer architecture
- Framework-agnostic core with React adapter

## Installation

```bash
npm install @felix/extended-markdown
```

## Usage

### Basic Usage (React)

```tsx
import { ExtendedMarkdownRenderer } from '@felix/extended-markdown/react';

function MyComponent() {
  const content = `
# My Document

## Mermaid Diagram

\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[OK]
    B -->|No| D[End]
\`\`\`

## Excalidraw Diagram

\`\`\`excalidraw
{
  "type": "excalidraw",
  "version": 2,
  "elements": [...]
}
\`\`\`
`;

  return <ExtendedMarkdownRenderer content={content} />;
}
```

### Core Parser (Framework Agnostic)

```typescript
import { ExtendedMarkdownParser } from '@felix/extended-markdown';

const parser = new ExtendedMarkdownParser();
const ast = parser.parse(content);

// Process AST nodes
ast.visit((node) => {
  if (node.type === 'code' && node.lang === 'mermaid') {
    // Handle mermaid diagram
  }
});
```

## Testing

Run the test suite to ensure everything is working correctly:

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

The test suite includes:
- Unit tests for the core parser
- Component tests for React renderers
- Integration tests for the complete system
- Error handling and edge case tests

## API

### ExtendedMarkdownParser

The core parser that converts markdown to an AST with extended support.

```typescript
interface ExtendedMarkdownParser {
  parse(content: string): MarkdownAST;
  registerExtension(extension: MarkdownExtension): void;
}
```

### MarkdownExtension

Interface for creating custom markdown extensions.

```typescript
interface MarkdownExtension {
  name: string;
  test: (node: ASTNode) => boolean;
  transform: (node: ASTNode) => ASTNode;
}
```

### Renderer Options

```typescript
interface RendererOptions {
  // Mermaid options
  mermaid?: {
    theme?: 'default' | 'dark' | 'forest' | 'neutral';
    themeVariables?: Record<string, string>;
  };
  
  // Excalidraw options
  excalidraw?: {
    theme?: 'light' | 'dark';
    viewModeEnabled?: boolean;
    minHeight?: number;
    maxHeight?: number;
  };
  
  // General options
  prose?: boolean;
  className?: string;
}
```
