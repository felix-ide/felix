import { useEffect, useState } from 'react';
import { Button } from '@client/shared/ui/Button';
import { felixService } from '@/services/felixService';
import { Trash2, AlertCircle, GripVertical, Sparkles, FileCode, Zap } from 'lucide-react';
import { cn } from '@/utils/cn';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface TaskType {
  id: string;
  name: string;
  workflowId: string | null;
  isNew?: boolean;
}

interface Workflow {
  name: string;
  display_name: string;
  color?: string;
  icon?: string;
}

export function MappingEditor() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const [wf, m] = await Promise.all([
          felixService.listWorkflows(),
          felixService.getWorkflowMapping()
        ]);
        setWorkflows(wf.items || []);

        // Convert mapping to task types
        const types: TaskType[] = Object.entries(m || {}).map(([name, workflowId]) => ({
          id: `task-${Date.now()}-${Math.random()}`,
          name,
          workflowId: workflowId as string
        }));
        setTaskTypes(types);
      } catch (e: any) {
        setError(e.message || 'Failed to load mapping');
      }
    })();
  }, []);


  const removeTaskType = async (id: string) => {
    const task = taskTypes.find(t => t.id === id);
    if (!task) return;

    const updatedTypes = taskTypes.filter(t => t.id !== id);
    setTaskTypes(updatedTypes);

    // Auto-save after removal
    try {
      const mapping: Record<string, string> = {};
      updatedTypes.forEach(t => {
        if (t.workflowId) {
          mapping[t.name] = t.workflowId;
        }
      });
      await felixService.setWorkflowMappingBulk(mapping);
    } catch (e: any) {
      setError(e.message || 'Failed to save mapping');
      // Revert on error
      setTaskTypes(taskTypes);
    }
  };

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { destination, draggableId } = result;

    // Update task type workflow assignment
    const updatedTypes = [...taskTypes];
    const taskIndex = updatedTypes.findIndex(t => t.id === draggableId);

    if (taskIndex !== -1) {
      updatedTypes[taskIndex].workflowId = destination.droppableId === 'unassigned'
        ? null
        : destination.droppableId;
      setTaskTypes(updatedTypes);

      // Auto-save the change
      try {
        const mapping: Record<string, string> = {};
        updatedTypes.forEach(t => {
          if (t.workflowId) {
            mapping[t.name] = t.workflowId;
          }
        });
        await felixService.setWorkflowMappingBulk(mapping);
      } catch (e: any) {
        setError(e.message || 'Failed to save mapping');
        // Revert on error
        setTaskTypes(taskTypes);
      }
    }
  };

const getWorkflowIcon = (workflow: Workflow) => {
    const icons: Record<string, any> = {
      'feature_development': FileCode,
      'bug_fix': AlertCircle,
      'performance': Zap
    };
    const Icon = icons[workflow.name] || Sparkles;
    return Icon;
  };

  const getWorkflowColor = (workflow: Workflow) => {
    const colors: Record<string, string> = {
      'feature_development': 'text-blue-500',
      'bug_fix': 'text-red-500',
      'performance': 'text-yellow-500'
    };
    return colors[workflow.name] || 'text-purple-500';
  };

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
          {/* Unassigned Tasks */}
          <div className="border border-border rounded-lg bg-card">
            <div className="p-3 border-b border-border">
              <h4 className="font-medium text-sm">Unassigned</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {taskTypes.filter(t => !t.workflowId).length} task types
              </p>
            </div>

            <Droppable droppableId="unassigned">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "min-h-[150px] p-2 space-y-1.5",
                    snapshot.isDraggingOver && "bg-muted/20"
                  )}
                >
                  {taskTypes
                    .filter(t => !t.workflowId)
                    .map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "group flex items-center gap-2 px-2 py-1.5 bg-background rounded-md border border-border",
                              "hover:border-primary/50 transition-all duration-300",
                              task.isNew && "animate-pulse bg-primary/10 border-primary/50",
                              snapshot.isDragging && "opacity-50"
                            )}
                          >
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="flex-1 text-sm font-mono">{task.name}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeTaskType(task.id)}
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* Workflow Columns */}
          {workflows.map(workflow => {
            const Icon = getWorkflowIcon(workflow);
            const colorClass = getWorkflowColor(workflow);
            const assignedTasks = taskTypes.filter(t => t.workflowId === workflow.name);

            return (
              <div key={workflow.name} className="border border-border rounded-lg bg-card">
                <div className="p-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", colorClass)} />
                    <h4 className="font-medium text-sm">{workflow.display_name || workflow.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {assignedTasks.length} task types
                  </p>
                </div>

                <Droppable droppableId={workflow.name}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "min-h-[150px] p-2 space-y-1.5",
                        snapshot.isDraggingOver && "bg-primary/5 border-primary/20"
                      )}
                    >
                      {assignedTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1.5 bg-background rounded-md border",
                                "hover:border-primary/50 transition-all duration-300",
                                "border-l-2",
                                task.isNew && "animate-pulse bg-primary/10",
                                colorClass.replace('text-', 'border-l-'),
                                snapshot.isDragging && "opacity-50"
                              )}
                            >
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="flex-1 text-sm font-mono">{task.name}</span>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {assignedTasks.length === 0 && (
                        <div className="text-center py-6 text-muted-foreground text-xs">
                          Drop task types here
                        </div>
                      )}
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
