/**
 * RelationshipRepository - TypeORM implementation matching UtilityBeltAdapter exactly
 * CRITICAL: Every operation must match UtilityBeltAdapter.ts behavior 100%
 */

import { Repository, DataSource, In } from 'typeorm';
import { Relationship } from '../entities/index/Relationship.entity.js';
import { IRelationship, RelationshipSearchCriteria } from '@felix/code-intelligence';
import type { StorageResult, SearchResult } from '../../../types/storage.js';

export class RelationshipRepository {
  private relationshipRepo: Repository<Relationship>;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.relationshipRepo = dataSource.getRepository(Relationship);
  }

  /**
   * Safe JSON parse helper - EXACT MATCH to UtilityBeltAdapter
   */
  private safeJsonParse(value: any): any {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Store relationship - EXACT MATCH to UtilityBeltAdapter.storeRelationship
   * Includes metadata merging logic
   */
  async storeRelationship(relationship: IRelationship): Promise<StorageResult> {
    try {
      // Check if relationship exists first - EXACT MATCH
      const existing = await this.relationshipRepo.findOne({ 
        where: { id: relationship.id } 
      });
      
      const relationshipData = {
        id: relationship.id,
        type: relationship.type,
        source_id: relationship.sourceId,
        target_id: relationship.targetId,
        start_line: relationship.location?.startLine || null,
        end_line: relationship.location?.endLine || null,
        start_column: relationship.location?.startColumn || null,
        end_column: relationship.location?.endColumn || null,
        metadata: relationship.metadata ? JSON.stringify(relationship.metadata) : null
      };
      
      if (existing) {
        // Merge metadata to preserve any manually added or resolved data - EXACT MATCH
        let mergedMetadata = {};
        
        // Parse existing metadata if present
        if (existing.metadata) {
          try {
            mergedMetadata = this.safeJsonParse(existing.metadata) || {};
          } catch (e) {
            // If parsing fails, use new metadata
            mergedMetadata = {};
          }
        }
        
        // Merge with new metadata (new values override old ones)
        if (relationship.metadata) {
          mergedMetadata = { ...mergedMetadata, ...relationship.metadata };
        }
        
        // Update with merged data
        const updateData: any = {
          ...relationshipData,
          metadata: Object.keys(mergedMetadata).length > 0 
            ? mergedMetadata
            : null
        };
        await this.relationshipRepo.update(relationship.id, updateData);
      } else {
        // Insert new relationship
        await this.relationshipRepo.insert(relationshipData as any);
      }
      
      return { success: true, affected: 1 };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Store multiple relationships - EXACT MATCH to UtilityBeltAdapter.storeRelationships
   * Maps to: insertMany('relationships', data[])
   * NOW WITH INTELLIGENT MERGE LOGIC to prevent UNIQUE constraint errors
   */
  async storeRelationships(relationships: IRelationship[]): Promise<StorageResult> {
    try {
      // Get all existing relationships in one query instead of individual lookups
      const ids = relationships.map(r => r.id);
      const existingEntities = await this.relationshipRepo.find({
        where: { id: In(ids) }
      });
      const existingMap = new Map(existingEntities.map(e => [e.id, e]));

      // Process each relationship with merge logic
      const entities = relationships.map(relationship => {
        // Check if relationship exists in our map
        let entity = existingMap.get(relationship.id);

        if (entity) {
          // Merge with existing entity - preserve existing metadata
          let mergedMetadata = {};

          // Parse existing metadata if present
          if (entity.metadata) {
            try {
              const existingMetadata = this.safeJsonParse(entity.metadata) || {};
              mergedMetadata = existingMetadata;
            } catch (e) {
              // If parsing fails, use new metadata
              mergedMetadata = {};
            }
          }

          // Merge with new metadata (new values override old ones, but preserve unaffected keys)
          if (relationship.metadata) {
            mergedMetadata = { ...mergedMetadata, ...relationship.metadata };
          }

          // Update existing entity with merged data
          entity.type = relationship.type;
          entity.source_id = relationship.sourceId;
          entity.target_id = relationship.targetId;
          entity.start_line = relationship.location?.startLine || undefined;
          entity.end_line = relationship.location?.endLine || undefined;
          entity.start_column = relationship.location?.startColumn || undefined;
          entity.end_column = relationship.location?.endColumn || undefined;
          entity.metadata = Object.keys(mergedMetadata).length > 0
            ? JSON.stringify(mergedMetadata)
            : null;
        } else {
          // Create new entity
          entity = new Relationship();
          entity.id = relationship.id;
          entity.type = relationship.type;
          entity.source_id = relationship.sourceId;
          entity.target_id = relationship.targetId;
          entity.start_line = relationship.location?.startLine || undefined;
          entity.end_line = relationship.location?.endLine || undefined;
          entity.start_column = relationship.location?.startColumn || undefined;
          entity.end_column = relationship.location?.endColumn || undefined;
          entity.metadata = relationship.metadata ? JSON.stringify(relationship.metadata) : null;
        }

        return entity;
      });

      // Save all entities in a single transaction for throughput
      await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(Relationship);
        await repo.save(entities);
      });

      return { success: true, affected: relationships.length };
    } catch (error) {
      console.error('Failed to store relationships:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get relationship by ID - EXACT MATCH to UtilityBeltAdapter.getRelationship
   * Maps to: findOne('relationships', { where: { id } })
   */
  async getRelationship(id: string): Promise<IRelationship | null> {
    try {
      const row = await this.relationshipRepo.findOne({ where: { id } });
      if (!row) return null;
      
      // Convert snake_case to camelCase - EXACT MATCH
      // Use resolved IDs if available, otherwise original IDs
      return {
        id: row.id,
        type: row.type as any,
        sourceId: row.resolved_source_id || row.source_id,
        targetId: row.resolved_target_id || row.target_id,
        location: row.start_line ? {
          startLine: row.start_line,
          endLine: row.end_line || 0,
          startColumn: row.start_column || 0,
          endColumn: row.end_column || 0
        } : undefined,
        metadata: this.safeJsonParse(row.metadata)
      } as IRelationship;
    } catch (error) {
      const { logger } = await import('../../../shared/logger.js');
      logger.error('Failed to get relationship:', error);
      return null;
    }
  }

  /**
   * Search relationships - EXACT MATCH to UtilityBeltAdapter.searchRelationships
   * Filters by source, target, and type
   */
  async searchRelationships(criteria: RelationshipSearchCriteria): Promise<SearchResult<IRelationship>> {
    try {
      const query = this.relationshipRepo.createQueryBuilder('rel');
      
      if (criteria.sourceId) {
        // Search both source_id and resolved_source_id
        query.andWhere('(rel.source_id = :sourceId OR rel.resolved_source_id = :sourceId)', { sourceId: criteria.sourceId });
      }
      
      if (criteria.targetId) {
        // Search both target_id and resolved_target_id
        query.andWhere('(rel.target_id = :targetId OR rel.resolved_target_id = :targetId)', { targetId: criteria.targetId });
      }
      
      if (criteria.type) {
        query.andWhere('rel.type = :type', { type: criteria.type });
      }
      
      const limit = criteria.limit || 50;
      const offset = criteria.offset || 0;
      
      query.limit(limit).skip(offset);
      
      const rows = await query.getMany();
      
      const items = rows.map((row: any) => ({
        id: row.id,
        type: row.type,
        sourceId: (row as any).resolved_source_id || row.source_id,
        targetId: row.resolved_target_id || row.target_id,
        location: row.start_line ? {
          startLine: row.start_line,
          endLine: row.end_line,
          startColumn: row.start_column,
          endColumn: row.end_column
        } : undefined,
        metadata: this.safeJsonParse(row.metadata) || {}
      }));
      
      return {
        items,
        total: items.length,
        hasMore: items.length === limit,
        offset,
        limit
      };
    } catch (error) {
      const { logger } = await import('../../../shared/logger.js');
      logger.error('Failed to search relationships:', error);
      return {
        items: [],
        total: 0,
        hasMore: false,
        offset: 0,
        limit: 0
      };
    }
  }

  /**
   * Update relationship by ID with partial data
   */
  async updateRelationshipById(id: string, data: Partial<Relationship>): Promise<StorageResult> {
    try {
      const result = await this.relationshipRepo.update(id, data);
      const success = result.affected ? result.affected > 0 : false;
      return { success, affected: success ? 1 : 0 };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Bulk update relationships with partial fields (within a single transaction).
   * Accepts patches like { id, resolved_target_id?, resolved_source_id?, metadata? }.
   */
  async updateRelationshipsBulk(patches: Array<{ id: string; resolved_target_id?: string | null; resolved_source_id?: string | null; metadata?: any }>): Promise<StorageResult> {
    if (!patches || patches.length === 0) return { success: true, affected: 0 };
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      let affected = 0;
      for (const p of patches) {
        const data: any = {};
        if (typeof p.resolved_target_id !== 'undefined') data.resolved_target_id = p.resolved_target_id;
        if (typeof p.resolved_source_id !== 'undefined') data.resolved_source_id = p.resolved_source_id;
        if (typeof p.metadata !== 'undefined') data.metadata = p.metadata;
        if (Object.keys(data).length === 0) continue;
        const res = await runner.manager.update(Relationship, { id: p.id }, data);
        affected += res.affected || 0;
      }
      await runner.commitTransaction();
      return { success: true, affected };
    } catch (error) {
      await runner.rollbackTransaction();
      return { success: false, error: String(error) };
    } finally {
      await runner.release();
    }
  }

  /** Ensure performance-critical indexes exist (idempotent). */
  async ensureIndexes(): Promise<void> {
    try {
      await this.dataSource.query('CREATE INDEX IF NOT EXISTS idx_relationships_source_resolved ON relationships(resolved_source_id)');
      await this.dataSource.query('CREATE INDEX IF NOT EXISTS idx_relationships_target_resolved ON relationships(resolved_target_id)');
      await this.dataSource.query('CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_id)');
      await this.dataSource.query('CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_id)');
      await this.dataSource.query('CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(type)');
      // Helpful partial indexes for unresolved scans (SQLite ignores WHERE in CREATE INDEX IF NOT EXISTS for expressions, so keep generic above)
    } catch (e) {
      // Best-effort; ignore
    }
  }

  /**
   * Update relationship - EXACT MATCH to UtilityBeltAdapter.updateRelationship
   * Maps to: update('relationships', id, data)
   */
  async updateRelationship(relationship: IRelationship): Promise<StorageResult> {
    try {
      const updateData: any = {
        type: relationship.type,
        source_id: relationship.sourceId,
        start_line: relationship.location?.startLine || null,
        end_line: relationship.location?.endLine || null,
        start_column: relationship.location?.startColumn || null,
        end_column: relationship.location?.endColumn || null,
        metadata: relationship.metadata || {}
      };

      // If targetId starts with RESOLVE:, keep it in target_id
      // Otherwise, update resolved_target_id
      if (relationship.targetId.startsWith('RESOLVE:')) {
        updateData.target_id = relationship.targetId;
      } else {
        updateData.resolved_target_id = relationship.targetId;
      }

      const result = await this.relationshipRepo.update(relationship.id, updateData);
      
      const success = result.affected ? result.affected > 0 : false;
      return { success, affected: success ? 1 : 0 };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Delete relationship - EXACT MATCH to UtilityBeltAdapter.deleteRelationship
   * Maps to: delete('relationships', id)
   */
  async deleteRelationship(id: string): Promise<StorageResult> {
    try {
      const result = await this.relationshipRepo.delete(id);
      const success = result.affected ? result.affected > 0 : false;
      return { success, affected: success ? 1 : 0 };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get relationships for component - Used by component operations
   * Gets all relationships where component is source or target
   */
  async getRelationshipsForComponent(componentId: string, types?: string[]): Promise<IRelationship[]> {
    try {
      const query = this.relationshipRepo.createQueryBuilder('rel')
        .where('(rel.source_id = :id OR rel.resolved_source_id = :id OR rel.target_id = :id OR rel.resolved_target_id = :id)', { id: componentId });
      
      if (types && types.length > 0) {
        query.andWhere('rel.type IN (:...types)', { types });
      }
      
      const rows = await query.getMany();
      
      return rows.map(row => ({
        id: row.id,
        type: row.type as any,
        sourceId: (row as any).resolved_source_id || row.source_id,
        targetId: row.resolved_target_id || row.target_id,
        location: row.start_line ? {
          startLine: row.start_line,
          endLine: row.end_line || 0,
          startColumn: row.start_column || 0,
          endColumn: row.end_column || 0
        } : undefined,
        metadata: this.safeJsonParse(row.metadata)
      }) as IRelationship);
    } catch (error) {
      return [];
    }
  }

  /**
   * Delete relationships by component - Used when deleting components
   * Maps to: deleteMany('relationships', { where: { source_id/target_id } })
   */
  async deleteRelationshipsByComponent(componentId: string): Promise<StorageResult> {
    try {
      // Delete where component is source
      const sourceResult = await this.relationshipRepo.delete({ source_id: componentId });
      // Delete where component is target
      const targetResult = await this.relationshipRepo.delete({ target_id: componentId });
      
      const affected = (sourceResult.affected || 0) + (targetResult.affected || 0);
      return { success: true, affected };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get all relationships - Used for various operations
   * Maps to: find('relationships', {})
   */
  async getAllRelationships(): Promise<IRelationship[]> {
    try {
      const rows = await this.relationshipRepo.find();
      
      return rows.map(row => ({
        id: row.id,
        type: row.type as any,
        sourceId: (row as any).resolved_source_id || row.source_id,
        targetId: row.resolved_target_id || row.target_id,
        location: row.start_line ? {
          startLine: row.start_line,
          endLine: row.end_line || 0,
          startColumn: row.start_column || 0,
          endColumn: row.end_column || 0
        } : undefined,
        metadata: this.safeJsonParse(row.metadata)
      }) as IRelationship);
    } catch (error) {
      return [];
    }
  }

  /**
   * Count relationships - Used for statistics
   * Maps to: execute('SELECT COUNT(*) FROM relationships')
   */
  async countRelationships(): Promise<number> {
    try {
      return await this.relationshipRepo.count();
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get relationship count - Alias for countRelationships
   */
  async getRelationshipCount(): Promise<number> {
    return this.countRelationships();
  }

  /**
   * Get relationship count by type
   */
  async getRelationshipCountByType(): Promise<Record<string, number>> {
    try {
      const result = await this.relationshipRepo
        .createQueryBuilder('relationship')
        .select('relationship.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('relationship.type')
        .getRawMany();
      
      const counts: Record<string, number> = {};
      for (const row of result) {
        counts[row.type] = parseInt(row.count, 10);
      }
      return counts;
    } catch (error) {
      return {};
    }
  }


  /**
   * Delete multiple relationships - Used for bulk operations
   * Maps to: deleteMany('relationships', { where })
   */
  async deleteMany(where: any): Promise<StorageResult> {
    try {
      const result = await this.relationshipRepo.delete(where);
      return { success: true, affected: result.affected || 0 };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Return only relationships that still need TARGET resolution.
   * Criteria:
   *  - target_id LIKE 'RESOLVE:%'
   *  - resolved_target_id IS NULL
   *  - metadata.isExternal != 1 (or metadata is NULL)
   */
  async getUnresolvedTargets(limit?: number, offset?: number): Promise<IRelationship[]> {
    try {
      const q = this.relationshipRepo
        .createQueryBuilder('rel')
        .where("rel.target_id LIKE 'RESOLVE:%'")
        .andWhere('rel.resolved_target_id IS NULL')
        .andWhere('(rel.metadata IS NULL OR json_extract(rel.metadata, \"$.isExternal\") != 1)');
      if (typeof limit === 'number') q.limit(limit);
      if (typeof offset === 'number') q.offset(offset);
      const rows = await q.getMany();
      return rows.map(row => ({
        id: row.id,
        type: row.type as any,
        sourceId: (row as any).resolved_source_id || row.source_id,
        targetId: row.resolved_target_id || row.target_id,
        location: row.start_line ? {
          startLine: row.start_line,
          endLine: row.end_line || 0,
          startColumn: row.start_column || 0,
          endColumn: row.end_column || 0
        } : undefined,
        metadata: this.safeJsonParse(row.metadata)
      }) as IRelationship);
    } catch (error) {
      return [];
    }
  }

  /**
   * Return only relationships that still need SOURCE resolution.
   * Criteria:
   *  - source_id LIKE 'RESOLVE:%' OR source_id LIKE 'EXTERNAL:%'
   *  - resolved_source_id IS NULL
   *  - metadata.isExternal != 1 (or metadata is NULL)
   */
  async getUnresolvedSources(limit?: number, offset?: number): Promise<IRelationship[]> {
    try {
      const q = this.relationshipRepo
        .createQueryBuilder('rel')
        .where("(rel.source_id LIKE 'RESOLVE:%' OR rel.source_id LIKE 'EXTERNAL:%')")
        .andWhere('rel.resolved_source_id IS NULL')
        .andWhere('(rel.metadata IS NULL OR json_extract(rel.metadata, \"$.isExternal\") != 1)');
      if (typeof limit === 'number') q.limit(limit);
      if (typeof offset === 'number') q.offset(offset);
      const rows = await q.getMany();
      return rows.map(row => ({
        id: row.id,
        type: row.type as any,
        sourceId: (row as any).resolved_source_id || row.source_id,
        targetId: row.resolved_target_id || row.target_id,
        location: row.start_line ? {
          startLine: row.start_line,
          endLine: row.end_line || 0,
          startColumn: row.start_column || 0,
          endColumn: row.end_column || 0
        } : undefined,
        metadata: this.safeJsonParse(row.metadata)
      }) as IRelationship);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get relationships by component using advanced querying
   */
  async getRelationshipsByComponent(
    componentId: string,
    options?: {
      depth?: number;
      relationshipTypes?: string[];
      direction?: 'in' | 'out' | 'both';
      limit?: number;
    }
  ): Promise<IRelationship[]> {
    const { RelationshipQuery } = await import('../queries/RelationshipQuery.js');
    const query = new RelationshipQuery(this.relationshipRepo);
    const relationships = await query.getRelationshipsByComponent(componentId, options);

    return relationships.map((rel: Relationship) => ({
      id: rel.id,
      type: rel.type as any,
      sourceId: rel.resolved_source_id || rel.source_id,
      targetId: rel.resolved_target_id || rel.target_id,
      location: rel.start_line ? {
        startLine: rel.start_line,
        endLine: rel.end_line || 0,
        startColumn: rel.start_column || 0,
        endColumn: rel.end_column || 0
      } : undefined,
      metadata: this.safeJsonParse(rel.metadata)
    }));
  }

  /**
   * Get relationship chain with depth traversal
   */
  async getRelationshipChain(
    startComponentId: string,
    options?: {
      depth?: number;
      relationshipTypes?: string[];
      direction?: 'in' | 'out' | 'both';
    }
  ): Promise<Array<{ relationship: IRelationship; depth: number; path: string[] }>> {
    const { RelationshipQuery } = await import('../queries/RelationshipQuery.js');
    const query = new RelationshipQuery(this.relationshipRepo);
    const chain = await query.getRelationshipChain(startComponentId, options);

    return chain.map((node: { relationship: Relationship; depth: number; path: string[] }) => ({
      relationship: {
        id: node.relationship.id,
        type: node.relationship.type as any,
        sourceId: node.relationship.resolved_source_id || node.relationship.source_id,
        targetId: node.relationship.resolved_target_id || node.relationship.target_id,
        location: node.relationship.start_line ? {
          startLine: node.relationship.start_line,
          endLine: node.relationship.end_line || 0,
          startColumn: node.relationship.start_column || 0,
          endColumn: node.relationship.end_column || 0
        } : undefined,
        metadata: this.safeJsonParse(node.relationship.metadata)
      },
      depth: node.depth,
      path: node.path
    }));
  }

  /**
   * Get complete relationship graph with cycle detection
   */
  async getRelationshipGraph(
    startComponentId: string,
    options?: {
      depth?: number;
      relationshipTypes?: string[];
      direction?: 'in' | 'out' | 'both';
    }
  ): Promise<{
    nodes: Map<string, any>;
    edges: IRelationship[];
    depth: number;
    cyclesDetected: string[][];
  }> {
    const { RelationshipQuery } = await import('../queries/RelationshipQuery.js');
    const query = new RelationshipQuery(this.relationshipRepo);
    const graph = await query.getRelationshipGraph(startComponentId, options);

    return {
      nodes: graph.nodes,
      edges: graph.edges.map((rel: Relationship) => ({
        id: rel.id,
        type: rel.type as any,
        sourceId: rel.resolved_source_id || rel.source_id,
        targetId: rel.resolved_target_id || rel.target_id,
        location: rel.start_line ? {
          startLine: rel.start_line,
          endLine: rel.end_line || 0,
          startColumn: rel.start_column || 0,
          endColumn: rel.end_column || 0
        } : undefined,
        metadata: this.safeJsonParse(rel.metadata)
      })),
      depth: graph.depth,
      cyclesDetected: graph.cyclesDetected
    };
  }
}
