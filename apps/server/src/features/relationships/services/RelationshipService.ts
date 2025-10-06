/**
 * RelationshipService - Facade for relationship storage, queries, and resolution orchestration.
 */

import type { IRelationship, RelationshipSearchCriteria } from '@felix/code-intelligence';

import type { SearchResult } from '../../../types/storage.js';
import { DatabaseManager } from '../../storage/DatabaseManager.js';
import { CrossFileRelationshipResolver } from '../CrossFileRelationshipResolver.js';
import { RelationshipStore } from './RelationshipStore.js';
import { RelationshipQueryService } from './RelationshipQueryService.js';
import { RelationshipGraphAnalyzer } from './RelationshipGraphAnalyzer.js';

export interface RelationshipSearchOptions {
  sourceId?: string;
  targetId?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface ComponentRelationships {
  outgoing: IRelationship[];
  incoming: IRelationship[];
}

export class RelationshipService {
  private readonly dbManager: DatabaseManager;
  private readonly resolver: CrossFileRelationshipResolver;
  private readonly store: RelationshipStore;
  private readonly query: RelationshipQueryService;
  private readonly graph: RelationshipGraphAnalyzer;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
    this.resolver = new CrossFileRelationshipResolver(dbManager);
    this.store = new RelationshipStore(dbManager);
    this.query = new RelationshipQueryService(dbManager);
    this.graph = new RelationshipGraphAnalyzer(this.query);
  }

  /**
   * Schedule a debounced cross-file resolution run. Safe to call frequently.
   */
  scheduleCrossFileResolution(): void {
    this.resolver.schedule();
  }

  /**
   * Trigger cross-file relationship resolution immediately.
   */
  async resolveCrossFileRelationships(): Promise<void> {
    await this.resolver.resolve();
  }

  /**
   * Store a single relationship.
   */
  async storeRelationship(relationship: IRelationship): Promise<{ success: boolean; error?: string }> {
    return await this.store.storeRelationship(relationship);
  }

  /**
   * Store multiple relationships.
   */
  async storeRelationships(relationships: IRelationship[]): Promise<{ success: boolean; error?: string }> {
    return await this.store.storeRelationships(relationships);
  }

  /**
   * Get a relationship by ID.
   */
  async getRelationship(id: string): Promise<IRelationship | null> {
    return await this.query.getRelationship(id);
  }

  /**
   * Search for relationships with criteria.
   */
  async search(criteria: RelationshipSearchCriteria): Promise<SearchResult<IRelationship>> {
    return await this.query.search(criteria);
  }

  /**
   * Search for relationships with options.
   */
  async searchRelationships(options: RelationshipSearchOptions = {}): Promise<SearchResult<IRelationship>> {
    return await this.query.searchRelationships(options);
  }

  /**
   * Get relationships for a component (both incoming and outgoing).
   */
  async getComponentRelationships(componentId: string): Promise<ComponentRelationships> {
    return await this.query.getComponentRelationships(componentId);
  }

  /**
   * Get all outgoing relationships for a component.
   */
  async getOutgoingRelationships(componentId: string): Promise<IRelationship[]> {
    return await this.query.getOutgoingRelationships(componentId);
  }

  /**
   * Get all incoming relationships for a component.
   */
  async getIncomingRelationships(componentId: string): Promise<IRelationship[]> {
    return await this.query.getIncomingRelationships(componentId);
  }

  /**
   * Get relationships by type.
   */
  async getRelationshipsByType(type: string): Promise<IRelationship[]> {
    return await this.query.getRelationshipsByType(type);
  }

  /**
   * Get all relationships.
   */
  async getAllRelationships(): Promise<IRelationship[]> {
    return await this.query.getAllRelationships();
  }

  /**
   * Update a relationship.
   */
  async updateRelationship(relationship: IRelationship): Promise<{ success: boolean; error?: string }> {
    return await this.store.updateRelationship(relationship);
  }

  /**
   * Delete a relationship.
   */
  async deleteRelationship(id: string): Promise<{ success: boolean; error?: string }> {
    return await this.store.deleteRelationship(id);
  }

  /**
   * Delete all relationships for a component.
   */
  async deleteComponentRelationships(componentId: string): Promise<{ success: boolean; error?: string }> {
    return await this.store.deleteComponentRelationships(componentId);
  }

  /**
   * Delete relationships in a file.
   */
  async deleteRelationshipsInFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    return await this.store.deleteRelationshipsInFile(filePath);
  }

  /**
   * Get neighbor component IDs (components connected by relationships).
   */
  async getNeighbors(componentId: string): Promise<string[]> {
    const relationships = await this.getComponentRelationships(componentId);
    const neighborIds = new Set<string>();

    relationships.outgoing.forEach(rel => neighborIds.add(rel.targetId));
    relationships.incoming.forEach(rel => neighborIds.add(rel.sourceId));

    return Array.from(neighborIds);
  }

  /**
   * Count total relationships.
   */
  async getRelationshipCount(): Promise<number> {
    return await this.query.getRelationshipCount();
  }

  /**
   * Get relationship count by type.
   */
  async getRelationshipCountByType(): Promise<Record<string, number>> {
    return await this.query.getRelationshipCountByType();
  }

  /**
   * Build dependency graph for components.
   */
  async buildDependencyGraph(): Promise<Map<string, string[]>> {
    return await this.graph.buildDependencyGraph();
  }

  /**
   * Find circular dependencies in the dependency graph.
   */
  async findCircularDependencies(): Promise<string[][]> {
    return await this.graph.findCircularDependencies();
  }

  /**
   * Get components that depend on a given component (reverse dependencies).
   */
  async getReverseDependencies(componentId: string): Promise<string[]> {
    return await this.graph.getReverseDependencies(componentId);
  }

  /**
   * Get components that a given component depends on (forward dependencies).
   */
  async getForwardDependencies(componentId: string): Promise<string[]> {
    return await this.graph.getForwardDependencies(componentId);
  }
}
