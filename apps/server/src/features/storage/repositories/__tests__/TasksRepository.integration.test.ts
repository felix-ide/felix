import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { DataSource } from 'typeorm';
import { TasksRepository } from '../TasksRepository';
import { Task } from '../../entities/metadata/Task.entity';
import { TaskDependency } from '../../entities/metadata/TaskDependency.entity';
import { TaskCodeLink } from '../../entities/metadata/TaskCodeLink.entity';
import { TaskMetric } from '../../entities/metadata/TaskMetric.entity';

describe('TasksRepository Integration', () => {
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
  });

  afterEach(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('updates status/priority on an existing task', async () => {
    await ds.getRepository(Task).save({ id: 'task-1', title: 'Implement login', description: 'Add login flow' } as any);

    const saved = await repo.getTask('task-1');
    expect(saved?.title).toMatch('login');

    const up = await repo.updateTask('task-1', { task_status: 'in_progress', task_priority: 'p1' } as any);
    expect(up.success).toBe(true);
    const after = await repo.getTask('task-1');
    expect(after?.task_status).toBe('in_progress');
    expect(after?.task_priority).toBe('p1');
  });
});
