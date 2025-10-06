/**
 * ComponentSearchService - Handles all component search operations
 * Single responsibility: Component discovery and search
 */

import { DatabaseManager } from '../../storage/DatabaseManager.js';
import { EmbeddingService } from '../../../nlp/EmbeddingServiceAdapter.js';
import { computeComponentContentHash } from '../../../utils/ContentHash.js';
import { BooleanQueryParser } from '@felix/code-intelligence';
import type { IComponent } from '@felix/code-intelligence';
import type { ComponentSearchCriteria } from '../../../models/types-fixed.js';
import type { SearchResult } from '../../../types/storage.js';
import { logger } from '../../../shared/logger.js';

export interface ComponentSearchOptions {
  type?: string;
  language?: string;
  namePattern?: string;
  name?: string;  // Support direct name search
  pathPattern?: string;
  filePath?: string;  // Support direct file path search
  query?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}

export interface MultiTermSearchOptions {
  query: string;                    // Boolean query string like "storage AND (update OR timestamp)"
  type?: string;                    // Filter by component type
  language?: string;                // Filter by programming language
  limit?: number;                   // Maximum results to return
  offset?: number;                  // Pagination offset
  contextWindowSize?: number;       // Token budget for result sizing
  includeCode?: boolean;            // Include source code in results
}

export interface SimilaritySearchResult {
  component: IComponent;
  similarity: number;
}

export class ComponentSearchService {
  private dbManager: DatabaseManager;
  private embeddingService: EmbeddingService;
  private booleanQueryParser: BooleanQueryParser;

  constructor(
    dbManager: DatabaseManager,
    embeddingService: EmbeddingService
  ) {
    this.dbManager = dbManager;
    this.embeddingService = embeddingService;
    this.booleanQueryParser = new BooleanQueryParser();
  }

  /**
   * Basic component search with filters
   */
  async searchComponents(options: ComponentSearchOptions = {}): Promise<SearchResult<IComponent>> {
    const criteria: ComponentSearchCriteria = {
      limit: options.limit || 50,
      offset: options.offset || 0
    };
    
    if (options.type) criteria.type = options.type as any;
    if (options.language) criteria.language = options.language;
    if (options.namePattern) criteria.name = options.namePattern;
    if (options.name) criteria.name = options.name; // Support both name and namePattern
    if (options.pathPattern) criteria.filePath = options.pathPattern;
    if (options.filePath) criteria.filePath = options.filePath; // Support both filePath and pathPattern
    if (options.entityType) (criteria as any).entity_type = options.entityType;
    if (options.entityId) (criteria as any).entity_id = options.entityId;

    return await this.dbManager.getComponentRepository().searchComponents(criteria);
  }

  /**
   * Direct search using ComponentSearchCriteria or query string
   */
  async search(queryOrCriteria: string | ComponentSearchCriteria, options?: any): Promise<SearchResult<IComponent>> {
    if (typeof queryOrCriteria === 'string') {
      const criteria: ComponentSearchCriteria = {
        name: queryOrCriteria,  // Changed from 'query' to 'name' to match ComponentRepository expectations
        ...options
      };
      return await this.dbManager.getComponentRepository().searchComponents(criteria);
    }
    return await this.dbManager.getComponentRepository().searchComponents(queryOrCriteria);
  }

  /**
   * Search for components using boolean logic with multiple terms
   */
  async searchMultiTerm(options: MultiTermSearchOptions): Promise<SearchResult<IComponent>> {
    try {
      // Parse the boolean query
      const parsedQuery = this.booleanQueryParser.parse(options.query);
      
      // Search for each term individually
      const termResults = new Map<string, IComponent[]>();
      
      for (const term of parsedQuery.terms) {
        const searchOptions: ComponentSearchOptions = {
          namePattern: term,
          type: options.type,
          language: options.language,
          limit: 1000 // High limit for boolean operations
        };
        
        const result = await this.searchComponents(searchOptions);
        termResults.set(term, result.items);
      }
      
      // Apply boolean logic to combine results
      let finalResults = this.applyBooleanLogic(parsedQuery, termResults);
      
      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      const total = finalResults.length;
      
      finalResults = finalResults.slice(offset, offset + limit);
      
      return {
        items: finalResults,
        total,
        hasMore: offset + limit < total,
        offset,
        limit
      };
    } catch (error) {
      logger.error('Multi-term search failed:', error);
      // Fallback to simple search
      return await this.searchComponents({
        namePattern: options.query,
        type: options.type,
        language: options.language,
        limit: options.limit,
        offset: options.offset
      });
    }
  }

  /**
   * Search by similarity (semantic search)
   */
  async searchBySimilarity(query: string, limit: number = 10): Promise<SimilaritySearchResult[]> {
    try {
      // 1) Query embedding (single sidecar call)
      const queryComponent: IComponent = {
        id: 'query',
        name: 'query',
        type: 'function' as any,
        language: 'unknown',
        filePath: '',
        location: { startLine: 0, endLine: 0, startColumn: 0, endColumn: 0 },
        code: query,
        metadata: {}
      };

      const queryEmbeddingResult = await this.embeddingService.generateComponentEmbedding(queryComponent);
      if (!queryEmbeddingResult) {
        logger.warn('Failed to generate query embedding');
        return [];
      }
      const queryEmbedding = queryEmbeddingResult.embedding;

      // 2) Fetch all persisted component embeddings in one DB call
      const embeddingRows = await this.dbManager.getEmbeddingRepository().getEmbeddingsByType('component');
      const embeddingMap = new Map<string, { vec: number[]; hash?: string }>();
      for (const row of embeddingRows) {
        try {
          const vec = typeof row.embedding === 'string' ? JSON.parse(row.embedding) : (row as any).embedding;
          if (Array.isArray(vec)) {
            embeddingMap.set(row.entity_id, { vec, hash: (row as any).content_hash });
          }
        } catch {}
      }

      // 3) Load component metadata once and compute similarity for those with vectors
      const components = await this.dbManager.getComponentRepository().getAllComponents();
      const threshold = Number(process.env.EMBED_SIMILARITY_THRESHOLD || '0.35');
      const results: SimilaritySearchResult[] = [];
      for (const component of components) {
        const entry = embeddingMap.get(component.id);
        if (!entry) continue; // skip components without precomputed embeddings
        const similarity = this.calculateSimilarity(queryEmbedding, entry.vec);
        if (similarity >= threshold) {
          results.push({ component, similarity });
        }
      }

      return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
    } catch (error) {
      logger.error('Similarity search failed:', error);
      return [];
    }
  }

  /**
   * Get component by ID
   */
  async getComponent(id: string): Promise<IComponent | null> {
    return await this.dbManager.getComponentRepository().getComponent(id);
  }

  /**
   * Get components by file path
   */
  async getComponentsByFile(filePath: string): Promise<IComponent[]> {
    try {
      const { toProjectRelativePosix } = await import('../../../utils/PathUtils.js');
      const projectRoot = this.dbManager.getProjectPath();
      const rel = toProjectRelativePosix(filePath, projectRoot);
      return await this.dbManager.getComponentRepository().getComponentsByFile(rel);
    } catch {
      return await this.dbManager.getComponentRepository().getComponentsByFile(filePath);
    }
  }

  /**
   * Get all components (paginated)
   */
  async getAllComponents(limit?: number, offset?: number): Promise<SearchResult<IComponent>> {
    const criteria: ComponentSearchCriteria = {
      limit: limit || 50,
      offset: offset || 0
    };
    return await this.dbManager.getComponentRepository().searchComponents(criteria);
  }

  /**
   * Count total components
   */
  async getComponentCount(): Promise<number> {
    return await this.dbManager.getComponentRepository().getComponentCount();
  }

  /**
   * Get component count by type
   */
  async getComponentCountByType(): Promise<Record<string, number>> {
    return await this.dbManager.getComponentRepository().getComponentCountByType();
  }

  /**
   * Get language breakdown
   */
  async getLanguageBreakdown(): Promise<Record<string, number>> {
    return await this.dbManager.getComponentRepository().getLanguageBreakdown();
  }

  /**
   * Get all indexed files
   */
  async getIndexedFiles(): Promise<string[]> {
    return await this.dbManager.getComponentRepository().getIndexedFiles();
  }

  /**
   * Get components that need embeddings (none or stale content hash)
   */
  async getComponentsNeedingEmbeddings(): Promise<IComponent[]> {
    return await this.dbManager.getComponentRepository().getComponentsNeedingEmbeddings();
  }

  /** Backward-compat alias */
  async getComponentsWithoutEmbeddings(): Promise<IComponent[]> {
    return this.getComponentsNeedingEmbeddings();
  }

  /**
   * Generate embeddings for components in batch
   */
  async generateEmbeddingsBatch(components: IComponent[]): Promise<void> {
    try {
      logger.info(`🧠 Generating embeddings for ${components.length} components...`);
      const startTime = Date.now();
      
      // Process components in smaller batches to avoid memory issues
      const BATCH_SIZE = Number(process.env.EMBED_BATCH_SIZE || '128');
      const results = { success: 0, failed: 0 };
      
      for (let i = 0; i < components.length; i += BATCH_SIZE) {
        const batch = components.slice(i, i + BATCH_SIZE);
        
        // Generate embeddings for this batch (batched sidecar call)
        try {
          const batchVectors = await this.embeddingService.generateComponentEmbeddings(batch);
          const embeddingRepo = this.dbManager.getEmbeddingRepository();
          for (let i = 0; i < batch.length; i++) {
            const component = batch[i]!;
            const embeddingResult = batchVectors[i]!;
            const contentHash = (component as any).contentHash || computeComponentContentHash(component);
            await embeddingRepo.storeEmbedding(
              component.id,
              embeddingResult.embedding,
              String(embeddingResult.version || '1'),
              'component',
              contentHash
            );
            results.success++;
          }
        } catch (error) {
          logger.warn('Batch embedding generation failed:', error);
          results.failed += batch.length;
        }
      }
      
      const endTime = Date.now();
      logger.info(`✅ Generated embeddings for ${results.success} components (${results.failed} failed) in ${endTime - startTime}ms`);
    } catch (error) {
      logger.error('Failed to generate component embeddings in batch:', error);
    }
  }

  /**
   * Apply boolean logic to search term results
   */
  private applyBooleanLogic(
    parsedQuery: any, 
    termResults: Map<string, IComponent[]>
  ): IComponent[] {
    // Simple implementation - for a full implementation, would need to properly parse the query tree
    const allComponents = new Set<IComponent>();
    
    // For now, just combine all results (this should be improved)
    for (const components of termResults.values()) {
      components.forEach(comp => allComponents.add(comp));
    }
    
    return Array.from(allComponents);
  }

  /**
   * Get embedding for a component
   */
  private async getComponentEmbedding(component: IComponent): Promise<number[] | null> {
    // 1) Check if the component object already carries an embedding
    if ((component as any).embedding) {
      return (component as any).embedding;
    }

    // 2) Check persisted embedding repository
    try {
      const repo = this.dbManager.getEmbeddingRepository();
      const existing = await repo.getEmbedding(component.id, 'component');
      const compHash = (component as any).contentHash || computeComponentContentHash(component);
      const isFresh = existing && (existing as any).version && (existing as any);
      if (existing?.embedding && Array.isArray(existing.embedding)) {
        const existingHash = (existing as any).content_hash;
        if (!existingHash || existingHash === compHash) {
          return existing.embedding as any;
        }
      }
    } catch {}

    // 3) Generate on the fly and persist for future queries
    const result = await this.embeddingService.generateComponentEmbedding(component);
    if (result && Array.isArray(result.embedding)) {
      try {
        const contentHash = (component as any).contentHash || computeComponentContentHash(component);
        await this.dbManager.getEmbeddingRepository().storeEmbedding(
          component.id,
          result.embedding,
          String(result.version || '1'),
          'component',
          contentHash
        );
      } catch {}
      return result.embedding;
    }
    return null;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i]! * embedding2[i]!;
      norm1 += embedding1[i]! * embedding1[i]!;
      norm2 += embedding2[i]! * embedding2[i]!;
    }
    
    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}
