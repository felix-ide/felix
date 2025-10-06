/**
 * Language Parser Interface - Core interface for all language parsers
 */

import { IComponent, IRelationship, Location } from '../types.js';
import { ParseError, ParseWarning, ParseResult } from '../../code-analysis-types/index.js';

// Re-export parse types from code-analysis-types
export { ParseError, ParseWarning, ParseResult } from '../../code-analysis-types/index.js';

/**
 * Parser progress callback
 */
export type ProgressCallback = (progress: {
  current: number;
  total: number;
  message: string;
  filePath?: string;
}) => void;

/**
 * Parser configuration options
 */
export interface ParserOptions {
  includeComments?: boolean;
  includePrivateMembers?: boolean;
  includeImports?: boolean;
  includeExports?: boolean;
  maxDepth?: number;
  progressCallback?: ProgressCallback;
  // Mixed-language support options
  isEmbedded?: boolean;
  parentLanguage?: string;
  parentScope?: string;
  offsetLine?: number;
  offsetColumn?: number;
  [key: string]: any;
}

/**
 * Language boundary information
 */
export interface LanguageBoundary {
  language: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  scope: string; // e.g., 'source.php', 'text.html.php', 'string.quoted.php'
}

/**
 * Enhanced extraction interface that all language parsers must implement
 * This ensures feature parity across all supported languages
 */
export interface IEnhancedExtraction {
  /**
   * Extract module/namespace components
   */
  extractModuleComponents(content: string, filePath: string): IComponent[];

  /**
   * Extract variable declarations with scope and type inference
   */
  extractVariableComponents(content: string, filePath: string): IComponent[];

  /**
   * Extract constructor components
   */
  extractConstructorComponents(content: string, filePath: string): IComponent[];

  /**
   * Extract accessor components (getters/setters)
   */
  extractAccessorComponents(content: string, filePath: string): IComponent[];

  /**
   * Extract property assignments in objects/classes
   */
  extractPropertyAssignments(content: string, filePath: string): IComponent[];

  /**
   * Extract usage relationships between components
   */
  extractUsageRelationships(components: IComponent[], content: string): IRelationship[];

  /**
   * Extract inheritance/implementation relationships
   */
  extractInheritanceRelationships(components: IComponent[], content: string): IRelationship[];

  /**
   * Extract import/export relationships
   */
  extractImportExportRelationships(components: IComponent[], content: string): IRelationship[];

  /**
   * Extract containment relationships (file->component, class->method, etc.)
   */
  extractContainmentRelationships(components: IComponent[]): IRelationship[];

  /**
   * Detect framework-specific components (React, Django, etc.)
   */
  detectFrameworkComponents(content: string, filePath: string): IComponent[];

  /**
   * Infer type from expression/literal
   */
  inferTypeFromExpression(expression: string): string;

  /**
   * Extract documentation from comments
   */
  extractDocumentation(content: string, lineNumber: number): string | undefined;
}

/**
 * Core interface for all language parsers
 * Now extends IEnhancedExtraction to enforce comprehensive AST tracking
 */
export interface ILanguageParser extends IEnhancedExtraction {
  /**
   * Get the language this parser supports
   */
  readonly language: string;

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[];

  /**
   * Get language-specific ignore patterns for file watching and indexing
   */
  getIgnorePatterns(): string[];

  /**
   * Check if this parser can handle the given file
   */
  canParseFile(filePath: string): boolean;

  /**
   * Parse a file and extract components and relationships
   */
  parseFile(filePath: string, options?: ParserOptions): Promise<ParseResult>;

  /**
   * Parse content directly (for in-memory parsing)
   */
  parseContent(content: string, filePath: string, options?: ParserOptions): Promise<ParseResult>;

  /**
   * Detect components in content
   */
  detectComponents(content: string, filePath: string): IComponent[] | Promise<IComponent[]>;

  /**
   * Detect relationships between components
   */
  detectRelationships(components: IComponent[], content: string): IRelationship[] | Promise<IRelationship[]>;

  /**
   * Validate syntax of the content
   */
  validateSyntax(content: string): ParseError[] | Promise<ParseError[]>;

  /**
   * Validate that content is valid for this language
   * Used for content-based parser selection
   */
  validateContent(content: string): boolean;

  /**
   * Detect language boundaries in mixed-language files
   * Returns boundaries where this parser's language starts/ends
   */
  detectLanguageBoundaries(content: string, filePath: string): LanguageBoundary[];
}