/**
 * SearchService - Orchestrates search operations across entities
 * Clean architecture following SOLID principles
 * MODIFIED FOR STALENESS TESTING
 */

import { EmbeddingService } from '../../../../nlp/EmbeddingServiceAdapter.js';
import { RerankingService } from '../../../embeddings/domain/services/RerankingService.js';
import { TextConverters } from '../../../embeddings/domain/converters/TextConverters.js';
import { IComponent, ITask, INote, IRule } from '@felix/code-intelligence';

/**
 * Search configuration
 */
export interface SearchConfig {
  limit?: number;
  entityTypes?: ('component' | 'task' | 'note' | 'rule')[];
  similarityThreshold?: number;
  rerankConfig?: {
    weights?: Record<string, number>;
    boosts?: Record<string, any>;
  };
  // Optional pre-rerank filters
  componentTypes?: string[];
  lang?: string[];
  pathInclude?: string[];
  pathExclude?: string[];
}

/**
 * Search result with metadata
 */
export interface SearchResult<T = any> {
  entity: T;
  entityType: 'component' | 'task' | 'note' | 'rule';
  similarity: number;
  finalScore?: number;
  scoringFactors?: Record<string, number>;
  highlights?: string[];
}

/**
 * Storage interface for search operations
 */
export interface SearchStorage {
  findSimilarEntities(
    queryEmbedding: number[],
    limit: number,
    entityTypes?: ('component' | 'task' | 'note' | 'rule')[],
    getters?: {
      getComponent?: (id: string) => Promise<IComponent | null>;
      getTask?: (id: string) => Promise<ITask | null>;
      getNote?: (id: string) => Promise<INote | null>;
      getRule?: (id: string) => Promise<IRule | null>;
    }
  ): Promise<Array<{
    entity: IComponent | ITask | INote | IRule;
    entityType: 'component' | 'task' | 'note' | 'rule';
    similarity: number;
  }>>;
}

/**
 * Entity getters for storage operations
 */
export interface EntityGetters {
  getComponent?: (id: string) => Promise<IComponent | null>;
  getTask?: (id: string) => Promise<ITask | null>;
  getNote?: (id: string) => Promise<INote | null>;
  getRule?: (id: string) => Promise<IRule | null>;
}

/**
 * Service for orchestrating search operations
 */
export class SearchService {
  private embeddingService: EmbeddingService;
  private rerankingService: RerankingService;
  private storage: SearchStorage;
  private entityGetters: EntityGetters;

  constructor(
    embeddingService: EmbeddingService,
    storage: SearchStorage,
    entityGetters: EntityGetters,
    rerankingService?: RerankingService
  ) {
    this.embeddingService = embeddingService;
    this.storage = storage;
    this.entityGetters = entityGetters;
    this.rerankingService = rerankingService || RerankingService.forUniversalSearch();
  }

  /**
   * Search across all entities with a text query
   */
  async search(query: string, config: SearchConfig = {}): Promise<SearchResult[]> {
    const {
      limit = 20,
      entityTypes = ['component', 'task', 'note', 'rule'],
      similarityThreshold = 0.0, // Let reranking handle filtering
      rerankConfig,
      componentTypes = [],
      lang = [],
      pathInclude = [],
      pathExclude = []
    } = config;

    // Generate query embedding
    const queryEmbedding = await this.embeddingService.getEmbedding(query);
    if (!queryEmbedding?.embedding) {
      throw new Error('Failed to generate query embedding');
    }

    // Find similar entities
    const similarEntities = await this.storage.findSimilarEntities(
      queryEmbedding.embedding,
      limit * 2, // Get more candidates for reranking
      entityTypes,
      this.entityGetters
    );

    // Convert to search results
    let results: SearchResult[] = similarEntities.map(item => ({
      entity: item.entity,
      entityType: item.entityType,
      similarity: item.similarity
    }));

    // Pre-rerank filtering to reduce candidate set
    if (componentTypes.length || lang.length || pathInclude.length || pathExclude.length) {
      results = results.filter(r => {
        if (r.entityType !== 'component') return true;
        const e: any = r.entity;
        const t = (e?.type || '').toString();
        const l = (e?.language || '').toString();
        const fp = (e?.filePath || '').toString();
        if (componentTypes.length && !componentTypes.includes(t)) return false;
        if (lang.length && !lang.includes(l)) return false;
        if (pathInclude.length && !pathInclude.some(s => fp.includes(s))) return false;
        if (pathExclude.length && pathExclude.some(s => fp.includes(s))) return false;
        return true;
      });
    }

    // Apply reranking
    const rerankedResults = this.rerankResults(results, query, rerankConfig);

    // Apply similarity threshold after reranking
    const filteredResults = rerankedResults.filter(
      r => (r.finalScore || r.similarity) >= similarityThreshold
    );

    // Return top results
    return filteredResults.slice(0, limit);
  }

  /**
   * Search for similar entities based on an existing entity
   */
  async findSimilar(
    entity: IComponent | ITask | INote | IRule,
    entityType: 'component' | 'task' | 'note' | 'rule',
    config: SearchConfig = {}
  ): Promise<SearchResult[]> {
    // Convert entity to text
    const text = this.entityToText(entity, entityType);
    
    // Use text search
    return this.search(text, {
      ...config,
      entityTypes: config.entityTypes || [entityType] // Default to same type
    });
  }

  /**
   * Search components specifically
   */
  async searchComponents(query: string, config: Omit<SearchConfig, 'entityTypes'> = {}): Promise<SearchResult<IComponent>[]> {
    const results = await this.search(query, {
      ...config,
      entityTypes: ['component']
    });

    return results as SearchResult<IComponent>[];
  }

  /**
   * Search tasks specifically
   */
  async searchTasks(query: string, config: Omit<SearchConfig, 'entityTypes'> = {}): Promise<SearchResult<ITask>[]> {
    const results = await this.search(query, {
      ...config,
      entityTypes: ['task']
    });

    return results as SearchResult<ITask>[];
  }

  /**
   * Search notes specifically
   */
  async searchNotes(query: string, config: Omit<SearchConfig, 'entityTypes'> = {}): Promise<SearchResult<INote>[]> {
    const results = await this.search(query, {
      ...config,
      entityTypes: ['note']
    });

    return results as SearchResult<INote>[];
  }

  /**
   * Search rules specifically
   */
  async searchRules(query: string, config: Omit<SearchConfig, 'entityTypes'> = {}): Promise<SearchResult<IRule>[]> {
    const results = await this.search(query, {
      ...config,
      entityTypes: ['rule']
    });

    return results as SearchResult<IRule>[];
  }

  /**
   * Apply reranking to search results
   */
  private rerankResults(
    results: SearchResult[],
    query: string,
    customConfig?: SearchConfig['rerankConfig']
  ): SearchResult[] {
    // Map to rerankable items
    const rerankableItems = results.map(r => {
      const metadata = this.getEntityMetadata(r.entity, r.entityType);
      // Prefer symbol kind for components; fall back to entityType for others
      const symbolType = r.entityType === 'component' ? (r.entity as any)?.type : undefined;
      // Attach entityType explicitly for downstream weighting
      (metadata as any).entityType = r.entityType;
      // Attach filePath when available for path-based demotion
      if (r.entityType === 'component' && (r.entity as any)?.filePath) {
        (metadata as any).filePath = (r.entity as any).filePath;
      }

      return {
        id: this.getEntityId(r.entity, r.entityType),
        name: this.getEntityName(r.entity, r.entityType),
        content: this.entityToText(r.entity, r.entityType),
        type: symbolType || r.entityType,
        similarity: r.similarity,
        metadata
      };
    });

    // Apply reranking
    const reranked = this.rerankingService.rerank(
      rerankableItems,
      query,
      customConfig
    );

    // Map back to search results
    return reranked.map((item, index) => {
      const original = results[index];
      if (!original) return results[0]!; // Fallback

      return {
        ...original,
        finalScore: (item as any).finalScore || item.similarity,
        scoringFactors: (item as any).scoringFactors
      };
    });
  }

  /**
   * Convert entity to text for embedding
   */
  private entityToText(
    entity: IComponent | ITask | INote | IRule,
    entityType: 'component' | 'task' | 'note' | 'rule'
  ): string {
    switch (entityType) {
      case 'component':
        return TextConverters.component(entity as IComponent);
      case 'task':
        return TextConverters.task(entity as ITask);
      case 'note':
        return TextConverters.note(entity as INote);
      case 'rule':
        return TextConverters.rule(entity as IRule);
      default:
        return '';
    }
  }

  /**
   * Get entity ID
   */
  private getEntityId(
    entity: any,
    entityType: 'component' | 'task' | 'note' | 'rule'
  ): string {
    switch (entityType) {
      case 'component':
        return entity.id || '';
      case 'task':
        return entity.task_id || '';
      case 'note':
        return entity.note_id || '';
      case 'rule':
        return entity.rule_id || '';
      default:
        return '';
    }
  }

  /**
   * Get entity name
   */
  private getEntityName(
    entity: any,
    entityType: 'component' | 'task' | 'note' | 'rule'
  ): string {
    switch (entityType) {
      case 'component':
        return entity.name || '';
      case 'task':
        return entity.title || '';
      case 'note':
        return entity.title || '';
      case 'rule':
        return entity.name || '';
      default:
        return '';
    }
  }

  /**
   * Get entity metadata for reranking
   */
  private getEntityMetadata(
    entity: any,
    entityType: 'component' | 'task' | 'note' | 'rule'
  ): Record<string, any> {
    const metadata: Record<string, any> = {};

    // Add updated timestamp
    if (entity.updated_at) {
      metadata.updatedAt = entity.updated_at;
    } else if (entity.created_at) {
      metadata.updatedAt = entity.created_at;
    }

    // Add relationships
    if (entity.relationships) {
      metadata.relationships = entity.relationships;
    }
    if (entity.inverseRelationships) {
      metadata.inverseRelationships = entity.inverseRelationships;
    }

    // Entity-specific metadata
    switch (entityType) {
      case 'component':
        if (entity.metadata) {
          Object.assign(metadata, entity.metadata);
        }
        break;
      case 'task':
        if (entity.task_priority) {
          metadata.priority = entity.task_priority;
        }
        if (entity.task_status) {
          metadata.status = entity.task_status;
        }
        break;
      case 'note':
        if (entity.note_type) {
          metadata.noteType = entity.note_type;
        }
        break;
      case 'rule':
        if (entity.rule_type) {
          metadata.ruleType = entity.rule_type;
        }
        if (entity.priority) {
          metadata.priority = entity.priority;
        }
        // Include analytics fields for reranking
        if (entity.acceptance_rate !== undefined) metadata.acceptance_rate = entity.acceptance_rate;
        if (entity.effectiveness_score !== undefined) metadata.effectiveness_score = entity.effectiveness_score;
        if (entity.usage_count !== undefined) metadata.usage_count = entity.usage_count;
        if (entity.last_used !== undefined) metadata.last_used = entity.last_used;
        break;
    }

    return metadata;
  }

  /**
   * Create a specialized search service for components
   */
  static forComponents(
    embeddingService: EmbeddingService,
    storage: SearchStorage,
    entityGetters: EntityGetters
  ): SearchService {
    return new SearchService(
      embeddingService,
      storage,
      entityGetters,
      RerankingService.forComponents()
    );
  }

  /**
   * Create a search service with custom reranking
   */
  static withCustomReranking(
    embeddingService: EmbeddingService,
    storage: SearchStorage,
    entityGetters: EntityGetters,
    rerankingService: RerankingService
  ): SearchService {
    return new SearchService(
      embeddingService,
      storage,
      entityGetters,
      rerankingService
    );
  }
}
