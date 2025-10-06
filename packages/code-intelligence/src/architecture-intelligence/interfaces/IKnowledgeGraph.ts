/**
 * Knowledge Graph interface for dependency injection
 * This allows the architectural intelligence library to work with any knowledge graph implementation
 */

import type { IComponent, IRelationship } from '../../code-analysis-types/index.js';

/**
 * Search options for knowledge graph operations
 */
export interface KnowledgeGraphSearchOptions {
  maxDepth?: number;
  relationshipTypes?: string[];
  includeComponents?: boolean;
  includeRelationships?: boolean;
}

/**
 * Path finding result
 */
export interface KnowledgeGraphPath {
  sourceId: string;
  targetId: string;
  path: string[];
  relationships: IRelationship[];
  distance: number;
}

/**
 * Graph statistics
 */
export interface KnowledgeGraphStats {
  componentCount: number;
  relationshipCount: number;
  avgDegree: number;
  maxDegree: number;
  connectedComponents: number;
}

/**
 * Knowledge Graph interface that architectural intelligence components depend on
 */
export interface IKnowledgeGraph {
  /**
   * Add a component to the graph
   */
  addComponent(component: IComponent): Promise<void>;

  /**
   * Add a relationship to the graph
   */
  addRelationship(relationship: IRelationship): Promise<void>;

  /**
   * Get a component by ID
   */
  getComponent(id: string): Promise<IComponent | null>;

  /**
   * Get a relationship by ID
   */
  getRelationship(id: string): Promise<IRelationship | null>;

  /**
   * Update a component
   */
  updateComponent(id: string, updates: Partial<IComponent>): Promise<void>;

  /**
   * Delete a component and its relationships
   */
  deleteComponent(id: string): Promise<void>;

  /**
   * Delete a relationship
   */
  deleteRelationship(id: string): Promise<void>;

  /**
   * Find components based on criteria
   */
  findComponents(criteria: any): Promise<IComponent[]>;

  /**
   * Find relationships for a component
   */
  getRelationshipsForComponent(
    componentId: string, 
    options?: { 
      direction?: 'in' | 'out' | 'both';
      types?: string[];
    }
  ): Promise<IRelationship[]>;

  /**
   * Find path between two components
   */
  findPath(sourceId: string, targetId: string, maxDepth?: number): Promise<KnowledgeGraphPath | null>;

  /**
   * Get neighbor components
   */
  getNeighbors(
    componentId: string, 
    options?: KnowledgeGraphSearchOptions
  ): Promise<IComponent[]>;

  /**
   * Search the graph
   */
  search(query: string, options?: KnowledgeGraphSearchOptions): Promise<{
    components: IComponent[];
    relationships: IRelationship[];
  }>;

  /**
   * Get graph statistics
   */
  getStats(): Promise<KnowledgeGraphStats>;

  /**
   * Clear all cached data and rebuild adjacency lists
   */
  rebuildCache(): Promise<void>;

  /**
   * Clear all data from the knowledge graph
   */
  clear(): Promise<void>;

  /**
   * Get all components
   */
  getAllComponents(): Promise<IComponent[]>;

  /**
   * Get all relationships
   */
  getAllRelationships(): Promise<IRelationship[]>;
}