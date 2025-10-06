/**
 * Base adapter for embedding storage
 */

import type { IEmbeddingStorage } from './interfaces.js';
import { cosineSimilarity } from '../search/similarity.js';

export abstract class BaseAdapter implements IEmbeddingStorage {
  protected _isReady: boolean = false;

  abstract initialize(): Promise<void>;
  
  isReady(): boolean {
    return this._isReady;
  }

  abstract storeEmbedding(
    entityId: string,
    embedding: number[],
    metadata?: Record<string, any>
  ): Promise<void>;

  abstract storeEmbeddings(
    embeddings: Array<{
      entityId: string;
      embedding: number[];
      metadata?: Record<string, any>;
    }>
  ): Promise<void>;

  abstract getEmbedding(entityId: string): Promise<{
    embedding: number[];
    metadata?: Record<string, any>;
  } | null>;

  abstract deleteEmbedding(entityId: string): Promise<void>;
  abstract deleteEmbeddings(entityIds: string[]): Promise<void>;
  abstract clear(): Promise<void>;
  abstract close(): Promise<void>;

  /**
   * Default implementation of findSimilar using brute force search
   * Subclasses can override for more efficient implementations
   */
  async findSimilar(
    queryEmbedding: number[],
    options?: {
      limit?: number;
      threshold?: number;
      entityTypes?: string[];
      filter?: Record<string, any>;
    }
  ): Promise<Array<{
    entityId: string;
    similarity: number;
    metadata?: Record<string, any>;
  }>> {
    const limit = options?.limit || 10;
    const threshold = options?.threshold || 0.0;

    // This is a basic implementation that should be overridden
    // by subclasses for better performance
    const allEmbeddings = await this.getAllEmbeddings();
    
    const results = allEmbeddings
      .map(item => ({
        ...item,
        similarity: cosineSimilarity(queryEmbedding, item.embedding)
      }))
      .filter(item => {
        // Apply similarity threshold
        if (item.similarity < threshold) return false;
        
        // Apply entity type filter
        if (options?.entityTypes && options.entityTypes.length > 0) {
          const itemType = item.metadata?.type;
          if (!itemType || !options.entityTypes.includes(itemType)) {
            return false;
          }
        }
        
        // Apply custom filter
        if (options?.filter) {
          for (const [key, value] of Object.entries(options.filter)) {
            if (item.metadata?.[key] !== value) {
              return false;
            }
          }
        }
        
        return true;
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return results;
  }

  /**
   * Get all embeddings - to be implemented by subclasses
   * This is used by the default findSimilar implementation
   */
  protected abstract getAllEmbeddings(): Promise<Array<{
    entityId: string;
    embedding: number[];
    metadata?: Record<string, any>;
  }>>;
}