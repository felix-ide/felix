/**
 * In-memory storage adapter for embeddings
 * Useful for testing and small datasets
 */

import { BaseAdapter } from './BaseAdapter.js';
import type { MemoryStorageOptions } from './interfaces.js';

interface StoredEmbedding {
  entityId: string;
  embedding: number[];
  metadata?: Record<string, any>;
  timestamp: number;
}

export class MemoryAdapter extends BaseAdapter {
  private storage: Map<string, StoredEmbedding> = new Map();
  private options: MemoryStorageOptions;

  constructor(options: MemoryStorageOptions = {}) {
    super();
    this.options = {
      maxItems: options.maxItems || 10000,
      ttl: options.ttl || 0 // 0 means no expiration
    };
  }

  async initialize(): Promise<void> {
    this._isReady = true;
  }

  async storeEmbedding(
    entityId: string,
    embedding: number[],
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this._isReady) {
      throw new Error('Storage adapter not initialized');
    }

    // Check size limit
    if (this.storage.size >= this.options.maxItems! && !this.storage.has(entityId)) {
      // Remove oldest entry
      const oldestKey = this.storage.keys().next().value;
      if (oldestKey) {
        this.storage.delete(oldestKey);
      }
    }

    this.storage.set(entityId, {
      entityId,
      embedding: [...embedding], // Clone array
      metadata: metadata ? { ...metadata } : undefined,
      timestamp: Date.now()
    });
  }

  async storeEmbeddings(
    embeddings: Array<{
      entityId: string;
      embedding: number[];
      metadata?: Record<string, any>;
    }>
  ): Promise<void> {
    for (const item of embeddings) {
      await this.storeEmbedding(item.entityId, item.embedding, item.metadata);
    }
  }

  async getEmbedding(entityId: string): Promise<{
    embedding: number[];
    metadata?: Record<string, any>;
  } | null> {
    if (!this._isReady) {
      throw new Error('Storage adapter not initialized');
    }

    const stored = this.storage.get(entityId);
    if (!stored) {
      return null;
    }

    // Check TTL
    if (this.options.ttl! > 0 && Date.now() - stored.timestamp > this.options.ttl!) {
      this.storage.delete(entityId);
      return null;
    }

    return {
      embedding: [...stored.embedding], // Clone array
      metadata: stored.metadata ? { ...stored.metadata } : undefined
    };
  }

  async deleteEmbedding(entityId: string): Promise<void> {
    if (!this._isReady) {
      throw new Error('Storage adapter not initialized');
    }
    this.storage.delete(entityId);
  }

  async deleteEmbeddings(entityIds: string[]): Promise<void> {
    if (!this._isReady) {
      throw new Error('Storage adapter not initialized');
    }
    for (const id of entityIds) {
      this.storage.delete(id);
    }
  }

  async clear(): Promise<void> {
    if (!this._isReady) {
      throw new Error('Storage adapter not initialized');
    }
    this.storage.clear();
  }

  async close(): Promise<void> {
    this.storage.clear();
    this._isReady = false;
  }

  protected async getAllEmbeddings(): Promise<Array<{
    entityId: string;
    embedding: number[];
    metadata?: Record<string, any>;
  }>> {
    if (!this._isReady) {
      throw new Error('Storage adapter not initialized');
    }

    const results: Array<{
      entityId: string;
      embedding: number[];
      metadata?: Record<string, any>;
    }> = [];

    // Clean expired entries and collect valid ones
    const now = Date.now();
    for (const [entityId, stored] of this.storage.entries()) {
      if (this.options.ttl! > 0 && now - stored.timestamp > this.options.ttl!) {
        this.storage.delete(entityId);
        continue;
      }

      results.push({
        entityId,
        embedding: [...stored.embedding],
        metadata: stored.metadata ? { ...stored.metadata } : undefined
      });
    }

    return results;
  }

  /**
   * Get statistics about the storage
   */
  getStats() {
    return {
      size: this.storage.size,
      maxItems: this.options.maxItems,
      ttl: this.options.ttl
    };
  }
}