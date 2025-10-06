import { useState } from 'react';
import { MoreVertical, Calendar, User, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { cn } from '@/utils/cn';
import { WorkflowBadge } from './WorkflowBadge';
import { ProgressIndicator } from './ProgressIndicator';
import type { TaskData } from '@/types/api';

interface TaskCardWithWorkflowProps {
  task: TaskData;
  variant?: 'compact' | 'detailed' | 'list';
  showWorkflowStatus?: boolean;
  showProgressBar?: boolean;
  showRequirements?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: TaskData['task_status']) => void;
  isSelected?: boolean;
  onSelect?: () => void;
  className?: string;
}

// Mock function to calculate progress (should be replaced with actual logic)
function calculateWorkflowProgress(task: TaskData): number {
  // This would check actual requirements completion
  // For now, return a mock value based on status
  if (task.task_status === 'done') return 100;
  if (task.task_status === 'in_progress') return 60;
  if (task.task_status === 'blocked') return 30;
  return 20;
}

// Mock function to get validation status
function getValidationStatus(task: TaskData): 'valid' | 'incomplete' | 'invalid' {
  const progress = calculateWorkflowProgress(task);
  if (progress === 100) return 'valid';
  if (progress >= 50) return 'incomplete';
  return 'invalid';
}

// Get workflow from task metadata (mock for now)
function getTaskWorkflow(task: TaskData): string {
  // This would read from task metadata
  // For now, determine based on task type
  if (task.task_type === 'bug') return 'bugfix';
  if (task.task_type === 'spike') return 'research';
  if (task.task_type === 'chore') return 'simple';
  return 'feature_development';
}

const STATUS_ICONS = {
  todo: '📋',
  in_progress: '🔄',
  blocked: '🚫',
  done: '✅',
  cancelled: '❌'
};

const PRIORITY_COLORS = {
  low: 'text-primary',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  critical: 'text-red-600'
};

const TYPE_ICONS = {
  epic: '🎯',
  story: '📖',
  task: '☑️',
  subtask: '📝',
  milestone: '🚩',
  bug: '🐛',
  spike: '🔍',
  chore: '🔧'
};

export function TaskCardWithWorkflow({
  task,
  variant = 'compact',
  showWorkflowStatus = true,
  showProgressBar = true,
  showRequirements = false,
  onEdit,
  onDelete,
  // onStatusChange,
  isSelected = false,
  onSelect,
  className
}: TaskCardWithWorkflowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const workflow = getTaskWorkflow(task);
  const progress = calculateWorkflowProgress(task);
  const validationStatus = getValidationStatus(task);

  const validationIcon = {
    valid: <span className="text-green-500">✅</span>,
    incomplete: <span className="text-yellow-500">⚠️</span>,
    invalid: <span className="text-red-500">❌</span>
  };

  if (variant === 'list') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer',
          isSelected && 'ring-2 ring-primary',
          className
        )}
        onClick={onSelect}
      >
        <span className="text-lg">{TYPE_ICONS[task.task_type]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{task.title}</span>
            {showWorkflowStatus && validationIcon[validationStatus]}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
            {showWorkflowStatus && <WorkflowBadge workflow={workflow} size="sm" />}
            {showProgressBar && <span>{Math.round(progress)}%</span>}
            <span className={PRIORITY_COLORS[task.task_priority]}>{task.task_priority}</span>
            {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border rounded-lg bg-background shadow-sm hover:shadow-md transition-shadow',
        isSelected && 'ring-2 ring-primary',
        className
      )}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg">{TYPE_ICONS[task.task_type]}</span>
            <h3 className="font-medium truncate flex-1">{task.title}</h3>
            {showWorkflowStatus && validationIcon[validationStatus]}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>

        {/* Workflow and progress */}
        {showWorkflowStatus && (
          <div className="flex items-center gap-3 mb-3">
            <WorkflowBadge workflow={workflow} size="sm" percent={progress} />
            {showProgressBar && (
              <div className="flex-1">
                <ProgressIndicator percentage={progress} size="sm" showLabel={false} />
              </div>
            )}
          </div>
        )}

        {/* Task info */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            {STATUS_ICONS[task.task_status]} {task.task_status.replace('_', ' ')}
          </span>
          <span className={cn('flex items-center gap-1', PRIORITY_COLORS[task.task_priority])}>
            <AlertCircle className="h-3 w-3" />
            {task.task_priority}
          </span>
          {task.due_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
          {task.assigned_to && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {task.assigned_to}
            </span>
          )}
        </div>

        {/* Expand button for detailed view */}
        {variant === 'detailed' && showRequirements && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 justify-between"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className="text-sm">View Requirements</span>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Expanded requirements (detailed view only) */}
      {variant === 'detailed' && isExpanded && (
        <div className="border-t px-4 py-3 bg-gray-50">
          <h4 className="font-medium text-sm mb-2">Workflow Requirements</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✅</span>
              <span>Architecture notes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500">❌</span>
              <span>Mockups (required)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-500">⏳</span>
              <span>Implementation checklist (3/5)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500">❌</span>
              <span>Test checklist (0/2)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500">❌</span>
              <span>Rules creation</span>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown menu */}
      {showMenu && (
        <div className="absolute right-0 mt-1 w-48 bg-background border rounded-md shadow-lg z-10">
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-card"
            onClick={() => {
              onEdit?.();
              setShowMenu(false);
            }}
          >
            Edit Task
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-card"
            onClick={() => {
              onDelete?.();
              setShowMenu(false);
            }}
          >
            Delete Task
          </button>
        </div>
      )}
    </div>
  );
}
