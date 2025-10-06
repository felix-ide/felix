/**
 * Generic search cache implementation with TTL support
 */

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number;
  hits: number;
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /** Maximum number of entries to store */
  maxSize?: number;
  /** Default TTL in milliseconds */
  defaultTTL?: number;
  /** Whether to track hit counts */
  trackHits?: boolean;
  /** Eviction policy: 'lru' | 'lfu' | 'fifo' */
  evictionPolicy?: 'lru' | 'lfu' | 'fifo';
}

/**
 * Generic search result cache with TTL and eviction policies
 */
export class SearchCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private accessOrder: string[] = [];
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.options = {
      maxSize: options.maxSize || 1000,
      defaultTTL: options.defaultTTL || 5 * 60 * 1000, // 5 minutes
      trackHits: options.trackHits !== false,
      evictionPolicy: options.evictionPolicy || 'lru'
    };
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return undefined;
    }

    // Update access tracking
    if (this.options.trackHits) {
      entry.hits++;
    }

    // Update LRU tracking
    if (this.options.evictionPolicy === 'lru') {
      this.updateAccessOrder(key);
    }

    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttl?: number): void {
    // Evict if necessary
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictOne();
    }

    // Clear existing timer if any
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.timers.delete(key);
    }

    // Create cache entry
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.options.defaultTTL,
      hits: 1
    };

    this.cache.set(key, entry);
    
    // Update access order
    if (this.options.evictionPolicy === 'lru') {
      this.updateAccessOrder(key);
    } else if (this.options.evictionPolicy === 'fifo') {
      if (!this.accessOrder.includes(key)) {
        this.accessOrder.push(key);
      }
    }

    // Set expiration timer
    if (entry.ttl && entry.ttl > 0) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, entry.ttl);
      this.timers.set(key, timer);
    }
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    // Clear timer
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }

    // Remove from access order
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }

    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get the current size of the cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    evictionPolicy: string;
    avgHits: number;
  } {
    let totalHits = 0;
    let entriesWithHits = 0;

    for (const entry of this.cache.values()) {
      if (entry.hits > 0) {
        totalHits += entry.hits;
        entriesWithHits++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate: entriesWithHits / Math.max(1, this.cache.size),
      evictionPolicy: this.options.evictionPolicy,
      avgHits: entriesWithHits > 0 ? totalHits / entriesWithHits : 0
    };
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict one entry based on the eviction policy
   */
  private evictOne(): void {
    let keyToEvict: string | undefined;

    switch (this.options.evictionPolicy) {
      case 'lru':
        // Least Recently Used
        keyToEvict = this.accessOrder[0];
        break;

      case 'lfu':
        // Least Frequently Used
        let minHits = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.hits < minHits) {
            minHits = entry.hits;
            keyToEvict = key;
          }
        }
        break;

      case 'fifo':
        // First In First Out
        keyToEvict = this.accessOrder[0];
        break;
    }

    if (keyToEvict) {
      this.delete(keyToEvict);
    }
  }

  /**
   * Create a cache key from multiple parts
   */
  static createKey(...parts: (string | number | boolean)[]): string {
    return parts.map(p => String(p)).join(':');
  }
}

/**
 * Specialized cache for search results with query normalization
 */
export class QueryResultCache<T> extends SearchCache<T> {
  private queryNormalizer?: (query: string) => string;

  constructor(
    options: CacheOptions = {},
    queryNormalizer?: (query: string) => string
  ) {
    super(options);
    this.queryNormalizer = queryNormalizer || ((q) => q.toLowerCase().trim());
  }

  /**
   * Get result for a query
   */
  getResult(query: string, ...additionalKeys: (string | number | boolean)[]): T | undefined {
    const normalizedQuery = this.queryNormalizer!(query);
    const key = SearchCache.createKey(normalizedQuery, ...additionalKeys);
    return this.get(key);
  }

  /**
   * Set result for a query
   */
  setResult(
    query: string,
    result: T,
    ttl?: number,
    ...additionalKeys: (string | number | boolean)[]
  ): void {
    const normalizedQuery = this.queryNormalizer!(query);
    const key = SearchCache.createKey(normalizedQuery, ...additionalKeys);
    this.set(key, result, ttl);
  }

  /**
   * Check if a query result exists
   */
  hasResult(query: string, ...additionalKeys: (string | number | boolean)[]): boolean {
    const normalizedQuery = this.queryNormalizer!(query);
    const key = SearchCache.createKey(normalizedQuery, ...additionalKeys);
    return this.has(key);
  }

  /**
   * Delete a query result
   */
  deleteResult(query: string, ...additionalKeys: (string | number | boolean)[]): boolean {
    const normalizedQuery = this.queryNormalizer!(query);
    const key = SearchCache.createKey(normalizedQuery, ...additionalKeys);
    return this.delete(key);
  }
}