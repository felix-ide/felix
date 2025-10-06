/**
 * Migration Runner
 * Executes database migrations in order
 */

import { DataSource } from 'typeorm';
import { logger } from '../shared/logger.js';

interface Migration {
  id: string;
  name: string;
  up: (dataSource: DataSource) => Promise<void>;
  down: (dataSource: DataSource) => Promise<void>;
}

/**
 * Registry of all migrations in execution order
 */
const migrations: Migration[] = [];

/**
 * Register a migration
 */
function registerMigration(migration: Migration): void {
  migrations.push(migration);
  migrations.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Load all migration modules
 */
async function loadMigrations(): Promise<void> {
  const { up: up001, down: down001 } = await import('./001-add-semantic-relationship-indexes.js');
  registerMigration({
    id: '001',
    name: 'add-semantic-relationship-indexes',
    up: up001,
    down: down001,
  });

  const { up: up002, down: down002 } = await import('./002-add-relationship-strength-column.js');
  registerMigration({
    id: '002',
    name: 'add-relationship-strength-column',
    up: up002,
    down: down002,
  });
}

/**
 * Create migrations tracking table if it doesn't exist
 */
async function ensureMigrationsTable(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations(dataSource: DataSource): Promise<Set<string>> {
  const rows = await dataSource.query('SELECT id FROM migrations');
  return new Set(rows.map((r: any) => r.id));
}

/**
 * Mark migration as executed
 */
async function markMigrationExecuted(
  dataSource: DataSource,
  id: string,
  name: string
): Promise<void> {
  await dataSource.query('INSERT INTO migrations (id, name) VALUES (?, ?)', [id, name]);
}

/**
 * Remove migration from executed list
 */
async function unmarkMigrationExecuted(dataSource: DataSource, id: string): Promise<void> {
  await dataSource.query('DELETE FROM migrations WHERE id = ?', [id]);
}

/**
 * Run all pending migrations
 */
export async function runMigrations(dataSource: DataSource): Promise<void> {
  logger.info('Starting database migrations');

  await ensureMigrationsTable(dataSource);
  await loadMigrations();

  const executed = await getExecutedMigrations(dataSource);
  const pending = migrations.filter((m) => !executed.has(m.id));

  if (pending.length === 0) {
    logger.info('No pending migrations');
    return;
  }

  logger.info(`Found ${pending.length} pending migrations`);

  for (const migration of pending) {
    logger.info(`Running migration ${migration.id}: ${migration.name}`);
    try {
      await migration.up(dataSource);
      await markMigrationExecuted(dataSource, migration.id, migration.name);
      logger.info(`Migration ${migration.id} completed successfully`);
    } catch (error) {
      logger.error(`Migration ${migration.id} failed:`, error);
      throw error;
    }
  }

  logger.info('All migrations completed successfully');
}

/**
 * Rollback the last N migrations
 */
export async function rollbackMigrations(
  dataSource: DataSource,
  count: number = 1
): Promise<void> {
  logger.info(`Rolling back ${count} migrations`);

  await ensureMigrationsTable(dataSource);
  await loadMigrations();

  const executed = await getExecutedMigrations(dataSource);
  const toRollback = migrations
    .filter((m) => executed.has(m.id))
    .slice(-count)
    .reverse();

  if (toRollback.length === 0) {
    logger.info('No migrations to rollback');
    return;
  }

  for (const migration of toRollback) {
    logger.info(`Rolling back migration ${migration.id}: ${migration.name}`);
    try {
      await migration.down(dataSource);
      await unmarkMigrationExecuted(dataSource, migration.id);
      logger.info(`Migration ${migration.id} rolled back successfully`);
    } catch (error) {
      logger.error(`Migration ${migration.id} rollback failed:`, error);
      throw error;
    }
  }

  logger.info('Rollback completed successfully');
}

/**
 * Get migration status
 */
export async function getMigrationStatus(dataSource: DataSource): Promise<{
  total: number;
  executed: number;
  pending: number;
  migrations: Array<{ id: string; name: string; status: 'executed' | 'pending' }>;
}> {
  await ensureMigrationsTable(dataSource);
  await loadMigrations();

  const executed = await getExecutedMigrations(dataSource);

  const migrationList = migrations.map((m) => ({
    id: m.id,
    name: m.name,
    status: executed.has(m.id) ? ('executed' as const) : ('pending' as const),
  }));

  return {
    total: migrations.length,
    executed: executed.size,
    pending: migrations.length - executed.size,
    migrations: migrationList,
  };
}
