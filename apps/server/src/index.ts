/**
 * Felix backend - gateway for analyzing, indexing, and generating context from codebases
 * spanning multiple programming languages.
 *
 * Formerly branded as The Seraiph .
 */

// Core exports
export { KnowledgeGraph } from './core/KnowledgeGraph.js';
export type { GraphSearchOptions, GraphPath, GraphStats } from './core/KnowledgeGraph.js';

// Clean orchestrator and services
export { CodeIndexer } from './features/indexing/api/CodeIndexer.js';
export type { IndexingOptions, IndexingResult } from './features/indexing/api/CodeIndexer.js';
export { FileIndexingService } from './features/indexing/services/FileIndexingService.js';
export { ComponentSearchService } from './features/search/services/ComponentSearchService.js';
export { RelationshipService } from './features/relationships/services/RelationshipService.js';
export { TaskManagementService } from './features/metadata/services/TaskManagementService.js';
export { NoteManagementService } from './features/metadata/services/NoteManagementService.js';
export { RuleManagementService } from './features/metadata/services/RuleManagementService.js';

// Database management (direct, no adapters)
export { DatabaseManager } from './features/storage/DatabaseManager.js';
// To be implemented:
// export { JsonAdapter } from './storage/adapters/JsonAdapter.js';

// Parser system - re-export from @felix/code-parser
export { 
  ILanguageParser,
  ParseResult,
  ParseError,
  ParseWarning,
  ParserOptions,
  ProgressCallback,
  BaseLanguageParser,
  JavaScriptParser,
  PythonParser,
  JavaParser,
  PhpParser,
  MarkdownParser,
  ParserFactory
} from '@felix/code-intelligence';

// Component models and types - re-export from @felix/code-analysis-types
export * from '@felix/code-intelligence';

// CLI (example integration)
export { createCLI, runCLI } from './cli/index.js';
export type { CLIOptions, CLIConfig } from './cli/types.js';

// Context generation
export { 
  ContextGenerationAPI,
  createDefaultContextGenerator,
  createContextQuery,
  createDefaultOptions
} from './context/index.js';
export type {
  ContextGenerationOptions,
  ContextQuery,
  ContextData,
  ContextResult,
  IContextProcessor
} from './context/index.js';

// Search functionality - re-export from semantic-search
export { BooleanQueryParser } from '@felix/code-intelligence';
export type { QueryNode, ParsedQuery } from '@felix/code-intelligence';

// Version
export const VERSION = '0.1.0';
