# TypeORM Migration - Complete Query Inventory

## Database Operation Inventory

### UtilityBeltAdapter Operations

#### Component Operations
1. **findOne('components', { where: { id } })** → Check if component exists
2. **insert('components', componentData)** → Insert new component
3. **update('components', id, componentData)** → Update existing component
4. **insertMany('components', componentData[])** → Bulk insert components
5. **find('components', { where: criteria })** → Search components
6. **deleteOne('components', { where: { id } })** → Delete component
7. **deleteMany('components', { where: criteria })** → Delete multiple components

#### Relationship Operations
1. **findOne('relationships', { where: { id } })** → Check relationship exists
2. **insert('relationships', relationshipData)** → Insert relationship
3. **insertMany('relationships', relationshipData[])** → Bulk insert relationships
4. **find('relationships', { where: criteria })** → Search relationships
5. **deleteOne('relationships', { where: { id } })** → Delete relationship
6. **deleteMany('relationships', { where: criteria })** → Delete multiple relationships

#### Embedding Operations
1. **findOne('embeddings', { where: criteria })** → Get embedding
2. **insert('embeddings', embeddingData)** → Store embedding
3. **update('embeddings', id, embeddingData)** → Update embedding
4. **find('embeddings', {})** → Get all embeddings for similarity search

### NotesManager Direct SQL Queries
Located in: `src/storage/metadata/NotesManager.ts`

1. **Complex JSON queries**:
```sql
SELECT * FROM notes 
WHERE EXISTS (
  SELECT 1 FROM json_each(entity_links)
  WHERE json_extract(value, '$.entity_type') = ?
  AND json_extract(value, '$.entity_id') = ?
)
```

2. **Hierarchical queries** (get tree structure)
3. **Tag aggregation queries**
4. **Full-text search queries**

### TasksManager Direct SQL Queries
Located in: `src/storage/metadata/TasksManager.ts`

1. **Task hierarchy with CTEs**
2. **Dependency graph queries**
3. **Checklist JSON operations**
4. **Task metrics aggregations**
5. **Workflow validation queries**

### RulesManager Direct SQL Queries
Located in: `src/storage/metadata/RulesManager.ts`

1. **Rule matching with JSON patterns**
2. **Application tracking aggregations**:
```sql
SELECT 
  r.*,
  COUNT(ra.id) as application_count,
  AVG(ra.feedback_score) as avg_score
FROM rules r
LEFT JOIN rule_applications ra ON r.id = ra.rule_id
GROUP BY r.id
```

3. **Semantic trigger matching**
4. **Rule effectiveness metrics**

## Migration Checklist

### Phase 1: Basic CRUD Operations
- [ ] Component CRUD (6 operations)
- [ ] Relationship CRUD (6 operations)
- [ ] Embedding CRUD (4 operations)
- [ ] Task CRUD (via TasksManager)
- [ ] Note CRUD (via NotesManager)
- [ ] Rule CRUD (via RulesManager)

### Phase 2: Search Operations
- [ ] Component search with criteria
- [ ] Relationship search with criteria
- [ ] Full-text search
- [ ] Embedding similarity search

### Phase 3: Complex Queries
- [ ] JSON extraction queries (14 identified)
- [ ] Hierarchical queries (tasks, notes, rules)
- [ ] Aggregation queries (4 identified)
- [ ] CTE queries for tree structures

### Phase 4: Database-Specific Implementations
- [ ] SQLite JSON operators (`json_each`, `json_extract`)
- [ ] PostgreSQL JSONB operators (`@>`, `->`, `->>`)
- [ ] SQLite vs PostgreSQL boolean handling
- [ ] Date/time format differences

## TypeORM Query Mappings

### Basic CRUD Mapping
```typescript
// UtilityBelt
await this.sqliteAdapter.findOne('components', { where: { id } })

// TypeORM
await componentRepo.findOne({ where: { id } })
```

### JSON Query Mapping
```typescript
// SQLite (current)
WHERE json_extract(entity_links, '$[0].entity_type') = ?

// TypeORM SQLite
.where(`json_extract(entity_links, '$[0].entity_type') = :type`, { type })

// TypeORM PostgreSQL
.where(`entity_links @> :link`, { link: JSON.stringify([{ entity_type: type }]) })
```

### Aggregation Mapping
```typescript
// Raw SQL
SELECT COUNT(*), AVG(score) FROM table GROUP BY category

// TypeORM
.select('category')
.addSelect('COUNT(*)', 'count')
.addSelect('AVG(score)', 'avg_score')
.groupBy('category')
```

## Testing Strategy

### For Each Query:
1. Create test with sample data
2. Run query with UtilityBeltAdapter
3. Run equivalent with TypeORM
4. Compare results exactly
5. Measure performance difference

### Test Categories:
1. **Smoke Tests**: Basic CRUD operations
2. **Integration Tests**: Complex queries with joins
3. **Edge Cases**: Empty results, nulls, large datasets
4. **Performance Tests**: Bulk operations, complex aggregations
5. **Database Compatibility**: Same query on SQLite and PostgreSQL

## Risk Areas

### High Risk (Complex/Critical):
1. JSON extraction queries - Different syntax per database
2. Hierarchical queries - CTEs might behave differently
3. Full-text search - Implementation varies by database
4. Transaction handling - Different isolation levels

### Medium Risk:
1. Date/time handling - Format differences
2. Boolean fields - SQLite uses 0/1, PostgreSQL uses true/false
3. NULL handling - Subtle differences in comparisons

### Low Risk:
1. Simple CRUD - TypeORM handles these well
2. Basic WHERE clauses - Standard SQL
3. Simple JOINs - Well-supported

## Implementation Order

1. **Week 1**: Basic CRUD + Tests
2. **Week 2**: Search operations + JSON queries
3. **Week 3**: Complex aggregations + hierarchies
4. **Week 4**: Performance optimization + migration scripts

## Success Criteria

- [ ] All 50+ queries converted to TypeORM
- [ ] 100% test coverage on query conversions
- [ ] Performance within 10% of current implementation
- [ ] Zero data loss during migration
- [ ] Both SQLite and PostgreSQL pass all tests
- [ ] Rollback plan tested and documented