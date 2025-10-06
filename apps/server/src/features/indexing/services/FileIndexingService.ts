/**
 * FileIndexingService - Handles file processing, parsing, and indexing
 * Single responsibility: File-to-database operations
 */

import {
  ParserFactory,
  Relationship
} from '@felix/code-intelligence';
import type { ProgressCallback } from '@felix/code-intelligence';
import { DatabaseManager } from '../../storage/DatabaseManager.js';
import { IgnorePatterns, type IgnoreConfig } from '../../../utils/IgnorePatterns.js';
import { logger } from '../../../shared/logger.js';
import type { DiscoveryOptions, FileIndexingOptions, FileIndexingResult, IndexingResult } from '../types.js';
export type { DiscoveryOptions, FileIndexingOptions, FileIndexingResult, IndexingResult } from '../types.js';
import { FileDiscovery } from '../discovery/FileDiscovery.js';
import { FileParser } from '../parsing/FileParser.js';
import { IndexPersistence } from '../persistence/IndexPersistence.js';

export class FileIndexingService {
  private dbManager: DatabaseManager;
  private parserFactory: ParserFactory;
  private embeddingService: any;
  private initialized = false;
  private _ignorePatterns: IgnorePatterns | null = null;
  private options: FileIndexingOptions;
  private fileDiscovery: FileDiscovery;
  private fileParser: FileParser;
  private indexPersistence: IndexPersistence;
  private static sharedParserFactory: ParserFactory | null = null;

  constructor(
    dbManager: DatabaseManager,
    parserFactory?: ParserFactory,
    embeddingService?: any,
    options: FileIndexingOptions = {},
    ignoreConfig?: IgnoreConfig
  ) {
    this.dbManager = dbManager;
    if (parserFactory) {
      this.parserFactory = parserFactory;
    } else {
      if (!FileIndexingService.sharedParserFactory) {
        FileIndexingService.sharedParserFactory = new ParserFactory();
      }
      this.parserFactory = FileIndexingService.sharedParserFactory;
    }
    this.embeddingService = embeddingService;
    this.options = {
      maxFileSize: 1024 * 1024, // 1MB default
      excludeDirectories: ['node_modules', '.git', 'dist', 'build'],
      followSymlinks: false,
      ...options
    };

    if (ignoreConfig) {
      try {
        const projectRoot = dbManager.getProjectPath();
        this._ignorePatterns = new IgnorePatterns(projectRoot, ignoreConfig);
      } catch {
        this._ignorePatterns = new IgnorePatterns('', ignoreConfig);
      }
    }

    this.indexPersistence = new IndexPersistence(this.dbManager);
    this.refreshCollaborators();
  }

  get ignorePatterns(): IgnorePatterns | null {
    return this._ignorePatterns;
  }

  set ignorePatterns(value: IgnorePatterns | null) {
    this._ignorePatterns = value;
    this.refreshCollaborators();
  }

  private refreshCollaborators(): void {
    this.fileDiscovery = new FileDiscovery(this.parserFactory, this.options, this._ignorePatterns);
    this.fileParser = new FileParser(this.dbManager, this.parserFactory, this.options, this._ignorePatterns);
  }

  /**
   * Initialize the parser registry if not already done
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const extensions = this.parserFactory.getSupportedExtensions();
    const languages = this.parserFactory.getRegisteredLanguages();
    logger.info(`Parser registry initialized: ${languages.length} languages`);
    logger.info(`Supported extensions: ${extensions.join(', ')}`);
  }

  /**
   * Discover files in a directory
   */
  async discoverFiles(directoryPath: string, options: DiscoveryOptions = {}): Promise<string[]> {
    await this.initialize();
    return this.fileDiscovery.collect(directoryPath, options);
  }

  /**
   * Parse a single file and return components/relationships without persisting.
   */
  async parseForIndex(filePath: string, onProgress?: ProgressCallback): Promise<FileIndexingResult> {
    await this.initialize();
    return this.fileParser.parseForIndex(filePath, onProgress);
  }

  /**
   * Persist components and relationships produced by parseForIndex
   */
  async persistParseResult(filePath: string, components: any[], relationships: any[]): Promise<void> {
    await this.indexPersistence.persist(filePath, components, relationships);
  }

  /**
   * Index a single file (parse + persist)
   */
  async indexFile(filePath: string, onProgress?: ProgressCallback): Promise<FileIndexingResult> {
    const parsed = await this.parseForIndex(filePath, onProgress);
    if (parsed.success) {
      await this.persistParseResult(filePath, parsed.components, parsed.relationships);
    }
    return parsed;
  }


  /**
   * Index entire directory
   */
  async indexDirectory(directoryPath: string, onProgress?: ProgressCallback): Promise<IndexingResult> {
    const startTime = Date.now();
    const result: IndexingResult = {
      success: true,
      filesProcessed: 0,
      componentCount: 0,
      relationshipCount: 0,
      errors: [],
      warnings: [],
      processingTime: 0
    };

    try {
      await this.initialize();
      const files = await this.fileDiscovery.collectAll(directoryPath);

      for (const file of files) {
        try {
          const parseResult = await this.indexFile(file, onProgress);
          result.filesProcessed++;
          
          if (parseResult.success) {
            result.componentCount += parseResult.components.length;
            result.relationshipCount += parseResult.relationships.length;
          } else {
            parseResult.errors.forEach(error => {
              if (error.severity === 'error') {
                result.errors.push({ filePath: file, error: error.message });
                result.success = false;
              } else {
                result.warnings.push({ filePath: file, message: error.message });
              }
            });
          }
        } catch (error) {
          result.errors.push({ filePath: file, error: String(error) });
          result.success = false;
        }
      }

      // Cross-language relationships are handled downstream by the relationship services

      result.processingTime = Date.now() - startTime;
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({ filePath: directoryPath, error: String(error) });
      result.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Update a file (remove old data, re-index)
   */
  async updateFile(filePath: string, onProgress?: ProgressCallback): Promise<FileIndexingResult> {
    // Remove existing components and relationships for this file
    await this.removeFile(filePath);
    
    // Re-index the file
    return this.indexFile(filePath, onProgress);
  }

  /**
   * Remove a file from index
   */
  async removeFile(filePath: string): Promise<void> {
    // Remove components (serialized write)
    await this.dbManager.runWrite(async () => {
      await this.dbManager.getComponentRepository().deleteComponentsInFile(filePath);
    });
    
    // Remove relationships (handled by cascade)
    // Cross-language tracking cleanup is handled separately
  }


}
