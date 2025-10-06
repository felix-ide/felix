/**
 * Generic types for semantic search library
 */

/**
 * A searchable entity that can have embeddings
 */
export interface Searchable {
  id: string;
  [key: string]: any;  // Allow any additional properties
}

/**
 * Embedding result with metadata
 */
export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
  version: number;
}

/**
 * Search result with similarity score
 */
export interface EmbeddingSearchResult<T = Searchable> {
  entity: T;
  similarity: number;
}

/**
 * Storage adapter interface for embeddings
 */
export interface EmbeddingStorage {
  storeEmbedding(entityId: string, embedding: number[], version: string, entityType?: string): Promise<StorageResult>;
  getEmbedding(entityId: string, entityType?: string): Promise<{embedding: number[], version: string} | null>;
  findSimilarEntities(queryEmbedding: number[], limit?: number, entityTypes?: string[]): Promise<Array<{
    entity: any,
    entityType: string,
    similarity: number
  }>>;
}

/**
 * Storage operation result
 */
export interface StorageResult {
  success: boolean;
  affectedRows?: number;
  error?: string;
}

/**
 * Configuration for the embedding service
 */
export interface EmbeddingServiceOptions {
  model?: string;
  maxTextLength?: number;
  cacheSize?: number;
  batchSize?: number;
  useWebGPU?: boolean;
  useOptimized?: boolean;
}

/**
 * Text to embedding converter function
 */
export type TextConverter<T> = (entity: T) => string;