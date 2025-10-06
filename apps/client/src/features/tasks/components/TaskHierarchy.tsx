import { useEffect } from 'react';
// Icons and extra UI imports removed as unused
import { TaskCard } from './TaskCard';
import { DragDropHierarchy } from '@client/shared/components/DragDropHierarchy';
import { useUIStore } from '@client/shared/state/uiStore';
import { useTasksStore } from '@client/features/tasks/state/tasksStore';
import { cn } from '@/utils/cn';
import type { TaskData } from '@/types/api';
import type { RootNodeSelection } from '@client/features/tasks/components/views/shared/RootNodeSelector';

interface TaskHierarchyProps {
  tasks: TaskData[];
  selectedTaskId?: string;
  onTaskSelect?: (taskId: string) => void;
  onTaskEdit?: (task: TaskData) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<TaskData>) => void;
  onTaskDelete?: (taskId: string) => void;
  onCreateNew?: (parentId?: string) => void;
  onStatusChange?: (taskId: string, status: TaskData['task_status']) => void;
  onReorder?: (taskId: string, newParentId: string | null, newSortOrder: number) => void;
  onAddNote?: (taskId: string) => void;
  className?: string;
  // Unified controls
  filters?: {
    status: string;
    type: string;
    search: string;
  };
  isSelectionMode?: boolean;
  rootContext?: RootNodeSelection;
}

export function TaskHierarchy({
  tasks,
  selectedTaskId,
  onTaskSelect,
  onTaskEdit,
  onTaskUpdate,
  onTaskDelete,
  onCreateNew,
  onStatusChange,
  onReorder,
  onAddNote,
  className,
  filters,
  isSelectionMode = false,
  rootContext,
}: TaskHierarchyProps) {
  const { expandedTasks, toggleTaskExpanded, setTaskFilters } = useUIStore();
  
  const { selectedTaskIds, toggleTaskSelection, clearSelection } = useTasksStore();
  
  // Use unified filters or fallback to local state
  const statusFilter = filters?.status || 'all';
  const typeFilter = filters?.type || 'all'; 
  const searchQuery = filters?.search || '';
  // (removed) legacy export/import menu state

  // Sync unified filters with store
  useEffect(() => {
    setTaskFilters(statusFilter, typeFilter);
  }, [statusFilter, typeFilter, setTaskFilters]);

  // (removed) export menu click-outside handler

  // Clear selection when exiting selection mode
  useEffect(() => {
    if (!isSelectionMode) {
      clearSelection();
    }
  }, [isSelectionMode, clearSelection]);

  // For rootContext filtering - determine which tasks should be visible
  const getRootFilteredTaskIds = (): Set<string> | null => {
    if (!rootContext || rootContext.type === 'all-tasks') {
      return null; // No filtering, show all
    }

    if (rootContext.type === 'specific-task' && rootContext.taskId) {
      const visibleIds = new Set<string>();

      // Add the selected task and all its descendants
      const addTaskAndDescendants = (taskId: string) => {
        visibleIds.add(taskId);
        const children = tasks.filter(t => t.parent_id === taskId);
        children.forEach(child => addTaskAndDescendants(child.id));
      };

      // Add all ancestors up to root
      const addAncestors = (taskId: string) => {
        let currentTask = tasks.find(t => t.id === taskId);
        while (currentTask) {
          visibleIds.add(currentTask.id);
          const parentId = currentTask.parent_id;
          if (!parentId) break;
          const parentTask = tasks.find((t) => t.id === parentId);
          if (!parentTask) break;
          currentTask = parentTask;
        }
      };

      // Build the set of visible task IDs
      addAncestors(rootContext.taskId);
      addTaskAndDescendants(rootContext.taskId);

      return visibleIds;
    }

    return null;
  };

  const visibleTaskIds = getRootFilteredTaskIds();

  // Filter tasks
  const filterTask = (task: TaskData): boolean => {
    // First check if task should be visible based on rootContext
    if (visibleTaskIds && !visibleTaskIds.has(task.id)) {
      return false;
    }

    // Search filter - check all relevant fields
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      // Check for exact ID match first (handles partial IDs like "task_1748984239818" or full IDs)
      if (task.id && task.id.toLowerCase().includes(query)) {
        return true;
      }

      const searchableText = [
        task.title,
        task.description,
        task.task_status,
        task.task_type,
        task.assigned_to,
        task.estimated_effort,
        task.actual_effort,
        ...(task.stable_tags || [])
      ].filter(Boolean).join(' ').toLowerCase();

      if (!searchableText.includes(query)) {
        return false;
      }
    }

    // Apply status filter
    if (statusFilter !== 'all' && task.task_status !== statusFilter) {
      return false;
    }

    // Apply type filter
    if (typeFilter !== 'all' && task.task_type !== typeFilter) {
      return false;
    }

    return true;
  };

  // Sort tasks by sort_order and creation date
  const sortTasks = (tasks: TaskData[]) => {
    return tasks.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  };
  
  // Get child tasks count for a parent task
  const getChildTasksCounts = (parentId: string) => {
    const childTasks = tasks.filter(t => t.parent_id === parentId);
    const completedCount = childTasks.filter(t => t.task_status === 'done').length;
    return {
      total: childTasks.length,
      completed: completedCount
    };
  };

  // Render task card
  const renderTaskCard = (task: TaskData, dragHandleProps: any) => {
    const childCounts = getChildTasksCounts(task.id);
    return (
      <TaskCard
        task={task}
        isSelected={task.id === selectedTaskId}
        isChecked={selectedTaskIds.has(task.id)}
        onSelect={() => onTaskSelect?.(task.id)}
        onToggleCheck={isSelectionMode ? () => toggleTaskSelection(task.id) : undefined}
        onEdit={() => onTaskEdit?.(task)}
        onUpdate={onTaskUpdate}
        onDelete={() => onTaskDelete?.(task.id)}
        onStatusChange={(status) => onStatusChange?.(task.id, status)}
        onAddNote={() => onAddNote?.(task.id)}
        onAddSubtask={() => onCreateNew?.(task.id)}
        dragHandleProps={dragHandleProps}
        childTasksCount={childCounts.total}
        completedChildTasksCount={childCounts.completed}
      />
    );
  };

  // (removed) legacy export/import handlers

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Task List */}
      <div className="flex-1 overflow-auto p-4 min-h-0">
        <DragDropHierarchy
          items={tasks}
          onReorder={onReorder || (() => {})}
          renderCard={renderTaskCard}
          filterItem={filterTask}
          sortItems={sortTasks}
          expandedIds={expandedTasks}
          onToggleExpanded={toggleTaskExpanded}
          itemType="TASK"
          isSearching={searchQuery.trim().length > 0}
        />
      </div>
    </div>
  );
}
