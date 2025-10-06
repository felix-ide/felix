import type { IRelationship, RelationshipSearchCriteria } from '@felix/code-intelligence';

import type { SearchResult } from '../../../types/storage.js';
import type { DatabaseManager } from '../../storage/DatabaseManager.js';
import type { RelationshipSearchOptions, ComponentRelationships } from './RelationshipService.js';

export class RelationshipQueryService {
  constructor(private readonly dbManager: DatabaseManager) {}

  async getRelationship(id: string): Promise<IRelationship | null> {
    return await this.dbManager.getRelationshipRepository().getRelationship(id);
  }

  async search(criteria: RelationshipSearchCriteria): Promise<SearchResult<IRelationship>> {
    return await this.dbManager.getRelationshipRepository().searchRelationships(criteria);
  }

  async searchRelationships(options: RelationshipSearchOptions = {}): Promise<SearchResult<IRelationship>> {
    const criteria: RelationshipSearchCriteria = {
      limit: options.limit || 50,
      offset: options.offset || 0
    };

    if (options.sourceId) criteria.sourceId = options.sourceId;
    if (options.targetId) criteria.targetId = options.targetId;
    if (options.type) criteria.type = options.type as any;

    return await this.dbManager.getRelationshipRepository().searchRelationships(criteria);
  }

  async getComponentRelationships(componentId: string): Promise<ComponentRelationships> {
    const outgoing = await this.searchRelationships({ sourceId: componentId });
    const incoming = await this.searchRelationships({ targetId: componentId });

    return {
      outgoing: outgoing.items,
      incoming: incoming.items
    };
  }

  async getOutgoingRelationships(componentId: string): Promise<IRelationship[]> {
    const result = await this.searchRelationships({ sourceId: componentId });
    return result.items;
  }

  async getIncomingRelationships(componentId: string): Promise<IRelationship[]> {
    const result = await this.searchRelationships({ targetId: componentId });
    return result.items;
  }

  async getRelationshipsByType(type: string): Promise<IRelationship[]> {
    const result = await this.searchRelationships({ type });
    return result.items;
  }

  async getAllRelationships(): Promise<IRelationship[]> {
    return await this.dbManager.getRelationshipRepository().getAllRelationships();
  }

  async getRelationshipCount(): Promise<number> {
    return await this.dbManager.getRelationshipRepository().getRelationshipCount();
  }

  async getRelationshipCountByType(): Promise<Record<string, number>> {
    return await this.dbManager.getRelationshipRepository().getRelationshipCountByType();
  }
}
