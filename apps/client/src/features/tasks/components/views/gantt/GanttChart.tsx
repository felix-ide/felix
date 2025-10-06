import { useState } from 'react';
import type { TaskData } from '@/types/api';
import { cn } from '@/utils/cn';
import { ChevronRight, ChevronDown, Target, Flag, CheckSquare, Bug, Wrench } from 'lucide-react';
import { DependencyLines } from './DependencyLines';

interface GanttTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies: string[];
  custom_class?: string;
  taskData: TaskData;
}

interface GanttChartProps {
  tasks: GanttTask[];
  viewMode: 'Quarter' | 'Month' | 'Week' | 'Day' | 'Hour';
  onTaskClick?: (task: GanttTask) => void;
  onDateChange?: (task: GanttTask, start: string, end: string) => void;
  onProgressChange?: (task: GanttTask, progress: number) => void;
}

export function GanttChart({
  tasks,
  viewMode,
  onTaskClick,
}: GanttChartProps) {
  // Initialize with all root tasks expanded
  const rootTaskIds = tasks.filter(t => !t.taskData.parent_id).map(t => t.id);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set(rootTaskIds));
  
  // Build task hierarchy
  const taskHierarchy = new Map<string | null, GanttTask[]>();
  const taskMap = new Map<string, GanttTask>();
  
  tasks.forEach(task => {
    taskMap.set(task.id, task);
    const parentId = task.taskData.parent_id || null;
    if (!taskHierarchy.has(parentId)) {
      taskHierarchy.set(parentId, []);
    }
    taskHierarchy.get(parentId)!.push(task);
  });
  
  // Get all tasks in hierarchical order
  const getOrderedTasks = (parentId: string | null = null, level: number = 0): Array<{ task: GanttTask, level: number }> => {
    const result: Array<{ task: GanttTask, level: number }> = [];
    const children = taskHierarchy.get(parentId) || [];
    
    children.forEach(task => {
      result.push({ task, level });
      if (expandedTasks.has(task.id)) {
        result.push(...getOrderedTasks(task.id, level + 1));
      }
    });
    
    return result;
  };
  
  const orderedTasks = getOrderedTasks();
  
  const toggleExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };
  // Generate date columns
  const generateDateColumns = () => {
    if (tasks.length === 0) return [];

    const dates = tasks.flatMap(t => [new Date(t.start), new Date(t.end)]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Calculate the time span
    const timeSpan = maxDate.getTime() - minDate.getTime();
    const days = timeSpan / (1000 * 60 * 60 * 24);

    // Auto-select appropriate view mode based on time span
    let effectiveViewMode = viewMode;
    if (days > 365) {
      effectiveViewMode = 'Month'; // Show months for year+ spans
    } else if (days > 90) {
      effectiveViewMode = 'Week'; // Show weeks for quarter+ spans
    } else if (days > 30) {
      effectiveViewMode = 'Day'; // Show days for month+ spans
    }

    // Add padding
    if (effectiveViewMode === 'Month') {
      minDate.setMonth(minDate.getMonth() - 1);
      maxDate.setMonth(maxDate.getMonth() + 1);
    } else if (effectiveViewMode === 'Week') {
      minDate.setDate(minDate.getDate() - 14);
      maxDate.setDate(maxDate.getDate() + 14);
    } else {
      minDate.setDate(minDate.getDate() - 7);
      maxDate.setDate(maxDate.getDate() + 7);
    }
    
    const columns = [];
    const current = new Date(minDate);

    while (current <= maxDate) {
      let label = '';

      switch (effectiveViewMode) {
        case 'Hour':
          label = current.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            hour12: true
          });
          break;
        case 'Day':
          label = current.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
          break;
        case 'Week':
          label = `Week ${Math.ceil(current.getDate() / 7)} ${current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}`;
          break;
        case 'Month':
          label = current.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
          });
          break;
        case 'Quarter': {
          const quarter = Math.floor(current.getMonth() / 3) + 1;
          label = `Q${quarter} ${current.getFullYear()}`;
          break;
        }
        default:
          label = current.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
      }

      columns.push({
        date: new Date(current),
        label
      });

      // Increment based on effective view mode
      switch (effectiveViewMode) {
        case 'Hour':
          current.setHours(current.getHours() + 1);
          break;
        case 'Day':
          current.setDate(current.getDate() + 1);
          break;
        case 'Week':
          current.setDate(current.getDate() + 7);
          break;
        case 'Month':
          current.setMonth(current.getMonth() + 1);
          break;
        case 'Quarter':
          current.setMonth(current.getMonth() + 3);
          break;
        default:
          current.setDate(current.getDate() + 1);
      }
    }
    
    return columns;
  };
  
  const dateColumns = generateDateColumns();

  // Calculate column width based on actual view mode and date range
  const getColumnWidth = () => {
    const timeSpan = dateColumns.length > 0
      ? (dateColumns[dateColumns.length - 1].date.getTime() - dateColumns[0].date.getTime()) / (1000 * 60 * 60 * 24)
      : 30;

    if (timeSpan > 365) return 40; // Narrow for year views
    if (timeSpan > 90) return 60;  // Medium for quarter views
    if (timeSpan > 30) return 80;  // Wider for month views
    return 120; // Widest for week/day views
  };

  const columnWidth = getColumnWidth();
  const totalWidth = dateColumns.length * columnWidth;

  // Calculate task bar position
  const getTaskPosition = (task: GanttTask) => {
    if (!dateColumns.length) return { left: 0, width: 100 };
    
    const startDate = new Date(task.start);
    const endDate = new Date(task.end);
    const firstDate = dateColumns[0].date;
    const lastDate = dateColumns[dateColumns.length - 1].date;
    
    // Calculate time units based on view mode
    const timeUnit = viewMode === 'Hour' ? (1000 * 60 * 60) : (1000 * 60 * 60 * 24); // hours vs days
    const totalUnits = (lastDate.getTime() - firstDate.getTime()) / timeUnit;
    
    const startUnits = (startDate.getTime() - firstDate.getTime()) / timeUnit;
    const durationUnits = (endDate.getTime() - startDate.getTime()) / timeUnit;
    
    const left = (startUnits / totalUnits) * totalWidth;
    const minWidth = viewMode === 'Hour' ? 30 : 40; // Smaller min width for hourly view
    const width = Math.max(minWidth, (durationUnits / totalUnits) * totalWidth);
    
    return { left, width };
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-destructive text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-primary text-primary-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'epic': return Target;
      case 'story': return Flag;
      case 'task': return CheckSquare;
      case 'milestone': return Target;
      case 'bug': return Bug;
      case 'feature': return Wrench;
      default: return CheckSquare;
    }
  };
  
  const hasChildren = (taskId: string) => {
    return taskHierarchy.has(taskId) && taskHierarchy.get(taskId)!.length > 0;
  };

  return (
    <div style={{
      height: '100%',
      display: 'grid',
      gridTemplateColumns: '320px 1fr',
      background: 'var(--background)'
    }}>
      {/* Task List Sidebar */}
      <div style={{
        borderRight: '1px solid var(--border)',
        background: 'var(--card)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div className="h-14 px-4 flex items-center border-b border-border bg-muted/50">
          <h3 className="font-semibold text-sm">Tasks</h3>
          <span className="ml-2 text-xs text-muted-foreground">({tasks.length})</span>
        </div>

        {/* Task List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {orderedTasks.map(({ task, level }) => {
            const taskData = task.taskData;
            const isExpanded = expandedTasks.has(task.id);
            const childrenExist = hasChildren(task.id);
            
            return (
              <div
                key={task.id}
                className={cn(
                  "h-12 border-b border-border cursor-pointer transition-all flex items-center",
                  "hover:bg-accent/50",
                  taskData.task_type === 'epic' && "bg-primary/5",
                  taskData.task_type === 'milestone' && "bg-yellow-50 /10"
                )}
                style={{ paddingLeft: `${level * 24 + 16}px` }}
              >
                <div className="pr-3 flex items-center gap-2 flex-1">
                  {/* Expand/Collapse button */}
                  {childrenExist && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(task.id);
                      }}
                      className="p-0.5 hover:bg-accent rounded -ml-5"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  )}

                  {/* Type Badge */}
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0",
                    taskData.task_type === 'epic' && "bg-purple-500/20 text-purple-400",
                    taskData.task_type === 'story' && "bg-blue-500/20 text-blue-400",
                    taskData.task_type === 'task' && "bg-green-500/20 text-green-400",
                    taskData.task_type === 'subtask' && "bg-gray-500/20 text-gray-400",
                    taskData.task_type === 'milestone' && "bg-yellow-500/20 text-yellow-400"
                  )}>
                    {taskData.task_type?.toUpperCase() || 'TASK'}
                  </span>

                  {/* Status Dot */}
                  <div className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    taskData.task_status === 'done' && "bg-green-500",
                    taskData.task_status === 'in_progress' && "bg-primary",
                    taskData.task_status === 'blocked' && "bg-destructive",
                    taskData.task_status === 'todo' && "bg-gray-400"
                  )} />

                  {/* Task Name */}
                  <div className="flex-1 min-w-0" onClick={() => {
                    // Scroll to the task in the timeline
                    const taskElement = document.querySelector<HTMLElement>(`[data-id="${task.id}"]`);
                    const timelineArea = document.getElementById('gantt-timeline-area') as HTMLElement | null;
                    if (taskElement && timelineArea) {
                      const taskBounds = taskElement.getBoundingClientRect();
                      const timelineBounds = timelineArea.getBoundingClientRect();
                      const scrollLeft = taskElement.offsetLeft - (timelineBounds.width / 2) + (taskBounds.width / 2);
                      timelineArea.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                      // Flash the task bar
                      taskElement.classList.add('ring-2', 'ring-primary');
                      setTimeout(() => {
                        taskElement.classList.remove('ring-2', 'ring-primary');
                      }, 1500);
                    }
                    onTaskClick?.(task);
                  }}>
                    <div className={cn(
                      "truncate text-sm",
                      taskData.task_type === 'epic' && "font-bold text-purple-400",
                      taskData.task_type === 'story' && "font-semibold text-blue-400",
                      taskData.task_type === 'milestone' && "font-medium text-yellow-400"
                    )}>
                      {task.name}
                    </div>
                  </div>

                  {/* Progress */}
                  {task.progress > 0 && (
                    <span className="text-xs text-muted-foreground">{task.progress}%</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline Area */}
      <div style={{
        overflow: 'auto',
        position: 'relative'
      }} id="gantt-timeline-area">
        <div style={{ width: `${totalWidth}px`, minWidth: 'fit-content' }}>
          {/* Date Headers */}
          <div className="h-14 flex border-b border-border bg-muted/50 sticky top-0 z-10">
            {dateColumns.map((col, index) => (
              <div
                key={index}
                className="flex-shrink-0 border-r border-border flex items-center justify-center"
                style={{ width: `${columnWidth}px` }}
              >
                <div className="text-center">
                  <div className="text-xs font-medium">{col.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {col.date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Task Rows */}
          <div className="relative">
            {/* Dependency Lines */}
            <DependencyLines
              tasks={orderedTasks.map(({ task }) => ({
                id: task.id,
                name: task.name,
                dependencies: task.dependencies ?? [],
              }))}
            />

            {orderedTasks.map(({ task }, index) => {
              const position = getTaskPosition(task);
              const taskData = task.taskData;
              const TypeIcon = getTypeIcon(taskData.task_type);

              return (
                <div
                  key={task.id}
                  className={cn(
                    "h-12 border-b border-border relative",
                    index % 2 === 1 && "bg-muted/20",
                    taskData.task_type === 'epic' && "bg-primary/5",
                    taskData.task_type === 'milestone' && "bg-yellow-50 /10"
                  )}
                >
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex">
                    {dateColumns.map((_, idx) => (
                      <div
                        key={idx}
                        className="flex-shrink-0 border-r border-border/50"
                        style={{ width: `${columnWidth}px` }}
                      />
                    ))}
                  </div>
                  
                  {/* Task Bar */}
                  <div
                    data-id={task.id}
                    className={cn(
                      "absolute top-2 h-8 rounded shadow-sm cursor-pointer transition-all",
                      "hover:shadow-md hover:z-10",
                      "flex items-center px-2",
                      taskData.task_type === 'epic' && "h-9 top-1.5 font-semibold",
                      taskData.task_type === 'milestone' && "bg-yellow-500 text-primary-foreground",
                      taskData.task_type !== 'milestone' && getPriorityClass(taskData.task_priority),
                      taskData.task_status === 'done' && "opacity-60",
                      taskData.task_status === 'blocked' && "opacity-80 ring-2 ring-red-500"
                    )}
                    style={{
                      left: `${position.left}px`,
                      width: `${position.width}px`
                    }}
                    onClick={() => onTaskClick?.(task)}
                  >
                    <div className="relative h-full w-full flex items-center gap-1 text-primary-foreground">
                      {/* Progress overlay */}
                      {task.progress > 0 && task.progress < 100 && (
                        <div
                          className="absolute inset-0 bg-black/20 rounded"
                          style={{ width: `${task.progress}%` }}
                        />
                      )}
                      
                      {/* Icon and Task name */}
                      <TypeIcon className="h-3 w-3 flex-shrink-0" />
                      <span className={cn(
                        "relative text-xs truncate",
                        taskData.task_type === 'epic' && "font-semibold"
                      )}>
                        {task.name}
                      </span>
                      
                      {/* Status indicator */}
                      {taskData.task_status === 'done' && (
                        <span className="ml-auto text-xs">✓</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
