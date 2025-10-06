/**
 * Common storage types used across the application
 */

export interface StorageResult {
  success: boolean;
  error?: string;
  data?: any;
  affected?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

export interface StorageStats {
  componentCount: number;
  relationshipCount: number;
  fileCount: number;
  indexSize: number;
  lastUpdated: Date;
  languageBreakdown: Record<string, number>;
}