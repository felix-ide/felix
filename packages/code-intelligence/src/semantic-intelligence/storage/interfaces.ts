/**
 * Storage interfaces for semantic search
 */

import type { EmbeddingResult } from '../types.js';

/**
 * Storage adapter for embeddings and searchable content
 */
export interface IEmbeddingStorage {
  /**
   * Initialize the storage adapter
   */
  initialize(): Promise<void>;

  /**
   * Check if storage is ready
   */
  isReady(): boolean;

  /**
   * Store an embedding for an entity
   */
  storeEmbedding(
    entityId: string,
    embedding: number[],
    metadata?: {
      model?: string;
      version?: string;
      entityType?: string;
      [key: string]: any;
    }
  ): Promise<void>;

  /**
   * Store multiple embeddings in batch
   */
  storeEmbeddings(
    embeddings: Array<{
      entityId: string;
      embedding: number[];
      metadata?: Record<string, any>;
    }>
  ): Promise<void>;

  /**
   * Get embedding for an entity
   */
  getEmbedding(entityId: string): Promise<{
    embedding: number[];
    metadata?: Record<string, any>;
  } | null>;

  /**
   * Find similar entities based on embedding similarity
   */
  findSimilar(
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
  }>>;

  /**
   * Delete an embedding
   */
  deleteEmbedding(entityId: string): Promise<void>;

  /**
   * Delete multiple embeddings
   */
  deleteEmbeddings(entityIds: string[]): Promise<void>;

  /**
   * Clear all embeddings (use with caution)
   */
  clear(): Promise<void>;

  /**
   * Close the storage connection
   */
  close(): Promise<void>;
}

/**
 * Factory for creating storage adapters
 */
export interface IStorageFactory {
  createStorage(type: string, options?: any): IEmbeddingStorage;
  registerAdapter(type: string, adapter: new (options?: any) => IEmbeddingStorage): void;
}

/**
 * In-memory storage options
 */
export interface MemoryStorageOptions {
  maxItems?: number;
  ttl?: number; // Time to live in milliseconds
}

/**
 * SQLite storage options
 */
export interface SQLiteStorageOptions {
  path: string;
  tableName?: string;
  createTable?: boolean;
}