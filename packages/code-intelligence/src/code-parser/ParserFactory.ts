/**
 * ParserFactory - Manages language parsers and provides automatic language detection
 * 
 * This factory class handles:
 * - Registration and management of language parsers
 * - Automatic language detection based on file extensions and content
 * - Parser selection and instantiation
 * - Language support querying
 */

import { BaseLanguageParser } from './parsers/BaseLanguageParser.js';
import type { ILanguageParser } from './interfaces/ILanguageParser.js';
import { readFileSync } from 'fs';
import { BlockScanner, SegmentationResult } from './services/BlockScanner.js';
import { InitialLinker, LinkingResult } from './services/InitialLinker.js';
import { RelationshipAggregator } from './services/RelationshipAggregator.js';
import { MultiLanguageParser } from './parsers/MultiLanguageParser.js';
import type { IComponent, IRelationship } from './types.js';
import { registerDefaultParsers } from './factory/registerDefaultParsers.js';
import { registerLanguageDetection } from './factory/languageDetection.js';
import { getAllLanguageDefinitions } from './core/LanguageRegistry.js';
import { LanguageDetector, LanguageDetectionResult } from './factory/LanguageDetector.js';
import { DocumentParserCoordinator } from './factory/DocumentParserCoordinator.js';
import type { DocumentParsingResult, ParseDocumentOptions } from './factory/types.js';
import {
  getLanguageCapability,
  listLanguageCapabilities,
  type LanguageCapabilityDefinition,
  type LanguageCapabilityMap
} from '../language-registry/index.js';
export type { LanguageDetectionResult } from './factory/LanguageDetector.js';
export type { DocumentParsingResult, ParseDocumentOptions } from './factory/types.js';

/**
 * Factory class for managing language parsers and detecting languages
 */
export class ParserFactory {
  private parsers = new Map<string, ILanguageParser>();
  private fallbackParsers = new Map<string, ILanguageParser>();  // Fallback parsers for multi-language support
  private extensionMap = new Map<string, string>();
  private shebangMap = new Map<string, string>();
  private filenameMap = new Map<string, string>();
  private blockScanner: BlockScanner;
  private initialLinker: InitialLinker;
  private relationshipAggregator: RelationshipAggregator;
  private multiLanguageParser: MultiLanguageParser;
  private languageDetector: LanguageDetector;
  private documentParserCoordinator: DocumentParserCoordinator;
  private languageCapabilities: LanguageCapabilityMap = {};

  constructor() {
    registerDefaultParsers({
      verboseLogging: Boolean(process.env.FELIX_PARSER_VERBOSE)
    });

    this.instantiateRegisteredLanguages();

    registerLanguageDetection({
      extensionMap: this.extensionMap,
      shebangMap: this.shebangMap,
      filenameMap: this.filenameMap
    });

    this.setupDelegationChains();
    this.setupTreeSitterDelegations();
    this.hydrateLanguageCapabilities();

    this.languageDetector = new LanguageDetector(
      {
        getPrimaryParser: (language) => this.parsers.get(language),
        getFallbackParser: (language) => this.fallbackParsers.get(language)
      },
      this.extensionMap,
      this.shebangMap,
      this.filenameMap
    );

    this.blockScanner = BlockScanner.getInstance();
    this.initialLinker = InitialLinker.getInstance();
    this.relationshipAggregator = RelationshipAggregator.getInstance();
    this.multiLanguageParser = new MultiLanguageParser(this);
    this.documentParserCoordinator = new DocumentParserCoordinator({
      blockScanner: this.blockScanner,
      initialLinker: this.initialLinker,
      relationshipAggregator: this.relationshipAggregator,
      detectLanguage: (filePath, content) => this.languageDetector.detectLanguage(filePath, content),
      detectPrimaryLanguage: (filePath, content) => this.languageDetector.detectPrimaryLanguage(filePath, content),
      getParser: (language) => this.getParser(language),
      readFile: (path) => readFileSync(path, 'utf-8')
    });
  }

  private instantiateRegisteredLanguages(): void {
    for (const definition of getAllLanguageDefinitions()) {
      const primaryParser = definition.createPrimary();
      this.registerParser(primaryParser);

      const fallbacks = definition.createFallbacks?.();
      if (fallbacks) {
        for (const fallback of fallbacks) {
          this.fallbackParsers.set(fallback.language, fallback);
        }
      }
    }
  }

  /**
   * Set up delegation chains for mixed-language parsing
   */
  private setupDelegationChains(): void {
    const htmlParser = this.parsers.get('html') as BaseLanguageParser;
    const phpParser = this.parsers.get('php') as BaseLanguageParser;
    const jsParser = this.parsers.get('javascript') as BaseLanguageParser;
    const cssParser = this.parsers.get('css') as BaseLanguageParser;
    
    // HTML can contain JavaScript, CSS, and PHP
    if (htmlParser) {
      if (jsParser) htmlParser.registerDelegate('javascript', jsParser);
      if (cssParser) htmlParser.registerDelegate('css', cssParser);
      if (phpParser) htmlParser.registerDelegate('php', phpParser);
    }
    
    // PHP can contain HTML (for mixed PHP/HTML files)
    if (phpParser && htmlParser) {
      phpParser.registerDelegate('html', htmlParser);
    }
  }

  /**
   * Set up Tree-sitter delegation chains for injections
   */
  private setupTreeSitterDelegations(): void {
    // Get Tree-sitter parsers from the fallback map
    const treeSitterHtmlParser = this.fallbackParsers.get('html') as BaseLanguageParser;
    const treeSitterCssParser = this.fallbackParsers.get('css') as BaseLanguageParser;
    const treeSitterJsParser = this.fallbackParsers.get('javascript') as BaseLanguageParser;

    // Set up HTML → CSS/JS injections for Tree-sitter fallback parsers
    if (treeSitterHtmlParser) {
      if (treeSitterCssParser) {
        treeSitterHtmlParser.registerDelegate('css', treeSitterCssParser);
      }
      if (treeSitterJsParser) {
        treeSitterHtmlParser.registerDelegate('javascript', treeSitterJsParser);
      }
    }

    // Also set up fallback chains for PHP
    const phpParser = this.parsers.get('php') as BaseLanguageParser;
    const treeSitterPhpParser = this.fallbackParsers.get('php') as BaseLanguageParser;

    // PHP AST parser can delegate to Tree-sitter HTML for mixed files
    if (phpParser && treeSitterHtmlParser) {
      phpParser.registerDelegate('html', treeSitterHtmlParser);
    }

    // Tree-sitter PHP can also delegate if needed
    if (treeSitterPhpParser && treeSitterHtmlParser) {
      treeSitterPhpParser.registerDelegate('html', treeSitterHtmlParser);
    }
  }

  /**
   * Register a new language parser
   */
  registerParser(parser: ILanguageParser): void {
    this.parsers.set(parser.language, parser);

    // Update extension mappings
    const extensions = parser.getSupportedExtensions();
    extensions.forEach(ext => {
      this.extensionMap.set(ext, parser.language);
    });
  }

  /**
   * Unregister a language parser
   */
  unregisterParser(language: string): boolean {
    const parser = this.parsers.get(language);
    if (!parser) {
      return false;
    }

    this.parsers.delete(language);
    
    // Remove extension mappings for this parser
    const extensions = parser.getSupportedExtensions();
    extensions.forEach(ext => {
      if (this.extensionMap.get(ext) === language) {
        this.extensionMap.delete(ext);
      }
    });

    return true;
  }

  /**
   * Get a parser for a specific language
   * First tries AST parsers, then falls back to Tree-sitter parsers
   */
  getParser(language: string): ILanguageParser | null {
    // First try to get AST parser (primary)
    const astParser = this.parsers.get(language);
    if (astParser) {
      return astParser;
    }

    // Fall back to Tree-sitter parser if no AST parser available
    return this.fallbackParsers.get(language) || null;
  }

  /**
   * Get fallback parser for a language
   * Returns Tree-sitter parser if AST parser fails
   */
  getFallbackParser(language: string): ILanguageParser | null {
    return this.fallbackParsers.get(language) || null;
  }

  /**
   * Get Tree-sitter parser for a language
   * Used by MultiLanguageParser for segmentation
   */
  getTreeSitterParser(language: string): any | null {
    // Get from the fallback parsers map
    const treeSitterParser = this.fallbackParsers.get(language);
    if (treeSitterParser) {
      return treeSitterParser;
    }

    // Handle typescript as javascript
    if (language === 'typescript') {
      return this.fallbackParsers.get('javascript') || null;
    }

    return null;
  }

  /**
   * Get all registered parsers
   */
  getAllParsers(): Map<string, ILanguageParser> {
    return new Map(this.parsers);
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): string[] {
    return this.getRegisteredLanguages();
  }

  /**
   * Get all supported file extensions
   */
  getSupportedExtensions(): string[] {
    return Array.from(this.extensionMap.keys());
  }

  /**
   * Resolve the canonical language identifier for a given file extension.
   */
  getLanguageForExtension(extension: string): string | undefined {
    return this.extensionMap.get(extension.toLowerCase());
  }

  /**
   * Return the set of registered language identifiers.
   */
  getRegisteredLanguages(): string[] {
    return Array.from(this.parsers.keys());
  }

  /**
   * Retrieve capability metadata for a language.
   */
  getLanguageCapability(language: string): LanguageCapabilityDefinition | undefined {
    return this.languageCapabilities[language];
  }

  /**
   * List capability metadata for all known languages.
   */
  listLanguageCapabilities(): LanguageCapabilityDefinition[] {
    return Object.values(this.languageCapabilities);
  }

  /**
   * Detect the language of a file and return the appropriate parser
   */
  detectLanguage(filePath: string, content?: string): LanguageDetectionResult | null {
    return this.languageDetector.detectLanguage(filePath, content);
  }

  /**
   * Detect the primary language of a file
   * Used when multiple languages are detected to choose the main one
   */
  private detectPrimaryLanguage(filePath: string, content: string): string {
    return this.languageDetector.detectPrimaryLanguage(filePath, content);
  }

  /**
   * Check if a file can be parsed by any registered parser
   */
  canParseFile(filePath: string): boolean {
    const detection = this.detectLanguage(filePath);
    return detection !== null;
  }

  /**
   * Get the best parser for a file (convenience method)
   */
  getParserForFile(filePath: string, content?: string): ILanguageParser | null {
    const detection = this.detectLanguage(filePath, content);
    return detection?.parser || null;
  }

  /**
   * Get language detection info for a file without returning the parser
   */
  getLanguageInfo(filePath: string): { language: string; confidence: number; method: string } | null {
    const detection = this.detectLanguage(filePath);
    if (!detection) {
      return null;
    }

    return {
      language: detection.language,
      confidence: detection.confidence,
      method: detection.detectionMethod
    };
  }

  /**
   * Add support for a custom file extension
   */
  addExtensionMapping(extension: string, language: string): boolean {
    if (!this.parsers.has(language)) {
      return false;
    }

    this.extensionMap.set(extension.toLowerCase(), language);
    return true;
  }

  /**
   * Add support for a custom shebang pattern
   */
  addShebangMapping(interpreter: string, language: string): boolean {
    if (!this.parsers.has(language)) {
      return false;
    }

    this.shebangMap.set(interpreter, language);
    return true;
  }

  /**
   * Add support for a custom filename pattern
   */
  addFilenameMapping(filename: string, language: string): boolean {
    if (!this.parsers.has(language)) {
      return false;
    }

    this.filenameMap.set(filename.toLowerCase(), language);
    return true;
  }

  private hydrateLanguageCapabilities(): void {
    const map: LanguageCapabilityMap = {};

    for (const language of this.parsers.keys()) {
      const capability = getLanguageCapability(language);
      if (capability) {
        map[language] = capability;
      } else if (process.env.FELIX_PARSER_VERBOSE) {
        console.warn(`[ParserFactory] Missing capability definition for language "${language}"`);
      }
    }

    for (const capability of listLanguageCapabilities()) {
      if (!map[capability.id]) {
        map[capability.id] = capability;
      }
    }

    this.languageCapabilities = map;
  }

  /**
   * Get all ignore patterns from all registered parsers
   * This compiles language-specific patterns for use in file watching and indexing
   */
  getAllIgnorePatterns(): string[] {
    const allPatterns: string[] = [];
    
    for (const parser of this.parsers.values()) {
      const patterns = parser.getIgnorePatterns();
      allPatterns.push(...patterns);
    }
    
    // Remove duplicates and return
    return [...new Set(allPatterns)];
  }

  /**
   * Get statistics about parser usage and language support
   */
  getStats(): {
    parserCount: number;
    supportedLanguages: string[];
    supportedExtensions: string[];
    extensionMappings: Record<string, string>;
  } {
    return {
      parserCount: this.parsers.size,
      supportedLanguages: this.getSupportedLanguages(),
      supportedExtensions: this.getSupportedExtensions(),
      extensionMappings: Object.fromEntries(this.extensionMap)
    };
  }

  /**
   * Parse a document with multi-language support and full relationship extraction
   * NEW APPROACH: Parse entire file through each relevant parser and merge results
   */
  async parseDocument(filePath: string, content?: string, options: ParseDocumentOptions = {}): Promise<DocumentParsingResult> {
    return this.documentParserCoordinator.parseDocument(filePath, content, options);
  }

  /**
   * Wrapper method for backward compatibility - delegates to existing parseFile logic
   */
  async parseFile(filePath: string, content?: string): Promise<{ components: IComponent[]; relationships: IRelationship[] }> {
    // This maintains the existing parseFile behavior for compatibility
    const detection = this.detectLanguage(filePath, content);
    if (!detection) {
      return { components: [], relationships: [] };
    }

    try {
      const result = await detection.parser.parseContent(content || readFileSync(filePath, 'utf-8'), filePath);
      return {
        components: result.components || [],
        relationships: result.relationships || []
      };
    } catch (error) {
      console.debug(`Parser failed for ${filePath}:`, error);
      return { components: [], relationships: [] };
    }
  }


}

/**
 * Default ParserFactory instance for convenient access
 */
export const defaultParserFactory = new ParserFactory();
