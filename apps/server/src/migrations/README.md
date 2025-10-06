# Database Migrations

This directory contains database migration scripts for the code indexer.

## Running Migrations

Migrations are designed to be run manually or as part of deployment scripts.

### Manual Execution

```typescript
import { runMigrations } from './migrations/runner.js';
import { DatabaseManager } from './features/storage/DatabaseManager.js';

const dbManager = new DatabaseManager();
await dbManager.initialize();
await runMigrations(dbManager.getDataSource());
```

### Available Migrations

- **001-add-semantic-relationship-indexes.ts**
  - Adds optimized indexes for semantic data flow relationships
  - Improves query performance for lens-based context queries
  - Safe to run multiple times (uses `IF NOT EXISTS`)

- **002-add-relationship-strength-column.ts**
  - Adds `strength`, `usage_count`, and `last_accessed` columns
  - Enables relationship ranking based on importance
  - Adds indexes for efficient strength-based queries

## Migration Best Practices

1. **Always use transactions** - Each migration runs in a transaction that can be rolled back
2. **Idempotent operations** - Use `IF NOT EXISTS` / `IF EXISTS` where possible
3. **Test rollback** - Every migration should have a corresponding `down()` function
4. **Logging** - Migrations log their progress using the shared logger

## Schema Changes

### Relationships Table

New columns added:
- `strength REAL DEFAULT 0.5` - Relationship importance (0.0-1.0)
- `usage_count INTEGER DEFAULT 0` - Number of times relationship accessed
- `last_accessed DATETIME` - Last access timestamp for recency tracking

New indexes added:
- `idx_relationships_source_type` - Composite index on (source_id, type)
- `idx_relationships_target_type` - Composite index on (target_id, type)
- `idx_relationships_resolved_source_type` - Composite index on (resolved_source_id, type)
- `idx_relationships_resolved_target_type` - Composite index on (resolved_target_id, type)
- `idx_relationships_subtype` - Index on relationship_subtype
- `idx_relationships_semantic_type` - Partial index for semantic relationship types
- `idx_relationships_confidence` - Index on confidence for filtering
- `idx_relationships_strength` - Index on strength for ranking
- `idx_relationships_source_strength` - Composite index on (source_id, strength DESC)
- `idx_relationships_target_strength` - Composite index on (target_id, strength DESC)

## Future Migrations

Planned migrations:
- Add materialized views for common graph queries
- Add full-text search indexes on component metadata
- Add partitioning for large relationship tables
