/**
 * Generic storage adapter interface for the knowledge graph
 */

import { IGraphEntity, IGraphRelationship } from './IGraphEntity.js';
import { RelationshipSearchCriteria } from '../../code-analysis-types/index.js';

export interface EntitySearchCriteria {
  id?: string | string[];
  type?: string | string[];
  name?: string;
  query?: string;
  metadata?: Record<string, any>;
  limit?: number;
  offset?: number;
}

// RelationshipSearchCriteria is imported from code-analysis-types above
export { RelationshipSearchCriteria } from '../../code-analysis-types/index.js';

export interface SearchResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface StorageStats {
  entityCount: number;
  relationshipCount: number;
  [key: string]: any;
}

export interface OperationResult {
  success: boolean;
  affected?: number;
  error?: string;
}

/**
 * Storage adapter interface for persisting graph data
 */
export interface IGraphStorageAdapter<
  TEntity extends IGraphEntity = IGraphEntity,
  TRelationship extends IGraphRelationship = IGraphRelationship
> {
  // Initialize the storage
  initialize?(): Promise<void>;
  
  // Entity operations
  storeEntity(entity: TEntity): Promise<OperationResult>;
  storeEntities?(entities: TEntity[]): Promise<OperationResult>;
  getEntity(id: string): Promise<TEntity | null>;
  updateEntity(entity: TEntity): Promise<OperationResult>;
  deleteEntity(id: string): Promise<OperationResult>;
  searchEntities(criteria: EntitySearchCriteria): Promise<SearchResult<TEntity>>;
  getAllEntities?(): Promise<TEntity[]>;
  
  // Relationship operations
  storeRelationship(relationship: TRelationship): Promise<OperationResult>;
  storeRelationships?(relationships: TRelationship[]): Promise<OperationResult>;
  getRelationship(id: string): Promise<TRelationship | null>;
  updateRelationship?(relationship: TRelationship): Promise<OperationResult>;
  deleteRelationship(id: string): Promise<OperationResult>;
  searchRelationships(criteria: RelationshipSearchCriteria): Promise<SearchResult<TRelationship>>;
  getAllRelationships?(): Promise<TRelationship[]>;
  
  // Utility operations
  getStats(): Promise<StorageStats>;
  clear?(): Promise<void>;
  close?(): Promise<void>;
}