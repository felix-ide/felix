import { X, Calendar, Clock, User, Tag, AlertCircle, CheckCircle, XCircle, Loader, FolderOpen, GitBranch, Hash, FileText, Link2, BarChart3, Play, ArrowUpCircle } from 'lucide-react';
import type { TaskData } from '@/types/api';
import { cn } from '@/utils/cn';
import { useTaskData } from './views/shared/TaskDataProvider';
import { MarkdownRenderer } from '@client/shared/components/MarkdownRenderer';
import { Button } from '@client/shared/ui/Button';

interface TaskDetailsModalProps {
  task: TaskData | null;
  isOpen: boolean;
  onClose: () => void;
  onViewFromTask: (taskId: string, taskTitle: string) => void;
  onViewFromParent: (parentType: 'epic' | 'story', parentId: string, parentTitle: string) => void;
  allTasks: TaskData[];
}

export function TaskDetailsModal({ 
  task, 
  isOpen, 
  onClose, 
  onViewFromTask, 
  onViewFromParent,
  allTasks
}: TaskDetailsModalProps) {
  const { getChildTasks } = useTaskData();
  
  if (!isOpen || !task) return null;

  // Parent task not directly used; derive hierarchy below
  
  // Get child tasks
  const childTasks = getChildTasks(task.id);
  
  // Find parent hierarchy
  const findParentHierarchy = (currentTask: TaskData) => {
    const hierarchy: TaskData[] = [];
    let current = currentTask;
    
    while (current.parent_id) {
      const parent = allTasks.find(t => t.id === current.parent_id);
      if (parent) {
        hierarchy.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }
    
    return hierarchy;
  };

  const parentHierarchy = findParentHierarchy(task);
  const parentEpic = parentHierarchy.find(t => t.task_type === 'epic') || 
                     (task.task_type === 'epic' ? task : null);
  const parentStory = parentHierarchy.find(t => t.task_type === 'story') ||
                      (task.task_type === 'story' ? task : null);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress': return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'blocked': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'todo': return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
      default: return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'epic': return '📋';
      case 'story': return '📝';
      case 'task': return '✓';
      case 'subtask': return '◦';
      case 'milestone': return '🎯';
      case 'bug': return '🐛';
      case 'spike': return '🔬';
      case 'chore': return '🔧';
      default: return '•';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-card text-gray-700  ';
      case 'in_progress': return 'bg-primary/10 text-primary /20/30 ';
      case 'blocked': return 'bg-destructive/10 text-red-700 /20/30 ';
      case 'done': return 'bg-green-100 text-green-700 /30 ';
      default: return 'bg-card text-gray-700  ';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-destructive/10 text-red-700 /20/30 ';
      case 'high': return 'bg-orange-100 text-orange-700 /30 ';
      case 'medium': return 'bg-yellow-100 text-yellow-700 /30 ';
      case 'low': return 'bg-card text-gray-700 /30 ';
      default: return 'bg-card text-gray-700 /30 ';
    }
  };

  // Calculate progress
  let progress = 0;
  if (task.task_status === 'done') {
    progress = 100;
  } else if (task.task_status === 'in_progress' && task.actual_effort && task.estimated_effort) {
    const actual = parseFloat(task.actual_effort.replace(/[^\d.]/g, ''));
    const estimated = parseFloat(task.estimated_effort.replace(/[^\d.]/g, ''));
    progress = Math.min(100, Math.round((actual / estimated) * 100));
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 overflow-hidden">
      <div className="absolute inset-4 md:inset-8 lg:inset-12 bg-background rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-3xl">{getTypeIcon(task.task_type)}</span>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{task.title}</h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  <code className="font-mono">{task.id}</code>
                </span>
                <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", getStatusColor(task.task_status))}>
                  {getStatusIcon(task.task_status)}
                  <span className="ml-1">{task.task_status.replace('_', ' ').toUpperCase()}</span>
                </span>
                <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", getPriorityColor(task.task_priority))}>
                  {getPriorityIcon(task.task_priority)}
                  <span className="ml-1">{task.task_priority.toUpperCase()}</span>
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {/* Navigation Options */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                View Timeline & Gantt From Different Perspectives
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewFromTask(task.id, task.title)}
                  className="justify-start border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                >
                  <Play className="h-4 w-4 mr-2" />
                  View from this {task.task_type}
                </Button>
                
                {parentEpic && parentEpic.id !== task.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewFromParent('epic', parentEpic.id, parentEpic.title)}
                    className="justify-start border-purple-300 hover:bg-purple-50 :bg-purple-900/20"
                  >
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                    View from Epic: {parentEpic.title}
                  </Button>
                )}
                
                {parentStory && parentStory.id !== task.id && parentStory.id !== parentEpic?.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewFromParent('story', parentStory.id, parentStory.title)}
                    className="justify-start border-emerald-300 hover:bg-emerald-50 :bg-emerald-900/20"
                  >
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                    View from Story: {parentStory.title}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Description
                  </h3>
                  {task.description ? (
                    <div className="prose prose-sm  max-w-none">
                      <MarkdownRenderer content={task.description} />
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No description provided</p>
                  )}
                </div>

                {/* Progress & Effort */}
                {(task.estimated_effort || task.actual_effort || progress > 0) && (
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Progress & Effort
                    </h3>
                    
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Overall Progress</span>
                        <span className="font-semibold text-lg">{progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Effort Details */}
                    {(task.estimated_effort || task.actual_effort) && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-1">Estimated</div>
                          <div className="font-semibold">{task.estimated_effort || 'Not set'}</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-1">Actual</div>
                          <div className="font-semibold">{task.actual_effort || '0h'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Subtasks */}
                {childTasks.length > 0 && (
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <GitBranch className="w-5 h-5" />
                      Subtasks
                      <span className="text-sm font-normal text-muted-foreground">({childTasks.length})</span>
                    </h3>
                    <div className="space-y-2">
                      {childTasks.map(child => (
                        <div 
                          key={child.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors border border-border/50"
                        >
                          <span className="flex-shrink-0">{getStatusIcon(child.task_status)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{child.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {child.task_priority} priority • {child.assigned_to || 'Unassigned'}
                            </div>
                          </div>
                          {child.due_date && (
                            <div className="text-xs text-muted-foreground">
                              {formatDate(child.due_date)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entity Links */}
                {task.entity_links && task.entity_links.length > 0 && (
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Link2 className="w-5 h-5" />
                      Linked Entities
                    </h3>
                    <div className="space-y-2">
                      {task.entity_links.map((link, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors border border-border/50"
                        >
                          <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {link.entity_name || link.entity_id}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {link.entity_type}
                            </div>
                          </div>
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full flex-shrink-0",
                            link.link_strength === 'primary' && "bg-primary/20 text-primary",
                            link.link_strength === 'secondary' && "bg-secondary/20 text-secondary-foreground",
                            link.link_strength === 'reference' && "bg-muted text-muted-foreground"
                          )}>
                            {link.link_strength}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Metadata */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="text-lg font-semibold mb-4">Details</h3>
                  <div className="space-y-4">
                    {task.assigned_to && (
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground">Assignee</div>
                          <div className="font-medium">{task.assigned_to}</div>
                        </div>
                      </div>
                    )}
                    
                    {task.due_date && (
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground">Due Date</div>
                          <div className="font-medium">{formatDate(task.due_date)}</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground">Created</div>
                        <div className="font-medium">{formatDate(task.created_at)}</div>
                      </div>
                    </div>
                    
                    {task.updated_at && (
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground">Updated</div>
                          <div className="font-medium">{formatDate(task.updated_at)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {task.stable_tags && task.stable_tags.length > 0 && (
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Tag className="w-5 h-5" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {task.stable_tags.map((tag, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hierarchy */}
                {parentHierarchy.length > 0 && (
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <GitBranch className="w-5 h-5" />
                      Task Hierarchy
                    </h3>
                    <div className="space-y-2">
                      {parentHierarchy.map((parent, index) => (
                        <div key={parent.id} className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground font-mono">
                            {'  '.repeat(index)}└─
                          </span>
                          <span>{getTypeIcon(parent.task_type)}</span>
                          <span className="truncate">{parent.title}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <span className="text-muted-foreground font-mono">
                          {'  '.repeat(parentHierarchy.length)}└─
                        </span>
                        <span>{getTypeIcon(task.task_type)}</span>
                        <span className="truncate">{task.title}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
