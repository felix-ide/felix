import { Button } from '@client/shared/ui/Button';
import { cn } from '@/utils/cn';
import { WorkflowBadge } from '../../WorkflowBadge';
import type { TaskData } from '@/types/api';
import type { LucideIcon } from 'lucide-react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Edit,
  GripVertical,
  Hash,
  Lock,
  MoreVertical,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo } from 'react';

interface TaskCardHeaderProps {
  task: TaskData;
  isChecked: boolean;
  isEditing: boolean;
  isExpanded: boolean;
  onToggleCheck?: () => void;
  dragHandleProps?: any;
  validation: any;
  workflow: string;
  taskTypeStyle: React.CSSProperties;
  taskTypeEmoji?: string;
  TaskTypeIcon: LucideIcon;
  getStatusStyles: (status: string) => React.CSSProperties;
  getPriorityStyles: (priority: string) => React.CSSProperties;
  getSpecStateStyles: (state: string) => React.CSSProperties;
  editTitle: string;
  onEditTitleChange: (value: string) => void;
  onTitleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  editStatus: TaskData['task_status'];
  onEditStatusChange: (value: TaskData['task_status']) => void;
  editPriority: TaskData['task_priority'];
  onEditPriorityChange: (value: TaskData['task_priority']) => void;
  editType: TaskData['task_type'] | string;
  typeOptions: Array<{ value: string; label: string }>;
  onEditTypeChange: (value: string) => void;
  editWorkflow: string;
  onEditWorkflowChange: (value: string) => void;
  mappedWorkflow?: string;
  enforceMapping: boolean;
  onResetWorkflowToDefault: () => void;
  copyButtonStyle: React.CSSProperties;
  onCopyId: (event: React.MouseEvent<HTMLButtonElement>) => void;
  copiedId: boolean;
  shortId: string;
  onEditClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onSaveEdit: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onCancelEdit: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onToggleExpanded: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onAddSubtaskClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
  showDropdown: boolean;
  onDropdownToggle: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onExportTask: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDeleteClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function TaskCardHeader({
  task,
  isChecked,
  isEditing,
  isExpanded,
  onToggleCheck,
  dragHandleProps,
  validation,
  workflow,
  taskTypeStyle,
  taskTypeEmoji,
  TaskTypeIcon,
  getStatusStyles,
  getPriorityStyles,
  getSpecStateStyles,
  editTitle,
  onEditTitleChange,
  onTitleKeyDown,
  editStatus,
  onEditStatusChange,
  editPriority,
  onEditPriorityChange,
  editType,
  typeOptions,
  onEditTypeChange,
  editWorkflow,
  onEditWorkflowChange,
  mappedWorkflow,
  enforceMapping,
  onResetWorkflowToDefault,
  copyButtonStyle,
  onCopyId,
  copiedId,
  shortId,
  onEditClick,
  onSaveEdit,
  onCancelEdit,
  onToggleExpanded,
  onAddSubtaskClick,
  dropdownRef,
  showDropdown,
  onDropdownToggle,
  onExportTask,
  onDeleteClick,
}: TaskCardHeaderProps) {
  const totalRequirements = useMemo(() => (
    validation?.requirements?.filter((r: any) => r.required)?.length || 0
  ), [validation]);

  const metRequirements = useMemo(() => (
    totalRequirements - (validation?.missingRequirements?.length || 0)
  ), [totalRequirements, validation]);

  return (
    <div className={cn('flex items-start gap-3', (isExpanded || isEditing) && 'mb-3')}>
      {onToggleCheck && (
        <div className="mt-1">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(event) => {
              event.stopPropagation();
              onToggleCheck();
            }}
            className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
          />
        </div>
      )}

      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="mt-1 p-1 hover:bg-accent rounded cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-medium"
            style={taskTypeStyle}
          >
            {taskTypeEmoji ? (
              <span className="mr-1">{taskTypeEmoji}</span>
            ) : (
              <TaskTypeIcon className="h-3 w-3 mr-1" />
            )}
            {task.task_type}
          </div>

          {task.workflow && task.workflow !== 'simple' && (
            <WorkflowBadge
              workflow={workflow}
              size="sm"
              showLabel
              percent={validation?.completionPercentage}
              completed={totalRequirements > 0 ? metRequirements : undefined}
              total={totalRequirements > 0 ? totalRequirements : undefined}
              status={validation?.status}
            />
          )}

          {task.spec_state && (
            <div
              className="inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-medium"
              style={getSpecStateStyles(task.spec_state)}
            >
              {task.spec_state.replace(/_/g, ' ')}
            </div>
          )}

          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(event) => onEditTitleChange(event.target.value)}
              onKeyDown={onTitleKeyDown}
              onClick={(event) => event.stopPropagation()}
              className="font-medium text-sm flex-1 bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          ) : (
            <>
              <h3
                className={cn(
                  'font-medium text-sm flex-1 relative',
                  task.task_status === 'done' && 'text-muted-foreground line-through',
                  task.task_status === 'cancelled' && 'text-muted-foreground opacity-60 line-through',
                )}
                style={{ textDecorationColor: 'hsl(var(--border))' }}
              >
                <span className="relative">
                  {task.title}
                  {(task.task_status === 'done' || task.task_status === 'cancelled') && (
                    <span className="absolute inset-0 flex items-center">
                      <span className="w-full h-0.5" style={{ backgroundColor: 'hsl(var(--border))' }} />
                    </span>
                  )}
                </span>
              </h3>

              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border"
                style={getStatusStyles(task.task_status)}
              >
                {task.task_status.replace('_', ' ')}
              </span>

              {task.task_priority && (
                <span
                  className="text-xs font-medium"
                  style={getPriorityStyles(task.task_priority)}
                >
                  {task.task_priority}
                </span>
              )}

              <button
                onClick={onCopyId}
                className="group flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors"
                style={copyButtonStyle}
                title={`Copy ID: ${task.id}`}
              >
                <Hash className="h-3 w-3" />
                <span className="text-xs font-mono">{shortId}</span>
                <Copy
                  className={cn(
                    'h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity',
                    copiedId ? 'text-success' : 'opacity-60',
                  )}
                />
                {copiedId && <span className="text-xs text-success ml-1">Copied!</span>}
              </button>
            </>
          )}
        </div>

        {isEditing && (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={editStatus}
              onChange={(event) => onEditStatusChange(event.target.value as TaskData['task_status'])}
              onClick={(event) => event.stopPropagation()}
              className="text-xs bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={editPriority}
              onChange={(event) => onEditPriorityChange(event.target.value as TaskData['task_priority'])}
              onClick={(event) => event.stopPropagation()}
              className="text-xs bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            <select
              value={editType}
              onChange={(event) => onEditTypeChange(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              className="text-xs bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <select
                value={editWorkflow}
                onChange={(event) => onEditWorkflowChange(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                className="text-xs bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
                disabled={enforceMapping}
              >
                <option value="simple">Simple</option>
                <option value="feature_development">Feature Development</option>
                <option value="bugfix">Bug Fix</option>
                <option value="research">Research</option>
              </select>
              {enforceMapping && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
            </div>

            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              <span>
                Default for {editType}: {mappedWorkflow || 'simple'}
              </span>
              {!enforceMapping && mappedWorkflow && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      onResetWorkflowToDefault();
                    }}
                  >
                    Use default
                  </Button>
                  <button
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-border rounded hover:bg-accent"
                    onClick={(event) => {
                      event.stopPropagation();
                      onResetWorkflowToDefault();
                    }}
                    title="Reset to mapped default"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                </>
              )}
              {enforceMapping && <span className="text-amber-600">Enforced by mapping</span>}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {isEditing ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSaveEdit}
              className="h-8 w-8 p-0 text-success hover:text-success/80"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelEdit}
              className="h-8 w-8 p-0 text-destructive hover:opacity-80"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEditClick}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpanded}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onAddSubtaskClick}
          className="h-8 w-8 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDropdownToggle}
            className="h-8 w-8 p-0"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-md">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onExportTask(event);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Download className="h-4 w-4" />
                Export with children
              </button>
              <div className="my-1 h-px bg-border" />
              {onDeleteClick && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteClick(event);
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
