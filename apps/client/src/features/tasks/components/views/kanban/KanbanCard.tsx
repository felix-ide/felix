import { Draggable } from '@hello-pangea/dnd';
import { 
  Calendar, 
  Clock, 
  Paperclip, 
  GitBranch, 
  AlertTriangle,
  User,
  MoreVertical,
  Link2,
  CircleDashed
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { TaskData, TaskDependency } from '@/types/api';
import { format } from 'date-fns';
import { WorkflowBadge } from '@client/features/tasks/components/WorkflowBadge';
import { ProgressIndicator } from '@client/features/tasks/components/ProgressIndicator';

interface KanbanCardProps {
  task: TaskData;
  index: number;
  dependencies?: TaskDependency[];
  onClick?: () => void;
}

const priorityColors = {
  low: 'bg-primary',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-destructive'
};

const statusColors = {
  todo: 'border-border',
  in_progress: 'border-blue-500',
  blocked: 'border-red-500', 
  done: 'border-green-500',
  cancelled: 'border-muted-foreground'
};

const typeIcons = {
  epic: '🎯',
  story: '📖',
  task: '✅',
  subtask: '📌',
  milestone: '🏁',
  bug: '🐛',
  spike: '🔍',
  chore: '🧹'
};

// Helper to get workflow from task
function getTaskWorkflow(task: TaskData): string {
  // Check metadata first
  if ((task as any).metadata?.workflow) {
    return (task as any).metadata.workflow;
  }
  // Infer from task type
  if (task.task_type === 'bug') return 'bugfix';
  if (task.task_type === 'spike') return 'research';
  if (task.task_type === 'chore') return 'simple';
  return 'feature_development';
}

// Mock workflow progress calculation
function calculateWorkflowProgress(task: TaskData): number {
  if (task.task_status === 'done') return 100;
  if (task.task_status === 'cancelled') return 0;
  
  // Check for linked artifacts
  const hasNotes = task.entity_links?.some(link => link.entity_type === 'note') || false;
  const hasRules = task.entity_links?.some(link => link.entity_type === 'rule') || false;
  const hasChecklist = task.description?.includes('- [ ]') || false;
  
  let progress = 20; // Base progress
  if (hasNotes) progress += 30;
  if (hasChecklist) progress += 30;
  if (hasRules) progress += 20;
  
  return Math.min(progress, 95); // Cap at 95% unless done
}

export function KanbanCard({ task, index, dependencies = [], onClick }: KanbanCardProps) {
  const blockedByCount = dependencies.filter(d => d.dependency_type === 'blocks' && d.dependent_task_id === task.id).length;
  const blockingCount = dependencies.filter(d => d.dependency_type === 'blocks' && d.dependency_task_id === task.id).length;
  const attachmentCount = task.entity_links?.filter(link => link.entity_type === 'file')?.length || 0;
  
  // Get workflow info
  const workflow = getTaskWorkflow(task);
  const workflowProgress = calculateWorkflowProgress(task);
  
  // Calculate progress for in-progress tasks
  const progress = task.task_status === 'in_progress' && task.estimated_effort && task.actual_effort
    ? Math.min((parseFloat(task.actual_effort) / parseFloat(task.estimated_effort)) * 100, 100)
    : 0;
    
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.task_status !== 'done';

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "bg-card text-card-foreground rounded-lg shadow-sm border-2 transition-all cursor-pointer",
            statusColors[task.task_status],
            snapshot.isDragging && "shadow-lg rotate-2 scale-105",
            "hover:shadow-md"
          )}
          onClick={onClick}
        >
          {/* Priority stripe */}
          <div className={cn("h-1 rounded-t-lg", priorityColors[task.task_priority])} />
          
          <div className="p-3 space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg" title={task.task_type}>
                    {typeIcons[task.task_type]}
                  </span>
                  <h4 className="font-medium text-sm truncate">{task.title}</h4>
                </div>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>
              <button className="text-muted-foreground hover:text-foreground p-1">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>

            {/* Workflow info */}
            <div className="flex items-center gap-2">
              <WorkflowBadge workflow={workflow} size="sm" showLabel={false} percent={workflowProgress} />
              <div className="flex-1">
                <ProgressIndicator 
                  percentage={workflowProgress} 
                  size="sm" 
                  showLabel={false} 
                  className="h-1.5"
                />
              </div>
            </div>

            {/* Progress bar for in-progress tasks */}
            {task.task_status === 'in_progress' && progress > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Meta information */}
            <div className="flex items-center justify-between text-xs">
              {/* Assignee */}
              <div className="flex items-center gap-1">
                {task.assigned_to ? (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="truncate max-w-[80px]">{task.assigned_to}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-muted-foreground/50">
                    <User className="h-3 w-3" />
                    <span>Unassigned</span>
                  </div>
                )}
              </div>

              {/* Priority badge */}
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium capitalize",
                task.task_priority === 'critical' && "bg-destructive/15 text-destructive ",
                task.task_priority === 'high' && "bg-warning/15 text-warning ",
                task.task_priority === 'medium' && "bg-warning/15 text-warning ",
                task.task_priority === 'low' && "bg-success/15 text-success "
              )}>
                {task.task_priority}
              </span>
            </div>

            {/* Due date and effort */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {task.due_date && (
                <div className={cn(
                  "flex items-center gap-1",
                  isOverdue && "text-destructive font-medium"
                )}>
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(task.due_date), 'MMM d')}</span>
                </div>
              )}
              
              {(task.estimated_effort || task.actual_effort) && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {task.actual_effort || '0'}/{task.estimated_effort || '?'}h
                  </span>
                </div>
              )}
            </div>

            {/* Tags */}
            {task.stable_tags && task.stable_tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.stable_tags.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[10px] border border-border"
                  >
                    #{tag}
                  </span>
                ))}
                {task.stable_tags.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{task.stable_tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Footer indicators */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border">
              {/* Dependencies */}
              {blockedByCount > 0 && (
                <div className="flex items-center gap-1 text-red-500" title="Blocked by">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{blockedByCount}</span>
                </div>
              )}
              
              {blockingCount > 0 && (
                <div className="flex items-center gap-1" title="Blocking">
                  <GitBranch className="h-3 w-3" />
                  <span>{blockingCount}</span>
                </div>
              )}

              {/* Attachments */}
              {attachmentCount > 0 && (
                <div className="flex items-center gap-1" title="Attachments">
                  <Paperclip className="h-3 w-3" />
                  <span>{attachmentCount}</span>
                </div>
              )}

              {/* Entity links */}
              {task.entity_links && task.entity_links.length > 0 && (
                <div className="flex items-center gap-1" title="Linked entities">
                  <Link2 className="h-3 w-3" />
                  <span>{task.entity_links.length}</span>
                </div>
              )}

              {/* Task type indicator for subtasks */}
              {task.task_type === 'subtask' && task.parent_id && (
                <div className="ml-auto flex items-center gap-1">
                  <CircleDashed className="h-3 w-3" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
