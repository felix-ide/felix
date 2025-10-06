# Complete Metadata Query Inventory

## NotesManager.ts - 13 Queries

### 1. CREATE NOTE (Line 24)
```sql
INSERT INTO meta.notes (
  id, parent_id, title, content, note_type, 
  entity_type, entity_id, entity_links, stable_tags,
  sort_order, depth_level, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

### 2. GET NOTE BY ID (Line 64)
```sql
SELECT * FROM meta.notes WHERE id = ?
```

### 3. UPDATE NOTE (Line 130)
```sql
UPDATE meta.notes SET [dynamic fields] WHERE id = ?
```

### 4. DELETE NOTE (Line 153)
```sql
DELETE FROM meta.notes WHERE id = ?
```

### 5. SEARCH NOTES - COUNT (Line 209)
```sql
SELECT COUNT(*) as total FROM meta.notes WHERE [conditions]
```

### 6. SEARCH NOTES - DATA (Line 222)
```sql
SELECT * FROM meta.notes WHERE [conditions] ORDER BY [order] LIMIT ? OFFSET ?
```

### 7. FIND BY ENTITY LINK - COUNT (Line 288)
```sql
SELECT COUNT(*) as total FROM meta.notes 
WHERE EXISTS (
  SELECT 1 FROM json_each(entity_links)
  WHERE json_extract(value, '$.entity_type') = ?
  AND json_extract(value, '$.entity_id') = ?
)
```

### 8. FIND BY ENTITY LINK - DATA (Line 301)
```sql
SELECT * FROM meta.notes 
WHERE EXISTS (
  SELECT 1 FROM json_each(entity_links)
  WHERE json_extract(value, '$.entity_type') = ?
  AND json_extract(value, '$.entity_id') = ?
) 
ORDER BY created_at DESC LIMIT ? OFFSET ?
```

### 9. GET ALL NOTES (Line 331)
```sql
SELECT * FROM meta.notes ORDER BY created_at DESC
```

### 10. GET TREE HIERARCHY (Line 376)
```sql
WITH RECURSIVE tree AS (
  SELECT * FROM meta.notes WHERE id = ?
  UNION ALL
  SELECT n.* FROM meta.notes n
  INNER JOIN tree t ON n.parent_id = t.id
)
SELECT * FROM tree
```

### 11. GET ROOT NOTE (Line 416)
```sql
SELECT * FROM meta.notes WHERE id = ?
```

### 12. GET CHILDREN (Line 437)
```sql
SELECT id FROM meta.notes WHERE parent_id = ?
```

### 13. UPDATE DEPTH LEVEL (Line 445)
```sql
UPDATE meta.notes SET depth_level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
```

## TasksManager.ts - 20 Queries

### 1. CREATE TASK (Line ~30)
```sql
INSERT INTO meta.tasks (
  id, parent_id, title, description, task_type, task_status,
  task_priority, estimated_effort, due_date, assigned_to,
  entity_links, stable_tags, checklists, sort_order, depth_level,
  created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

### 2. GET TASK BY ID
```sql
SELECT * FROM meta.tasks WHERE id = ?
```

### 3. UPDATE TASK
```sql
UPDATE meta.tasks SET [dynamic fields] WHERE id = ?
```

### 4. DELETE TASK
```sql
DELETE FROM meta.tasks WHERE id = ?
```

### 5. SEARCH TASKS WITH CONDITIONS
```sql
SELECT * FROM meta.tasks WHERE [conditions] ORDER BY [order] LIMIT ? OFFSET ?
```

### 6. GET TASK DEPENDENCIES
```sql
SELECT * FROM meta.task_dependencies WHERE task_id = ?
```

### 7. ADD TASK DEPENDENCY
```sql
INSERT INTO meta.task_dependencies (
  id, task_id, dependency_task_id, dependency_type, required, created_at
) VALUES (?, ?, ?, ?, ?, ?)
```

### 8. REMOVE TASK DEPENDENCY
```sql
DELETE FROM meta.task_dependencies WHERE id = ?
```

### 9. GET TASK WITH CHILDREN (Recursive)
```sql
WITH RECURSIVE tree AS (
  SELECT * FROM meta.tasks WHERE id = ?
  UNION ALL
  SELECT t.* FROM meta.tasks t
  INNER JOIN tree tr ON t.parent_id = tr.id
)
SELECT * FROM tree
```

### 10. GET TASK METRICS
```sql
SELECT * FROM meta.task_metrics WHERE task_id = ? ORDER BY measured_at DESC
```

### 11. ADD TASK METRIC
```sql
INSERT INTO meta.task_metrics (
  id, task_id, metric_type, value, unit, metadata, measured_at
) VALUES (?, ?, ?, ?, ?, ?, ?)
```

### 12. GET TASK CODE LINKS
```sql
SELECT * FROM meta.task_code_links WHERE task_id = ?
```

### 13. ADD TASK CODE LINK
```sql
INSERT INTO meta.task_code_links (
  id, task_id, component_id, link_type, confidence, notes, created_at
) VALUES (?, ?, ?, ?, ?, ?, ?)
```

### 14. REMOVE TASK CODE LINK
```sql
DELETE FROM meta.task_code_links WHERE id = ?
```

### 15. UPDATE TASK STATUS
```sql
UPDATE meta.tasks 
SET task_status = ?, updated_at = CURRENT_TIMESTAMP 
WHERE id = ?
```

### 16. UPDATE TASK COMPLETION
```sql
UPDATE meta.tasks 
SET task_status = 'done', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
WHERE id = ?
```

### 17. GET INCOMPLETE CHILDREN
```sql
SELECT COUNT(*) FROM meta.tasks 
WHERE parent_id = ? AND task_status != 'done'
```

### 18. BULK UPDATE SORT ORDER
```sql
UPDATE meta.tasks SET sort_order = ? WHERE id = ?
```

### 19. GET TASKS BY STATUS
```sql
SELECT * FROM meta.tasks 
WHERE task_status = ? 
ORDER BY task_priority DESC, created_at ASC
```

### 20. GET OVERDUE TASKS
```sql
SELECT * FROM meta.tasks 
WHERE due_date < datetime('now') 
AND task_status NOT IN ('done', 'cancelled')
```

## RulesManager.ts - 17 Queries

### 1. CREATE RULE (Line 31)
```sql
INSERT INTO meta.rules (
  id, name, description, rule_type, parent_id, sort_order, depth_level,
  trigger_patterns, semantic_triggers, context_conditions, 
  auto_apply, guidance_text, code_template, validation_script,
  priority, confidence_threshold, is_active, stable_tags,
  created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

### 2. GET RULE BY ID (Line 84)
```sql
SELECT * FROM meta.rules WHERE id = ?
```

### 3. UPDATE RULE (Line 203)
```sql
UPDATE meta.rules SET [dynamic fields] WHERE id = ?
```

### 4. DELETE RULE (Line 226)
```sql
DELETE FROM meta.rules WHERE id = ?
```

### 5. SEARCH RULES WITH TYPE (Line 249)
```sql
SELECT * FROM meta.rules WHERE rule_type = ? ORDER BY priority ASC, created_at DESC
```

### 6. SEARCH ACTIVE RULES (Line 274)
```sql
SELECT * FROM meta.rules WHERE is_active = ? ORDER BY priority ASC, created_at DESC
```

### 7. SEARCH RULES WITH CONDITIONS (Line 298)
```sql
SELECT * FROM meta.rules WHERE [conditions] ORDER BY priority ASC, created_at DESC
```

### 8. UPDATE RULE EFFECTIVENESS (Line 316)
```sql
UPDATE meta.rules 
SET usage_count = ?, acceptance_rate = ?, effectiveness_score = ?, last_used = ?, updated_at = ?
WHERE id = ?
```

### 9. TRACK RULE APPLICATION (Line 355)
```sql
INSERT INTO meta.rule_applications (
  id, rule_id, entity_type, entity_id, applied_context,
  user_action, feedback_score, generated_code, applied_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
```

### 10. UPDATE RULE LAST USED (Line 375)
```sql
UPDATE meta.rules SET last_used = ? WHERE id = ?
```

### 11. GET APPLICABLE RULES WITH JSON (Line 420)
```sql
SELECT * FROM meta.rules 
WHERE is_active = 1 
AND (
  trigger_patterns IS NULL OR
  json_extract(trigger_patterns, '$.files') LIKE ? OR
  json_extract(trigger_patterns, '$.components') LIKE ?
)
ORDER BY priority ASC
```

### 12. GET RULE APPLICATIONS (Line 445)
```sql
SELECT ra.*, r.name as rule_name 
FROM meta.rule_applications ra
JOIN meta.rules r ON ra.rule_id = r.id
WHERE ra.entity_id = ? AND ra.entity_type = ?
ORDER BY ra.applied_at DESC
```

### 13. GET SINGLE RULE FOR TREE (Line 469)
```sql
SELECT * FROM meta.rules WHERE id = ?
```

### 14. GET ALL RULES FOR TREE (Line 492)
```sql
SELECT * FROM meta.rules ORDER BY sort_order, created_at
```

### 15. GET RULE TREE RECURSIVE (Line 542)
```sql
WITH RECURSIVE tree AS (
  SELECT * FROM meta.rules WHERE id = ?
  UNION ALL
  SELECT r.* FROM meta.rules r
  INNER JOIN tree t ON r.parent_id = t.id
)
SELECT * FROM tree
```

### 16. GET RULE CHILDREN (Line 587)
```sql
SELECT id FROM meta.rules WHERE parent_id = ?
```

### 17. UPDATE RULE DEPTH LEVEL (Line 595)
```sql
UPDATE meta.rules SET depth_level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
```

## Total Query Count: 50 Queries
- NotesManager: 13 queries
- TasksManager: 20 queries  
- RulesManager: 17 queries

## TypeORM Migration Checklist

For EACH query above, we need:

### 1. TypeORM Equivalent
- [ ] Repository method
- [ ] Query builder for complex queries
- [ ] Handle both SQLite and PostgreSQL syntax

### 2. Test Case
- [ ] Sample data setup
- [ ] Run both old and new query
- [ ] Compare results exactly
- [ ] Test edge cases (null, empty, etc.)

### 3. Database-Specific Handling

#### JSON Operations (SQLite → PostgreSQL)
```typescript
// SQLite
.where(`EXISTS (SELECT 1 FROM json_each(entity_links) WHERE json_extract(value, '$.entity_type') = :type)`)

// PostgreSQL
.where(`entity_links @> :link::jsonb`, { link: JSON.stringify([{entity_type: type}]) })
```

#### Recursive CTEs
Both databases support CTEs but syntax might vary slightly

#### Date/Time
- SQLite: `datetime('now')`
- PostgreSQL: `NOW()`

## Implementation Order

1. **Phase 1: Basic CRUD** (Lines 1-4 of each manager)
   - Create, Read, Update, Delete
   - These are straightforward TypeORM operations

2. **Phase 2: Search Operations** (Lines 5-8)
   - Simple WHERE conditions
   - Pagination with LIMIT/OFFSET

3. **Phase 3: JSON Queries** (Lines 7-8 in Notes)
   - Entity link searches
   - Need database-specific implementations

4. **Phase 4: Recursive Queries** (Tree operations)
   - Task/Note hierarchies
   - CTEs for tree traversal

5. **Phase 5: Aggregations and Complex Queries**
   - Metrics, dependencies
   - Cross-table operations

## Success Criteria

- [ ] All 33 queries converted to TypeORM
- [ ] Test suite with 100% coverage
- [ ] Both SQLite and PostgreSQL pass all tests
- [ ] No performance degradation
- [ ] Zero data loss or corruption