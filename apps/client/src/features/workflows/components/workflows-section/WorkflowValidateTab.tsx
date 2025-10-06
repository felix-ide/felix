import { AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@client/shared/ui/Card';
import { Select } from '@client/shared/ui/Select';
import { Button } from '@client/shared/ui/Button';
import { cn } from '@/utils/cn';
import type { WorkflowDefinition } from '@client/features/workflows/components/WorkflowForm';
import type { WorkflowListItem } from './hooks/useWorkflowsSectionState';

interface WorkflowValidateTabProps {
  items: WorkflowListItem[];
  form: WorkflowDefinition;
  onFormSelect: (workflow: WorkflowDefinition) => void;
  getWorkflowIcon: (name: string) => JSX.Element;
  validation: any;
  clearValidation: () => void;
  selectedTaskId: string;
  onTaskChange: (value: string) => void;
  tasks: any[];
  runValidation: () => void;
}

export function WorkflowValidateTab({
  items,
  form,
  onFormSelect,
  getWorkflowIcon,
  validation,
  clearValidation,
  selectedTaskId,
  onTaskChange,
  tasks,
  runValidation,
}: WorkflowValidateTabProps) {
  return (
    <>
      <div className="w-80 border-r border-border bg-muted/30 flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-medium text-sm mb-2">Select Workflow</h3>
          <p className="text-xs text-muted-foreground">Choose a workflow to validate tasks against</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {items.map((workflow) => (
              <button
                key={workflow.name}
                onClick={() => {
                  onFormSelect({
                    ...workflow,
                    name: workflow.name || '',
                    display_name: workflow.display_name || '',
                    description: workflow.description || '',
                    required_sections: (workflow as any).required_sections || [],
                    conditional_requirements: (workflow as any).conditional_requirements || [],
                    validation_rules: (workflow as any).validation_rules || [],
                  } as WorkflowDefinition);
                  clearValidation();
                }}
                className={cn(
                  'w-full p-3 rounded-lg text-left transition-all',
                  'hover:bg-background hover:shadow-sm',
                  'group flex items-start gap-3',
                  form?.name === workflow.name && 'bg-background shadow-sm ring-1 ring-primary/50'
                )}
              >
                <div className="mt-0.5">{getWorkflowIcon(workflow.name)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{workflow.display_name || workflow.name}</div>
                  {workflow.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{workflow.description}</div>
                  )}
                </div>
                {form?.name === workflow.name && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {form?.name ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Validate Against: {form.display_name || form.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select a task to check if it meets this workflow's requirements
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium">
                    {getWorkflowIcon(form.name)}
                    <span>{form.display_name || form.name}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select label="Select Task to Validate" value={selectedTaskId} onChange={(event) => onTaskChange(event.target.value)}>
                  <option value="">Choose a task...</option>
                  {tasks.map((task: any) => (
                    <option key={task.id} value={task.id}>
                      {task.title} ({task.task_type})
                    </option>
                  ))}
                </Select>
                <Button onClick={runValidation} disabled={!selectedTaskId} className="gap-2 w-full">
                  <CheckCircle className="h-4 w-4" />
                  Run Validation
                </Button>

                {validation && (
                  <Card
                    className={cn(
                      'border-2',
                      validation.is_valid ? 'border-green-500/20 bg-green-500/5' : 'border-amber-500/20 bg-amber-500/5'
                    )}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {validation.is_valid ? (
                            <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                              <AlertCircle className="h-5 w-5 text-amber-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{validation.is_valid ? 'Validation Passed' : 'Missing Requirements'}</p>
                            <p className="text-sm text-muted-foreground">{Math.round(validation.completion_percentage)}% complete</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn('h-full transition-all duration-500', validation.is_valid ? 'bg-green-500' : 'bg-amber-500')}
                            style={{ width: `${validation.completion_percentage}%` }}
                          />
                        </div>
                      </div>

                      {!validation.is_valid && validation.missing_requirements?.length > 0 && (
                        <div className="mt-6 space-y-2">
                          <p className="text-sm font-medium mb-3">Missing Requirements:</p>
                          {validation.missing_requirements.map((missing: any, index: number) => (
                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-background">
                              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{missing.section_type}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{missing.action_needed || missing.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Select a Workflow</h3>
                <p className="text-sm text-muted-foreground">Choose a workflow from the sidebar to start validating tasks</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
