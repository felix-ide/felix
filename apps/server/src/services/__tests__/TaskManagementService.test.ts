import { TaskManagementService, TaskDependencyParams } from '../../features/metadata/services/TaskManagementService';
import { DatabaseManager } from '../../features/storage/DatabaseManager';
import { EmbeddingService } from '../../nlp/EmbeddingServiceAdapter';
import { ITask, CreateTaskParams, UpdateTaskParams, TaskSearchCriteria } from '@felix/code-intelligence';
import { TaskUtils } from '@felix/code-intelligence';

// Mock dependencies
jest.mock('../../features/storage/DatabaseManager');
jest.mock('../../nlp/EmbeddingServiceAdapter');
jest.mock('@felix/code-intelligence', () => ({
  ...jest.requireActual('@felix/code-intelligence'),
  TaskUtils: {
    createFromParams: jest.fn()
  }
}));

describe('TaskManagementService', () => {
  let taskService: TaskManagementService;
  let mockDbManager: jest.Mocked<DatabaseManager>;
  let mockEmbeddingService: jest.Mocked<EmbeddingService>;
  let mockTasksRepo: any;
  let mockEmbeddingRepo: any;

  const mockTask = {
    id: 'task1',
    title: 'Test Task',
    description: 'Test task description',
    status: 'todo',
    priority: 'medium',
    type: 'task',
    task_type: 'task',
    task_status: 'todo',
    task_priority: 'medium',
    sort_order: 0,
    depth_level: 0,
    created_at: new Date(),
    updated_at: new Date(),
    metadata: {}
  } as ITask;

  const mockTaskWithParent: ITask = {
    ...mockTask,
    id: 'task2',
    parent_id: 'task1'
  };

  beforeEach(() => {
    // Setup mocked repositories
    mockTasksRepo = {
      storeTask: jest.fn().mockResolvedValue({ success: true }),
      getTask: jest.fn().mockResolvedValue(mockTask),
      updateTask: jest.fn().mockResolvedValue({ success: true }),
      deleteTask: jest.fn().mockResolvedValue({ success: true }),
      searchTasks: jest.fn().mockResolvedValue({
        items: [mockTask],
        total: 1,
        hasMore: false,
        offset: 0,
        limit: 50
      }),
      getTaskTree: jest.fn().mockResolvedValue([mockTask, mockTaskWithParent]),
      getSuggestedTasks: jest.fn().mockResolvedValue([mockTask]),
      getTaskCount: jest.fn().mockResolvedValue(1),
      getAllTasks: jest.fn().mockResolvedValue([mockTask]),
      // Add dependency methods
      addTaskDependency: jest.fn().mockResolvedValue({ success: true }),
      removeTaskDependency: jest.fn().mockResolvedValue({ success: true }),
      getTaskDependencies: jest.fn().mockResolvedValue([]),
      getDependentTasks: jest.fn().mockResolvedValue([])
    };

    mockEmbeddingRepo = {
      storeEmbedding: jest.fn().mockResolvedValue({ success: true })
    };

    // Setup mocked database manager
    mockDbManager = {
      getTasksRepository: jest.fn().mockReturnValue(mockTasksRepo),
      getEmbeddingRepository: jest.fn().mockReturnValue(mockEmbeddingRepo)
    } as any;

    // Setup mocked embedding service
    mockEmbeddingService = {
      generateTaskEmbedding: jest.fn().mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        dimensions: 3,
        model: 'test-model',
        version: 1
      })
    } as any;

    // Setup TaskUtils mock
    (TaskUtils.createFromParams as jest.Mock).mockReturnValue(mockTask);

    taskService = new TaskManagementService(mockDbManager, mockEmbeddingService);
  });

  describe('addTask', () => {
    it('should add a new task', async () => {
      const params: CreateTaskParams = {
        title: 'Test Task',
        description: 'Test task description',
        priority: 'medium' as any
      } as CreateTaskParams;

      const result = await taskService.addTask(params);

      expect(result).toEqual(mockTask);
      expect(TaskUtils.createFromParams).toHaveBeenCalledWith(params);
      expect(mockTasksRepo.storeTask).toHaveBeenCalledWith(expect.objectContaining(mockTask));
    });

    it('should preserve checklists field', async () => {
      const params: any = {
        title: 'Test Task',
        checklists: [{ name: 'Test Checklist', items: [] }]
      };

      await taskService.addTask(params);

      expect(mockTasksRepo.storeTask).toHaveBeenCalledWith(
        expect.objectContaining({ checklists: params.checklists })
      );
    });

    it('should generate embedding asynchronously', async () => {
      const params: CreateTaskParams = {
        title: 'Test Task'
      };

      await taskService.addTask(params);

      // Wait for async embedding generation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockEmbeddingService.generateTaskEmbedding).toHaveBeenCalledWith(mockTask);
    });

    it('should throw error if storage fails', async () => {
      mockTasksRepo.storeTask.mockResolvedValue({ success: false, error: 'Storage error' });

      const params: CreateTaskParams = { title: 'Test Task' };

      await expect(taskService.addTask(params)).rejects.toThrow('Storage error');
    });
  });

  describe('getTask', () => {
    it('should get task by ID', async () => {
      const result = await taskService.getTask('task1');

      expect(result).toEqual(mockTask);
      expect(mockTasksRepo.getTask).toHaveBeenCalledWith('task1');
    });

    it('should return null for non-existent task', async () => {
      mockTasksRepo.getTask.mockResolvedValue(null);

      const result = await taskService.getTask('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateTask', () => {
    it('should update a task', async () => {
      const updates: UpdateTaskParams = {
        title: 'Updated Task'
      };

      const result = await taskService.updateTask('task1', updates);

      expect(result).toEqual(mockTask);
      expect(mockTasksRepo.updateTask).toHaveBeenCalledWith('task1', updates);
    });

    it('should preserve checklists in update', async () => {
      const updates: any = {
        title: 'Updated Task',
        checklists: [{ name: 'Updated Checklist', items: [] }]
      };

      await taskService.updateTask('task1', updates);

      expect(mockTasksRepo.updateTask).toHaveBeenCalledWith('task1', 
        expect.objectContaining({ checklists: updates.checklists })
      );
    });

    it('should regenerate embedding if content changed', async () => {
      const updates: UpdateTaskParams = {
        title: 'Updated Task',
        description: 'Updated description'
      };

      await taskService.updateTask('task1', updates);

      // Wait for async embedding generation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockEmbeddingService.generateTaskEmbedding).toHaveBeenCalledWith(mockTask);
    });

    it('should throw error if update fails', async () => {
      mockTasksRepo.updateTask.mockResolvedValue({ success: false, error: 'Update error' });

      await expect(taskService.updateTask('task1', {})).rejects.toThrow('Update error');
    });

    it('should throw error if task not found after update', async () => {
      mockTasksRepo.getTask.mockResolvedValue(null);

      await expect(taskService.updateTask('task1', {})).rejects.toThrow('Task not found after update');
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      await taskService.deleteTask('task1');

      expect(mockTasksRepo.deleteTask).toHaveBeenCalledWith('task1');
    });

    it('should throw error if deletion fails', async () => {
      mockTasksRepo.deleteTask.mockResolvedValue({ success: false, error: 'Delete error' });

      await expect(taskService.deleteTask('task1')).rejects.toThrow('Delete error');
    });
  });

  describe('listTasks', () => {
    it('should list tasks with criteria', async () => {
      const criteria: TaskSearchCriteria = {
        priority: 'high' as any
      } as TaskSearchCriteria;

      const result = await taskService.listTasks(criteria);

      expect(result).toEqual([mockTask]);
      expect(mockTasksRepo.searchTasks).toHaveBeenCalledWith(criteria);
    });

    it('should list all tasks when no criteria provided', async () => {
      const result = await taskService.listTasks();

      expect(result).toEqual([mockTask]);
      expect(mockTasksRepo.searchTasks).toHaveBeenCalledWith({});
    });
  });

  describe('searchTasks', () => {
    it('should search tasks with pagination', async () => {
      const criteria: TaskSearchCriteria = {
        query: 'test',
        limit: 10,
        offset: 5
      };

      const result = await taskService.searchTasks(criteria);

      expect(result.items).toEqual([mockTask]);
      expect(result.total).toBe(1);
      expect(mockTasksRepo.searchTasks).toHaveBeenCalledWith(criteria);
    });
  });

  describe('searchTasksSummary', () => {
    it('should search tasks with summary data', async () => {
      mockTasksRepo.searchTasksSummary = jest.fn().mockResolvedValue({
        items: [{ id: 'task1', title: 'Test Task', status: 'todo' }],
        total: 1,
        hasMore: false,
        offset: 0,
        limit: 50
      });

      const result = await taskService.searchTasksSummary({ priority: 'high' } as any);

      expect(result.items[0]).toHaveProperty('id');
      expect(result.items[0]).toHaveProperty('title');
      expect(result.items[0]).not.toHaveProperty('description');
    });

    it('should fallback to regular search if summary not available', async () => {
      const result = await taskService.searchTasksSummary({ priority: 'high' } as any);

      expect(result.items[0]).toHaveProperty('id');
      expect(result.items[0]).toHaveProperty('title');
      expect(result.items[0]).not.toHaveProperty('description');
      expect(mockTasksRepo.searchTasks).toHaveBeenCalled();
    });
  });

  describe('getTaskTree', () => {
    it('should get task hierarchy tree', async () => {
      const result = await taskService.getTaskTree('task1', true);

      expect(result).toEqual([mockTask, mockTaskWithParent]);
      expect(mockTasksRepo.getTaskTree).toHaveBeenCalledWith('task1', true);
    });

    it('should get all root tasks when no rootId provided', async () => {
      const result = await taskService.getTaskTree();

      expect(result).toEqual([mockTask, mockTaskWithParent]);
      expect(mockTasksRepo.getTaskTree).toHaveBeenCalledWith(undefined, true);
    });
  });

  describe('getTaskTreeSummary', () => {
    it('should get task tree with summary data', async () => {
      mockTasksRepo.getTaskTreeSummary = jest.fn().mockResolvedValue([
        { id: 'task1', title: 'Test Task', status: 'todo' }
      ]);

      const result = await taskService.getTaskTreeSummary('task1');

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).not.toHaveProperty('description');
    });

    it('should fallback to regular tree if summary not available', async () => {
      const result = await taskService.getTaskTreeSummary('task1');

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(mockTasksRepo.getTaskTree).toHaveBeenCalled();
    });
  });

  describe('getSuggestedTasks', () => {
    it('should get suggested tasks', async () => {
      const result = await taskService.getSuggestedTasks(5);

      expect(result).toEqual([mockTask]);
      expect(mockTasksRepo.getSuggestedTasks).toHaveBeenCalledWith(5);
    });

    it('should use default limit of 10', async () => {
      await taskService.getSuggestedTasks();

      expect(mockTasksRepo.getSuggestedTasks).toHaveBeenCalledWith(10);
    });
  });

  describe('statistics methods', () => {
    it('should get task count', async () => {
      const result = await taskService.getTaskCount();

      expect(result).toBe(1);
      expect(mockTasksRepo.getTaskCount).toHaveBeenCalled();
    });

    it('should get all tasks', async () => {
      const result = await taskService.getAllTasks();

      expect(result).toEqual([mockTask]);
      expect(mockTasksRepo.getAllTasks).toHaveBeenCalled();
    });
  });

  describe('task dependencies', () => {
    const mockDependency = {
      id: 'dep1',
      dependent_task_id: 'task1',
      dependency_task_id: 'task2',
      dependency_type: 'blocks' as const,
      required: true,
      created_at: new Date().toISOString()
    };

    beforeEach(() => {
      // Use repository-level mocks directly (TypeORM-only)
      mockTasksRepo.addTaskDependency.mockResolvedValue({ success: true });
      mockTasksRepo.removeTaskDependency.mockResolvedValue({ success: true });
      mockTasksRepo.getTaskDependencies.mockResolvedValue([mockDependency]);
      mockTasksRepo.getDependentTasks.mockResolvedValue([mockDependency]);
    });

    it('should add task dependency', async () => {
      const params: TaskDependencyParams = {
        dependent_task_id: 'task1',
        dependency_task_id: 'task2',
        dependency_type: 'blocks',
        required: true
      };

      const result = await taskService.addTaskDependency(params);

      expect(result).toMatchObject({
        dependent_task_id: 'task1',
        dependency_task_id: 'task2',
        dependency_type: 'blocks',
        required: true
      });
      expect(result.id).toBeDefined();
      expect(mockTasksRepo.addTaskDependency).toHaveBeenCalledWith(params);
    });

    it('should remove task dependency', async () => {
      await taskService.removeTaskDependency('dep1');

      expect(mockTasksRepo.removeTaskDependency).toHaveBeenCalledWith('dep1');
    });

    it('should get task dependencies', async () => {
      mockTasksRepo.getTaskDependencies.mockResolvedValue([mockDependency]);
      mockTasksRepo.getDependentTasks.mockResolvedValue([mockDependency]);
      
      const result = await taskService.getTaskDependencies('task1', 'both');

      expect(result).toEqual([mockDependency, mockDependency]);
      expect(mockTasksRepo.getTaskDependencies).toHaveBeenCalledWith('task1');
      expect(mockTasksRepo.getDependentTasks).toHaveBeenCalledWith('task1');
    });

    it('should throw error if dependency functionality not available', async () => {
      mockTasksRepo.addTaskDependency.mockResolvedValue({ 
        success: false, 
        error: 'Task dependency functionality not available' 
      });

      await expect(taskService.addTaskDependency({
        dependent_task_id: 'task1',
        dependency_task_id: 'task2'
      })).rejects.toThrow('Task dependency functionality not available');
    });
  });

  describe('generateTaskEmbeddingsBatch', () => {
    it('should generate embeddings for multiple tasks', async () => {
      const tasks = [mockTask, { ...mockTask, id: 'task2' }, { ...mockTask, id: 'task3' }];

      await taskService.generateTaskEmbeddingsBatch(tasks);

      expect(mockEmbeddingService.generateTaskEmbedding).toHaveBeenCalledTimes(3);
      expect(mockEmbeddingRepo.storeEmbedding).toHaveBeenCalledTimes(3);
    });

    it('should handle embedding generation failures gracefully', async () => {
      mockEmbeddingService.generateTaskEmbedding
        .mockResolvedValueOnce({
          embedding: [0.1, 0.2, 0.3],
          dimensions: 3,
          model: 'test-model',
          version: 1
        })
        .mockRejectedValueOnce(new Error('Embedding error'));

      const tasks = [mockTask, { ...mockTask, id: 'task2' }];

      await taskService.generateTaskEmbeddingsBatch(tasks);

      expect(mockEmbeddingRepo.storeEmbedding).toHaveBeenCalledTimes(1);
    });
  });

  describe('dependency graph methods', () => {
    beforeEach(() => {
      const mockDependencies = [
        {
          id: 'dep1',
          dependent_task_id: 'task1',
          dependency_task_id: 'task2',
          dependency_type: 'blocks',
          required: true,
          created_at: new Date().toISOString()
        }
      ];

      // Service uses repository methods directly
      mockTasksRepo.getTaskDependencies = jest.fn().mockImplementation((taskId: string) => {
        if (taskId === 'task1') return Promise.resolve(mockDependencies);
        return Promise.resolve([]);
      });
    });

    it('should build task dependency graph', async () => {
      const graph = await taskService.buildTaskDependencyGraph();

      expect(graph.has('task1')).toBe(true);
      expect(graph.get('task1')).toEqual(['task2']);
    });

    it('should find circular dependencies', async () => {
      // Create a circular dependency
      const circularDeps = [
        { dependency_task_id: 'task2' },
        { dependency_task_id: 'task3' },
        { dependency_task_id: 'task1' }
      ];

      mockTasksRepo.getTaskDependencies.mockImplementation((taskId: any) => {
        if (taskId === 'task1') return Promise.resolve([{ dependency_task_id: 'task2' }]);
        if (taskId === 'task2') return Promise.resolve([{ dependency_task_id: 'task3' }]);
        if (taskId === 'task3') return Promise.resolve([{ dependency_task_id: 'task1' }]);
        return Promise.resolve([]);
      });

      mockTasksRepo.getAllTasks.mockResolvedValue([
        { ...mockTask, id: 'task1' },
        { ...mockTask, id: 'task2' },
        { ...mockTask, id: 'task3' }
      ]);

      const cycles = await taskService.findCircularTaskDependencies();

      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should get blocked tasks', async () => {
      mockTasksRepo.getDependentTasks = jest.fn().mockResolvedValue([{
        dependent_task_id: 'task2',
        dependency_type: 'blocks',
        dependency_task_id: 'task1'
      }]);
      mockTasksRepo.getTask.mockResolvedValue({ ...mockTask, id: 'task2' });

      const result = await taskService.getBlockedTasks('task1');

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('task2');
    });

    it('should get blocking tasks', async () => {
      mockTasksRepo.getTaskDependencies.mockResolvedValue([{
        dependency_task_id: 'task2',
        dependency_type: 'blocks'
      }]);
      mockTasksRepo.getTask.mockResolvedValue({ ...mockTask, id: 'task2' });

      const result = await taskService.getBlockingTasks('task1');

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('task2');
    });
  });
});
