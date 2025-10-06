# Complete Database Access Map

## Database Access Points

### 1. Direct Database Access (50 SQL queries)
- **NotesManager**: 13 prepared statements
- **TasksManager**: 20 prepared statements  
- **RulesManager**: 17 prepared statements

### 2. Through UtilityBeltAdapter
The adapter wraps utility-belt ORM methods and the metadata managers:

#### Component Operations
- `searchComponents()` - Uses utility-belt `execute()` for LIKE queries
- `getComponent()` - Uses utility-belt `findOne()`
- `storeComponent()` - Uses utility-belt `insert()` or `update()`
- `storeComponents()` - Uses utility-belt `insertMany()`
- `deleteComponent()` - Uses utility-belt `deleteOne()`

#### Embedding Operations (for semantic search)
- `storeEmbedding()` - Stores in embeddings table
- `getEmbedding()` - Retrieves embeddings
- `findSimilarComponents()` - Vector similarity search
- `findSimilarEntities()` - Searches across tasks, notes, rules using embeddings

#### Metadata Operations (delegates to managers)
- `getTask()` → `this.tasksManager.getTask()`
- `storeTask()` → `this.tasksManager.storeTask()`
- `searchTasks()` → `this.tasksManager.searchTasks()`
- `getNote()` → `this.notesManager.getNote()`
- `storeNote()` → `this.notesManager.storeNote()`
- `searchNotes()` → `this.notesManager.searchNotes()`
- `getRule()` → `this.rulesManager.getRule()`
- `storeRule()` → `this.rulesManager.storeRule()`
- `searchRules()` → `this.rulesManager.searchRules()`

### 3. Search Routes (`src/server/routes/searchRoutes.ts`)
Uses the CodeIndexer which calls UtilityBeltAdapter methods:
- Direct ID lookups: `getTask()`, `getNote()`, `getRule()`
- Text search: `searchComponents()` with name pattern
- Semantic search: `findSimilarEntities()` with embeddings

### 4. Service Layer Access

#### TagDegradationService
- Accesses through IStorageAdapter interface
- Calls adapter methods to update tags
- No direct SQL, uses adapter abstraction

#### Export Services (TaskExportService, NoteExportService, RuleExportService)
- Use adapter methods to fetch data
- No direct SQL access

#### DocumentationService  
- Uses adapter for fetching components and relationships
- No direct SQL

### 5. MCP Server (`src/mcp/`)
- Uses CodeIndexer instance
- All database access through adapter methods
- No direct SQL

### 6. API Routes (`src/server/routes/`)
- All use CodeIndexer or adapter methods
- No direct database access

## Critical Findings

### What MUST be migrated:

1. **UtilityBeltAdapter** (the main adapter)
   - All component CRUD operations
   - Embedding operations for semantic search
   - Delegates to metadata managers

2. **Three Metadata Managers** (50 SQL queries total)
   - NotesManager - 13 queries
   - TasksManager - 20 queries
   - RulesManager - 17 queries

3. **No other direct database access!**
   - Everything else goes through the adapter
   - Services use IStorageAdapter interface
   - Routes use CodeIndexer which uses adapter

## Migration Strategy

### Option A: Full TypeORM Migration
1. Create TypeORM repositories for all entities
2. Rewrite all 50 SQL queries in managers
3. Update UtilityBeltAdapter to use TypeORM
4. Test every single operation

### Option B: Hybrid Approach (Recommended)
1. Keep utility-belt for components/embeddings (simpler)
2. Migrate only metadata to TypeORM for PostgreSQL support
3. Update the 3 managers to use TypeORM repositories
4. Everything else stays the same

### Option C: Minimal Change
1. Keep everything as is
2. Add PostgreSQL support to utility-belt
3. Only change connection strings and JSON operators
4. Least risk, but stays dependent on utility-belt

## Testing Requirements

For ANY approach, we need tests for:

### Core Operations (via adapter)
- [ ] All component CRUD operations
- [ ] All embedding operations
- [ ] Semantic search with vectors

### Manager Operations (50 queries)
- [ ] All 13 NotesManager queries
- [ ] All 20 TasksManager queries
- [ ] All 17 RulesManager queries

### Integration Points
- [ ] Search routes returning correct results
- [ ] Export services getting all data
- [ ] MCP tools working correctly
- [ ] API endpoints unchanged

### Database Compatibility
- [ ] SQLite: All operations work
- [ ] PostgreSQL: All operations work
- [ ] JSON queries work in both
- [ ] Performance acceptable in both