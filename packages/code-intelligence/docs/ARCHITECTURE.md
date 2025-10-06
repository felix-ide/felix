# Code Parser Architecture

## Core Components

### ILanguageParser Interface
The contract all parsers must implement:
- parseFile(filePath): Parse a file from disk
- parseContent(content, filePath): Parse string content
- detectComponents(content, filePath): Extract components
- detectRelationships(components, content): Find relationships

### Parser Implementations
Each language has a dedicated parser:
- JavaScriptParser: Uses TypeScript compiler API
- PythonParser: Uses Python AST via subprocess
- PhpParser: Uses PHP-Parser via subprocess
- JavaParser: Uses java-parser npm package
- MarkdownParser: Regex-based parsing

### ParserFactory
Manages parser lifecycle:
- Language detection from extension/content
- Parser registration and retrieval
- Confidence scoring for mixed files (Phase 2)

## Adding a New Parser
1. Implement ILanguageParser interface
2. Extend BaseLanguageParser for common functionality
3. Register in ParserFactory.registerDefaultParsers()
4. Add tests for your language