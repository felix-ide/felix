# API Reference

This document provides comprehensive API documentation for the Parser Stack, including all public interfaces, methods, parameters, return types, and usage examples.

## Table of Contents

1. [Core Classes](#core-classes)
2. [Interfaces](#interfaces)
3. [Types and Enums](#types-and-enums)
4. [Services](#services)
5. [Configuration](#configuration)
6. [Error Handling](#error-handling)

## Core Classes

### ParserFactory

The main orchestrator for all parsing operations.

#### Constructor

```typescript
constructor()
```

Creates a new ParserFactory instance with default parsers registered.

**Example:**
```typescript
import { ParserFactory } from '@felix/code-intelligence/code-parser';
const factory = new ParserFactory();
```

#### Methods

##### parseDocument

```typescript
async parseDocument(
  filePath: string,
  content?: string,
  options?: ParseDocumentOptions
): Promise<DocumentParsingResult>
```

Parse a document with full segmentation and relationship extraction.

**Parameters:**
- `filePath` (string): Path to the file being parsed
- `content` (string, optional): File content (if not provided, file will be read)
- `options` (ParseDocumentOptions, optional): Parsing configuration options

**Returns:** Promise<DocumentParsingResult>

**Example:**
```typescript
const result = await factory.parseDocument('/src/app.js', undefined, {
  confidenceThreshold: 0.8
});

console.log(`Found ${result.components.length} components`);
console.log(`Parsing level: ${result.metadata.parsingLevel}`);
```

##### parseFile

```typescript
async parseFile(
  filePath: string,
  content?: string
): Promise<{ components: IComponent[]; relationships: IRelationship[] }>
```

Legacy parsing method for backward compatibility.

**Parameters:**
- `filePath` (string): Path to the file
- `content` (string, optional): File content

**Returns:** Promise with components and relationships arrays

**Example:**
```typescript
const { components, relationships } = await factory.parseFile('/src/utils.js');
```

##### detectLanguage

```typescript
detectLanguage(filePath: string, content?: string): LanguageDetectionResult | null
```

Detect the programming language of a file.

**Parameters:**
- `filePath` (string): Path to the file
- `content` (string, optional): File content for validation

**Returns:** LanguageDetectionResult or null if no language detected

**Example:**
```typescript
const detection = factory.detectLanguage('/config/webpack.config.js');
if (detection) {
  console.log(`Language: ${detection.language}`);
  console.log(`Confidence: ${detection.confidence}`);
  console.log(`Method: ${detection.detectionMethod}`);
}
```

##### registerParser

```typescript
registerParser(parser: ILanguageParser): void
```

Register a new language parser.

**Parameters:**
- `parser` (ILanguageParser): Parser instance to register

**Example:**
```typescript
import { CustomLanguageParser } from './CustomLanguageParser';

const customParser = new CustomLanguageParser();
factory.registerParser(customParser);
```

##### unregisterParser

```typescript
unregisterParser(language: string): boolean
```

Remove a language parser.

**Parameters:**
- `language` (string): Language identifier to remove

**Returns:** boolean indicating success

##### getParser

```typescript
getParser(language: string): ILanguageParser | null
```

Get a specific language parser.

**Parameters:**
- `language` (string): Language identifier

**Returns:** Parser instance or null

##### getSupportedLanguages

```typescript
getSupportedLanguages(): string[]
```

Get all supported programming languages.

##### getSupportedExtensions

```typescript
getSupportedExtensions(): string[]
```

Get all supported file extensions.

##### getStats

```typescript
getStats(): {
  parserCount: number;
  supportedLanguages: string[];
  supportedExtensions: string[];
  extensionMappings: Record<string, string>;
}
```

Get parser factory statistics.

### BaseLanguageParser

Abstract base class for language parsers.

#### Constructor

```typescript
constructor(language: string, extensions: string[])
```

**Parameters:**
- `language` (string): Language identifier
- `extensions` (string[]): Supported file extensions

#### Abstract Methods

Must be implemented by concrete parsers:

##### detectComponents

```typescript
abstract detectComponents(content: string, filePath: string): IComponent[]
```

Extract components from source code.

##### detectRelationships

```typescript
abstract detectRelationships(components: IComponent[], content: string): IRelationship[]
```

Extract relationships between components.

#### Implemented Methods

##### parseContent

```typescript
async parseContent(
  content: string,
  filePath: string,
  options?: ParserOptions
): Promise<ParseResult>
```

Parse content and return comprehensive results.

##### validateSyntax

```typescript
async validateSyntax(content: string): Promise<ParseError[]>
```

Validate syntax and return errors.

##### canParseFile

```typescript
canParseFile(filePath: string): boolean
```

Check if parser can handle a file.

## Interfaces

### ILanguageParser

Core interface for all language parsers.

```typescript
interface ILanguageParser extends IEnhancedExtraction {
  readonly language: string;
  getSupportedExtensions(): string[];
  getIgnorePatterns(): string[];
  canParseFile(filePath: string): boolean;
  parseFile(filePath: string, options?: ParserOptions): Promise<ParseResult>;
  parseContent(content: string, filePath: string, options?: ParserOptions): Promise<ParseResult>;
  detectComponents(content: string, filePath: string): IComponent[] | Promise<IComponent[]>;
  detectRelationships(components: IComponent[], content: string): IRelationship[] | Promise<IRelationship[]>;
  validateSyntax(content: string): ParseError[] | Promise<ParseError[]>;
  validateContent(content: string): boolean;
  detectLanguageBoundaries(content: string, filePath: string): LanguageBoundary[];
}
```

### IEnhancedExtraction

Extended extraction capabilities interface.

```typescript
interface IEnhancedExtraction {
  extractModuleComponents(content: string, filePath: string): IComponent[];
  extractVariableComponents(content: string, filePath: string): IComponent[];
  extractConstructorComponents(content: string, filePath: string): IComponent[];
  extractAccessorComponents(content: string, filePath: string): IComponent[];
  extractPropertyAssignments(content: string, filePath: string): IComponent[];
  extractUsageRelationships(components: IComponent[], content: string): IRelationship[];
  extractInheritanceRelationships(components: IComponent[], content: string): IRelationship[];
  extractImportExportRelationships(components: IComponent[], content: string): IRelationship[];
  extractContainmentRelationships(components: IComponent[]): IRelationship[];
  detectFrameworkComponents(content: string, filePath: string): IComponent[];
  inferTypeFromExpression(expression: string): string;
  extractDocumentation(content: string, lineNumber: number): string | undefined;
}
```

### IComponent

Represents a code component (function, class, variable, etc.).

```typescript
interface IComponent {
  id: string;                    // Unique identifier
  name: string;                  // Component name
  type: ComponentType;           // Component type enum
  language: string;              // Programming language
  filePath: string;              // Source file path
  location: Location;            // Position information
  signature?: string;            // Method/function signature
  docstring?: string;            // Documentation string
  metadata?: Record<string, any>; // Additional metadata
}
```

### IRelationship

Represents a relationship between components.

```typescript
interface IRelationship {
  sourceId: string;              // Source component ID
  targetId: string;              // Target component ID
  type: RelationshipType;        // Relationship type enum
  location?: Location;           // Where relationship occurs
  metadata?: Record<string, any>; // Additional metadata
}
```

### Location

Position information within a file.

```typescript
interface Location {
  startLine: number;             // Starting line (1-based)
  endLine: number;               // Ending line (1-based)
  startColumn: number;           // Starting column (1-based)
  endColumn: number;             // Ending column (1-based)
}
```

### ParseResult

Result of parsing operation.

```typescript
interface ParseResult {
  components: IComponent[];      // Extracted components
  relationships: IRelationship[]; // Extracted relationships
  errors: ParseError[];          // Parse errors
  warnings: ParseWarning[];      // Parse warnings
  metadata?: {
    parseTime?: number;          // Time taken to parse (ms)
    parsingLevel?: 'semantic' | 'structural' | 'basic';
    backend?: string;            // Parser backend used
    capabilities?: {             // Parser capabilities
      symbols?: boolean;
      relationships?: boolean;
      ranges?: boolean;
      types?: boolean;
      controlFlow?: boolean;
      incremental?: boolean;
    };
    [key: string]: any;
  };
}
```

## Types and Enums

### ComponentType

Enumeration of component types.

```typescript
enum ComponentType {
  FUNCTION = 'function',
  CLASS = 'class',
  INTERFACE = 'interface',
  VARIABLE = 'variable',
  CONSTANT = 'constant',
  MODULE = 'module',
  NAMESPACE = 'namespace',
  ENUM = 'enum',
  TYPE = 'type',
  PROPERTY = 'property',
  METHOD = 'method',
  CONSTRUCTOR = 'constructor',
  GETTER = 'getter',
  SETTER = 'setter',
  FIELD = 'field',
  PARAMETER = 'parameter',
  LOCAL_VARIABLE = 'local_variable',
  IMPORT = 'import',
  EXPORT = 'export',
  DECORATOR = 'decorator',
  ANNOTATION = 'annotation',
  COMMENT = 'comment',
  UNKNOWN = 'unknown'
}
```

### RelationshipType

Enumeration of relationship types.

```typescript
enum RelationshipType {
  CALLS = 'calls',
  IMPORTS = 'imports',
  EXPORTS = 'exports',
  EXTENDS = 'extends',
  IMPLEMENTS = 'implements',
  CONTAINS = 'contains',
  USES = 'uses',
  DECORATES = 'decorates',
  OVERRIDES = 'overrides',
  INSTANTIATES = 'instantiates',
  ACCESSES = 'accesses',
  MODIFIES = 'modifies',
  DEPENDS_ON = 'depends_on',
  REFERENCES = 'references',
  DEFINES = 'defines',
  ANNOTATES = 'annotates',
  THROWS = 'throws',
  CATCHES = 'catches',
  RETURNS = 'returns',
  PARAMETER_OF = 'parameter_of',
  TYPE_OF = 'type_of',
  UNKNOWN = 'unknown'
}
```

### ParseDocumentOptions

Configuration options for document parsing.

```typescript
interface ParseDocumentOptions {
  enableSegmentation?: boolean;     // Enable file segmentation (default: true)
  enableInitialLinking?: boolean;   // Enable cross-file linking (default: true)
  enableAggregation?: boolean;      // Enable relationship aggregation (default: true)
  confidenceThreshold?: number;     // Filter confidence threshold (default: 0.5)
  workspaceRoot?: string;          // Workspace root path
  forceParser?: string;            // Force specific parser
  segmentationOnly?: boolean;      // Return only segmentation
}
```

### ParserOptions

Options for individual parser operations.

```typescript
interface ParserOptions {
  includeComments?: boolean;        // Include comment components
  includePrivateMembers?: boolean;  // Include private members
  includeImports?: boolean;         // Include import statements
  includeExports?: boolean;         // Include export statements
  maxDepth?: number;               // Maximum parsing depth
  progressCallback?: ProgressCallback; // Progress reporting
  isEmbedded?: boolean;            // Embedded language parsing
  parentLanguage?: string;         // Parent language context
  parentScope?: string;            // Parent scope context
  offsetLine?: number;             // Line offset for embedded content
  offsetColumn?: number;           // Column offset for embedded content
  [key: string]: any;              // Additional options
}
```

### LanguageDetectionResult

Result of language detection.

```typescript
interface LanguageDetectionResult {
  language: string;                // Detected language
  confidence: number;              // Confidence score (0-1)
  parser: ILanguageParser;         // Selected parser
  detectionMethod: 'extension' | 'shebang' | 'content' | 'filename';
}
```

### DocumentParsingResult

Comprehensive parsing result.

```typescript
interface DocumentParsingResult {
  components: IComponent[];        // Extracted components
  relationships: AggregatedRelationship[]; // Aggregated relationships
  segmentation: SegmentationResult; // File segmentation info
  linking: LinkingResult;          // Cross-file relationships
  metadata: {
    filePath: string;
    totalBlocks: number;
    parsingLevel: 'semantic' | 'structural' | 'basic';
    backend: 'ast' | 'tree-sitter' | 'detectors-only' | 'hybrid';
    processingTimeMs: number;
    warnings: string[];
    segmentation?: {
      backend: 'detectors-only' | 'tree-sitter' | 'hybrid';
      confidence: number;
    };
  };
}
```

## Services

### BlockScanner

Service for file segmentation.

#### getInstance

```typescript
static getInstance(): BlockScanner
```

Get singleton instance.

#### scanFile

```typescript
async scanFile(filePath: string, content: string): Promise<SegmentationResult>
```

Segment file into language blocks.

**Parameters:**
- `filePath` (string): File path
- `content` (string): File content

**Returns:** SegmentationResult with blocks and metadata

**Example:**
```typescript
import { BlockScanner } from '@felix/code-intelligence/code-parser/services';

const scanner = BlockScanner.getInstance();
const segmentation = await scanner.scanFile('/src/mixed.html', htmlContent);

console.log(`Segmented into ${segmentation.blocks.length} blocks`);
segmentation.blocks.forEach(block => {
  console.log(`${block.language}: lines ${block.startLine}-${block.endLine}`);
});
```

### InitialLinker

Service for extracting cross-file relationships.

#### getInstance

```typescript
static getInstance(): InitialLinker
```

Get singleton instance.

#### extractRelationships

```typescript
async extractRelationships(filePath: string, content: string): Promise<LinkingResult>
```

Extract import/export and usage relationships.

#### setWorkspaceRoot

```typescript
setWorkspaceRoot(root: string): void
```

Set workspace root for path resolution.

### RelationshipAggregator

Service for consolidating relationships from multiple sources.

#### getInstance

```typescript
static getInstance(): RelationshipAggregator
```

Get singleton instance.

#### addRelationships

```typescript
addRelationships(
  relationships: Array<{
    sourceId: string;
    targetId: string;
    type: string;
    confidence: number;
    metadata?: Record<string, any>;
  }>,
  source: 'semantic' | 'structural' | 'initial'
): void
```

Add relationships from a specific source.

#### getAllRelationships

```typescript
getAllRelationships(options?: {
  confidenceThreshold?: number;
}): {
  relationships: AggregatedRelationship[];
  metadata: {
    totalSources: number;
    conflictsResolved: number;
    averageConfidence: number;
  };
}
```

Get all aggregated relationships.

## Error Handling

### ParseError

Represents a parsing error.

```typescript
interface ParseError {
  message: string;               // Error message
  location?: Location;           // Error location
  severity: 'error' | 'warning' | 'info';
  code?: string;                 // Error code
  source?: string;               // Error source
}
```

### ParseWarning

Represents a parsing warning.

```typescript
interface ParseWarning {
  message: string;               // Warning message
  location?: Location;           // Warning location
  code?: string;                 // Warning code
  source?: string;               // Warning source
}
```

### Error Handling Patterns

#### Try-Catch with Fallback

```typescript
try {
  const result = await factory.parseDocument(filePath);
  return result;
} catch (error) {
  console.error('Primary parsing failed:', error);

  // Fallback to basic parsing
  try {
    const fallback = await factory.parseDocument(filePath, undefined, {
      segmentationOnly: true
    });
    console.warn('Using fallback parsing results');
    return fallback;
  } catch (fallbackError) {
    console.error('Fallback parsing also failed:', fallbackError);
    throw new Error(`Failed to parse ${filePath}: ${error.message}`);
  }
}
```

#### Handling Parse Warnings

```typescript
const result = await factory.parseDocument(filePath);

if (result.metadata.warnings.length > 0) {
  console.warn(`Parse warnings for ${filePath}:`);
  result.metadata.warnings.forEach(warning => {
    console.warn(`  - ${warning}`);
  });
}

// Check individual component/relationship errors
result.components.forEach(component => {
  if (component.metadata?.errors) {
    console.error(`Component ${component.name} has errors:`, component.metadata.errors);
  }
});
```

#### Validation

```typescript
// Validate syntax before parsing
const parser = factory.getParser('javascript');
if (parser) {
  const errors = await parser.validateSyntax(content);
  if (errors.length > 0) {
    console.warn('Syntax errors detected:', errors);
    // Decide whether to continue with parsing
  }
}

// Validate content matches expected language
const isValid = parser?.validateContent(content);
if (!isValid) {
  console.warn('Content does not match expected language format');
}
```

This API reference provides comprehensive documentation for all public interfaces and methods in the Parser Stack. For usage examples and best practices, refer to the Parser Usage Guide.
