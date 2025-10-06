/**
 * Tests for Task model
 */

import { TaskValidator, TaskUtils, CreateTaskParams } from '../../metadata/Task';

describe('TaskValidator', () => {
  describe('validate', () => {
    test('should validate valid task', () => {
      const task = {
        title: 'Test Task',
        description: 'This is a test task',
        task_status: 'todo' as const,
        task_priority: 'medium' as const
      };
      
      const result = TaskValidator.validate(task);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject task without title', () => {
      const task = {
        description: 'This is a test task',
        task_status: 'todo' as const,
        task_priority: 'medium' as const
      };
      
      const result = TaskValidator.validate(task);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    test('should reject task with empty title', () => {
      const task = {
        title: '   ',
        description: 'This is a test task',
        task_status: 'todo' as const,
        task_priority: 'medium' as const
      };
      
      const result = TaskValidator.validate(task);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    test('should reject task with title too long', () => {
      const task = {
        title: 'a'.repeat(201),
        description: 'This is a test task',
        task_status: 'todo' as const,
        task_priority: 'medium' as const
      };
      
      const result = TaskValidator.validate(task);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title exceeds maximum length (200 characters)');
    });

    test('should reject task with invalid status', () => {
      const task = {
        title: 'Test Task',
        description: 'Description',
        task_status: 'invalid' as any,
        task_priority: 'medium' as const
      };
      
      const result = TaskValidator.validate(task);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid task status');
    });

    test('should reject task with invalid priority', () => {
      const task = {
        title: 'Test Task',
        description: 'Description',
        task_status: 'todo' as const,
        task_priority: 'invalid' as any
      };
      
      const result = TaskValidator.validate(task);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid task priority');
    });
  });
});

describe('TaskUtils', () => {
  describe('generateId', () => {
    test('should generate unique IDs', () => {
      const id1 = TaskUtils.generateId();
      const id2 = TaskUtils.generateId();
      
      expect(id1).toMatch(/^task_\d+_[a-z0-9]{9}$/);
      expect(id2).toMatch(/^task_\d+_[a-z0-9]{9}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateDependencyId', () => {
    test('should generate unique dependency IDs', () => {
      const id1 = TaskUtils.generateDependencyId();
      const id2 = TaskUtils.generateDependencyId();
      
      expect(id1).toMatch(/^dep_\d+_[a-z0-9]{9}$/);
      expect(id2).toMatch(/^dep_\d+_[a-z0-9]{9}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('createFromParams', () => {
    test('should create task from parameters', () => {
      const params: CreateTaskParams = {
        title: 'Test Task',
        description: 'Test description',
        task_type: 'task',
        task_status: 'todo',
        task_priority: 'high'
      };
      
      const task = TaskUtils.createFromParams(params);
      
      expect(task.id).toMatch(/^task_\d+_[a-z0-9]{9}$/);
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test description');
      expect(task.task_type).toBe('task');
      expect(task.task_status).toBe('todo');
      expect(task.task_priority).toBe('high');
      expect(task.parent_id).toBeUndefined();
      expect(task.sort_order).toBe(0);
      expect(task.depth_level).toBe(0);
      expect(task.created_at).toBeInstanceOf(Date);
      expect(task.updated_at).toBeInstanceOf(Date);
    });

    test('should handle optional parameters', () => {
      const params: CreateTaskParams = {
        title: 'Test Task',
        description: 'Test description',
        task_type: 'epic',
        task_status: 'in_progress',
        task_priority: 'critical',
        parent_id: 'parent-task-id',
        estimated_effort: '8h',
        due_date: new Date('2024-12-31'),
        entity_links: [{
          entity_type: 'component',
          entity_id: 'comp-1',
          entity_name: 'TestComponent',
          link_strength: 'primary'
        }],
        stable_tags: ['urgent', 'review']
      };
      
      const task = TaskUtils.createFromParams(params);
      
      expect(task.task_type).toBe('epic');
      expect(task.task_status).toBe('in_progress');
      expect(task.task_priority).toBe('critical');
      expect(task.parent_id).toBe('parent-task-id');
      expect(task.estimated_effort).toBe('8h');
      expect(task.due_date).toEqual(new Date('2024-12-31'));
      expect(task.entity_links).toHaveLength(1);
      expect(task.entity_links![0].entity_type).toBe('component');
      expect(task.tags?.stable_tags).toEqual(['urgent', 'review']);
    });
  });

  describe('fromDbRow', () => {
    test('should create task from database row', () => {
      const row = {
        id: 'task_123_abc',
        title: 'Database Task',
        description: 'Database description',
        task_type: 'subtask',
        task_status: 'done',
        task_priority: 'low',
        parent_id: null,
        sort_order: 1,
        depth_level: 0,
        progress: 0.75,
        estimated_effort: '4h',
        actual_effort: '5h',
        due_date: '2024-01-01',
        completed_at: '2024-01-01T12:00:00.000Z',
        entity_links: JSON.stringify([{
          entity_type: 'component',
          entity_id: 'comp-1'
        }]),
        stable_tags: JSON.stringify(['tag1', 'tag2']),
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-02T00:00:00.000Z'
      };
      
      const task = TaskUtils.fromDbRow(row);
      
      expect(task.id).toBe('task_123_abc');
      expect(task.title).toBe('Database Task');
      expect(task.description).toBe('Database description');
      expect(task.task_type).toBe('subtask');
      expect(task.task_status).toBe('done');
      expect(task.task_priority).toBe('low');
      expect(task.parent_id).toBeUndefined();
      expect(task.sort_order).toBe(1);
      expect(task.estimated_effort).toBe('4h');
      expect(task.actual_effort).toBe('5h');
      expect(task.due_date).toEqual(new Date('2024-01-01'));
      expect(task.completed_at).toEqual(new Date('2024-01-01T12:00:00.000Z'));
      expect(task.entity_links).toHaveLength(1);
      expect(task.tags?.stable_tags).toEqual(['tag1', 'tag2']);
      expect(task.created_at).toEqual(new Date('2023-01-01T00:00:00.000Z'));
      expect(task.updated_at).toEqual(new Date('2023-01-02T00:00:00.000Z'));
    });
  });

  describe('toDbRow', () => {
    test('should convert task to database row', () => {
      const task = TaskUtils.createFromParams({
        title: 'Test Task',
        description: 'Test description',
        task_type: 'task',
        task_status: 'todo',
        task_priority: 'medium',
        estimated_effort: '2h',
        entity_links: [{
          entity_type: 'component',
          entity_id: 'comp-1'
        }],
        stable_tags: ['tag1']
      });
      
      const row = TaskUtils.toDbRow(task);
      
      expect(row.id).toBe(task.id);
      expect(row.title).toBe('Test Task');
      expect(row.description).toBe('Test description');
      expect(row.task_type).toBe('task');
      expect(row.task_status).toBe('todo');
      expect(row.task_priority).toBe('medium');
      expect(row.estimated_effort).toBe('2h');
      expect(row.entity_links).toBe(JSON.stringify([{
        entity_type: 'component',
        entity_id: 'comp-1'
      }]));
      expect(row.stable_tags).toBe(JSON.stringify(['tag1']));
      expect(row.created_at).toBe(task.created_at.toISOString());
      expect(row.updated_at).toBe(task.updated_at.toISOString());
    });
  });

  describe('buildHierarchy', () => {
    test('should build task hierarchy correctly', () => {
      const tasks = [
        TaskUtils.createFromParams({ 
          title: 'Epic 1', 
          description: 'First epic', 
          task_type: 'epic',
          task_status: 'todo',
          task_priority: 'high'
        }),
        TaskUtils.createFromParams({ 
          title: 'Epic 2', 
          description: 'Second epic', 
          task_type: 'epic',
          task_status: 'todo',
          task_priority: 'medium'
        }),
      ];
      
      const child1 = TaskUtils.createFromParams({ 
        title: 'Task 1', 
        description: 'First task', 
        task_type: 'task',
        task_status: 'todo',
        task_priority: 'medium',
        parent_id: tasks[0].id 
      });
      
      const child2 = TaskUtils.createFromParams({ 
        title: 'Task 2', 
        description: 'Second task', 
        task_type: 'task',
        task_status: 'in_progress',
        task_priority: 'low',
        parent_id: tasks[0].id 
      });
      
      const allTasks = [...tasks, child1, child2];
      const hierarchy = TaskUtils.buildHierarchy(allTasks);
      
      expect(hierarchy).toHaveLength(2); // Two root tasks (epics)
      expect((hierarchy[0] as any).children).toHaveLength(2); // First epic has 2 children
      expect((hierarchy[1] as any).children).toHaveLength(0); // Second epic has no children
    });
  });

});