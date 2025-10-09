import { useState, useEffect, useMemo } from 'react';
import { felixService } from '@/services/felixService';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@client/shared/ui/Card';
import { Save, X, Link, Tag, Plus, Lock as LockIcon } from 'lucide-react';
import { useAppStore } from '@client/features/app-shell/state/appStore';
import { cn } from '@/utils/cn';
import { EntityLinksSection, EntityLink } from '@client/shared/components/EntityLinksSection';
import { TaskDependencies } from './TaskDependencies';
import { WorkflowStatus } from './WorkflowStatus';
import { RequirementsPrompt } from './RequirementsPrompt';
import { useTaskValidation } from '@client/features/tasks/hooks/useTaskValidation';
import type { TaskData } from '@/types/api';

interface TaskEditorProps {
  task?: TaskData;
  parentId?: string;
  isOpen: boolean;
  onSave: (task: Omit<TaskData, 'id' | 'created_at' | 'updated_at' | 'sort_order' | 'depth_level'>) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

type WorkflowOption = { value: string; label: string };

export function TaskEditor({
  task,
  parentId,
  isOpen,
  onSave,
  onCancel,
  className,
}: TaskEditorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<'epic' | 'story' | 'task' | 'subtask' | 'milestone' | 'bug' | 'spike' | 'chore'>('task');
  const [taskStatus, setTaskStatus] = useState<'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled'>('todo');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [estimatedEffort, setEstimatedEffort] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [entityLinks, setEntityLinks] = useState<EntityLink[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [workflow, setWorkflow] = useState('simple');
  const showWorkflowOverride = false;
  const [showWorkflowWarning, setShowWorkflowWarning] = useState(false);
  const [typeMapping, setTypeMapping] = useState<Record<string,string>>({});
  const { setCurrentSection } = useAppStore();
  const [workflowOptions, setWorkflowOptions] = useState<WorkflowOption[]>([
    { value: 'simple', label: 'Simple Task' },
    { value: 'feature_development', label: 'Feature Development' },
    { value: 'bugfix', label: 'Bug Fix' },
    { value: 'research', label: 'Research' }
  ]);
  const [enforceMapping, setEnforceMapping] = useState<boolean>(false);
  const [typesMeta, setTypesMeta] = useState<Record<string, {emoji?: string;color?: string; default_priority?: 'low'|'medium'|'high'|'critical'; default_tags?: string[]}>>({});
  const getTypeMeta = (t: string) => (typesMeta as any)[t] as (undefined | {emoji?: string;color?: string; default_priority?: 'low'|'medium'|'high'|'critical'; default_tags?: string[]; default_description_template?: string});

  // Create a task object for validation (memoized to prevent infinite loops)
  const taskForValidation: TaskData | null = useMemo(() => isOpen ? {
    id: task?.id || '',
    title,
    description,
    task_type: taskType,
    task_status: taskStatus,
    task_priority: taskPriority,
    entity_links: entityLinks,
    stable_tags: tags,
    created_at: task?.created_at || new Date().toISOString(),
    updated_at: task?.updated_at || new Date().toISOString(),
    sort_order: 0,
    depth_level: 0
  } : null, [isOpen, task?.id, task?.created_at, task?.updated_at, title, description, taskType, taskStatus, taskPriority, entityLinks, tags]);

  const validation = useTaskValidation(taskForValidation, workflow);

  // Reset form when task changes or editor opens/closes
  useEffect(() => {
    if (isOpen) {
      // Load mapping for default workflow resolution
      felixService.getWorkflowMapping().then(({ workflowMap }) => setTypeMapping(workflowMap || {})).catch((error) => {
        console.error('[Felix] Failed to load workflow mapping', error);
      });
      felixService.listWorkflows().then((resp) => {
        const opts = (resp.items || []).map((w:any) => ({ value: w.name, label: w.display_name || w.name }));
        if (opts.length) setWorkflowOptions(opts);
      }).catch((error) => {
        console.error('[Felix] Failed to list workflows', error);
      });
      felixService.getWorkflowConfig().then(({config}) => {
        const v = (config as any).enforce_type_mapping;
        setEnforceMapping(v === true || v === 'true');
        try {
          const m = (config as any).types_metadata;
          const parsed = typeof m === 'string' ? JSON.parse(m) : (m || {});
          setTypesMeta(parsed);
        } catch (error) {
          console.error('[Felix] Failed to parse workflow type metadata', error);
        }
      }).catch((error) => {
        console.error('[Felix] Failed to load workflow config', error);
      });
      if (task) {
        // Editing existing task
        setTitle(task.title);
        setDescription(task.description || '');
        setTaskType(task.task_type);
        setTaskStatus(task.task_status);
        setTaskPriority(task.task_priority);
        setEstimatedEffort(task.estimated_effort || '');
        setDueDate(task.due_date || '');
        setAssignedTo(task.assigned_to || '');
        setTags(task.stable_tags || []);
        
        // Set entity links from existing task
        setEntityLinks(task.entity_links || []);
        
        // Detect workflow from task type or metadata
        const detectedWorkflow = detectWorkflowFromTask(task, typeMapping);
        setWorkflow(detectedWorkflow);
      } else {
        // Creating new task
        setTitle('');
        setDescription('');
        setTaskType('task');
        setTaskStatus('todo');
        setTaskPriority('medium');
        setEstimatedEffort('');
        setDueDate('');
        setAssignedTo('');
        setEntityLinks([]);
        setTags([]);
        const mapped = typeMapping['task'] || 'simple';
        setWorkflow(mapped);
      }
      setIsSaving(false);
      setShowWorkflowWarning(false);
    }
  }, [task, parentId, isOpen]);

  // Helper to detect workflow from task
  function detectWorkflowFromTask(task: TaskData, map: Record<string,string>): string {
    return map[task.task_type] || (task.task_type === 'bug' ? 'bugfix' : task.task_type === 'spike' ? 'research' : 'simple');
  }

  // When task type changes, auto-apply mapped workflow (user can still override)
  useEffect(() => {
    if (!isOpen) return;
    const mapped = typeMapping[taskType];
    if (mapped) setWorkflow(mapped);
    // Apply defaults when type changes: only if neutral values
    const meta = getTypeMeta(taskType);
    if (meta?.default_priority && taskPriority === 'medium') {
      setTaskPriority(meta.default_priority);
    }
    if (meta?.default_tags && (!tags || tags.length === 0)) {
      setTags(meta.default_tags);
    }
    if (meta?.default_description_template) {
      const trimmed = (description || '').trim();
      if (!trimmed) {
        setDescription(meta.default_description_template);
      }
    }
  }, [taskType, typeMapping, isOpen]);

  const handleSave = async (override: boolean = false) => {
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        parent_id: parentId,
        task_type: taskType,
        task_status: taskStatus,
        task_priority: taskPriority,
        estimated_effort: estimatedEffort.trim() || undefined,
        actual_effort: undefined,
        due_date: dueDate || undefined,
        assigned_to: assignedTo.trim() || undefined,
        entity_links: entityLinks.length > 0 ? entityLinks : undefined,
        stable_tags: tags.length > 0 ? tags : undefined,
        completed_at: undefined,
        // Add workflow metadata
        metadata: {
          workflow,
          workflow_override: override
        }
      };

      console.log('🔍 TaskEditor: Saving task with entity_links:', entityLinks);
      console.log('🔍 TaskEditor: Full taskData:', taskData);

      await onSave(taskData as any);
      
      // Show workflow warning after successful save if validation failed
      if (!validation.isValid) {
        setShowWorkflowWarning(true);
        // Auto-hide warning after 10 seconds
        setTimeout(() => setShowWorkflowWarning(false), 10000);
      }
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleCreateRequirement = (type: string) => {
    // This would open a modal or navigate to create the requirement
    console.log('Create requirement:', type);
    // For now, just add a placeholder to the description
    if (type === 'checklist' || type === 'test') {
      const placeholder = type === 'checklist' 
        ? '\n\n### Implementation Checklist\n- [ ] Item 1\n- [ ] Item 2\n- [ ] Item 3'
        : '\n\n### Test Verification\n- [ ] Test case 1\n- [ ] Test case 2';
      setDescription(description + placeholder);
    }
  };

  if (!isOpen && !showWorkflowWarning) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className={cn('w-full max-w-2xl max-h-[90vh] flex flex-col', className)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{task ? 'Edit Task' : 'Create Task'}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 space-y-4 overflow-auto">
          {/* Workflow Status */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium">
                Workflow Type
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={workflow}
                  onChange={(e) => setWorkflow(e.target.value)}
                  className="px-2 py-1 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  disabled={enforceMapping}
                >
                  {workflowOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {enforceMapping && <LockIcon className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div>
                Default for <span className="font-medium">{taskType}</span> → <span className="font-medium">{typeMapping[taskType] || 'simple'}</span>
                {typeMapping[taskType] && workflow !== typeMapping[taskType] && !enforceMapping && (
                  <span className="ml-2 text-amber-600">(overridden)</span>
                )}
                {!typeMapping[taskType] || workflow === typeMapping[taskType] ? (
                  <span className="ml-2 text-muted-foreground">Auto-selected from mapping</span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {!enforceMapping && (
                  <Button size="sm" variant="secondary" onClick={() => setWorkflow(typeMapping[taskType] || 'simple')}>Use default</Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    try {
                      localStorage.setItem('workflows-tab', 'mapping');
                    } catch (error) {
                      console.error('[Felix] Failed to store workflows tab selection', error);
                    }
                    setCurrentSection('workflows');
                  }}
                >
                  Edit mapping…
                </Button>
              </div>
            </div>

            <WorkflowStatus
              workflow={workflow}
              requirements={validation.requirements}
              completionPercentage={validation.completionPercentage}
              validationStatus={validation.status}
            />
          </div>

          {/* Missing Requirements Prompt */}
          {validation.missingRequirements.length > 0 && (
            <RequirementsPrompt
              missingRequirements={validation.missingRequirements.map(req => ({
                type: req.type,
                name: req.name,
                description: req.helpText || '',
                action: () => handleCreateRequirement(req.type)
              }))}
              canOverride={showWorkflowOverride}
              onOverride={() => handleSave(true)}
            />
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Title *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              onKeyDown={handleKeyDown}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task... (supports markdown)"
              className="w-full h-32 p-3 border border-border rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Type and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Type
              </label>
              {(() => {
                const builtin = [
                  { value: 'epic', label: '🎯 Epic - Level 1: Major initiative' },
                  { value: 'story', label: '📖 Story - Level 2: User story/feature' },
                  { value: 'task', label: '☑️ Task - Level 3: Individual work item' },
                  { value: 'subtask', label: '📝 Subtask - Level 4: Sub-component' },
                  { value: 'milestone', label: '🚩 Milestone - Key deliverable' },
                  { value: 'bug', label: '🐛 Bug - Bug fix' },
                  { value: 'spike', label: '🔍 Spike - Research/investigation' },
                  { value: 'chore', label: '🔧 Chore - Maintenance/cleanup' }
                ];
                const customKeys = Object.keys(typeMapping || {}).filter(k => !builtin.find(b => b.value === k));
                const all = [...builtin, ...customKeys.map(k => ({ value: k, label: k }))];
                return (
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as any)}
                    className="w-full px-2 py-1.5 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    {all.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                );
              })()}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Status
              </label>
              <select
                value={taskStatus}
                onChange={(e) => setTaskStatus(e.target.value as any)}
                className="w-full px-2 py-1.5 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Priority and Effort */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Priority
              </label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as any)}
                className="w-full px-2 py-1.5 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Estimated Effort
              </label>
              <Input
                value={estimatedEffort}
                onChange={(e) => setEstimatedEffort(e.target.value)}
                placeholder="e.g., 2h, 3d, 1w"
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {/* Due Date and Assigned To */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Due Date
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Assigned To
              </label>
              <Input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Person or team"
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Tags
            </label>
            
            {/* Existing Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground text-sm rounded-md"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add Tag */}
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  } else {
                    handleKeyDown(e);
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Entity Linking */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Link className="h-4 w-4 inline mr-1" />
              Entity Links (optional)
            </label>
            <EntityLinksSection
              entityLinks={entityLinks}
              onEntityLinksUpdate={setEntityLinks}
              allowedEntityTypes={['component', 'note', 'rule', 'task']}
              compact={true}
            />
          </div>

          {/* Task Dependencies - only show for existing tasks */}
          {task && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Dependencies
              </label>
              <TaskDependencies taskId={task.id} />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Press Ctrl+Enter to save
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSave()}
              disabled={!title.trim() || isSaving}
              variant={validation.isValid ? 'default' : 'outline'}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : task ? 'Update' : 'Create'}
            </Button>
          </div>
        </CardFooter>
      </Card>
        </div>
      )}
      
      {/* Workflow Warning Banner */}
      {showWorkflowWarning && !isOpen && validation.missingRequirements.length > 0 && (
        <div className="fixed bottom-4 right-4 max-w-md bg-orange-500 text-primary-foreground p-4 rounded-lg shadow-lg z-50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">⚠️ WORKFLOW WARNING</h3>
              <p className="text-sm mb-2">Task violates user guidelines for {workflow} workflow.</p>
              <p className="text-sm font-medium">Missing required components:</p>
              <ul className="text-sm mt-1 space-y-1">
                {validation.missingRequirements.map((req, idx) => (
                  <li key={idx}>• {req.helpText || req.name}</li>
                ))}
              </ul>
              <p className="text-sm font-semibold mt-2">Add these immediately to comply with user expectations.</p>
            </div>
            <button
              onClick={() => setShowWorkflowWarning(false)}
              className="flex-shrink-0 ml-2 text-primary-foreground/80 hover:text-primary-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
