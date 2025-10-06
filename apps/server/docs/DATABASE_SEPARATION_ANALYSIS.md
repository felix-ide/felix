# Database Separation Analysis

## Key Finding: Databases are LOOSELY Coupled! 🎉

The metadata database (tasks/notes/rules) and index database (components/relationships) are **NOT directly joined**. They only reference each other through IDs stored as strings.

## How They Connect

### 1. **Entity Links (JSON column)**
Tasks, Notes, and Rules have an `entity_links` JSON column:
```typescript
entity_links: [
  { 
    entity_type: 'component',  // or 'task', 'note', 'rule'
    entity_id: 'comp_123',      // Just stores the ID as string
    link_strength: 'primary' 
  }
]
```

### 2. **TaskCodeLink Table**
The only "join" table, but it doesn't actually JOIN:
```typescript
{
  task_id: 'task_456',        // Reference to tasks table
  component_id: 'comp_123'    // Reference to components table
}
```
Comment in code: "This cross-database reference is handled at the application level"

### 3. **No Direct SQL JOINs**
- ✅ No queries found with `JOIN components` from metadata tables
- ✅ No queries found with `JOIN meta.` from index tables
- ✅ All relationships are managed through application logic

## What This Means

### We CAN migrate them separately! 

**Option 1: Migrate Index DB First**
- Components, Relationships, Embeddings → TypeORM
- Keep metadata in utility-belt temporarily
- Pros: Simpler tables, fewer queries
- Cons: Still need to handle entity_links lookups

**Option 2: Migrate Metadata DB First** 
- Tasks, Notes, Rules → TypeORM
- Keep index in utility-belt temporarily
- Pros: Get PostgreSQL support for collaboration features
- Cons: More complex queries (50+ SQL statements)

**Option 3: Just Add PostgreSQL to Metadata**
- Keep both using utility-belt
- Add PostgreSQL support to utility-belt adapter
- Migrate metadata DB to PostgreSQL
- Leave index DB as SQLite
- Pros: Much simpler, no query rewrites needed
- Cons: Still dependent on utility-belt

## Interaction Points

### From Metadata → Index
1. When displaying a task, might need to fetch linked components
2. When searching, might need to check both databases
3. When deleting a component, might need to update entity_links

### From Index → Metadata  
1. When showing a component, might fetch related tasks
2. When analyzing code, might check for applicable rules

### But these are ALL application-level operations, not SQL JOINs!

## Recommendation

Since the databases are loosely coupled:

1. **Start with Index DB migration to TypeORM**
   - Only 4 tables (components, relationships, embeddings, index_metadata)
   - Simpler queries (mostly CRUD)
   - No complex JSON operations
   - Already created all entities

2. **Test thoroughly with existing metadata DB**
   - Ensure entity_links still resolve correctly
   - Verify no performance regression

3. **Then migrate Metadata DB**
   - With lessons learned from Index migration
   - Can take time to handle complex queries properly

This approach is MUCH safer than trying to migrate everything at once!