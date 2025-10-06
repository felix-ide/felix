/**
 * Migration 001: Add indexes for semantic relationship types
 *
 * This migration adds optimized indexes for the new semantic data flow relationships
 * to improve query performance for lens-based context queries.
 */

import { DataSource } from 'typeorm';
import { logger } from '../shared/logger.js';

export async function up(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    logger.info('Running migration 001: Add semantic relationship indexes');

    // Add composite index for source + type (optimizes callers/callees queries)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_relationships_source_type
      ON relationships(source_id, type)
    `);

    // Add composite index for target + type (optimizes reverse lookups)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_relationships_target_type
      ON relationships(target_id, type)
    `);

    // Add composite index for resolved source + type
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_relationships_resolved_source_type
      ON relationships(resolved_source_id, type)
      WHERE resolved_source_id IS NOT NULL
    `);

    // Add composite index for resolved target + type
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_relationships_resolved_target_type
      ON relationships(resolved_target_id, type)
      WHERE resolved_target_id IS NOT NULL
    `);

    // Add index on relationship_subtype for filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_relationships_subtype
      ON relationships(relationship_subtype)
      WHERE relationship_subtype IS NOT NULL
    `);

    // Add partial index for semantic data flow relationships
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_relationships_semantic_type
      ON relationships(type)
      WHERE type IN (
        'uses_field', 'transforms_data', 'passes_to', 'returns_from',
        'reads_from', 'writes_to', 'derives_from', 'modifies',
        'awaits', 'yields', 'observes_pattern'
      )
    `);

    // Add index for confidence filtering (useful for pattern detection)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_relationships_confidence
      ON relationships(confidence)
      WHERE confidence < 1.0
    `);

    await queryRunner.commitTransaction();
    logger.info('Migration 001 completed successfully');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    logger.error('Migration 001 failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

export async function down(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    logger.info('Rolling back migration 001: Remove semantic relationship indexes');

    await queryRunner.query('DROP INDEX IF EXISTS idx_relationships_source_type');
    await queryRunner.query('DROP INDEX IF EXISTS idx_relationships_target_type');
    await queryRunner.query('DROP INDEX IF EXISTS idx_relationships_resolved_source_type');
    await queryRunner.query('DROP INDEX IF EXISTS idx_relationships_resolved_target_type');
    await queryRunner.query('DROP INDEX IF EXISTS idx_relationships_subtype');
    await queryRunner.query('DROP INDEX IF EXISTS idx_relationships_semantic_type');
    await queryRunner.query('DROP INDEX IF EXISTS idx_relationships_confidence');

    await queryRunner.commitTransaction();
    logger.info('Migration 001 rollback completed');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    logger.error('Migration 001 rollback failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}
