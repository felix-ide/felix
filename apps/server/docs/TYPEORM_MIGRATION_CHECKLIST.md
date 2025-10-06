# TypeORM Migration Checklist

## Migration Strategy
We're doing a **file-by-file migration** to TypeORM, prioritizing metadata (tasks/notes/rules) for planning workflow.

## Phase 1: Metadata Managers (Priority - For Planning Workflow)

### ✅ NotesManager.ts → NotesRepository.ts
**Status:** COMPLETED
**Location:** `/src/features/storage/repositories/NotesRepository.ts`
- [x] 13 SQL queries migrated
- [x] Supports both SQLite and PostgreSQL
- [x] JSON operations handled per database

### ⬜ TasksManager.ts → TasksRepository.ts  
**Status:** TODO
**20 SQL queries to migrate:**

#### Basic CRUD (4 queries)
- [ ] `getTaskStatement` - Get task by ID
- [ ] `createTaskStatement` - Create new task
- [ ] `updateTaskStatement` - Update task
- [ ] `deleteTaskStatement` - Delete task

#### Search & List (5 queries)
- [ ] `searchTasksStatement` - Search with filters
- [ ] `listTasksStatement` - List with pagination
- [ ] `getTasksByStatusStatement` - Filter by status
- [ ] `getTasksByParentStatement` - Get child tasks
- [ ] `getRootTasksStatement` - Get top-level tasks

#### Hierarchy & Relations (4 queries)
- [ ] `getTaskHierarchyStatement` - Recursive CTE for tree
- [ ] `getTaskWithChildrenStatement` - Task + immediate children
- [ ] `getTaskAncestorsStatement` - Get parent chain
- [ ] `updateTaskParentStatement` - Move task in hierarchy

#### Dependencies (3 queries)
- [ ] `createDependencyStatement` - Add task dependency
- [ ] `getDependenciesStatement` - Get task dependencies
- [ ] `deleteDependencyStatement` - Remove dependency

#### Code Links (2 queries)
- [ ] `createCodeLinkStatement` - Link task to code
- [ ] `getCodeLinksStatement` - Get task's code links

#### Metrics (2 queries)
- [ ] `createMetricStatement` - Track task metrics
- [ ] `getMetricsStatement` - Get task metrics

### ⬜ RulesManager.ts → RulesRepository.ts
**Status:** TODO  
**17 SQL queries to migrate:**

#### Basic CRUD (4 queries)
- [ ] `getRuleStatement` - Get rule by ID
- [ ] `createRuleStatement` - Create new rule
- [ ] `updateRuleStatement` - Update rule
- [ ] `deleteRuleStatement` - Delete rule

#### Search & Analytics (5 queries)
- [ ] `searchRulesStatement` - Search with filters
- [ ] `listRulesStatement` - List with pagination
- [ ] `getActiveRulesStatement` - Get active rules only
- [ ] `getRulesByTypeStatement` - Filter by rule type
- [ ] `getRuleAnalyticsStatement` - Usage statistics

#### Relationships (3 queries)
- [ ] `createRuleRelationshipStatement` - Link rules
- [ ] `getRuleRelationshipsStatement` - Get relationships
- [ ] `deleteRuleRelationshipStatement` - Remove link

#### Applications & Tracking (3 queries)
- [ ] `createApplicationStatement` - Track rule application
- [ ] `getApplicationsStatement` - Get application history
- [ ] `updateEffectivenessStatement` - Update effectiveness score

#### Degradation (2 queries)
- [ ] `getRulesForDegradationStatement` - Find inactive rules
- [ ] `markRuleInactiveStatement` - Deactivate rule

## Phase 2: UtilityBeltAdapter Operations

### ⬜ Component Operations (15 operations)
**Location:** `/src/storage/adapters/UtilityBeltAdapter.ts`

#### CRUD Operations (6)
- [ ] `findOne('components', { where: { id } })`
- [ ] `insert('components', data)`
- [ ] `update('components', id, data)`
- [ ] `insertMany('components', data[])`
- [ ] `delete('components', id)`
- [ ] `deleteMany('components', { where })`

#### Search Operations (4)
- [ ] `find('components', query)`
- [ ] `execute('SELECT * FROM components WHERE name LIKE ?')`
- [ ] `find('components', { where: { file_path } })`
- [ ] `deleteMany('components', { where: { file_path } })`

#### Statistics (5)
- [ ] `execute('SELECT COUNT(*) FROM components')`
- [ ] `execute('SELECT COUNT(DISTINCT file_path) FROM components')`
- [ ] `execute('SELECT language, COUNT(*) FROM components GROUP BY language')`
- [ ] `find('components', {})`
- [ ] `execute('SELECT DISTINCT file_path FROM components')`

### ⬜ Relationship Operations (10 operations)
#### CRUD Operations (6)
- [ ] `findOne('relationships', { where: { id } })`
- [ ] `insert('relationships', data)`
- [ ] `update('relationships', id, data)`
- [ ] `insertMany('relationships', data[])`
- [ ] `delete('relationships', id)`
- [ ] `deleteMany('relationships', { where })`

#### Search Operations (4)
- [ ] `find('relationships', query)`
- [ ] `execute('SELECT COUNT(*) FROM relationships')`
- [ ] `find('relationships', {})`
- [ ] `deleteMany('relationships', { where: { from/to_component_id } })`

### ⬜ Embedding Operations (6 operations)
- [ ] `insert('embeddings', data)`
- [ ] `findOne('embeddings', { where })`
- [ ] `find('embeddings', { where: { entity_type: 'component' } })`
- [ ] `find('embeddings', { where: { entity_type: 'task' } })`
- [ ] `find('embeddings', { where: { entity_type: 'note' } })`
- [ ] `find('embeddings', { where: { entity_type: 'rule' } })`

### ⬜ Transaction & Maintenance (7 operations)
- [ ] `transaction(async (tx) => { ... })`
- [ ] `transaction(async () => { ... })`
- [ ] `execute('VACUUM')`
- [ ] `execute('ANALYZE')`
- [ ] Orphaned relationship detection query
- [ ] Duplicate detection query
- [ ] Cross-table validation queries

## Phase 3: Service Layer Updates

### ⬜ TagDegradationService.ts
**Uses IStorageAdapter interface - needs update to use TypeORM**
- [ ] `getAllNotes()` → Use NotesRepository
- [ ] `getAllTasks()` → Use TasksRepository
- [ ] `getAllRules()` → Use RulesRepository
- [ ] `updateEntityTags()` → Use appropriate repository
- [ ] `updateRuleUsage()` → Use RulesRepository
- [ ] `markRuleInactive()` → Use RulesRepository
- [ ] `getRulesForDegradation()` → Use RulesRepository

### ⬜ searchRoutes.ts
**Uses CodeIndexer → UtilityBeltAdapter**
- [ ] Direct ID lookups → Use TypeORM repositories
- [ ] Component search → Use ComponentRepository
- [ ] Semantic search → Use EmbeddingRepository
- [ ] Context generation → Use TypeORM relations

## Phase 4: Testing & Verification

### ⬜ Integration Tests
- [ ] Create test database with sample data
- [ ] Test all CRUD operations for each entity
- [ ] Test complex queries (hierarchies, CTEs)
- [ ] Test JSON operations in both SQLite and PostgreSQL
- [ ] Test transactions and rollbacks
- [ ] Performance comparison tests

### ⬜ Migration Validation
- [ ] Compare query results: old vs new
- [ ] Verify data integrity after migration
- [ ] Check all relationships preserved
- [ ] Validate JSON data handling
- [ ] Ensure no orphaned records

### ⬜ Database Compatibility
- [ ] SQLite: All operations work
- [ ] PostgreSQL: All operations work
- [ ] Connection switching works
- [ ] Environment variable configuration

## Migration Order (Recommended)

1. **Week 1: Metadata Repositories**
   - Day 1-2: TasksRepository (20 queries)
   - Day 3-4: RulesRepository (17 queries)
   - Day 5: Integration tests for metadata

2. **Week 2: Core Adapter**
   - Day 1-2: Component operations (15 ops)
   - Day 3: Relationship operations (10 ops)
   - Day 4: Embedding operations (6 ops)
   - Day 5: Transaction & maintenance

3. **Week 3: Services & Testing**
   - Day 1: TagDegradationService
   - Day 2: searchRoutes
   - Day 3-5: Comprehensive testing

## Files to Track

### Core Migration Files
```
✅ /src/features/storage/repositories/NotesRepository.ts
⬜ /src/features/storage/repositories/TasksRepository.ts
⬜ /src/features/storage/repositories/RulesRepository.ts
⬜ /src/features/storage/repositories/ComponentRepository.ts
⬜ /src/features/storage/repositories/RelationshipRepository.ts
⬜ /src/features/storage/repositories/EmbeddingRepository.ts
```

### Files to Update
```
⬜ /src/storage/adapters/UtilityBeltAdapter.ts (replace internals)
⬜ /src/storage/metadata/TasksManager.ts (use TasksRepository)
⬜ /src/storage/metadata/RulesManager.ts (use RulesRepository)
⬜ /src/services/TagDegradationService.ts (use repositories)
⬜ /src/server/routes/searchRoutes.ts (use repositories)
```

### Configuration Files
```
✅ /src/features/storage/config/database.config.ts
✅ /src/features/storage/entities/metadata/*.entity.ts (14 entities)
⬜ /src/features/storage/entities/index/*.entity.ts (3 entities)
```

## Success Criteria

- [ ] All 50 SQL queries from metadata managers migrated
- [ ] All ~35 UtilityBeltAdapter operations migrated
- [ ] Both SQLite and PostgreSQL fully supported
- [ ] All tests passing
- [ ] No performance degradation
- [ ] Zero data loss during migration
- [ ] Backward compatibility maintained

## Notes

1. **Priority:** Metadata first (tasks/notes/rules) for planning workflow
2. **Approach:** File-by-file to ensure nothing missed
3. **Testing:** Test each file after migration before moving on
4. **Rollback:** Git revert if issues arise
5. **Documentation:** Update as we complete each item