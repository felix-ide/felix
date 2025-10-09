import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { TaskData } from '@/types/api';
import { felixService } from '@/services/felixService';
import { TaskUpdateError } from '@client/shared/api/tasksClient';

interface TasksStore {
  tasks: TaskData[];
  loading: boolean;
  error: string | null;
  selectedTaskId?: string;
  selectedTaskIds: Set<string>;
  pollInterval: number | null;
  pendingGates: Record<string, {
    gate: any;
    updates: Record<string, unknown>;
    message: string;
  }>;
  
  // Actions
  loadTasks: (options?: { parentId?: string; includeChildren?: boolean }) => Promise<void>;
  addTask: (task: Omit<TaskData, 'id' | 'created_at' | 'updated_at' | 'sort_order' | 'depth_level'>) => Promise<TaskData>;
  updateTask: (taskId: string, updates: Partial<TaskData>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  selectTask: (taskId?: string) => void;
  toggleTaskSelection: (taskId: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  clearError: () => void;
  startPolling: (interval?: number) => void;
  stopPolling: () => void;
  acknowledgeGate: (taskId: string) => Promise<void>;
  dismissGate: (taskId: string) => void;
}

export const useTasksStore = create<TasksStore>()(
  devtools(
    (set, get) => ({
      tasks: [],
      loading: false,
      error: null,
      selectedTaskId: undefined,
      selectedTaskIds: new Set<string>(),
      pollInterval: null,
      pendingGates: {},

      loadTasks: async (options = {}) => {
        set({ loading: true, error: null });
        
        try {
          const result = await felixService.listTasks({
            parentId: options.parentId,
            includeChildren: options.includeChildren || true,
            limit: 1000, // Get up to 1000 tasks
          });
          
          set({ 
            tasks: result.tasks,
            loading: false,
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load tasks',
            loading: false,
          });
        }
      },

      addTask: async (taskData) => {
        set({ loading: true, error: null });
        
        try {
          const result = await felixService.addTask({
            title: taskData.title,
            description: taskData.description,
            parentId: taskData.parent_id,
            taskType: taskData.task_type,
            taskPriority: taskData.task_priority,
            estimatedEffort: taskData.estimated_effort,
            dueDate: taskData.due_date,
            entity_links: taskData.entity_links,
            stableTags: taskData.stable_tags,
            checklists: (taskData as any).checklists || [],
          });
          
          const newTask = result.task;
          
          set((state) => ({
            tasks: [newTask, ...state.tasks],
            selectedTaskId: newTask.id,
            loading: false,
          }));
          
          return newTask;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to add task';
          set({ 
            error: errorMessage,
            loading: false,
          });
          throw new Error(errorMessage);
        }
      },

      updateTask: async (taskId: string, updates: Partial<TaskData>) => {
        set({ loading: true, error: null });
        
        console.log('tasksStore updateTask called with:', { taskId, updates });
        
        try {
          // Map field names from TaskData format to service format
          const serviceUpdates: any = {};
          if (updates.title !== undefined) serviceUpdates.title = updates.title;
          if (updates.description !== undefined) serviceUpdates.description = updates.description;
          if (updates.task_status !== undefined) serviceUpdates.taskStatus = updates.task_status;
          if (updates.task_priority !== undefined) serviceUpdates.taskPriority = updates.task_priority;
          if (updates.task_type !== undefined) serviceUpdates.taskType = updates.task_type;
          if (updates.assigned_to !== undefined) serviceUpdates.assignedTo = updates.assigned_to;
          if (updates.estimated_effort !== undefined) serviceUpdates.estimatedEffort = updates.estimated_effort;
          if (updates.actual_effort !== undefined) serviceUpdates.actualEffort = updates.actual_effort;
          if (updates.due_date !== undefined) serviceUpdates.dueDate = updates.due_date;
          if (updates.stable_tags !== undefined) serviceUpdates.stableTags = updates.stable_tags;
          if (updates.entity_links !== undefined) serviceUpdates.entity_links = updates.entity_links;
          if (updates.parent_id !== undefined) serviceUpdates.parentId = updates.parent_id;
          if (updates.sort_order !== undefined) serviceUpdates.sortOrder = updates.sort_order;
          if (updates.checklists !== undefined) serviceUpdates.checklists = updates.checklists;
          
          console.log('tasksStore mapped to serviceUpdates:', serviceUpdates);
          
          const result = await felixService.updateTask(taskId, serviceUpdates);
          console.log('tasksStore received result:', result);
          const updatedTask = result.task;
          console.log('tasksStore updatedTask:', updatedTask);
          console.log('tasksStore updatedTask.checklists:', updatedTask?.checklists);
          
          // If parent_id or sort_order changed, reload all tasks to get correct hierarchy
          if (updates.parent_id !== undefined || updates.sort_order !== undefined) {
            await get().loadTasks();
          } else {
            set((state) => {
              const { [taskId]: _, ...restGates } = state.pendingGates;
              return {
                tasks: state.tasks.map(task =>
                  task.id === taskId ? updatedTask : task
                ),
                loading: false,
                pendingGates: restGates
              };
            });
          }
        } catch (error) {
          if (error instanceof TaskUpdateError && error.gate) {
            set((state) => ({
              error: error.message,
              loading: false,
              pendingGates: {
                ...state.pendingGates,
                [taskId]: {
                  gate: error.gate,
                  updates: serviceUpdates,
                  message: error.message
                }
              }
            }));
            throw error;
          } else {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to update task',
              loading: false,
            });
            throw error;
          }
        }
      },

      deleteTask: async (taskId: string) => {
        set({ loading: true, error: null });
        
        try {
          await felixService.deleteTask(taskId);
          
          set((state) => ({
            tasks: state.tasks.filter(task => task.id !== taskId),
            selectedTaskId: state.selectedTaskId === taskId ? undefined : state.selectedTaskId,
            loading: false,
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete task',
            loading: false,
          });
          throw error;
        }
      },

      selectTask: (taskId?: string) => {
        set({ selectedTaskId: taskId });
      },

      toggleTaskSelection: (taskId: string) => {
        set((state) => {
          const newSelectedIds = new Set(state.selectedTaskIds);
          if (newSelectedIds.has(taskId)) {
            newSelectedIds.delete(taskId);
          } else {
            newSelectedIds.add(taskId);
          }
          return { selectedTaskIds: newSelectedIds };
        });
      },

      clearSelection: () => {
        set({ selectedTaskIds: new Set<string>() });
      },

      selectAll: () => {
        set((state) => ({
          selectedTaskIds: new Set(state.tasks.map(t => t.id))
        }));
      },

      clearError: () => {
        set({ error: null });
      },

      startPolling: (interval = 5000) => {
        const { pollInterval, loadTasks } = get();
        
        // Clear any existing interval
        if (pollInterval) {
          clearInterval(pollInterval);
        }

        // Start new polling interval
        const newInterval = setInterval(() => {
          // Only reload if not currently loading
          if (!get().loading) {
            loadTasks();
          }
        }, interval) as unknown as number;

        set({ pollInterval: newInterval });
      },

      stopPolling: () => {
        const { pollInterval } = get();
        
        if (pollInterval) {
          clearInterval(pollInterval);
          set({ pollInterval: null });
        }
      },

      acknowledgeGate: async (taskId: string) => {
        const pending = get().pendingGates[taskId];
        if (!pending) {
          throw new Error('No pending workflow gate for this task');
        }
        set({ loading: true, error: null });
        try {
          const result = await felixService.updateTask(taskId, {
            ...pending.updates,
            transitionGateToken: pending.gate?.issued_token ?? pending.gate?.gate?.issued_token
          });
          const updatedTask = result.task;
          set((state) => {
            const { [taskId]: _, ...rest } = state.pendingGates;
            return {
              tasks: state.tasks.map(task =>
                task.id === taskId ? updatedTask : task
              ),
              loading: false,
              pendingGates: rest
            };
          });
        } catch (error) {
          if (error instanceof TaskUpdateError && error.gate) {
            set((state) => ({
              error: error.message,
              loading: false,
              pendingGates: {
                ...state.pendingGates,
                [taskId]: {
                  gate: error.gate,
                  updates: pending.updates,
                  message: error.message
                }
              }
            }));
            throw error;
          } else {
            set({
              error: error instanceof Error ? error.message : 'Failed to acknowledge workflow gate',
              loading: false
            });
            throw error;
          }
        }
      },

      dismissGate: (taskId: string) => {
        set((state) => {
          const { [taskId]: _, ...rest } = state.pendingGates;
          return { pendingGates: rest };
        });
      }
    }),
    { name: 'tasks-store' }
  )
);
