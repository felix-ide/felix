/**
 * ContextCache - LRU cache for frequently accessed contexts
 * Improves performance for repeated context queries
 */

import { logger } from '../../shared/logger.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

interface CacheOptions {
  maxSize?: number;
  ttlMs?: number;
  enableStats?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

/**
 * LRU Cache implementation with TTL support
 */
export class ContextCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private ttlMs: number;
  private stats: CacheStats;
  private enableStats: boolean;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 1000;
    this.ttlMs = options.ttlMs || 5 * 60 * 1000; // 5 minutes default
    this.enableStats = options.enableStats !== false;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      hitRate: 0,
    };
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.enableStats) this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Check TTL
    const age = Date.now() - entry.timestamp;
    if (age > this.ttlMs) {
      this.cache.delete(key);
      if (this.enableStats) this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Update LRU - move to end
    this.cache.delete(key);
    entry.hits++;
    this.cache.set(key, entry);

    if (this.enableStats) this.stats.hits++;
    this.updateHitRate();

    return entry.data;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): void {
    // Remove if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value as string | undefined;
      if (firstKey) {
        this.cache.delete(firstKey);
        if (this.enableStats) this.stats.evictions++;
      }
    }

    // Add new entry
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      hits: 0,
    });

    if (this.enableStats) {
      this.stats.size = this.cache.size;
    }
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string | undefined): boolean {
    if (!key) return false;
    const result = this.cache.delete(key);
    if (this.enableStats && result) {
      this.stats.size = this.cache.size;
    }
    return result;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    if (this.enableStats) {
      this.stats.size = 0;
    }
  }

  /**
   * Invalidate entries matching a pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of Array.from(this.cache.keys())) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (this.enableStats) {
      this.stats.size = this.cache.size;
    }
    return count;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    if (!this.enableStats) return;
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > this.ttlMs) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (this.enableStats && removed > 0) {
      this.stats.size = this.cache.size;
    }

    return removed;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * Generate cache key for component context
 */
export function generateContextCacheKey(
  componentId: string,
  options: {
    lens?: string;
    depth?: number;
    relationshipTypes?: string[];
  } = {}
): string {
  const parts = [
    `ctx:${componentId}`,
    options.lens ? `lens:${options.lens}` : '',
    options.depth ? `depth:${options.depth}` : '',
    options.relationshipTypes ? `types:${options.relationshipTypes.sort().join(',')}` : '',
  ].filter(Boolean);

  return parts.join('|');
}

/**
 * Global context cache instance
 */
export const contextCache = new ContextCache({
  maxSize: 500,
  ttlMs: 5 * 60 * 1000, // 5 minutes
  enableStats: true,
});

/**
 * Invalidate context cache for a file
 */
export function invalidateFileContexts(filePath: string): number {
  const pattern = new RegExp(`^ctx:.*\\|.*${filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  const count = contextCache.invalidatePattern(pattern);
  logger.debug(`Invalidated ${count} context cache entries for file: ${filePath}`);
  return count;
}

/**
 * Invalidate context cache for a component
 */
export function invalidateComponentContext(componentId: string): number {
  const pattern = new RegExp(`^ctx:${componentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  const count = contextCache.invalidatePattern(pattern);
  logger.debug(`Invalidated ${count} context cache entries for component: ${componentId}`);
  return count;
}

/**
 * Periodic cleanup task
 */
export function startCacheCleanup(intervalMs: number = 60000): NodeJS.Timeout {
  const interval = setInterval(() => {
    const removed = contextCache.cleanup();
    if (removed > 0) {
      logger.debug(`Cache cleanup removed ${removed} expired entries`);
    }

    // Log stats
    const stats = contextCache.getStats();
    logger.debug('Cache stats:', {
      size: stats.size,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: (stats.hitRate * 100).toFixed(2) + '%',
    });
  }, intervalMs);

  return interval;
}
