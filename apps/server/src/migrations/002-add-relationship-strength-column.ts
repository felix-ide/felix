/**
 * Migration 002: Add relationship strength column
 *
 * This migration adds a 'strength' column to the relationships table
 * to track relationship importance based on usage frequency and proximity.
 */

import { DataSource } from 'typeorm';
import { logger } from '../shared/logger.js';

export async function up(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    logger.info('Running migration 002: Add relationship strength column');

    // Add strength column (0.0 to 1.0, default 0.5 for neutral)
    await queryRunner.query(`
      ALTER TABLE relationships
      ADD COLUMN strength REAL DEFAULT 0.5
    `);

    // Add usage_count column for tracking frequency
    await queryRunner.query(`
      ALTER TABLE relationships
      ADD COLUMN usage_count INTEGER DEFAULT 0
    `);

    // Add last_accessed column for recency tracking
    await queryRunner.query(`
      ALTER TABLE relationships
      ADD COLUMN last_accessed DATETIME
    `);

    // Add index on strength for ranking queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_relationships_strength
      ON relationships(strength DESC)
    `);

    // Add composite index for source + strength (for ranked lookups)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_relationships_source_strength
      ON relationships(source_id, strength DESC)
    `);

    // Add composite index for target + strength
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_relationships_target_strength
      ON relationships(target_id, strength DESC)
    `);

    await queryRunner.commitTransaction();
    logger.info('Migration 002 completed successfully');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    logger.error('Migration 002 failed:', error);
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
    logger.info('Rolling back migration 002: Remove relationship strength column');

    await queryRunner.query('DROP INDEX IF EXISTS idx_relationships_strength');
    await queryRunner.query('DROP INDEX IF EXISTS idx_relationships_source_strength');
    await queryRunner.query('DROP INDEX IF EXISTS idx_relationships_target_strength');

    await queryRunner.query(`
      ALTER TABLE relationships
      DROP COLUMN strength
    `);

    await queryRunner.query(`
      ALTER TABLE relationships
      DROP COLUMN usage_count
    `);

    await queryRunner.query(`
      ALTER TABLE relationships
      DROP COLUMN last_accessed
    `);

    await queryRunner.commitTransaction();
    logger.info('Migration 002 rollback completed');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    logger.error('Migration 002 rollback failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}
