/**
 * TypeORM Database Configuration
 * Supports dual database architecture:
 * - Index DB: SQLite only (for local code analysis)
 * - Metadata DB: SQLite or PostgreSQL (configurable)
 */

import { DataSourceOptions } from 'typeorm';
import { logger } from '../../../shared/logger.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import all entities
import { Component, Relationship, Embedding, IndexMetadata } from '../entities/index/index.js';
import { 
  Task, Note, Rule, 
  TaskDependency, TaskCodeLink, TaskMetric,
  RuleRelationship, RuleApplication,
  WorkflowConfiguration, GlobalWorkflowSetting 
} from '../entities/metadata/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database type from environment or default to sqlite
const METADATA_DB_TYPE = process.env.METADATA_DB_TYPE || 'sqlite';

/**
 * Index database configuration (SQLite only)
 * Used for code components, relationships, and embeddings
 */
export const indexDatabaseConfig: DataSourceOptions = {
  type: 'sqlite',
  database: process.env.INDEX_DB_PATH || '.felix.db',
  entities: [
    Component, Relationship, Embedding, IndexMetadata
  ],
  synchronize: true, // Enable to create schema
  logging: process.env.DB_LOGGING === 'true',
  migrations: [
    join(__dirname, '../migrations/index/*.{ts,js}')
  ],
  migrationsTableName: 'typeorm_migrations'
};

/**
 * Metadata database configuration (SQLite or PostgreSQL)
 * Used for tasks, notes, rules, and workflows
 */
export const metadataDatabaseConfig: DataSourceOptions = METADATA_DB_TYPE === 'postgres' 
  ? {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'code_indexer_metadata',
      entities: [
        Task, Note, Rule, TaskDependency, TaskCodeLink, TaskMetric,
        RuleRelationship, RuleApplication, WorkflowConfiguration, GlobalWorkflowSetting
      ],
      synchronize: true, // Enable to create schema
      logging: process.env.DB_LOGGING === 'true',
      migrations: [
        join(__dirname, '../migrations/metadata/*.{ts,js}')
      ],
      migrationsTableName: 'typeorm_migrations',
      // PostgreSQL specific options
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false,
      poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
      extra: {
        max: parseInt(process.env.DB_POOL_SIZE || '10'),
        idleTimeoutMillis: 30000
      }
    }
  : {
      type: 'sqlite',
      database: process.env.METADATA_DB_PATH || '.felix.metadata.db',
      entities: [
        Task, Note, Rule, TaskDependency, TaskCodeLink, TaskMetric,
        RuleRelationship, RuleApplication, WorkflowConfiguration, GlobalWorkflowSetting
      ],
      synchronize: true, // Enable to create schema
      logging: process.env.DB_LOGGING === 'true',
      migrations: [
        join(__dirname, '../migrations/metadata/*.{ts,js}')
      ],
      migrationsTableName: 'typeorm_migrations'
    };

/**
 * Validate database configuration
 */
export function validateDatabaseConfig(): void {
  if (METADATA_DB_TYPE === 'postgres') {
    const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      logger.warn(`Missing PostgreSQL configuration: ${missing.join(', ')}`);
      logger.warn('Using default values. Set these environment variables for production.');
    }
  }
}

/**
 * Get database configuration summary for logging
 */
export function getDatabaseConfigSummary() {
  return {
    index: {
      type: 'sqlite',
      database: indexDatabaseConfig.database
    },
    metadata: {
      type: METADATA_DB_TYPE,
      database: METADATA_DB_TYPE === 'postgres' 
        ? `${(metadataDatabaseConfig as any).host}:${(metadataDatabaseConfig as any).port}/${(metadataDatabaseConfig as any).database}`
        : metadataDatabaseConfig.database
    }
  };
}
