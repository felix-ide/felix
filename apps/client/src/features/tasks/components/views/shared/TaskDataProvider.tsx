import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { felixService } from '@/services/felixService';
import type { TaskData } from '@/types/api';
import type { ViewType } from './ViewSwitcher';
import type { RootNodeSelection } from './RootNodeSelector';

interface TaskDataContextValue {
  // Data
  allTasks: TaskData[];
  filteredTasks: TaskData[];
  rootTasks: TaskData[];
  isLoading: boolean;
  error: string | null;
  
  // View state
  currentView: ViewType;
  rootNodeSelection: RootNodeSelection;
  
  // Filters
  statusFilter: string;
  typeFilter: string;
  searchQuery: string;
  
  // Actions
  setCurrentView: (view: ViewType) => void;
  setRootNodeSelection: (selection: RootNodeSelection) => void;
  setStatusFilter: (status: string) => void;
  setTypeFilter: (type: string) => void;
  setSearchQuery: (query: string) => void;
  refreshTasks: () => Promise<void>;
  
  // Task operations
  updateTask: (taskId: string, updates: Partial<TaskData>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  createTask: (task: Omit<TaskData, 'id' | 'created_at' | 'updated_at' | 'sort_order' | 'depth_level'>) => Promise<void>;
  
  // Utility functions
  getTaskById: (taskId: string) => TaskData | undefined;
  getChildTasks: (parentId: string) => TaskData[];
  getTaskHierarchy: (rootTaskId?: string) => TaskData[];
}

const TaskDataContext = createContext<TaskDataContextValue | null>(null);

export function useTaskData() {
  const context = useContext(TaskDataContext);
  if (!context) {
    throw new Error('useTaskData must be used within a TaskDataProvider');
  }
  return context;
}

interface TaskDataProviderProps {
  children: React.ReactNode;
  initialView?: ViewType;
  initialRootSelection?: RootNodeSelection;
}

export function TaskDataProvider({ 
  children, 
  initialView = 'gantt',
  initialRootSelection = { type: 'all-tasks' }
}: TaskDataProviderProps) {
  // Data state
  const [allTasks, setAllTasks] = useState<TaskData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // View state
  const [currentView, setCurrentView] = useState<ViewType>(initialView);
  const [rootNodeSelection, setRootNodeSelection] = useState<RootNodeSelection>(initialRootSelection);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load tasks
  const refreshTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await felixService.listTasks({
        include_children: true,
        limit: 1000 // Get up to 1000 tasks
      });
      setAllTasks(response.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      console.error('Failed to load tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  // Listen for project changes to reload tasks
  useEffect(() => {
    const handleProjectRestore = () => {
      refreshTasks();
    };

    window.addEventListener('project-restored', handleProjectRestore);
    return () => window.removeEventListener('project-restored', handleProjectRestore);
  }, [refreshTasks]);

  // Task operations
  const updateTask = useCallback(async (taskId: string, updates: Partial<TaskData>) => {
    try {
      await felixService.updateTask(taskId, {
        title: updates.title,
        description: updates.description,
        taskStatus: updates.task_status,
        taskPriority: updates.task_priority,
        taskType: updates.task_type,
        assignedTo: updates.assigned_to,
        estimatedEffort: updates.estimated_effort,
        actualEffort: updates.actual_effort,
        dueDate: updates.due_date,
        stableTags: updates.stable_tags,
        entity_links: updates.entity_links,
        parentId: updates.parent_id,
        sortOrder: updates.sort_order
      });
      
      // Update local state
      setAllTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));
    } catch (err) {
      console.error('Failed to update task:', err);
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await felixService.deleteTask(taskId);
      
      // Update local state
      setAllTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
      throw err;
    }
  }, []);

  const createTask = useCallback(async (taskData: Omit<TaskData, 'id' | 'created_at' | 'updated_at' | 'sort_order' | 'depth_level'>) => {
    try {
      const response = await felixService.addTask({
        title: taskData.title,
        description: taskData.description,
        parentId: taskData.parent_id,
        taskType: taskData.task_type,
        taskPriority: taskData.task_priority,
        estimatedEffort: taskData.estimated_effort,
        dueDate: taskData.due_date,
        entity_links: taskData.entity_links,
        stableTags: taskData.stable_tags
      });
      
      // Update local state
      setAllTasks(prev => [...prev, response.task]);
    } catch (err) {
      console.error('Failed to create task:', err);
      throw err;
    }
  }, []);

  // Utility functions
  const getTaskById = useCallback((taskId: string) => {
    return allTasks.find(task => task.id === taskId);
  }, [allTasks]);

  const getChildTasks = useCallback((parentId: string) => {
    return allTasks.filter(task => task.parent_id === parentId);
  }, [allTasks]);

  const getTaskHierarchy = useCallback((rootTaskId?: string) => {
    if (rootTaskId) {
      // Get task and all its descendants
      const collectDescendants = (taskId: string): TaskData[] => {
        const task = getTaskById(taskId);
        if (!task) return [];
        
        const children = getChildTasks(taskId);
        return [task, ...children.flatMap(child => collectDescendants(child.id))];
      };
      
      return collectDescendants(rootTaskId);
    }
    
    return allTasks;
  }, [allTasks, getTaskById, getChildTasks]);

  // Filter tasks based on current filters and root node selection
  const filteredTasks = useMemo(() => {
    let tasks = [...allTasks];

    // Apply root node selection
    switch (rootNodeSelection.type) {
      case 'all-tasks':
        // All tasks - no filtering
        break;
      case 'root-only':
        // Only tasks without parents
        tasks = tasks.filter(task => !task.parent_id);
        break;
      case 'epics-only':
        // Only epic type tasks
        tasks = tasks.filter(task => task.task_type === 'epic');
        break;
      case 'stories-only':
        // Only story type tasks
        tasks = tasks.filter(task => task.task_type === 'story');
        break;
      case 'specific-task':
      case 'epic':
      case 'story':
        // Tasks under specific node (works the same for all specific selections)
        if (rootNodeSelection.taskId) {
          tasks = getTaskHierarchy(rootNodeSelection.taskId);
        }
        break;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      tasks = tasks.filter(task => {
        return (
          task.title.toLowerCase().includes(query) ||
          task.id.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query)) ||
          (task.stable_tags && task.stable_tags.some(tag => tag.toLowerCase().includes(query)))
        );
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      tasks = tasks.filter(task => task.task_status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      tasks = tasks.filter(task => task.task_type === typeFilter);
    }

    return tasks;
  }, [allTasks, rootNodeSelection, searchQuery, statusFilter, typeFilter, getTaskHierarchy]);

  // Get root-level tasks from filtered tasks
  const rootTasks = useMemo(() => {
    return filteredTasks.filter(task => !task.parent_id || !filteredTasks.some(t => t.id === task.parent_id));
  }, [filteredTasks]);

  const contextValue: TaskDataContextValue = {
    // Data
    allTasks,
    filteredTasks,
    rootTasks,
    isLoading,
    error,
    
    // View state
    currentView,
    rootNodeSelection,
    
    // Filters
    statusFilter,
    typeFilter,
    searchQuery,
    
    // Actions
    setCurrentView,
    setRootNodeSelection,
    setStatusFilter,
    setTypeFilter,
    setSearchQuery,
    refreshTasks,
    
    // Task operations
    updateTask,
    deleteTask,
    createTask,
    
    // Utility functions
    getTaskById,
    getChildTasks,
    getTaskHierarchy
  };

  return (
    <TaskDataContext.Provider value={contextValue}>
      {children}
    </TaskDataContext.Provider>
  );
}