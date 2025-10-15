import { useState, useEffect, useMemo } from 'react';
import { useTaskData } from '../shared/TaskDataProvider';
import { GanttChart } from './GanttChart';
import { Alert } from '@client/shared/ui/Alert';
import { Button } from '@client/shared/ui/Button';
import { BarChart3 } from 'lucide-react';
import type { TaskData } from '@/types/api';
import { felixService } from '@/services/felixService';

interface GanttViewProps {
  onTaskClick?: (task: TaskData) => void;
  filters?: any;
}

export function GanttView({ onTaskClick, filters }: GanttViewProps) {
  const {
    filteredTasks,
    isLoading,
    error,
    statusFilter,
    typeFilter,
    searchQuery,
    refreshTasks,
    updateTask,
    createTask
  } = useTaskData();

  const viewMode = (filters?.viewMode as 'Quarter' | 'Month' | 'Week' | 'Day' | 'Hour') || 'Month';

  // State for dependencies
  const [taskDependencies, setTaskDependencies] = useState<Map<string, string[]>>(new Map());

  // Load dependencies for all tasks
  useEffect(() => {
    const loadDependencies = async () => {
      if (filteredTasks.length === 0) return;
      
      const depMap = new Map<string, string[]>();
      
      try {
        // Load dependencies for each task
        const dependencyPromises = filteredTasks.map(async (task) => {
          try {
            const deps = await felixService.getTaskDependencies(task.id);
            // Get INCOMING dependencies - tasks that THIS task depends on
            if (deps?.incoming) {
              const incomingIds = deps.incoming.map((dep: any) => dep.dependency_task_id);
              depMap.set(task.id, incomingIds);
            } else {
              depMap.set(task.id, []);
            }
          } catch (error) {
            depMap.set(task.id, []);
          }
        });
        
        await Promise.all(dependencyPromises);
        setTaskDependencies(depMap);
      } catch (error) {
        console.error('Failed to load task dependencies:', error);
      }
    };

    loadDependencies();
  }, [filteredTasks]);

  // Prepare tasks for Gantt chart
  const ganttTasks = useMemo(() => {
    console.log('Filtered tasks for Gantt:', filteredTasks);
    console.log('Task dependencies map:', taskDependencies);

    return filteredTasks.map((task) => {
      // Use actual task dates
      const today = new Date();

      // Start date is created_at
      const start = task.created_at ? new Date(task.created_at) : today;

      // End date is due_date if available
      let end = task.due_date ? new Date(task.due_date) : null;

      // If no due date, calculate based on status and task type
      if (!end) {
        // Default duration based on task type
        const daysToAdd = task.task_type === 'epic' ? 90 :
                         task.task_type === 'story' ? 30 :
                         task.task_type === 'milestone' ? 1 :
                         task.task_status === 'done' ? 7 :
                         task.task_status === 'in_progress' ? 14 :
                         21;
        end = new Date(start.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      }

      // Ensure end is after start
      if (end <= start) {
        end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      // Calculate progress
      let progress = 0;
      if (task.task_status === 'done') {
        progress = 100;
      } else if (task.task_status === 'in_progress') {
        if (task.actual_effort && task.estimated_effort) {
          const actual = parseFloat(task.actual_effort.replace(/[^\d.]/g, ''));
          const estimated = parseFloat(task.estimated_effort.replace(/[^\d.]/g, ''));
          progress = Math.min(100, (actual / estimated) * 100);
        } else {
          progress = 50; // Default for in-progress
        }
      }

      return {
        id: task.id,
        name: task.title,
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        progress,
        dependencies: taskDependencies.get(task.id) || [],
        custom_class: `gantt-${task.task_priority}-${task.task_status}`,
        taskData: task // Store original task data
      };
    });
  }, [filteredTasks, taskDependencies]);

  const handleTaskClick = (task: any) => {
    const taskData = filteredTasks.find(t => t.id === task.id);
    if (taskData && onTaskClick) {
      onTaskClick(taskData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <p className="font-semibold">Error loading tasks</p>
        <p className="text-sm mt-1">{error}</p>
        <Button onClick={refreshTasks} size="sm" className="mt-2">
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div className="h-full">
      {ganttTasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground text-lg font-medium">No tasks to display</p>
              <p className="text-muted-foreground text-sm mt-1">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Use the main task list to create your first task'}
              </p>
          </div>
        </div>
      ) : (
        <div className="h-full">
          <GanttChart
              tasks={ganttTasks}
              viewMode={viewMode}
              onTaskClick={handleTaskClick}
              onDateChange={(task, _start, end) => {
                const taskData = filteredTasks.find(t => t.id === task.id);
                if (taskData) {
                  updateTask(task.id, {
                    due_date: end
                  });
                }
              }}
              onProgressChange={(task, progress) => {
                const taskData = filteredTasks.find(t => t.id === task.id);
                if (taskData) {
                  // Update task status based on progress
                  let status = taskData.task_status;
                  if (progress === 0) status = 'todo';
                  else if (progress === 100) status = 'done';
                  else status = 'in_progress';

                  updateTask(task.id, {
                    task_status: status
                  });
                }
              }}
          />
        </div>
      )}
    </div>
  );
}
