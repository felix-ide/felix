/**
 * Documentation Service for managing external documentation bundles
 * Integrates documentation from doc-scraper SQLite bundles with Felix
 */

import { EmbeddingService } from '../../../nlp/EmbeddingServiceAdapter.js';
import { SimilarityCalculator } from '../../embeddings/domain/services/SimilarityCalculator.js';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../../../shared/logger.js';

// Simple boolean query parser
class BooleanQueryParser {
  parse(query: string): any {
    const lowerQuery = query.toLowerCase();
    
    // Check for boolean operators
    if (lowerQuery.includes(' and ')) {
      const terms = lowerQuery.split(' and ').map(t => t.trim());
      return { type: 'and', terms };
    } else if (lowerQuery.includes(' or ')) {
      const terms = lowerQuery.split(' or ').map(t => t.trim());
      return { type: 'or', terms };
    } else if (lowerQuery.includes(' not ')) {
      const parts = lowerQuery.split(' not ');
      return { type: 'not', term: parts[1]?.trim() || '' };
    }
    
    return { type: 'simple', term: query };
  }
}

export interface DocumentationBundle {
  id: string;
  name: string;
  path: string;
  metadata: {
    library_name: string;
    library_version?: string;
    source_url?: string;
    created_at: string;
    total_documents: number;
  };
  database: Database.Database;
}

export interface DocumentSearchResult {
  doc_id: string;
  library_id: string;
  library_name: string;
  title: string;
  content: string;
  section_type: string;
  url: string;
  similarity: number;
  highlights?: string[];
}

export interface DocumentationSearchOptions {
  query: string;
  library_ids?: string[];
  limit?: number;
  section_types?: string[];
  similarity_threshold?: number;
}

export class DocumentationService {
  private bundles: Map<string, DocumentationBundle> = new Map();
  private embeddingService: EmbeddingService;
  private bundleDirectory: string;
  private queryParser: BooleanQueryParser;

  constructor(bundleDirectory: string, embeddingService: EmbeddingService) {
    this.bundleDirectory = bundleDirectory;
    this.embeddingService = embeddingService;
    this.queryParser = new BooleanQueryParser();
  }

  /**
   * Initialize the documentation service
   */
  async initialize(): Promise<void> {
    // Create bundle directory if it doesn't exist
    await fs.mkdir(this.bundleDirectory, { recursive: true });
    
    // Load existing bundles
    await this.loadExistingBundles();
  }

  /**
   * Load all existing documentation bundles from the bundle directory
   */
  private async loadExistingBundles(): Promise<void> {
    try {
      const files = await fs.readdir(this.bundleDirectory);
      const sqliteFiles = files.filter(f => f.endsWith('.db') || f.endsWith('.sqlite'));
      
      for (const file of sqliteFiles) {
        const bundlePath = path.join(this.bundleDirectory, file);
        try {
          await this.attachBundle(bundlePath);
        } catch (error) {
          logger.warn(`Failed to load bundle ${file}:`, error);
        }
      }
    } catch (error) {
      logger.warn('Failed to load existing bundles:', error);
    }
  }

  /**
   * Attach a documentation bundle from a SQLite file
   */
  async attachBundle(bundlePath: string): Promise<string> {
    const absolutePath = path.resolve(bundlePath);
    
    // Check if file exists
    try {
      await fs.access(absolutePath);
    } catch {
      throw new Error(`Bundle file not found: ${absolutePath}`);
    }

    // Open the SQLite database to read metadata
    const tempDatabase = new Database(absolutePath, { readonly: true });
    
    let bundleId: string;
    let metadata: DocumentationBundle['metadata'];
    
    try {
      // Get bundle metadata
      metadata = await this.getBundleMetadata(tempDatabase);
      
      // Generate bundle ID - use "docs." prefix for combined bundles
      if (metadata.library_name === 'Combined Documentation' || path.basename(absolutePath).startsWith('docs.')) {
        bundleId = `docs.${metadata.library_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      } else {
        bundleId = `${metadata.library_name}@${metadata.library_version || 'latest'}`.toLowerCase().replace(/[^a-z0-9@\-]/g, '-');
      }
      
      // Check if already attached
      if (this.bundles.has(bundleId)) {
        tempDatabase.close();
        return bundleId; // Already attached
      }
    } finally {
      tempDatabase.close();
    }
    
    // Copy bundle to bundle directory with standardized name
    // For combined bundles, preserve the "docs." prefix in filename
    const bundleFileName = bundleId.startsWith('docs.') ? `${bundleId}.db` : `${bundleId}.db`;
    const targetPath = path.join(this.bundleDirectory, bundleFileName);
    
    try {
      await fs.copyFile(absolutePath, targetPath);
    } catch (error) {
      throw new Error(`Failed to copy bundle to storage directory: ${error}`);
    }

    // Open the copied bundle
    const database = new Database(targetPath, { readonly: true });
    
    try {
      // Create bundle entry
      const bundle: DocumentationBundle = {
        id: bundleId,
        name: metadata.library_name,
        path: targetPath,
        metadata,
        database
      };
      
      this.bundles.set(bundleId, bundle);
      logger.info(`✅ Attached documentation bundle: ${bundleId}`);
      
      return bundleId;
    } catch (error) {
      database.close();
      // Clean up copied file on error
      try {
        await fs.unlink(targetPath);
      } catch {}
      throw new Error(`Failed to attach bundle: ${error}`);
    }
  }

  /**
   * Get metadata from a documentation bundle
   */
  private async getBundleMetadata(database: Database.Database): Promise<DocumentationBundle['metadata']> {
    try {
      // Get library info
      const libraryInfo = database.prepare(`
        SELECT library_id, library_name, library_version, source_url
        FROM library_info
        LIMIT 1
      `).get() as any;
      
      if (!libraryInfo) {
        throw new Error('No library info found in bundle');
      }
      
      // Count documents
      const docCount = database.prepare(`
        SELECT COUNT(*) as count FROM documents
      `).get() as any;
      
      return {
        library_name: libraryInfo.library_name,
        library_version: libraryInfo.library_version,
        source_url: libraryInfo.source_url,
        created_at: new Date().toISOString(),
        total_documents: docCount.count || 0
      };
    } catch (error) {
      throw new Error(`Failed to read bundle metadata: ${error}`);
    }
  }

  /**
   * Detach a documentation bundle
   */
  async detachBundle(bundleId: string): Promise<void> {
    const bundle = this.bundles.get(bundleId);
    if (!bundle) {
      throw new Error(`Bundle not found: ${bundleId}`);
    }
    
    // Close database connection
    bundle.database.close();
    
    // Remove from bundles map
    this.bundles.delete(bundleId);
    
    // Remove the bundle file from storage
    try {
      await fs.unlink(bundle.path);
    } catch (error) {
      logger.warn(`Failed to remove bundle file ${bundle.path}:`, error);
    }
    
    logger.info(`✅ Detached documentation bundle: ${bundleId}`);
  }

  /**
   * List all attached bundles
   */
  listBundles(): Array<{
    id: string;
    name: string;
    path: string;
    metadata: DocumentationBundle['metadata'];
  }> {
    return Array.from(this.bundles.values()).map(bundle => ({
      id: bundle.id,
      name: bundle.name,
      path: bundle.path,
      metadata: bundle.metadata
    }));
  }

  /**
   * Resolve library ID from package name
   */
  async resolveLibraryId(packageName: string): Promise<string | null> {
    // Check all bundles for matching library name
    for (const [bundleId, bundle] of this.bundles) {
      if (bundle.metadata.library_name.toLowerCase() === packageName.toLowerCase()) {
        return bundleId;
      }
    }
    
    // Check for partial matches
    const lowerPackage = packageName.toLowerCase();
    for (const [bundleId, bundle] of this.bundles) {
      if (bundle.metadata.library_name.toLowerCase().includes(lowerPackage) ||
          lowerPackage.includes(bundle.metadata.library_name.toLowerCase())) {
        return bundleId;
      }
    }
    
    return null;
  }

  /**
   * Get library documentation structure
   */
  async getLibraryDocs(libraryId: string): Promise<{
    library: DocumentationBundle['metadata'];
    sections: Array<{
      section_type: string;
      count: number;
    }>;
    total_documents: number;
  }> {
    const bundle = this.bundles.get(libraryId);
    if (!bundle) {
      throw new Error(`Bundle not found: ${libraryId}`);
    }
    
    try {
      // Get section breakdown
      const sections = bundle.database.prepare(`
        SELECT section_type, COUNT(*) as count
        FROM documents
        GROUP BY section_type
        ORDER BY count DESC
      `).all() as any[];
      
      return {
        library: bundle.metadata,
        sections,
        total_documents: bundle.metadata.total_documents
      };
    } catch (error) {
      throw new Error(`Failed to get library docs: ${error}`);
    }
  }

  /**
   * Search documentation across bundles
   */
  async searchDocumentation(options: DocumentationSearchOptions): Promise<{
    results: DocumentSearchResult[];
    total: number;
    bundles_searched: string[];
  }> {
    const {
      query,
      library_ids,
      limit = 20,
      section_types,
      similarity_threshold = 0.3
    } = options;

    // Parse the query to handle boolean operators
    const parsedQuery = this.queryParser.parse(query);
    
    // Determine which bundles to search
    const bundlesToSearch = library_ids 
      ? library_ids.map(id => this.bundles.get(id)).filter(Boolean)
      : Array.from(this.bundles.values());
    
    if (bundlesToSearch.length === 0) {
      return {
        results: [],
        total: 0,
        bundles_searched: []
      };
    }

    // Generate query embedding
    const queryEmbedding = await this.embeddingService.getEmbedding(query);
    
    // Search each bundle
    const allResults: DocumentSearchResult[] = [];
    const bundlesSearched: string[] = [];
    
    for (const bundle of bundlesToSearch) {
      if (!bundle) continue;
      
      bundlesSearched.push(bundle.id);
      
      try {
        // Build SQL query with optional filters
        let sql = `
          SELECT 
            d.doc_id,
            d.title,
            d.content,
            d.section_type,
            d.url,
            d.embedding
          FROM documents d
          WHERE d.embedding IS NOT NULL
        `;
        
        const params: any = {};
        
        if (section_types && section_types.length > 0) {
          sql += ` AND d.section_type IN (${section_types.map((_, i) => `$section_type_${i}`).join(', ')})`;
          section_types.forEach((type, i) => {
            params[`$section_type_${i}`] = type;
          });
        }
        
        // Execute query
        const docs = bundle.database.prepare(sql).all(params) as any[];
        
        // Calculate similarities and filter
        for (const doc of docs) {
          if (!doc.embedding) continue;
          
          // Deserialize embedding from binary BLOB
          let docEmbedding: number[];
          try {
            if (Buffer.isBuffer(doc.embedding)) {
              // Convert binary buffer to Float32Array then to regular array
              const float32Array = new Float32Array(doc.embedding.buffer, doc.embedding.byteOffset, doc.embedding.length / 4);
              docEmbedding = Array.from(float32Array);
            } else if (typeof doc.embedding === 'string') {
              // Fallback: try parsing as JSON string
              docEmbedding = JSON.parse(doc.embedding);
            } else {
              logger.warn('Unknown embedding format:', typeof doc.embedding);
              continue;
            }
          } catch (error) {
            logger.warn('Failed to deserialize embedding:', error);
            continue;
          }
          
          // Calculate similarity
          const similarity = SimilarityCalculator.cosineSimilarity(queryEmbedding.embedding, docEmbedding);
          
          if (similarity >= similarity_threshold) {
            // Check boolean query match if applicable
            if (parsedQuery.type !== 'simple' && !this.matchesBooleanQuery(doc, parsedQuery)) {
              continue;
            }
            
            allResults.push({
              doc_id: doc.doc_id,
              library_id: bundle.id,
              library_name: bundle.metadata.library_name,
              title: doc.title,
              content: doc.content,
              section_type: doc.section_type,
              url: doc.url,
              similarity
            });
          }
        }
      } catch (error) {
        logger.warn(`Failed to search bundle ${bundle.id}:`, error);
      }
    }
    
    // Sort by similarity and limit results
    allResults.sort((a, b) => b.similarity - a.similarity);
    const limitedResults = allResults.slice(0, limit);
    
    // Add highlights for top results
    for (const result of limitedResults) {
      result.highlights = this.generateHighlights(result.content, query);
    }
    
    return {
      results: limitedResults,
      total: allResults.length,
      bundles_searched: bundlesSearched
    };
  }

  /**
   * Check if a document matches a boolean query
   */
  private matchesBooleanQuery(doc: any, parsedQuery: any): boolean {
    const content = `${doc.title} ${doc.content}`.toLowerCase();
    
    // Simple implementation - enhance as needed
    if (parsedQuery.type === 'and') {
      return parsedQuery.terms.every((term: string) => content.includes(term.toLowerCase()));
    } else if (parsedQuery.type === 'or') {
      return parsedQuery.terms.some((term: string) => content.includes(term.toLowerCase()));
    } else if (parsedQuery.type === 'not') {
      return !content.includes(parsedQuery.term.toLowerCase());
    }
    
    return true;
  }

  /**
   * Generate text highlights for search results
   */
  private generateHighlights(content: string, query: string): string[] {
    const highlights: string[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (queryTerms.some(term => lowerSentence.includes(term))) {
        highlights.push(sentence.trim());
        if (highlights.length >= 3) break;
      }
    }
    
    return highlights;
  }

  /**
   * Auto-attach bundles based on package.json dependencies
   */
  async autoAttachFromPackageJson(packageJsonPath: string): Promise<string[]> {
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      const attachedBundles: string[] = [];
      
      for (const [packageName, version] of Object.entries(dependencies)) {
        // Look for matching bundle files
        const bundleFiles = await this.findBundleForPackage(packageName);
        
        for (const bundleFile of bundleFiles) {
          try {
            const bundleId = await this.attachBundle(bundleFile);
            attachedBundles.push(bundleId);
          } catch (error) {
            logger.warn(`Failed to attach bundle for ${packageName}:`, error);
          }
        }
      }
      
      return attachedBundles;
    } catch (error) {
      throw new Error(`Failed to auto-attach bundles: ${error}`);
    }
  }

  /**
   * Find bundle files for a package
   */
  private async findBundleForPackage(packageName: string): Promise<string[]> {
    const bundleFiles: string[] = [];
    
    try {
      const files = await fs.readdir(this.bundleDirectory);
      
      for (const file of files) {
        if (file.includes(packageName.replace('/', '-')) && 
            (file.endsWith('.db') || file.endsWith('.sqlite'))) {
          bundleFiles.push(path.join(this.bundleDirectory, file));
        }
      }
    } catch (error) {
      logger.warn(`Failed to find bundles for ${packageName}:`, error);
    }
    
    return bundleFiles;
  }

  /**
   * Get documentation service storage info
   */
  getStorage(): any {
    // TypeORM-only: managers removed; repositories live in DatabaseManager
    return {};
  }

  /**
   * Close all bundle connections
   */
  async close(): Promise<void> {
    for (const bundle of this.bundles.values()) {
      try {
        bundle.database.close();
      } catch (error) {
        logger.warn(`Failed to close bundle ${bundle.id}:`, error);
      }
    }
    this.bundles.clear();
  }
}
