import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useTaskData } from '../shared/TaskDataProvider';
import { KanbanColumn } from './KanbanColumn';
import { felixService } from '@/services/felixService';
import type { TaskData, TaskDependency } from '@/types/api';

interface Column {
  id: string;
  title: string;
  taskStatus: TaskData['task_status'];
}

const columns: Column[] = [
  { id: 'todo', title: 'TODO', taskStatus: 'todo' },
  { id: 'in_progress', title: 'IN PROGRESS', taskStatus: 'in_progress' },
  { id: 'review', title: 'REVIEW', taskStatus: 'blocked' }, // Using blocked for review state
  { id: 'done', title: 'DONE', taskStatus: 'done' }
];

interface KanbanBoardProps {
  onTaskClick?: (task: TaskData) => void;
}

export function KanbanBoard({ onTaskClick }: KanbanBoardProps) {
  const { filteredTasks, updateTask, createTask, refreshTasks } = useTaskData();
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  // loading spinner not displayed here; omit local loading state

  // Group tasks by status
  const tasksByColumn = columns.reduce((acc, column) => {
    acc[column.id] = filteredTasks
      .filter(task => {
        if (column.id === 'review') {
          return task.task_status === 'blocked';
        }
        return task.task_status === column.taskStatus;
      })
      .sort((a, b) => a.sort_order - b.sort_order);
    return acc;
  }, {} as Record<string, TaskData[]>);

  // Load dependencies
  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const response = await felixService.listTaskDependencies();
        setDependencies(response.dependencies || []);
      } catch (error) {
        console.error('Failed to load dependencies:', error);
      }
    };
    
    loadDependencies();
  }, [filteredTasks]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside any column
    if (!destination) {
      return;
    }

    // No movement
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const taskId = draggableId;
    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destColumn = columns.find(col => col.id === destination.droppableId);

    if (!sourceColumn || !destColumn) {
      return;
    }

    // Calculate new sort order
    const destTasks = tasksByColumn[destination.droppableId];
    let newSortOrder = 0;
    
    if (destination.index === 0) {
      // First position
      newSortOrder = destTasks.length > 0 ? destTasks[0].sort_order - 1 : 0;
    } else if (destination.index >= destTasks.length) {
      // Last position
      newSortOrder = destTasks.length > 0 
        ? destTasks[destTasks.length - 1].sort_order + 1 
        : 0;
    } else {
      // Middle position
      const prevTask = destTasks[destination.index - 1];
      const nextTask = destTasks[destination.index];
      newSortOrder = (prevTask.sort_order + nextTask.sort_order) / 2;
    }

    try {
      
      // Update task status and sort order
      await updateTask(taskId, {
        task_status: destColumn.taskStatus,
        sort_order: newSortOrder
      });

      // Refresh tasks to get updated state
      await refreshTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      // no-op
    }
  }, [tasksByColumn, updateTask, refreshTasks]);

  const handleAddTask = useCallback(async (columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (!column) return;

    try {
      await createTask({
        title: 'New Task',
        task_status: column.taskStatus,
        task_priority: 'medium',
        task_type: 'task'
      });
      
      await refreshTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  }, [createTask, refreshTasks]);

  const handleTaskClick = useCallback((task: TaskData) => {
    if (onTaskClick) {
      onTaskClick(task);
    }
  }, [onTaskClick]);

  // quick edit inline handler removed; use context menus if needed

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div style={{ 
        height: '100%', 
        overflowX: 'auto',
        overflowY: 'auto'
      }}>
        <div style={{ 
          display: 'flex',
          gap: '16px',
          padding: '16px',
          minWidth: 'max-content',
          height: '100%'
        }}>
          {columns.map(column => (
            <div key={column.id} style={{ width: '320px', flexShrink: 0 }}>
              <KanbanColumn
                columnId={column.id}
                title={column.title}
                tasks={tasksByColumn[column.id]}
                dependencies={dependencies}
                onAddTask={() => handleAddTask(column.id)}
                onTaskClick={handleTaskClick}
              />
            </div>
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}
