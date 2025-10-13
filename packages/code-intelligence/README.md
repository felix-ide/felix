# @felix/code-intelligence

> The all-knowing AIgent - Unified content intelligence for parsing, understanding, and connecting any structured content

## What is The OrAIcle?

The OrAIcle (yes, with AI unnecessarily shoved in there 🙄) is the unified intelligence package that sees all, knows all, and connects all. Just like the Oracle in the Matrix, it understands the deeper meaning and relationships in any structured content - whether it's source code, documentation, configurations, or schemas.

## Features

### 🔮 **Unified Content Intelligence**
- **Parser** - Understands 15+ programming languages and documentation formats
- **Types** - Comprehensive type definitions for all content structures  
- **Semantic Intelligence** - Embeddings, semantic search, and context building (formerly the server package)
- **Intelligence** - Pattern recognition and rule matching
- **Graph** - Knowledge graph construction and traversal

### 📦 **Single Package, Multiple Powers**
Instead of juggling multiple packages, The OrAIcle consolidates:
- `@felix/code-parser`
- `@felix/code-analysis-types`
- Semantic intelligence (embeddings + search)
- `@felix/architectural-intelligence`
- `@felix/knowledge-graph`

## Installation

```bash
npm install @felix/code-intelligence
```

## Usage

### Import Everything
```typescript
import { ParserFactory, EmbeddingService, KnowledgeGraph, RuleMatchingService } from '@felix/code-intelligence';
```

### Import Specific Modules
```typescript
import { Parser } from '@felix/code-intelligence/parser';
import { EmbeddingService } from '@felix/code-intelligence/semantic-intelligence';
import { KnowledgeGraph } from '@felix/code-intelligence/graph';
import { RuleMatchingService } from '@felix/code-intelligence/intelligence';
```

## Example: Analyzing Any Content

```typescript
import { ParserFactory, EmbeddingService, KnowledgeGraph } from '@felix/code-intelligence';

// Works with source code
const codeParser = ParserFactory.getParser('javascript');
const codeComponents = await codeParser.parse(jsContent);

// Works with documentation  
const docParser = ParserFactory.getParser('html');
const docComponents = await docParser.parse(htmlContent);

// Same embeddings and search for both
const embeddings = new EmbeddingService();
await embeddings.generateEmbeddings(components);

// Build unified knowledge graph
const graph = new KnowledgeGraph();
graph.addComponents(components);
graph.buildRelationships();

// Search semantically across everything
const results = await graph.search('authentication flow');
```

## Documentation

### Parser Stack Documentation

Comprehensive documentation for the Parser Stack overhaul is available in the [`docs/parser-stack/`](./docs/parser-stack/) directory:

- **[Architecture Guide](./docs/parser-stack/ARCHITECTURE.md)** - System architecture, design decisions, and component relationships
- **[Parser Usage Guide](./docs/parser-stack/PARSER_USAGE.md)** - Common patterns, best practices, and configuration options
- **[API Reference](./docs/parser-stack/API_REFERENCE.md)** - Complete API documentation with examples
- **[Migration Guide](./docs/parser-stack/MIGRATION_GUIDE.md)** - Step-by-step migration from the old parser system
- **[Individual Parser Documentation](./docs/parser-stack/parsers/)** - Detailed guides for each language parser

### Quick Links

- **Getting Started**: See [Parser Usage Guide](./docs/parser-stack/PARSER_USAGE.md#quick-start)
- **Language Support**: Check [Parser Documentation](./docs/parser-stack/parsers/README.md)
- **Performance Tuning**: Review [Performance Section](./docs/parser-stack/PARSER_USAGE.md#performance-tuning)
- **Troubleshooting**: Visit [Troubleshooting Guide](./docs/parser-stack/PARSER_USAGE.md#troubleshooting)

### Architecture Overview

The Parser Stack features:
- **Multi-language support**: JavaScript/TypeScript, Python, PHP, Java, HTML, CSS, Markdown, and more
- **Mixed-language files**: HTML with embedded JS/CSS, Vue SFCs, PHP templates
- **Multiple backends**: AST parsers, Tree-sitter, Roslyn sidecar for C#
- **Segmentation-first approach**: Files are segmented into language blocks before detailed parsing
- **Relationship extraction**: Automatic extraction of imports, calls, inheritance, and usage relationships

For a complete overview, see the [Architecture Documentation](./docs/parser-stack/ARCHITECTURE.md).

## Why "The OrAIcle"?

Because apparently everything needs AI in the name now, even when it's just good old-fashioned parsing and pattern matching. But hey, at least our Oracle actually knows things, unlike some "AI" products out there. 😏

## License

MIT
