/**
 * Database-aware column decorators for TypeORM cross-database compatibility
 *
 * TypeORM intentionally doesn't abstract database-specific column types.
 * This module provides decorators that handle common cross-database scenarios.
 *
 * Based on TypeORM maintainer guidance: https://github.com/typeorm/typeorm/issues/1776
 * The proper solution is either:
 * 1. Create separate entity classes per database (interface-based approach)
 * 2. Use database-specific column type mapping per driver
 * 3. Accept workarounds for cross-database compatibility
 *
 * This implementation uses approach #3 with driver-specific type resolution.
 */

import { Column, ColumnOptions, ColumnType } from 'typeorm';

/**
 * Get the database type from the calling DataSource
 * This is a workaround for TypeORM's lack of per-driver column type support
 */
function getDbType(): 'postgres' | 'sqlite' {
  // Check if we're in a TypeORM context and can access the connection
  // This will be set dynamically at runtime
  const dbType = (global as any).__TYPEORM_METADATA_DB_TYPE || process.env.METADATA_DB_TYPE || 'sqlite';
  return dbType as 'postgres' | 'sqlite';
}

/**
 * Cross-database column type mapping
 * Maps logical types to database-specific column types
 */
const TYPE_MAPPING: Record<string, Record<'postgres' | 'sqlite', ColumnType>> = {
  // Binary data: Buffer type
  binary: {
    postgres: 'bytea',
    sqlite: 'blob'
  },
  // JSON data: For use with @> operator in PostgreSQL
  json: {
    postgres: 'jsonb',
    sqlite: 'text'
  },
  // Timestamps are auto-handled by TypeORM when using Date type without explicit type
};

/**
 * Date column that works across PostgreSQL and SQLite
 *
 * TypeORM automatically handles the type mapping when you specify the TypeScript type as Date:
 * - In PostgreSQL: Creates "timestamp without time zone" column
 * - In SQLite: Creates "datetime" column (stored as TEXT)
 *
 * Usage: @DateColumn({ nullable: true })
 */
export function DateColumn(options: Omit<ColumnOptions, 'type'> = {}) {
  // Don't specify a type - let TypeORM infer from the TypeScript type
  // This works because TypeORM's ColumnMetadata will see the property is Date
  // and apply the correct database-specific type
  return Column({ ...options });
}

/**
 * Binary column that works across PostgreSQL and SQLite
 *
 * Maps to the appropriate binary type based on the current database driver:
 * - In PostgreSQL: Uses "bytea" column
 * - In SQLite: Uses "blob" column
 *
 * Usage: @BinaryColumn({ nullable: true })
 *
 * Note: Requires METADATA_DB_TYPE environment variable to be set before entity import
 */
export function BinaryColumn(options: Omit<ColumnOptions, 'type'> = {}) {
  const dbType = getDbType();
  const columnType = (TYPE_MAPPING['binary'] as Record<string, ColumnType>)[dbType];

  console.error(`[BinaryColumn] dbType=${dbType}, columnType=${columnType}, METADATA_DB_TYPE=${process.env.METADATA_DB_TYPE}`);

  return Column({
    ...options,
    type: columnType
  });
}

/**
 * JSON column that works across PostgreSQL and SQLite
 *
 * Maps to the appropriate JSON type based on the current database driver:
 * - In PostgreSQL: Uses "jsonb" column (allows @> operator)
 * - In SQLite: Uses "text" column with JSON transformer
 *
 * TypeORM will automatically serialize/deserialize the JSON data.
 * For PostgreSQL, this enables JSONB operators like @> (contains)
 *
 * Usage: @JsonColumn({ nullable: true })
 *
 * Note: Requires __TYPEORM_METADATA_DB_TYPE global to be set before entity import
 */
export function JsonColumn(options: Omit<ColumnOptions, 'type'> = {}) {
  const dbType = getDbType();
  const columnType = (TYPE_MAPPING['json'] as Record<string, ColumnType>)[dbType];

  return Column({
    ...options,
    type: columnType,
    transformer: {
      to: (value: any) => {
        if (value === null || value === undefined) return null;
        return typeof value === 'string' ? value : JSON.stringify(value);
      },
      from: (value: any) => {
        if (!value || value === 'null') return null;
        return typeof value === 'string' ? JSON.parse(value) : value;
      }
    }
  });
}
