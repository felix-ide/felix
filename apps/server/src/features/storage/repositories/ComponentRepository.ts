/**
 * ComponentRepository - TypeORM implementation matching UtilityBeltAdapter exactly
 * CRITICAL: Every operation must match UtilityBeltAdapter.ts behavior 100%
 */

import { Repository, DataSource, Like, In, Raw } from 'typeorm';
import { Component } from '../entities/index/Component.entity.js';
import { IComponent, ComponentSearchCriteria } from '@felix/code-intelligence';
import type { StorageResult, SearchResult } from '../../../types/storage.js';
import { computeComponentContentHash } from '../../../utils/ContentHash.js';
import { RelationshipRepository } from './RelationshipRepository.js';

export class ComponentRepository {
  private componentRepo: Repository<Component>;
  private dataSource: DataSource;
  private projectRoot: string;
  private relationshipRepository: RelationshipRepository;

  constructor(dataSource: DataSource, projectRoot: string, relationshipRepository?: RelationshipRepository) {
    this.dataSource = dataSource;
    this.projectRoot = projectRoot;
    this.componentRepo = dataSource.getRepository(Component);
    this.relationshipRepository = relationshipRepository ?? new RelationshipRepository(dataSource);
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
   * Store component - Using TypeORM save for insert/update
   */
  async storeComponent(component: IComponent): Promise<StorageResult> {
    try {
      const { toProjectRelativePosix } = await import('../../../utils/PathUtils.js');
      const entity = new Component();
      entity.id = component.id;
      entity.name = component.name;
      entity.type = component.type;
      entity.language = component.language || 'unknown';
      entity.file_path = component.filePath ? toProjectRelativePosix(component.filePath, this.projectRoot) : component.filePath as any;
      entity.project_name = 'default';
      // Guard against parsers that omit location (fallback to 1..1,0..0)
      const loc = component.location || { startLine: 1, endLine: 1, startColumn: 0, endColumn: 0 };
      entity.start_line = loc.startLine;
      entity.end_line = loc.endLine;
      entity.start_column = loc.startColumn || 0;
      entity.end_column = loc.endColumn || 0;
      if (component.code) entity.code = component.code;
      if (component.metadata) entity.metadata = JSON.stringify(component.metadata);
      // Don't set embedding fields - they're optional
      try {
        const ch = computeComponentContentHash(component);
        (entity as any).content_hash = ch;
        (entity as any).content_updated_at = new Date();
      } catch {}
      
      const saved = await this.componentRepo.save(entity);
      const { logger } = await import('../../../shared/logger.js');
      logger.debug('Saved entity:', saved);
      return { success: true };
    } catch (error) {
      const { logger } = await import('../../../shared/logger.js');
      logger.error('Error saving component:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Store multiple components - Using TypeORM save for batch operations
   */
  async storeComponents(components: IComponent[]): Promise<StorageResult> {
    try {
      const { toProjectRelativePosix } = await import('../../../utils/PathUtils.js');
      // Process sequentially to avoid race conditions with duplicate IDs
      const entities: Component[] = [];
      const processedIds = new Set<string>();

      for (const component of components) {
        // Skip if we already processed this ID in this batch
        if (processedIds.has(component.id)) {
          continue;
        }
        processedIds.add(component.id);

        // First, try to find existing entity
        let entity = await this.componentRepo.findOne({ where: { id: component.id } });

        if (entity) {
          // Merge with existing entity - preserve existing data
          entity.name = component.name;
          entity.type = component.type;
          entity.language = component.language || entity.language || 'unknown';
          entity.file_path = component.filePath ? toProjectRelativePosix(component.filePath, this.projectRoot) : component.filePath as any;
          // Keep existing project_name if set
          entity.project_name = entity.project_name || 'default';

          // Update location (guard missing)
          {
            const loc = component.location || { startLine: 1, endLine: 1, startColumn: 0, endColumn: 0 };
            entity.start_line = loc.startLine;
            entity.end_line = loc.endLine;
            entity.start_column = loc.startColumn || 0;
            entity.end_column = loc.endColumn || 0;
          }

          // Update parent if provided
          if (component.parentId) entity.parent_id = component.parentId;

          // Update code if provided
          if (component.code) entity.code = component.code;

          // Merge metadata instead of replacing
          if (component.metadata) {
            let existingMetadata: any = {};
            // Safely parse existing metadata
            if (entity.metadata) {
              try {
                existingMetadata = typeof entity.metadata === 'string'
                  ? JSON.parse(entity.metadata)
                  : entity.metadata;
              } catch (e) {
                console.error('Failed to parse existing metadata:', entity.metadata);
                existingMetadata = {};
              }
            }
            const newMetadata: any = component.metadata;
            // Deep merge - preserve existing keys not in new metadata
            const mergedMetadata: any = { ...existingMetadata, ...newMetadata };
            // For nested objects like capabilities, merge those too
            if (existingMetadata.capabilities && newMetadata.capabilities) {
              mergedMetadata.capabilities = { ...existingMetadata.capabilities, ...newMetadata.capabilities };
            }
            entity.metadata = JSON.stringify(mergedMetadata);
          }

          // Preserve existing embeddings if not provided in update
          // Don't overwrite embedding data
        } else {
          // Create new entity
          entity = new Component();
          entity.id = component.id;
          entity.name = component.name;
          entity.type = component.type;
          entity.language = component.language || 'unknown';
          entity.file_path = component.filePath ? toProjectRelativePosix(component.filePath, this.projectRoot) : component.filePath as any;
          entity.project_name = 'default';
          {
            const loc = component.location || { startLine: 1, endLine: 1, startColumn: 0, endColumn: 0 };
            entity.start_line = loc.startLine;
            entity.end_line = loc.endLine;
            entity.start_column = loc.startColumn || 0;
            entity.end_column = loc.endColumn || 0;
          }
          if (component.parentId) entity.parent_id = component.parentId;
          if (component.code) entity.code = component.code;
          if (component.metadata) entity.metadata = JSON.stringify(component.metadata);
        }

        // Update content hash for both new and existing
        try {
          const ch = computeComponentContentHash(component);
          (entity as any).content_hash = ch;
          (entity as any).content_updated_at = new Date();
        } catch {}

        entities.push(entity);
      }

      // Save all entities inside a single transaction for throughput
      const saved = await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(Component);
        return await repo.save(entities);
      });
      return { success: true, affected: Array.isArray(saved) ? saved.length : 0 };
    } catch (error) {
      const { logger } = await import('../../../shared/logger.js');
      logger.error(`ComponentRepository.storeComponents failed:`, error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get component by ID - EXACT MATCH to UtilityBeltAdapter.getComponent
   * Maps to: findOne('components', { where: { id } })
   */
  async getComponent(id: string): Promise<IComponent | null> {
    try {
      const row = await this.componentRepo.findOne({ where: { id } });
      
      if (!row) return null;
      
      // Convert snake_case to camelCase - EXACT MATCH
      const component: IComponent = {
        id: row.id,
        name: row.name,
        type: row.type as any,
        language: row.language || '',
        filePath: row.file_path,
        parentId: row.parent_id || undefined,
        location: {
          startLine: row.start_line,
          endLine: row.end_line,
          startColumn: row.start_column || 0,
          endColumn: row.end_column || 0
        },
        code: row.code || undefined,
        metadata: this.safeJsonParse(row.metadata)
      };
      
      // Add optional fields if they exist - EXACT MATCH
      if (row.embedding) {
        (component as any).embedding = this.safeJsonParse(row.embedding);
      }
      if (row.embedding_version) {
        (component as any).embeddingVersion = row.embedding_version;
      }
      if ((row as any).content_hash) {
        (component as any).contentHash = (row as any).content_hash;
      }
      
      return component;
    } catch (error) {
      const { logger } = await import('../../../shared/logger.js');
      logger.error('Failed to get component:', error);
      return null;
    }
  }

  /**
   * Get components needing embeddings (none stored or stale hash mismatch)
   */
  async getComponentsNeedingEmbeddings(): Promise<IComponent[]> {
    try {
      const rows: any[] = await this.dataSource.query(`
        SELECT c.*
        FROM components c
        LEFT JOIN embeddings e
          ON e.entity_id = c.id
         AND e.entity_type = 'component'
        WHERE e.entity_id IS NULL
           OR e.content_hash IS NULL
           OR e.content_hash != c.content_hash
      `);

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        language: row.language || '',
        filePath: row.file_path,
        parentId: row.parent_id || undefined,
        location: {
          startLine: row.start_line,
          endLine: row.end_line,
          startColumn: row.start_column || 0,
          endColumn: row.end_column || 0
        },
        code: row.code || undefined,
        metadata: this.safeJsonParse(row.metadata)
      }));
    } catch (error) {
      const { logger } = await import('../../../shared/logger.js');
      logger.error('getComponentsNeedingEmbeddings failed:', error);
      return [];
    }
  }

  /**
   * Search components - EXACT MATCH to UtilityBeltAdapter.searchComponents
   * Handles name LIKE search and other filters
   */
  async searchComponents(criteria: ComponentSearchCriteria): Promise<SearchResult<IComponent>> {
    try {
      // Create base query with proper ordering
      const baseQuery = this.componentRepo.createQueryBuilder('component');
      
      // Helper function to apply filters to any query
      const applyFilters = (query: any) => {
      
        if (criteria.type) {
          if (Array.isArray(criteria.type)) {
            query.andWhere('component.type IN (:...types)', { types: criteria.type });
          } else {
            query.andWhere('component.type = :type', { type: criteria.type });
          }
        }

        if (criteria.language) {
          if (Array.isArray(criteria.language)) {
            query.andWhere('component.language IN (:...languages)', { languages: criteria.language });
          } else {
            query.andWhere('component.language = :language', { language: criteria.language });
          }
        }

        if (criteria.filePath) {
          query.andWhere('component.file_path = :filePath', { filePath: criteria.filePath });
        }

        // Handle both 'name' and 'query' fields
        const nameSearch = criteria.name || criteria.query;
        if (nameSearch) {
          query.andWhere('component.name LIKE :namePattern', { namePattern: `%${nameSearch}%` });
        }
      };

      // Apply filters to main query
      applyFilters(baseQuery);

      // Prefer exact normalized name matches and real code constructs over namespaces when names collide
      // Normalize query on the fly (letters+digits only)
      const rawName = String(criteria.name || criteria.query || '').toLowerCase();
      const normQuery = rawName.replace(/[^a-z0-9]/g, '');
      if (normQuery) {
        // CASE score for exact normalized match + type preference
        // SQLite-compatible normalization: lower and strip '-', '_', and spaces
        const normNameExpr = "lower(replace(replace(replace(component.name,'-',''),'_',''),' ',''))";
        const exactMatchExpr = `CASE WHEN ${normNameExpr} = :normQuery THEN 1 ELSE 0 END`;
        const typePrefExpr = `CASE component.type 
          WHEN 'class' THEN 3 
          WHEN 'interface' THEN 2 
          WHEN 'function' THEN 1 
          WHEN 'method' THEN 1 
          ELSE 0 END`;
        const vendorPrefExpr = `CASE WHEN component.file_path LIKE '%/vendor/%' OR component.file_path LIKE '%/node_modules/%' THEN 0 ELSE 1 END`;
        // Order: exact-match score first (desc), then type preference (desc), then non-vendor first, then name/id for stability
        baseQuery.orderBy(`${exactMatchExpr}`, 'DESC')
          .addOrderBy(`${typePrefExpr}`, 'DESC')
          .addOrderBy(`${vendorPrefExpr}`, 'DESC')
          .addOrderBy('component.name', 'ASC')
          .addOrderBy('component.id', 'ASC')
          .setParameter('normQuery', normQuery);
      } else {
        // Fallback deterministic ordering
        baseQuery.orderBy('component.name', 'ASC').addOrderBy('component.id', 'ASC');
      }
      
      // Get total count BEFORE pagination using cloned query
      const countQuery = baseQuery.clone();
      const total = await countQuery.getCount();
      
      // Apply pagination to main query
      const limit = criteria.limit || 50;
      const offset = criteria.offset || 0;
      baseQuery.limit(limit).offset(offset);
      
      // Execute query
      const rows = await baseQuery.getMany();
      
      // Convert raw rows to proper IComponent objects - EXACT MATCH
      const components: IComponent[] = rows.map((row: any) => {
        const component: IComponent = {
          id: row.id,
          name: row.name,
          type: row.type,
          language: row.language || '',
          filePath: row.file_path,
          parentId: row.parent_id || undefined,
          location: {
            startLine: row.start_line,
            endLine: row.end_line,
            startColumn: row.start_column,
            endColumn: row.end_column
          },
          code: row.code || undefined,
          metadata: this.safeJsonParse(row.metadata)
        };
        
        // Add optional fields if they exist
        if (row.embedding) {
          (component as any).embedding = this.safeJsonParse(row.embedding);
        }
        if (row.embedding_version) {
          (component as any).embeddingVersion = row.embedding_version;
        }
        if ((row as any).content_hash) {
          (component as any).contentHash = (row as any).content_hash;
        }
        
        return component;
      });
      
      return {
        items: components,
        total,
        hasMore: offset + rows.length < total,
        offset,
        limit
      };
    } catch (error) {
      return {
        items: [],
        total: 0,
        hasMore: false,
        offset: criteria.offset || 0,
        limit: criteria.limit || 50
      };
    }
  }

  /**
   * Update component - EXACT MATCH to UtilityBeltAdapter.updateComponent
   * Maps to: update('components', id, data)
   */
  async updateComponent(component: IComponent): Promise<StorageResult> {
    try {
      const updateData: any = {
        name: component.name,
        type: component.type,
        language: component.language || 'unknown',
        file_path: component.filePath,
        start_line: component.location.startLine,
        end_line: component.location.endLine,
        start_column: component.location.startColumn || 0,
        end_column: component.location.endColumn || 0,
        code: component.code || null,
        metadata: component.metadata || null
      };
      try {
        const ch = computeComponentContentHash(component);
        updateData.content_hash = ch;
        updateData.content_updated_at = new Date();
      } catch {}
      
      const result = await this.componentRepo.update(component.id, updateData);
      
      const success = result.affected ? result.affected > 0 : false;
      return { success, affected: result.affected || 0 };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Delete component - Using TypeORM delete with cascade
   */
  async deleteComponent(id: string): Promise<StorageResult> {
    try {
      await this.relationshipRepository.deleteRelationshipsByComponent(id);
      
      const result = await this.componentRepo.delete(id);
      const success = result.affected ? result.affected > 0 : false;
      return { success, affected: success ? 1 : 0 };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Delete components in file - EXACT MATCH to UtilityBeltAdapter.deleteComponentsInFile
   * Maps to: deleteMany('components', { where: { file_path } })
   */
  async deleteComponentsInFile(filePath: string): Promise<StorageResult> {
    try {
      const components = await this.componentRepo.find({ select: ['id'], where: { file_path: filePath } });
      const componentIds = components.map(component => component.id);
      if (componentIds.length > 0) {
        await this.relationshipRepository.deleteMany({ source_id: In(componentIds) });
        await this.relationshipRepository.deleteMany({ target_id: In(componentIds) });
      }
      const result = await this.componentRepo.delete({ file_path: filePath });
      return { success: true, affected: result.affected || 0 };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get all components - Used by various operations
   * Maps to: find('components', {})
   */

  /**
   * Get components by file - Used by file operations
   * Maps to: find('components', { where: { file_path } })
   */
  async getComponentsByFile(filePath: string): Promise<IComponent[]> {
    try {
      const rows = await this.componentRepo.find({ where: { file_path: filePath } });
      
      return rows.map(row => {
        const comp: IComponent = {
        id: row.id,
        name: row.name,
        type: row.type as any,
        language: row.language || '',
        filePath: row.file_path,
        parentId: row.parent_id || undefined,
        location: {
          startLine: row.start_line,
          endLine: row.end_line,
          startColumn: row.start_column || 0,
          endColumn: row.end_column || 0
        },
        code: row.code || undefined,
        metadata: this.safeJsonParse(row.metadata)
      } as IComponent;
        (comp as any).contentHash = (row as any).content_hash;
        return comp;
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Count components - Used for statistics
   * Maps to: execute('SELECT COUNT(*) FROM components')
   */
  async countComponents(): Promise<number> {
    try {
      return await this.componentRepo.count();
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get component count - Alias for countComponents
   */
  async getComponentCount(): Promise<number> {
    return this.countComponents();
  }

  /**
   * Get component count by type
   */
  async getComponentCountByType(): Promise<Record<string, number>> {
    try {
      const result = await this.componentRepo
        .createQueryBuilder('component')
        .select('component.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('component.type')
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
   * Get all indexed files
   */
  async getIndexedFiles(): Promise<string[]> {
    try {
      const result = await this.componentRepo
        .createQueryBuilder('component')
        .select('DISTINCT component.file_path', 'file_path')
        .getRawMany();
      
      return result.map(row => row.file_path);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get embedding count for components
   */
  async getEmbeddingCount(): Promise<number> {
    return this.componentRepo
      .createQueryBuilder('component')
      .where('component.embedding IS NOT NULL')
      .getCount();
  }

  /** Ensure performance-critical indexes exist (idempotent). */
  async ensureIndexes(): Promise<void> {
    try {
      await this.dataSource.query('CREATE INDEX IF NOT EXISTS idx_components_file_path ON components(file_path)');
      await this.dataSource.query('CREATE INDEX IF NOT EXISTS idx_components_name ON components(name)');
      await this.dataSource.query('CREATE INDEX IF NOT EXISTS idx_components_language ON components(language)');
    } catch (e) {
      // Best-effort; ignore
    }
  }

  /**
   * Get language breakdown
   */
  async getLanguageBreakdown(): Promise<Record<string, number>> {
    try {
      const result = await this.componentRepo
        .createQueryBuilder('component')
        .select('component.language', 'language')
        .addSelect('COUNT(*)', 'count')
        .groupBy('component.language')
        .getRawMany();
      
      const breakdown: Record<string, number> = {};
      for (const row of result) {
        if (row.language) {
          breakdown[row.language] = parseInt(row.count, 10);
        }
      }
      return breakdown;
    } catch (error) {
      return {};
    }
  }

  /**
   * Get all components (used for export)
   */
  async getAllComponents(): Promise<IComponent[]> {
    try {
      const components = await this.componentRepo.find();
      return components.map(row => {
        const comp: IComponent = {
        id: row.id,
        name: row.name,
        type: row.type as any,
        language: row.language || '',
        filePath: row.file_path,
        parentId: row.parent_id || undefined,
        location: {
          startLine: row.start_line,
          endLine: row.end_line,
          startColumn: row.start_column || 0,
          endColumn: row.end_column || 0
        },
        code: row.code || undefined,
        metadata: this.safeJsonParse(row.metadata)
      } as IComponent;
        (comp as any).contentHash = (row as any).content_hash;
        return comp;
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Bulk fetch component IDs by exact names
   */
  async getComponentIdsByNames(names: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!names || names.length === 0) return map;
    const unique = Array.from(new Set(names.filter(Boolean)));
    if (unique.length === 0) return map;
    const rows = await this.componentRepo.createQueryBuilder('component')
      .select(['component.id as id', 'component.name as name'])
      .where('component.name IN (:...names)', { names: unique })
      .getRawMany();
    for (const row of rows) {
      if (row.name && row.id && !map.has(row.name)) map.set(row.name, row.id);
    }
    return map;
  }

  /**
   * Bulk fetch component IDs by exact file paths
   */
  async getComponentIdsByFilePaths(paths: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!paths || paths.length === 0) return map;
    const unique = Array.from(new Set(paths.filter(Boolean)));
    if (unique.length === 0) return map;
    const rows = await this.componentRepo.createQueryBuilder('component')
      .select(['component.id as id', 'component.file_path as file_path'])
      .where('component.file_path IN (:...paths)', { paths: unique })
      .getRawMany();
    for (const row of rows) {
      if (row.file_path && row.id && !map.has(row.file_path)) map.set(row.file_path, row.id);
    }
    return map;
  }

  /**
   * Count distinct files - Used for statistics
   * Maps to: execute('SELECT COUNT(DISTINCT file_path) FROM components')
   */
  async countDistinctFiles(): Promise<number> {
    try {
      const result = await this.componentRepo
        .createQueryBuilder('component')
        .select('COUNT(DISTINCT component.file_path)', 'count')
        .getRawOne();
      return result?.count || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get language statistics - Used for project analysis
   * Maps to: execute('SELECT language, COUNT(*) FROM components GROUP BY language')
   */
  async getLanguageStatistics(): Promise<{ language: string; count: number }[]> {
    try {
      const results = await this.componentRepo
        .createQueryBuilder('component')
        .select('component.language', 'language')
        .addSelect('COUNT(*)', 'count')
        .groupBy('component.language')
        .getRawMany();
      
      return results.map(r => ({
        language: r.language,
        count: parseInt(r.count)
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get distinct file paths - Used for file listing
   * Maps to: execute('SELECT DISTINCT file_path FROM components')
   */
  async getDistinctFilePaths(): Promise<string[]> {
    try {
      const results = await this.componentRepo
        .createQueryBuilder('component')
        .select('DISTINCT component.file_path', 'file_path')
        .getRawMany();
      
      return results.map(r => r.file_path);
    } catch (error) {
      return [];
    }
  }
}
