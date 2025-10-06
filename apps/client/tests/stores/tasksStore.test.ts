import { describe, it, expect, vi, afterEach } from 'vitest';
import { useTasksStore } from '../../src/features/tasks/state/tasksStore';

vi.mock('../../src/services/felixService', () => ({
  felixService: {
    listTasks: vi.fn().mockResolvedValue({ tasks: [{ id: 't1', title: 'A', task_type: 'task', task_status: 'todo', task_priority: 'low', sort_order: 0, depth_level: 0, created_at: '', updated_at: '' }] }),
    addTask: vi.fn().mockResolvedValue({ task: { id: 't2', title: 'B', task_type: 'task', task_status: 'todo', task_priority: 'low', sort_order: 0, depth_level: 0, created_at: '', updated_at: '' } }),
    updateTask: vi.fn().mockResolvedValue({ task: { id: 't2', title: 'C', task_type: 'task', task_status: 'done', task_priority: 'low', sort_order: 0, depth_level: 0, created_at: '', updated_at: '' } }),
    deleteTask: vi.fn().mockResolvedValue({ success: true }),
  }
}));

describe('tasksStore', () => {
  afterEach(() => {
    useTasksStore.setState({ tasks: [], loading: false, error: null, selectedTaskId: undefined, selectedTaskIds: new Set(), pollInterval: null });
    vi.restoreAllMocks();
  });

  it('loads, adds, updates and deletes tasks', async () => {
    const s = useTasksStore.getState();
    await s.loadTasks();
    expect(useTasksStore.getState().tasks.length).toBeGreaterThan(0);
    const newTask = await s.addTask({ title: 'B', task_type: 'task', task_status: 'todo', task_priority: 'low' } as any);
    expect(newTask.id).toBe('t2');
    await s.updateTask('t2', { task_status: 'done' } as any);
    expect(useTasksStore.getState().tasks.find(t => t.id === 't2')?.task_status).toBe('done');
    await s.deleteTask('t2');
    expect(useTasksStore.getState().tasks.find(t => t.id === 't2')).toBeUndefined();
  });
});

