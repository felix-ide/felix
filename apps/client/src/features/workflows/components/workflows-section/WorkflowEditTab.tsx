import {
  AlertCircle,
  Bug,
  ChevronRight,
  Code,
  FileCode,
  Search as SearchIcon,
  Sparkles,
  Trash2,
  Save,
  Plus,
  GitBranch,
  Boxes,
  ListChecks,
  ScrollText
} from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { Textarea } from '@client/shared/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@client/shared/ui/Card';
import { WorkflowForm, type WorkflowDefinition } from '@client/features/workflows/components/WorkflowForm';
import type { TaskStatusRecord, TaskStatusFlowRecord } from '@/shared/api/workflowsClient';
import { cn } from '@/utils/cn';
import type { EditorSection, WorkflowListItem } from './hooks/useWorkflowsSectionState';
import type { ComponentType } from 'react';

type ConfigPanel = 'sections' | 'status' | 'bundles' | 'rules';

interface WorkflowEditTabProps {
  filteredItems: WorkflowListItem[];
  selected: WorkflowDefinition | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectWorkflow: (name: string) => void;
  onNewWorkflow: () => void;
  editorSection: EditorSection;
  onEditorSectionChange: (section: EditorSection) => void;
  configPanel: ConfigPanel;
  onConfigPanelChange: (panel: ConfigPanel) => void;
  error: string;
  parseOk: boolean;
  name: string;
  displayName: string;
  description: string;
  onFieldChange: (field: 'name' | 'display_name' | 'description', value: string) => void;
  editorValue: string;
  onEditorChange: (value: string) => void;
  form: WorkflowDefinition;
  onFormChange: (next: WorkflowDefinition) => void;
  dirty: boolean;
  onDelete: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
  getWorkflowIcon: (name: string) => JSX.Element;
  getSectionIcon: (section: EditorSection) => JSX.Element | null;
  onTemplateSelect: (template: string) => void;
  statusHints: string[];
  statePresets: Array<{ id: string; label: string; states: string[] }>;
  statusCatalog: TaskStatusRecord[];
  statusFlows: TaskStatusFlowRecord[];
}

export function WorkflowEditTab({
  filteredItems,
  selected,
  searchQuery,
  onSearchChange,
  onSelectWorkflow,
  onNewWorkflow,
  editorSection,
  onEditorSectionChange,
  configPanel,
  onConfigPanelChange,
  error,
  parseOk,
  name,
  displayName,
  description,
  onFieldChange,
  editorValue,
  onEditorChange,
  form,
  onFormChange,
  dirty,
  onDelete,
  onSave,
  getWorkflowIcon,
  getSectionIcon,
  onTemplateSelect,
  statusHints,
  statePresets,
  statusCatalog,
  statusFlows,
}: WorkflowEditTabProps) {
  const configurationPanels: Array<{ id: ConfigPanel; label: string; description: string; icon: ComponentType<{ className?: string }> }> = [
    {
      id: 'sections',
      label: 'Sections',
      description: 'Define the sections, formats, and guidance each task must complete.',
      icon: ListChecks
    },
    {
      id: 'status',
      label: 'Status Flow',
      description: 'Manage shared statuses, transitions, prompts, and gates.',
      icon: GitBranch
    },
    {
      id: 'bundles',
      label: 'Validation Bundles',
      description: 'Create reusable bundles to attach to transitions and gates.',
      icon: Boxes
    },
    {
      id: 'rules',
      label: 'Rules',
      description: 'Add conditional requirements and custom validation rules.',
      icon: ScrollText
    }
  ];

  const combinedPresets = [
    ...statePresets,
    ...statusFlows.map((flow) => ({
      id: flow.id,
      label: flow.display_label || flow.name,
      states: Array.isArray(flow.status_ids) ? flow.status_ids : []
    }))
  ];

  return (
    <>
      <div className="w-80 border-r border-border bg-muted/30 flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Button onClick={onNewWorkflow} className="flex-1 gap-2" size="sm">
              <Plus className="h-4 w-4" />
              New Workflow
            </Button>
          </div>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {searchQuery ? 'No workflows found' : 'No workflows created yet'}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredItems.map((workflow) => (
                <div key={workflow.name}>
                  <button
                    onClick={() => onSelectWorkflow(workflow.name)}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-all',
                      'hover:bg-background hover:shadow-sm',
                      'group flex items-start gap-3',
                      selected?.name === workflow.name && 'bg-background shadow-sm ring-1 ring-border'
                    )}
                  >
                    <div className="mt-0.5">{getWorkflowIcon(workflow.name)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{workflow.display_name || workflow.name}</div>
                      {workflow.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{workflow.description}</div>
                      )}
                    </div>
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5',
                        selected?.name === workflow.name && 'opacity-100'
                      )}
                    />
                  </button>

                  {selected?.name === workflow.name && (
                    <div className="ml-8 mt-1 space-y-0.5">
                      <button
                        onClick={() => onEditorSectionChange('basic')}
                        className={cn(
                          'w-full px-3 py-1.5 rounded-md text-xs text-left transition-all flex items-center gap-2',
                          editorSection === 'basic'
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                        )}
                      >
                        {getSectionIcon('basic')}
                        Basic Info
                      </button>
                      <button
                        onClick={() => onEditorSectionChange('configuration')}
                        className={cn(
                          'w-full px-3 py-1.5 rounded-md text-xs text-left transition-all flex items-center gap-2',
                          editorSection === 'configuration'
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                        )}
                      >
                        {getSectionIcon('configuration')}
                        Configuration
                      </button>
                      <button
                        onClick={() => onEditorSectionChange('json')}
                        className={cn(
                          'w-full px-3 py-1.5 rounded-md text-xs text-left transition-all flex items-center gap-2',
                          editorSection === 'json'
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                        )}
                      >
                        {getSectionIcon('json')}
                        JSON Editor
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {error && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 mb-6">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Error</p>
                      <p className="text-sm text-muted-foreground mt-1">{error}</p>
                    </div>
                  </div>
                )}

                {editorSection === 'basic' && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Workflow Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Input
                            label="Workflow Name"
                            value={name}
                            onChange={(event) => onFieldChange('name', event.target.value)}
                            placeholder="feature_development"
                          />
                        </div>
                        <div>
                          <Input
                            label="Display Name"
                            value={displayName}
                            onChange={(event) => onFieldChange('display_name', event.target.value)}
                            placeholder="Feature Development"
                          />
                        </div>
                      </div>
                      <div>
                        <Textarea
                          label="Description"
                          value={description}
                          onChange={(event) => onFieldChange('description', event.target.value)}
                          placeholder="Describe what this workflow is for..."
                          rows={4}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {editorSection === 'configuration' && (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      {configurationPanels.map((panel) => {
                        const Icon = panel.icon;
                        const isActive = configPanel === panel.id;
                        return (
                          <button
                            key={panel.id}
                            onClick={() => onConfigPanelChange(panel.id)}
                            className={cn(
                              'p-4 rounded-lg border text-left transition-all flex gap-3 items-start',
                              isActive
                                ? 'border-primary bg-primary/10'
                                : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5'
                            )}
                          >
                            <Icon
                              className={cn(
                                'h-5 w-5 mt-0.5',
                                isActive ? 'text-primary' : 'text-muted-foreground'
                              )}
                            />
                            <div>
                              <div className={cn('text-sm font-semibold', isActive ? 'text-primary' : 'text-foreground')}>
                                {panel.label}
                              </div>
                              <p className={cn('text-xs mt-1 leading-snug', isActive ? 'text-primary/80' : 'text-muted-foreground')}>
                                {panel.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <WorkflowForm
                      value={form}
                      onChange={onFormChange}
                      activePanel={configPanel}
                      statusHints={statusHints}
                      statePresets={combinedPresets}
                      statusCatalog={statusCatalog}
                      statusFlows={statusFlows}
                    />
                  </div>
                )}

                {editorSection === 'json' && (
                  <div className="h-full flex flex-col -m-6">
                    <div className="flex items-center justify-between px-6 py-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Code className="h-5 w-5 text-green-500" />
                        <h3 className="font-medium">JSON Editor</h3>
                      </div>
                      {!parseOk && (
                        <div className="flex items-center gap-2 text-amber-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          Invalid JSON syntax
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-4">
                      <Textarea
                        value={editorValue}
                        onChange={(event) => onEditorChange(event.target.value)}
                        placeholder="Workflow JSON configuration..."
                        className="font-mono text-xs h-full min-h-[600px] resize-none"
                        spellCheck={false}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border bg-background/95 backdrop-blur p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onTemplateSelect('feature_development')}
                  >
                    <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                    Feature Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onTemplateSelect('bugfix')}
                  >
                    <Bug className="h-4 w-4 mr-2 text-red-500" />
                    Bugfix Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onTemplateSelect('research')}
                  >
                    <SearchIcon className="h-4 w-4 mr-2 text-blue-500" />
                    Research Template
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  {selected?.name && (
                    <Button variant="destructive" size="sm" onClick={onDelete}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                  <Button onClick={onSave} disabled={!name || !parseOk} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                    {dirty && <span className="ml-2 h-2 w-2 bg-amber-400 rounded-full animate-pulse" />}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
                <FileCode className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Workflow Selected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select a workflow from the sidebar or create a new one to get started
              </p>
              <Button onClick={onNewWorkflow} className="gap-2">
                <Plus className="h-4 w-4" />
                Create New Workflow
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
