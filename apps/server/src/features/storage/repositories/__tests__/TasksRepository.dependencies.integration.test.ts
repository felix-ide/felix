import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { DataSource } from 'typeorm';
import { TasksRepository } from '../TasksRepository';
import { Task } from '../../entities/metadata/Task.entity';
import { TaskDependency } from '../../entities/metadata/TaskDependency.entity';
import { TaskCodeLink } from '../../entities/metadata/TaskCodeLink.entity';
import { TaskMetric } from '../../entities/metadata/TaskMetric.entity';

describe('TasksRepository Dependencies Integration', () => {
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

    // seed two tasks
    await ds.getRepository(Task).save({ id: 't-1', title: 'Task 1', description: 'Root' } as any);
    await ds.getRepository(Task).save({ id: 't-2', title: 'Task 2', description: 'Child' } as any);
  });

  afterEach(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('adds, reads, and deletes a dependency', async () => {
    const add = await repo.createDependency('t-2', 't-1', 'blocks', true);
    expect(add.success).toBe(true);

    const deps = await repo.getTaskDependencies('t-2');
    expect(deps.length).toBe(1);
    expect(deps[0].dependency_task_id).toBe('t-1');

    const dependents = await repo.getDependentTasks('t-1');
    expect(dependents.length).toBe(1);
    expect(dependents[0].dependent_task_id).toBe('t-2');

    const id = deps[0].id;
    const del = await repo.deleteDependency(id);
    expect(del.success).toBe(true);
    expect((await repo.getTaskDependencies('t-2')).length).toBe(0);
  });
});
