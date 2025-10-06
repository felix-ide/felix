/**
 * EmbeddingRepository - TypeORM implementation matching UtilityBeltAdapter exactly
 * CRITICAL: Every operation must match UtilityBeltAdapter.ts behavior 100%
 */

import { Repository, DataSource, In } from 'typeorm';
import { Embedding } from '../entities/index/Embedding.entity.js';
import type { StorageResult } from '../../../types/storage.js';

export class EmbeddingRepository {
  private embeddingRepo: Repository<Embedding>;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.embeddingRepo = dataSource.getRepository(Embedding);
  }

  /**
   * Count embeddings by entity type (efficient COUNT query)
   */
  async countEmbeddingsByType(entityType: 'component' | 'task' | 'note' | 'rule'): Promise<number> {
    try {
      return await this.embeddingRepo.count({ where: { entity_type: entityType } });
    } catch {
      return 0;
    }
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
   * Store embedding - EXACT MATCH to UtilityBeltAdapter.storeEmbedding
   * Maps to: insert('embeddings', data) with composite primary key
   */
  async storeEmbedding(
    entityId: string, 
    embedding: number[], 
    version: string, 
    entityType?: 'component' | 'task' | 'note' | 'rule',
    contentHash?: string
  ): Promise<StorageResult> {
    try {
      // Check if embedding exists (composite key: entity_id + entity_type)
      const existing = await this.embeddingRepo.findOne({
        where: {
          entity_id: entityId,
          entity_type: entityType || 'component'
        }
      });

      const embeddingData = {
        entity_id: entityId,
        entity_type: entityType || 'component',
        embedding: JSON.stringify(embedding),
        version,
        content_hash: contentHash,
        created_at: new Date()
      };

      if (existing) {
        // Update existing
        await this.embeddingRepo.update(
          { entity_id: entityId, entity_type: entityType || 'component' },
          embeddingData
        );
      } else {
        // Insert new
        await this.embeddingRepo.insert(embeddingData);
      }
      
      return { success: true, affected: 1 };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get embedding - EXACT MATCH to UtilityBeltAdapter.getEmbedding
   * Maps to: findOne('embeddings', { where })
   */
  async getEmbedding(
    entityId: string, 
    entityType?: 'component' | 'task' | 'note' | 'rule'
  ): Promise<{embedding: number[], version: string, content_hash?: string} | null> {
    try {
      const result = await this.embeddingRepo.findOne({
        where: {
          entity_id: entityId,
          entity_type: entityType || 'component'
        }
      });
      
      if (!result) return null;
      
      return {
        embedding: this.safeJsonParse(result.embedding),
        version: result.version,
        content_hash: (result as any).content_hash
      };
    } catch (error) {
      const { logger } = await import('../../../shared/logger.js');
      logger.error('Failed to get embedding:', error);
      return null;
    }
  }

  /**
   * Get embeddings by entity type - Used for similarity search
   * Maps to: find('embeddings', { where: { entity_type } })
   */
  async getEmbeddingsByType(entityType: 'component' | 'task' | 'note' | 'rule'): Promise<Array<{
    entity_id: string;
    embedding: string;
    version: string;
    content_hash?: string;
  }>> {
    try {
      const rows = await this.embeddingRepo.find({
        where: { entity_type: entityType }
      });
      
      return rows.map((row: any) => ({
        entity_id: row.entity_id,
        embedding: row.embedding,
        version: row.version,
        content_hash: row.content_hash
      }));
    } catch (error) {
      // Fallback to TypeORM find method
      try {
        const rows = await this.embeddingRepo.find({
          where: { entity_type: entityType }
        });
        
        return rows.map(row => ({
          entity_id: row.entity_id,
          embedding: row.embedding,
          version: row.version,
          content_hash: (row as any).content_hash
        }));
      } catch (fallbackError) {
        return [];
      }
    }
  }



  /**
   * Delete embedding - Used when entity is deleted
   */
  async deleteEmbedding(entityId: string, entityType?: 'component' | 'task' | 'note' | 'rule'): Promise<StorageResult> {
    try {
      const result = await this.embeddingRepo.delete({
        entity_id: entityId,
        entity_type: entityType || 'component'
      });
      
      return { success: true, affected: result.affected || 0 };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get all embeddings - Used for maintenance/debugging
   */
  async getAllEmbeddings(): Promise<Array<{
    entity_id: string;
    entity_type: string;
    embedding: number[];
    version: string;
  }>> {
    try {
      const rows = await this.embeddingRepo.find();
      
      return rows.map(row => ({
        entity_id: row.entity_id,
        entity_type: row.entity_type,
        embedding: this.safeJsonParse(row.embedding),
        version: row.version
      }));
    } catch (error) {
      return [];
    }
  }
}
