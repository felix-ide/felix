import { Calendar, Clock, User, Tag, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { TaskData } from '@/types/api';

interface TaskBarProps {
  task: {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    taskData: TaskData;
  };
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

export function TaskBar({ task, index, isSelected, onClick }: TaskBarProps) {
  const { taskData } = task;
  
  // Calculate indent level based on parent hierarchy
  const indentLevel = taskData.depth_level || 0;
  const indentPixels = indentLevel * 20;
  
  // Get hierarchy indicator
  const getHierarchyIndicator = () => {
    if (!taskData.parent_id) return '';
    // Check if this is the last child of its parent (simplified)
    return index === 0 ? '├─' : '├─';
  };

  // Get task type icon
  const getTaskIcon = () => {
    switch (taskData.task_type) {
      case 'epic': return '📋';
      case 'story': return '📖';
      case 'task': return '✓';
      case 'subtask': return '·';
      case 'milestone': return '💎';
      case 'bug': return '🐛';
      case 'spike': return '🔍';
      case 'chore': return '🔧';
      default: return '📌';
    }
  };

  // Get priority color class
  const getPriorityClass = () => {
    switch (taskData.task_priority) {
      case 'critical': return 'bg-destructive/10 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-card text-gray-700 border-border';
      default: return 'bg-card text-gray-700 border-border';
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (taskData.task_status) {
      case 'done':
        return <CheckCircle2 className="h-3 w-3 text-green-600" />;
      case 'blocked':
        return <AlertCircle className="h-3 w-3 text-red-600" />;
      case 'in_progress':
        return <span className="text-primary">🔄</span>;
      case 'todo':
        return <span className="text-gray-500">⭕</span>;
      default:
        return null;
    }
  };

  // Format dates
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={`gantt-task-bar ${isSelected ? 'selected' : ''} ${
        index % 2 === 0 ? 'bg-muted' : 'bg-card'
      } hover:bg-blue-50 cursor-pointer border-b border-border`}
      onClick={onClick}
      style={{ paddingLeft: `${indentPixels}px` }}
    >
      <div className="p-3">
        {/* Task Title Row */}
        <div className="flex items-center gap-2 mb-2">
          {indentLevel > 0 && (
            <span className="text-muted-foreground font-mono text-sm">{getHierarchyIndicator()}</span>
          )}
          <span className="text-lg">{getTaskIcon()}</span>
          <h4 className="font-medium text-foreground flex-1 truncate">{task.name}</h4>
          {getStatusIcon()}
        </div>

        {/* Task Details Row */}
        <div className="flex items-center gap-3 text-xs">
          {/* Assignee */}
          {taskData.assigned_to && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{taskData.assigned_to}</span>
            </div>
          )}

          {/* Priority Badge */}
          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityClass()}`}>
            {taskData.task_priority.toUpperCase()}
          </span>

          {/* Dates */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(task.start)} - {formatDate(task.end)}</span>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <span>📊</span>
            <span>{task.progress}%</span>
          </div>

          {/* Effort */}
          {taskData.estimated_effort && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {taskData.actual_effort || '0h'} / {taskData.estimated_effort}
              </span>
            </div>
          )}

          {/* Tags */}
          {taskData.stable_tags && taskData.stable_tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3 text-gray-500" />
              {taskData.stable_tags.slice(0, 2).map((tag, i) => (
                <span key={i} className="text-muted-foreground">{tag}</span>
              ))}
              {taskData.stable_tags.length > 2 && (
                <span className="text-gray-500">+{taskData.stable_tags.length - 2}</span>
              )}
            </div>
          )}

          {/* Blocked indicator */}
          {taskData.task_status === 'blocked' && (
            <span className="text-red-600 font-medium">🚫 Blocked</span>
          )}
        </div>

        {/* Progress Bar (visual) */}
        <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              taskData.task_status === 'done'
                ? 'bg-green-500'
                : taskData.task_status === 'blocked'
                ? 'bg-destructive'
                : taskData.task_priority === 'critical'
                ? 'bg-red-400'
                : taskData.task_priority === 'high'
                ? 'bg-orange-400'
                : taskData.task_priority === 'medium'
                ? 'bg-yellow-400'
                : 'bg-blue-400'
            }`}
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
