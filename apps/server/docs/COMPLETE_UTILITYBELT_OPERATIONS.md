# Complete UtilityBeltAdapter Database Operations

## Total Count: ~95 Database Operations

### Connection Management (2 operations)
1. `connect()` - Initialize connection
2. `disconnect()` - Close connection

### Component Operations (15 operations)
1. `findOne('components', { where: { id } })` - Get component by ID
2. `insert('components', data)` - Create component
3. `update('components', id, data)` - Update component
4. `insertMany('components', data[])` - Bulk insert components
5. `delete('components', id)` - Delete single component
6. `deleteMany('components', { where })` - Delete multiple components
7. `find('components', query)` - Search components
8. `execute('SELECT * FROM components WHERE name LIKE ?')` - Name search
9. `execute('SELECT COUNT(*) FROM components')` - Count components
10. `execute('SELECT COUNT(DISTINCT file_path) FROM components')` - Count files
11. `execute('SELECT language, COUNT(*) FROM components GROUP BY language')` - Language stats
12. `find('components', {})` - Get all components
13. `find('components', { where: { file_path } })` - Get by file
14. `deleteMany('components', { where: { file_path } })` - Delete by file
15. `execute('SELECT DISTINCT file_path FROM components')` - List all files

### Relationship Operations (10 operations)
1. `findOne('relationships', { where: { id } })` - Get relationship
2. `insert('relationships', data)` - Create relationship
3. `update('relationships', id, data)` - Update relationship
4. `insertMany('relationships', data[])` - Bulk insert relationships
5. `delete('relationships', id)` - Delete relationship
6. `deleteMany('relationships', { where })` - Delete multiple relationships
7. `find('relationships', query)` - Search relationships
8. `execute('SELECT COUNT(*) FROM relationships')` - Count relationships
9. `find('relationships', {})` - Get all relationships
10. `deleteMany('relationships', { where: { from/to_component_id } })` - Delete by component

### Embedding Operations (6 operations)
1. `insert('embeddings', data)` - Store embedding
2. `findOne('embeddings', { where })` - Get embedding
3. `find('embeddings', { where: { entity_type: 'component' } })` - Get component embeddings
4. `find('embeddings', { where: { entity_type: 'task' } })` - Get task embeddings
5. `find('embeddings', { where: { entity_type: 'note' } })` - Get note embeddings
6. `find('embeddings', { where: { entity_type: 'rule' } })` - Get rule embeddings

### Transaction Operations (2 operations)
1. `transaction(async (tx) => { ... })` - Execute in transaction
2. `transaction(async () => { ... })` - Batch operations

### Maintenance Operations (5 operations)
1. `execute('VACUUM')` - Optimize database
2. `execute('ANALYZE')` - Update statistics
3. `execute('SELECT ... FROM relationships WHERE ... NOT IN components')` - Find orphaned relationships
4. `execute('SELECT ... GROUP BY ... HAVING COUNT(*) > 1')` - Find duplicates
5. Complex SQL for integrity checks

### Complex Queries (5+ custom SQL)
1. Component search with LIKE
2. Language statistics aggregation
3. Orphaned relationship detection
4. Duplicate detection
5. Cross-table validation queries

## Summary by Table

### Components Table
- **CRUD**: 15 operations
- **Search**: Name pattern, file path, type
- **Bulk**: Insert many, delete many
- **Stats**: Count, language breakdown

### Relationships Table
- **CRUD**: 10 operations
- **Search**: By source, target, type
- **Bulk**: Insert many, delete many
- **Cleanup**: Delete by component

### Embeddings Table
- **CRUD**: 6 operations
- **Search**: By entity type for similarity
- **Used for**: Semantic search across all entities

### Index_metadata Table
- Not directly used in adapter (handled elsewhere)

## TypeORM Migration Requirements

### For Each Operation Above:
1. Create TypeORM repository method
2. Handle both SQLite and PostgreSQL syntax
3. Maintain exact same return format
4. Test with identical inputs/outputs

### Total Scope:
- **50 SQL queries** in metadata managers (Notes: 13, Tasks: 20, Rules: 17)
- **~35 unique operations** in UtilityBeltAdapter (components, relationships, embeddings)
- **5+ complex SQL queries** for maintenance and stats
- **Total: ~90 database operations** to migrate

### Complexity Breakdown:
- **Simple CRUD**: ~60% (straightforward TypeORM)
- **Search/Filter**: ~20% (query builder needed)
- **JSON Operations**: ~10% (database-specific)
- **Complex SQL**: ~10% (raw queries or complex builders)

## Recommendation

Given the full scope (~90 operations):

### Option 1: Complete Migration (2-3 weeks)
- Migrate everything to TypeORM
- Full PostgreSQL support everywhere
- Most future-proof but highest risk

### Option 2: Metadata Only (1 week)
- Migrate only metadata (50 queries) for PostgreSQL
- Keep index DB with utility-belt (SQLite only)
- Balanced approach, gets collaboration features

### Option 3: Adapter Layer (3-4 days)
- Write PostgreSQL adapter for utility-belt
- Change only connection and SQL syntax
- Lowest risk, fastest delivery

The complete migration is significant but doable. Every operation is documented here.