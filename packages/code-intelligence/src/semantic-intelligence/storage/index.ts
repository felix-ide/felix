/**
 * Storage module exports
 */

export type {
  IEmbeddingStorage,
  IStorageFactory,
  MemoryStorageOptions,
  SQLiteStorageOptions
} from './interfaces.js';

export { BaseAdapter } from './BaseAdapter.js';
export { MemoryAdapter } from './MemoryAdapter.js';
export {
  StorageFactory,
  createStorage,
  registerStorageAdapter
} from './StorageFactory.js';