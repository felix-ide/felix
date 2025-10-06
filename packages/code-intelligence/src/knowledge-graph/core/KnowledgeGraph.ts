/**
 * Knowledge Graph - Core graph data structure for entities and relationships
 */

import { IGraphEntity, IGraphRelationship } from '../interfaces/IGraphEntity.js';
import { 
  IGraphStorageAdapter, 
  EntitySearchCriteria, 
  RelationshipSearchCriteria 
} from '../interfaces/IGraphStorageAdapter.js';

/**
 * Search options for graph operations
 */
export interface GraphSearchOptions {
  maxDepth?: number;
  relationshipTypes?: string[];
  includeEntities?: boolean;
  includeRelationships?: boolean;
}

/**
 * Path finding result
 */
export interface GraphPath<TRelationship extends IGraphRelationship = IGraphRelationship> {
  sourceId: string;
  targetId: string;
  path: string[];
  relationships: TRelationship[];
  distance: number;
}

/**
 * Graph statistics
 */
export interface GraphStats {
  entityCount: number;
  relationshipCount: number;
  avgDegree: number;
  maxDegree: number;
  connectedComponents: number;
}

/**
 * Generic Knowledge Graph class for managing entities and relationships
 */
export class KnowledgeGraph<
  TEntity extends IGraphEntity = IGraphEntity,
  TRelationship extends IGraphRelationship = IGraphRelationship
> {
  private storage: IGraphStorageAdapter<TEntity, TRelationship>;
  private entityCache: Map<string, TEntity> = new Map();
  private relationshipCache: Map<string, TRelationship> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();
  private reverseAdjacencyList: Map<string, Set<string>> = new Map();

  constructor(storage: IGraphStorageAdapter<TEntity, TRelationship>) {
    this.storage = storage;
  }

  /**
   * Add an entity to the graph
   */
  async addEntity(entity: TEntity): Promise<void> {
    const result = await this.storage.storeEntity(entity);
    if (result.success) {
      this.entityCache.set(entity.id, entity);
      
      // Initialize adjacency lists if not present
      if (!this.adjacencyList.has(entity.id)) {
        this.adjacencyList.set(entity.id, new Set());
      }
      if (!this.reverseAdjacencyList.has(entity.id)) {
        this.reverseAdjacencyList.set(entity.id, new Set());
      }
    } else {
      throw new Error(`Failed to add entity: ${result.error}`);
    }
  }

  /**
   * Add a component to the graph (alias for compatibility)
   */
  async addComponent(component: TEntity): Promise<void> {
    return this.addEntity(component);
  }

  /**
   * Add a relationship to the graph
   */
  async addRelationship(relationship: TRelationship): Promise<void> {
    const result = await this.storage.storeRelationship(relationship);
    if (result.success) {
      this.relationshipCache.set(relationship.id, relationship);
      
      // Update adjacency lists
      if (!this.adjacencyList.has(relationship.sourceId)) {
        this.adjacencyList.set(relationship.sourceId, new Set());
      }
      if (!this.reverseAdjacencyList.has(relationship.targetId)) {
        this.reverseAdjacencyList.set(relationship.targetId, new Set());
      }
      
      this.adjacencyList.get(relationship.sourceId)!.add(relationship.targetId);
      this.reverseAdjacencyList.get(relationship.targetId)!.add(relationship.sourceId);
    } else {
      throw new Error(`Failed to add relationship: ${result.error}`);
    }
  }

  /**
   * Get an entity by ID
   */
  async getEntity(id: string): Promise<TEntity | null> {
    // Check cache first
    if (this.entityCache.has(id)) {
      return this.entityCache.get(id)!;
    }
    
    // Fetch from storage
    const entity = await this.storage.getEntity(id);
    if (entity) {
      this.entityCache.set(id, entity);
    }
    return entity;
  }

  /**
   * Get a component by ID (alias for compatibility)
   */
  async getComponent(id: string): Promise<TEntity | null> {
    return this.getEntity(id);
  }

  /**
   * Get a relationship by ID
   */
  async getRelationship(id: string): Promise<TRelationship | null> {
    // Check cache first
    if (this.relationshipCache.has(id)) {
      return this.relationshipCache.get(id)!;
    }
    
    // Fetch from storage
    const relationship = await this.storage.getRelationship(id);
    if (relationship) {
      this.relationshipCache.set(id, relationship);
    }
    return relationship;
  }

  /**
   * Update an entity
   */
  async updateEntity(id: string, updates: Partial<TEntity>): Promise<void> {
    const existing = await this.getEntity(id);
    if (!existing) {
      throw new Error(`Entity ${id} not found`);
    }
    
    const updatedEntity: TEntity = { ...existing, ...updates };
    const result = await this.storage.updateEntity(updatedEntity);
    if (result.success) {
      // Update cache
      this.entityCache.set(id, updatedEntity);
    } else {
      throw new Error(`Failed to update entity: ${result.error}`);
    }
  }

  /**
   * Update a component (alias for compatibility)
   */
  async updateComponent(id: string, updates: Partial<TEntity>): Promise<void> {
    return this.updateEntity(id, updates);
  }

  /**
   * Delete an entity and its relationships
   */
  async deleteEntity(id: string): Promise<void> {
    // Get all relationships involving this entity
    const incomingRels = await this.storage.searchRelationships({ targetId: id });
    const outgoingRels = await this.storage.searchRelationships({ sourceId: id });
    
    // Delete all relationships
    for (const rel of [...incomingRels.items, ...outgoingRels.items]) {
      await this.storage.deleteRelationship(rel.id);
      this.relationshipCache.delete(rel.id);
    }
    
    // Delete the entity
    const result = await this.storage.deleteEntity(id);
    if (result.success) {
      this.entityCache.delete(id);
      this.adjacencyList.delete(id);
      this.reverseAdjacencyList.delete(id);
      
      // Remove from other adjacency lists
      for (const neighbors of this.adjacencyList.values()) {
        neighbors.delete(id);
      }
      for (const neighbors of this.reverseAdjacencyList.values()) {
        neighbors.delete(id);
      }
    } else {
      throw new Error(`Failed to delete entity: ${result.error}`);
    }
  }

  /**
   * Delete a component (alias for compatibility)
   */
  async deleteComponent(id: string): Promise<void> {
    return this.deleteEntity(id);
  }

  /**
   * Delete a relationship
   */
  async deleteRelationship(id: string): Promise<void> {
    const relationship = await this.getRelationship(id);
    if (!relationship) {
      throw new Error(`Relationship ${id} not found`);
    }
    
    const result = await this.storage.deleteRelationship(id);
    if (result.success) {
      this.relationshipCache.delete(id);
      
      // Update adjacency lists
      const sourceNeighbors = this.adjacencyList.get(relationship.sourceId);
      if (sourceNeighbors) {
        sourceNeighbors.delete(relationship.targetId);
      }
      
      const targetNeighbors = this.reverseAdjacencyList.get(relationship.targetId);
      if (targetNeighbors) {
        targetNeighbors.delete(relationship.sourceId);
      }
    } else {
      throw new Error(`Failed to delete relationship: ${result.error}`);
    }
  }

  /**
   * Search for entities
   */
  async findEntities(criteria: EntitySearchCriteria): Promise<TEntity[]> {
    const result = await this.storage.searchEntities(criteria);
    
    // Update cache with found entities
    for (const entity of result.items) {
      this.entityCache.set(entity.id, entity);
    }
    
    return result.items;
  }

  /**
   * Find components (alias for compatibility)
   */
  async findComponents(criteria: EntitySearchCriteria): Promise<TEntity[]> {
    return this.findEntities(criteria);
  }

  /**
   * Find relationships for an entity
   */
  async getRelationshipsForEntity(
    entityId: string, 
    options: { 
      direction?: 'in' | 'out' | 'both';
      types?: string[];
    } = {}
  ): Promise<TRelationship[]> {
    const { direction = 'both', types } = options;
    const relationships: TRelationship[] = [];
    
    // Get outgoing relationships
    if (direction === 'out' || direction === 'both') {
      const criteria: RelationshipSearchCriteria = { sourceId: entityId };
      if (types) {
        criteria.type = types;
      }
      const outgoing = await this.storage.searchRelationships(criteria);
      relationships.push(...outgoing.items);
    }
    
    // Get incoming relationships
    if (direction === 'in' || direction === 'both') {
      const criteria: RelationshipSearchCriteria = { targetId: entityId };
      if (types) {
        criteria.type = types;
      }
      const incoming = await this.storage.searchRelationships(criteria);
      relationships.push(...incoming.items);
    }
    
    // Update cache
    for (const rel of relationships) {
      this.relationshipCache.set(rel.id, rel);
    }
    
    return relationships;
  }

  /**
   * Get relationships for component (alias for compatibility)
   */
  async getRelationshipsForComponent(
    componentId: string,
    options: { direction?: 'in' | 'out' | 'both'; types?: string[] } = {}
  ): Promise<TRelationship[]> {
    return this.getRelationshipsForEntity(componentId, options);
  }

  /**
   * Find path between two entities
   */
  async findPath(sourceId: string, targetId: string, maxDepth: number = 5): Promise<GraphPath<TRelationship> | null> {
    // Breadth-first search
    const queue: Array<{ nodeId: string; path: string[]; relationships: TRelationship[] }> = [
      { nodeId: sourceId, path: [sourceId], relationships: [] }
    ];
    const visited = new Set<string>();
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current.path.length > maxDepth + 1) {
        continue;
      }
      
      if (current.nodeId === targetId) {
        return {
          sourceId,
          targetId,
          path: current.path,
          relationships: current.relationships,
          distance: current.path.length - 1
        };
      }
      
      if (visited.has(current.nodeId)) {
        continue;
      }
      visited.add(current.nodeId);
      
      // Get neighbors from adjacency list
      const neighbors = this.adjacencyList.get(current.nodeId);
      if (neighbors) {
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            // Find the relationship between current and neighbor
            const relationships = await this.storage.searchRelationships({
              sourceId: current.nodeId,
              targetId: neighborId
            });
            
            if (relationships.items.length > 0) {
              const relationship = relationships.items[0];
              if (relationship) {
                queue.push({
                  nodeId: neighborId,
                  path: [...current.path, neighborId],
                  relationships: [...current.relationships, relationship]
                });
              }
            }
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Get neighbor entities
   */
  async getNeighbors(
    entityId: string, 
    options: GraphSearchOptions = {}
  ): Promise<TEntity[]> {
    const { maxDepth = 1, relationshipTypes, includeEntities = true } = options;
    const neighbors = new Set<string>();
    const visited = new Set<string>();
    
    const traverse = async (nodeId: string, depth: number) => {
      if (depth > maxDepth || visited.has(nodeId)) {
        return;
      }
      visited.add(nodeId);
      
      const relationshipOptions: { direction?: 'in' | 'out' | 'both'; types?: string[] } = {};
      if (relationshipTypes) {
        relationshipOptions.types = relationshipTypes;
      }
      const relationships = await this.getRelationshipsForEntity(nodeId, relationshipOptions);
      
      for (const rel of relationships) {
        const neighborId = rel.sourceId === nodeId ? rel.targetId : rel.sourceId;
        if (neighborId !== entityId) {
          neighbors.add(neighborId);
          if (depth < maxDepth) {
            await traverse(neighborId, depth + 1);
          }
        }
      }
    };
    
    await traverse(entityId, 0);
    
    // Fetch entities
    const entities: TEntity[] = [];
    for (const neighborId of neighbors) {
      const entity = await this.getEntity(neighborId);
      if (entity && includeEntities) {
        entities.push(entity);
      }
    }
    
    return entities;
  }

  /**
   * Search the graph
   */
  async search(query: string, options: GraphSearchOptions = {}): Promise<{
    entities: TEntity[];
    relationships: TRelationship[];
  }> {
    const { includeEntities = true, includeRelationships = true } = options;
    
    const results = {
      entities: [] as TEntity[],
      relationships: [] as TRelationship[]
    };
    
    if (includeEntities) {
      const entityResults = await this.storage.searchEntities({ query });
      results.entities = entityResults.items;
    }
    
    if (includeRelationships) {
      // Search relationships by type or metadata
      const relationshipResults = await this.storage.searchRelationships({});
      results.relationships = relationshipResults.items.filter(rel => 
        rel.type.includes(query) || 
        JSON.stringify(rel.metadata).includes(query)
      );
    }
    
    return results;
  }

  /**
   * Get graph statistics
   */
  async getStats(): Promise<GraphStats> {
    const storageStats = await this.storage.getStats();
    
    // Calculate additional graph metrics
    let totalDegree = 0;
    let maxDegree = 0;
    
    for (const neighbors of this.adjacencyList.values()) {
      const degree = neighbors.size;
      totalDegree += degree;
      maxDegree = Math.max(maxDegree, degree);
    }
    
    const avgDegree = this.adjacencyList.size > 0 ? totalDegree / this.adjacencyList.size : 0;

    // Compute connected components over an undirected view of the graph.
    const connectedComponents = this.computeConnectedComponents(storageStats.entityCount);

    return {
      entityCount: storageStats.entityCount,
      relationshipCount: storageStats.relationshipCount,
      avgDegree,
      maxDegree,
      connectedComponents
    };
  }

  /**
   * Calculate connected components using BFS on an undirected projection of the graph.
   * Counts isolated entities (no edges) based on storageStats.entityCount.
   */
  private computeConnectedComponents(totalEntities: number): number {
    // Build set of nodes known via relationships
    const nodes = new Set<string>();
    for (const k of this.adjacencyList.keys()) nodes.add(k);
    for (const k of this.reverseAdjacencyList.keys()) nodes.add(k);

    // BFS/DFS over undirected neighbors (out + in)
    const visited = new Set<string>();
    let comps = 0;

    const getNeighbors = (id: string): string[] => {
      const out = this.adjacencyList.get(id);
      const inc = this.reverseAdjacencyList.get(id);
      const set = new Set<string>();
      if (out) for (const t of out) set.add(t);
      if (inc) for (const s of inc) set.add(s);
      return Array.from(set);
    };

    for (const id of nodes) {
      if (visited.has(id)) continue;
      comps++;
      const queue: string[] = [id];
      visited.add(id);
      while (queue.length) {
        const cur = queue.shift()!;
        for (const nb of getNeighbors(cur)) {
          if (!visited.has(nb)) {
            visited.add(nb);
            queue.push(nb);
          }
        }
      }
    }

    // Count isolated entities not present in adjacency maps
    const nodesWithEdges = nodes.size;
    const isolated = Math.max(0, totalEntities - nodesWithEdges);
    return comps + isolated;
  }

  /**
   * Clear all cached data and rebuild adjacency lists
   */
  async rebuildCache(): Promise<void> {
    this.entityCache.clear();
    this.relationshipCache.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
    
    // Rebuild adjacency lists from storage
    const allRelationships = await this.storage.searchRelationships({});
    for (const rel of allRelationships.items) {
      if (!this.adjacencyList.has(rel.sourceId)) {
        this.adjacencyList.set(rel.sourceId, new Set());
      }
      if (!this.reverseAdjacencyList.has(rel.targetId)) {
        this.reverseAdjacencyList.set(rel.targetId, new Set());
      }
      
      this.adjacencyList.get(rel.sourceId)!.add(rel.targetId);
      this.reverseAdjacencyList.get(rel.targetId)!.add(rel.sourceId);
    }
  }

  /**
   * Clear all data from the knowledge graph
   */
  async clear(): Promise<void> {
    // Clear storage if it supports clearing
    if (this.storage.clear) {
      await this.storage.clear();
    } else {
      // Fallback: get all entities and delete them one by one
      const allEntities = await this.storage.searchEntities({});
      for (const entity of allEntities.items) {
        await this.deleteEntity(entity.id);
      }
    }
    
    // Clear caches
    this.entityCache.clear();
    this.relationshipCache.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
  }

  /**
   * Get all entities
   */
  async getAllEntities(): Promise<TEntity[]> {
    if (this.storage.getAllEntities) {
      return this.storage.getAllEntities();
    }
    const result = await this.storage.searchEntities({});
    return result.items;
  }

  /**
   * Get all components (alias for compatibility)
   */
  async getAllComponents(): Promise<TEntity[]> {
    return this.getAllEntities();
  }

  /**
   * Get all relationships
   */
  async getAllRelationships(): Promise<TRelationship[]> {
    if (this.storage.getAllRelationships) {
      return this.storage.getAllRelationships();
    }
    const result = await this.storage.searchRelationships({});
    return result.items;
  }

  /**
   * Get the underlying storage adapter
   */
  getStorage(): IGraphStorageAdapter<TEntity, TRelationship> {
    return this.storage;
  }

  // Legacy aliases for compatibility
  async removeComponent(id: string): Promise<void> {
    return this.deleteEntity(id);
  }

  async removeRelationship(id: string): Promise<void> {
    return this.deleteRelationship(id);
  }

  async findRelatedComponents(criteria: EntitySearchCriteria): Promise<TEntity[]> {
    return this.findEntities(criteria);
  }
}
