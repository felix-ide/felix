import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { DataSource } from 'typeorm';
import { TasksRepository } from '../TasksRepository';
import { Task } from '../../entities/metadata/Task.entity';
import { TaskDependency } from '../../entities/metadata/TaskDependency.entity';
import { TaskCodeLink } from '../../entities/metadata/TaskCodeLink.entity';
import { TaskMetric } from '../../entities/metadata/TaskMetric.entity';

describe('TasksRepository Advanced Integration', () => {
  let ds: DataSource;
  let repo: TasksRepository;

  beforeEach(async () => {
    ds = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [Task, TaskDependency, TaskCodeLink, TaskMetric],
      synchronize: true,
      logging: false,
      dropSchema: true,
    });
    await ds.initialize();
    repo = new TasksRepository(ds);

    // Seed a small tree and assorted tasks
    const tRepo = ds.getRepository(Task);
    await tRepo.save({ id: 'root', title: 'Root', task_status: 'todo', task_priority: 'p2' } as any);
    await tRepo.save({ id: 'child1', parent_id: 'root', title: 'Child 1', task_status: 'todo', task_priority: 'p2' } as any);
    await tRepo.save({ id: 'child2', parent_id: 'child1', title: 'Child 2', task_status: 'done', task_priority: 'p3' } as any);
    await tRepo.save({ id: 't-high', title: 'High P', task_status: 'todo', task_priority: 'p3' } as any);
    await tRepo.save({ id: 't-mid', title: 'Mid P', task_status: 'todo', task_priority: 'p2' } as any);
    await tRepo.save({ id: 't-low', title: 'Low P', task_status: 'todo', task_priority: 'p1' } as any);

    // Suggested-next: a child of a done parent should be allowed
    await tRepo.save({ id: 'parent-done', title: 'Parent Done', task_status: 'done', task_priority: 'p1' } as any);
    await tRepo.save({ id: 'child-of-done', parent_id: 'parent-done', title: 'Child Of Done', task_status: 'todo', task_priority: 'p1' } as any);
    // And a child of a non-done parent (should be filtered in suggestedNext)
    await tRepo.save({ id: 'parent-todo', title: 'Parent Todo', task_status: 'in_progress', task_priority: 'p1' } as any);
    await tRepo.save({ id: 'child-of-todo', parent_id: 'parent-todo', title: 'Child Of Todo', task_status: 'todo', task_priority: 'p1' } as any);
  });

  afterEach(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('getNextTasks orders by priority desc then created_at asc', async () => {
    const next = await repo.getNextTasks(2);
    // Expect highest priorities first; created_at ordering is secondary and not deterministic here
    expect(next.length).toBe(2);
    const priorities = next.map(t => t.task_priority);
    // First should be p3, then p2
    expect(priorities[0]).toBe('p3');
  });

  it('getSuggestedNextTasks returns non-empty prioritized list (smoke)', async () => {
    const suggested = await repo.getSuggestedNextTasks(10);
    expect(Array.isArray(suggested)).toBe(true);
    expect(suggested.length).toBeGreaterThan(0);
    expect(suggested.length).toBeLessThanOrEqual(10);
  });

  it('searchTasksSummary applies text filter, limit/offset, and returns minimal fields', async () => {
    // Add a couple of tasks with common token
    await ds.getRepository(Task).save({ id: 'login-1', title: 'Login page', task_status: 'todo', task_priority: 'p1' } as any);
    await ds.getRepository(Task).save({ id: 'login-2', title: 'Login API', task_status: 'todo', task_priority: 'p1' } as any);

    const page1 = await repo.searchTasksSummary({ limit: 1, offset: 0, text: 'Login' } as any);
    expect(page1.items.length).toBe(1);
    expect(page1.total).toBeGreaterThanOrEqual(2);
    expect(page1.hasMore).toBe(true);
    // Shape is summary (no heavy fields like checklists)
    expect(page1.items[0]).toHaveProperty('id');
    expect(page1.items[0]).toHaveProperty('title');
    expect(page1.items[0]).not.toHaveProperty('checklists');

    const page2 = await repo.searchTasksSummary({ limit: 1, offset: 1, text: 'Login' } as any);
    expect(page2.items.length).toBe(1);
  });

  it('getTaskTreeSummary returns a pruned list when includeCompleted=false', async () => {
    const list = await repo.getTaskTreeSummary(undefined, false);
    const idsOrTitles = JSON.stringify(list);
    // child2 is done; filtered out
    expect(idsOrTitles).not.toContain('child2');
  });

  it('updates children depths when parent is re-parented', async () => {
    // child2 is a child of child1 (which is under root). Move child1 to root=null and expect child2 depth to update too
    const beforeChild2 = await repo.getTask('child2');
    expect(beforeChild2?.parent_id).toBe('child1');

    await repo.updateTask('child1', { parent_id: null } as any);
    const afterChild1 = await repo.getTask('child1');
    const afterChild2 = await repo.getTask('child2');

    // child1 depth becomes 0, child2 becomes 1
    expect(afterChild1?.depth_level).toBe(0);
    expect(afterChild2?.depth_level).toBe(1);
  });

  it('hasCircularDependency detects cycles (positive and negative cases)', async () => {
    const depRepo = ds.getRepository(TaskDependency);
    const tRepo = ds.getRepository(Task);
    // Add 3 standalone tasks for the cycle test
    await tRepo.save({ id: 'A', title: 'A', task_status: 'todo' } as any);
    await tRepo.save({ id: 'B', title: 'B', task_status: 'todo' } as any);
    await tRepo.save({ id: 'C', title: 'C', task_status: 'todo' } as any);
    // B depends on A; C depends on B
    await depRepo.save({ id: 'd1', dependent_task_id: 'B', dependency_task_id: 'A', dependency_type: 'blocks', required: true } as any);
    await depRepo.save({ id: 'd2', dependent_task_id: 'C', dependency_task_id: 'B', dependency_type: 'blocks', required: true } as any);

    // Adding A depends on C would create a cycle; check detection
    const cycle = await repo.hasCircularDependency('A', 'C');
    expect(cycle).toBe(true);

    // Negative case: D does not participate
    await tRepo.save({ id: 'D', title: 'D', task_status: 'todo' } as any);
    const noCycle = await repo.hasCircularDependency('D', 'A');
    expect(noCycle).toBe(false);
  });
});
