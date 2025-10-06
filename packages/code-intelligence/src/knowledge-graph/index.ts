/**
 * @felix/knowledge-graph
 * 
 * Generic knowledge graph library for managing entities and relationships
 * Version: 0.1.0
 */

// Core classes
export { KnowledgeGraph } from './core/KnowledgeGraph.js';
export type { GraphSearchOptions, GraphPath, GraphStats } from './core/KnowledgeGraph.js';

// Interfaces
export type { IGraphEntity, IGraphRelationship } from './interfaces/IGraphEntity.js';
export type { 
  IGraphStorageAdapter,
  EntitySearchCriteria,
  RelationshipSearchCriteria,
  SearchResult,
  StorageStats,
  OperationResult
} from './interfaces/IGraphStorageAdapter.js';

// Utilities
export { RelationshipInverter } from './utils/RelationshipInverter.js';
export type { InverseRelationshipConfig } from './utils/RelationshipInverter.js';
export { 
  filterRelationshipsByDirection, 
  getRelationshipsWithInverses 
} from './utils/RelationshipInverter.js';
export { createFelixRelationshipConfig } from './utils/FelixRelationshipConfig.js';


// Re-export types from code-analysis-types for convenience when using with Felix
export type { 
  IComponent, 
  IRelationship, 
  RelationshipType,
  ComponentType
} from '../code-analysis-types/index.js';
