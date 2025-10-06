/**
 * Factory for creating storage adapters
 */

import type { IEmbeddingStorage, IStorageFactory } from './interfaces.js';
import { MemoryAdapter } from './MemoryAdapter.js';

export class StorageFactory implements IStorageFactory {
  private static instance: StorageFactory;
  private adapters: Map<string, new (options?: any) => IEmbeddingStorage> = new Map();

  private constructor() {
    // Register default adapters
    this.registerAdapter('memory', MemoryAdapter);
  }

  static getInstance(): StorageFactory {
    if (!StorageFactory.instance) {
      StorageFactory.instance = new StorageFactory();
    }
    return StorageFactory.instance;
  }

  createStorage(type: string, options?: any): IEmbeddingStorage {
    const AdapterClass = this.adapters.get(type);
    if (!AdapterClass) {
      throw new Error(`Unknown storage adapter type: ${type}`);
    }
    return new AdapterClass(options);
  }

  registerAdapter(type: string, adapter: new (options?: any) => IEmbeddingStorage): void {
    this.adapters.set(type, adapter);
  }

  /**
   * Get list of registered adapter types
   */
  getAdapterTypes(): string[] {
    return Array.from(this.adapters.keys());
  }
}

/**
 * Convenience function to create storage
 */
export function createStorage(type: string, options?: any): IEmbeddingStorage {
  return StorageFactory.getInstance().createStorage(type, options);
}

/**
 * Convenience function to register a custom adapter
 */
export function registerStorageAdapter(
  type: string,
  adapter: new (options?: any) => IEmbeddingStorage
): void {
  StorageFactory.getInstance().registerAdapter(type, adapter);
}