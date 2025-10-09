import { useEffect, useMemo, useState } from 'react';
import { Button } from '@client/shared/ui/Button';
import { Select } from '@client/shared/ui/Select';
import { felixService } from '@/services/felixService';
import { Trash2, AlertCircle, GripVertical, Sparkles, FileCode, Zap } from 'lucide-react';
import { cn } from '@/utils/cn';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { TaskStatusFlowRecord } from '@/shared/api/workflowsClient';

interface TaskType {
  id: string;
  name: string;
  workflowId: string | null;
  flowId: string | null;
  isNew?: boolean;
}

interface Workflow {
  name: string;
  display_name: string;
  color?: string;
  icon?: string;
}

const WORKFLOW_ICONS: Record<string, any> = {
  feature_development: FileCode,
  bug_fix: AlertCircle,
  bugfix: AlertCircle,
  performance: Zap
};

const WORKFLOW_COLORS: Record<string, string> = {
  feature_development: 'text-blue-500',
  bug_fix: 'text-red-500',
  bugfix: 'text-red-500',
  performance: 'text-yellow-500'
};

export function MappingEditor() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [statusFlows, setStatusFlows] = useState<TaskStatusFlowRecord[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const [wf, mapping, flowData] = await Promise.all([
          felixService.listWorkflows(),
          felixService.getWorkflowMapping(),
          felixService.getWorkflowStatusFlows()
        ]);
        setWorkflows(wf.items || []);
        setStatusFlows(flowData.flows || []);

        const workflowMap = mapping.workflowMap || {};
        const flowMap = mapping.flowMap || {};
        const typeNames = Array.from(new Set([...Object.keys(workflowMap), ...Object.keys(flowMap)]));
        const types: TaskType[] = typeNames.map((name) => ({
          id: `task-${name}`,
          name,
          workflowId: workflowMap[name] || null,
          flowId: flowMap[name] || null
        }));
        setTaskTypes(types);
      } catch (e: any) {
        setError(e.message || 'Failed to load mapping');
      }
    })();
  }, []);

  const flowOptions = useMemo(
    () =>
      statusFlows.map((flow) => ({
        value: flow.id,
        label: flow.display_label || flow.name
      })),
    [statusFlows]
  );

  const persistWorkflowMapping = async (types: TaskType[]) => {
    const mapping: Record<string, string> = {};
    types.forEach((t) => {
      if (t.workflowId) {
        mapping[t.name] = t.workflowId;
      }
    });
    await felixService.setWorkflowMappingBulk(mapping);
  };

  const removeTaskType = async (id: string) => {
    const task = taskTypes.find((t) => t.id === id);
    if (!task) return;

    const updatedTypes = taskTypes.filter((t) => t.id !== id);
    setTaskTypes(updatedTypes);

    try {
      await persistWorkflowMapping(updatedTypes);
      await felixService.setStatusFlowMapping(task.name, null);
    } catch (e: any) {
      setError(e.message || 'Failed to save mapping');
      setTaskTypes(taskTypes);
    }
  };

  const updateFlowSelection = async (taskId: string, nextFlowId: string | null) => {
    const idx = taskTypes.findIndex((t) => t.id === taskId);
    if (idx === -1) return;

    const snapshot = [...taskTypes];
    const target = snapshot[idx];
    snapshot[idx] = { ...target, flowId: nextFlowId };
    setTaskTypes(snapshot);

    try {
      await felixService.setStatusFlowMapping(target.name, nextFlowId);
    } catch (e: any) {
      setError(e.message || 'Failed to update flow mapping');
      setTaskTypes(taskTypes);
    }
  };

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    const { destination, draggableId } = result;

    const updatedTypes = [...taskTypes];
    const taskIndex = updatedTypes.findIndex((t) => t.id === draggableId);
    if (taskIndex === -1) return;

    updatedTypes[taskIndex] = {
      ...updatedTypes[taskIndex],
      workflowId: destination.droppableId === 'unassigned' ? null : destination.droppableId
    };
    setTaskTypes(updatedTypes);

    try {
      await persistWorkflowMapping(updatedTypes);
    } catch (e: any) {
      setError(e.message || 'Failed to save mapping');
      setTaskTypes(taskTypes);
    }
  };

  const getWorkflowIcon = (workflow: Workflow) => {
    const Icon = WORKFLOW_ICONS[workflow.name] || Sparkles;
    return Icon;
  };

  const getWorkflowColor = (workflow: Workflow) => WORKFLOW_COLORS[workflow.name] || 'text-purple-500';

  const renderFlowSelect = (task: TaskType) => (
    <Select
      value={task.flowId || ''}
      onChange={(event) => updateFlowSelection(task.id, event.target.value || null)}
      className="mt-2 w-full text-xs"
    >
      <option value="">Select flow</option>
      {flowOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 px-2 py-1 rounded">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <div className="border border-border rounded-lg bg-card">
            <div className="p-3 border-b border-border">
              <h4 className="font-medium text-sm">Unassigned</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {taskTypes.filter((t) => !t.workflowId).length} task types
              </p>
            </div>

            <Droppable droppableId="unassigned">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn('min-h-[150px] p-2 space-y-1.5', snapshot.isDraggingOver && 'bg-muted/20')}
                >
                  {taskTypes
                    .filter((t) => !t.workflowId)
                    .map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className={cn(
                              'group rounded-md border border-border bg-background px-2 py-1.5',
                              'hover:border-primary/50 transition-all duration-300',
                              task.isNew && 'animate-pulse bg-primary/10 border-primary/50',
                              dragSnapshot.isDragging && 'opacity-50'
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <div {...dragProvided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1">
                                <span className="block text-sm font-mono">{task.name}</span>
                                {renderFlowSelect(task)}
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => removeTaskType(task.id)}
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {workflows.map((workflow) => {
            const Icon = getWorkflowIcon(workflow);
            const colorClass = getWorkflowColor(workflow);
            const assigned = taskTypes.filter((t) => t.workflowId === workflow.name);

            return (
              <div key={workflow.name} className="border border-border rounded-lg bg-card">
                <div className="p-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', colorClass)} />
                    <h4 className="font-medium text-sm">{workflow.display_name || workflow.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {assigned.length} task type{assigned.length === 1 ? '' : 's'}
                  </p>
                </div>

                <Droppable droppableId={workflow.name}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'min-h-[150px] p-2 space-y-1.5',
                        snapshot.isDraggingOver && 'bg-primary/5 border border-primary/20 rounded-b-lg'
                      )}
                    >
                      {assigned.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={cn(
                                'group rounded-md border border-border bg-background px-2 py-1.5',
                                'hover:border-primary/50 transition-all duration-300',
                                dragSnapshot.isDragging && 'opacity-50'
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <div {...dragProvided.dragHandleProps}>
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                  <span className="block text-sm font-mono">{task.name}</span>
                                  {renderFlowSelect(task)}
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => removeTaskType(task.id)}
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

