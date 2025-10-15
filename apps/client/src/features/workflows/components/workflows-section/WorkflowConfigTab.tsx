import { useState } from 'react';
import { Layers, Settings2, Shield, RefreshCw, Archive, Download, Upload, Trash2, Edit2, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@client/shared/ui/Card';
import { Select } from '@client/shared/ui/Select';
import { MappingEditor } from '@client/features/workflows/components/MappingEditor';
import { TypeManager } from '@client/features/workflows/components/TypeManager';
import { cn } from '@/utils/cn';
import { Input } from '@client/shared/ui/Input';
import { Textarea } from '@client/shared/ui/Textarea';
import type { ConfigSection, WorkflowListItem } from './hooks/useWorkflowsSectionState';
import type { TaskStatusRecord, TaskStatusFlowRecord } from '@/shared/api/workflowsClient';

interface WorkflowConfigTabProps {
  configSection: ConfigSection;
  onConfigSectionChange: (section: ConfigSection) => void;
  defaultWorkflow: string;
  items: WorkflowListItem[];
  updateDefaultWorkflow: (name: string) => void;
  enforceMapping: boolean;
  toggleEnforceMapping: () => void;
  mappingKey: number;
  onReloadMapping: () => void;
  restoreBuiltInWorkflows: () => void;
  exportSnapshot: (filePath?: string) => void;
  importSnapshot: (options?: { filePath?: string; overwrite?: boolean }) => void;
  statusCatalog: TaskStatusRecord[];
  statusFlows: TaskStatusFlowRecord[];
  onSaveStatus: (status: Partial<TaskStatusRecord> & { name: string }) => void;
  onDeleteStatus: (id: string) => void;
  onSaveStatusFlow: (flow: Partial<TaskStatusFlowRecord> & { name: string; status_ids: string[] }) => void;
  onDeleteStatusFlow: (id: string) => void;
}

export function WorkflowConfigTab({
  configSection,
  onConfigSectionChange,
  defaultWorkflow,
  items,
  updateDefaultWorkflow,
  enforceMapping,
  toggleEnforceMapping,
  mappingKey,
  onReloadMapping,
  restoreBuiltInWorkflows,
  exportSnapshot,
  importSnapshot,
  statusCatalog,
  statusFlows,
  onSaveStatus,
  onDeleteStatus,
  onSaveStatusFlow,
  onDeleteStatusFlow,
}: WorkflowConfigTabProps) {
  const [statusDraft, setStatusDraft] = useState({ name: '', display_label: '', emoji: '' });
  const [flowDraft, setFlowDraft] = useState({ name: '', status_ids: '' });
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [statusEditDraft, setStatusEditDraft] = useState<{ display_label: string; emoji: string; color: string; description: string }>({
    display_label: '',
    emoji: '',
    color: '#6366f1',
    description: ''
  });
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [flowEditDraft, setFlowEditDraft] = useState<{ id?: string; name: string; display_label: string; description: string; status_ids: string[]; metadata?: Record<string, unknown> }>(
    { name: '', display_label: '', description: '', status_ids: [] }
  );
  const [flowStatusPicker, setFlowStatusPicker] = useState('');

  const handleCreateStatus = async () => {
    if (!statusDraft.name.trim()) return;
    await onSaveStatus({
      name: statusDraft.name.trim(),
      display_label: statusDraft.display_label.trim() || undefined,
      emoji: statusDraft.emoji.trim() || undefined
    });
    setStatusDraft({ name: '', display_label: '', emoji: '' });
  };

  const handleCreateFlow = async () => {
    if (!flowDraft.name.trim()) return;
    const parsed = Array.from(new Set(
      flowDraft.status_ids
        .split(',')
        .map((token) => token.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, ''))
        .filter(Boolean)
    ));
    if (!parsed.length) return;
    await onSaveStatusFlow({
      name: flowDraft.name.trim(),
      status_ids: parsed
    });
    onReloadMapping();
    setFlowDraft({ name: '', status_ids: '' });
  };

  const beginEditStatus = (status: TaskStatusRecord) => {
    setEditingStatusId(status.id);
    setStatusEditDraft({
      display_label: status.display_label || '',
      emoji: status.emoji || '',
      color: status.color || '#6366f1',
      description: status.description || ''
    });
  };

  const saveStatusEdit = async () => {
    if (!editingStatusId) return;
    await onSaveStatus({
      id: editingStatusId,
      name: editingStatusId,
      display_label: statusEditDraft.display_label?.trim() || undefined,
      emoji: statusEditDraft.emoji?.trim() || undefined,
      color: statusEditDraft.color?.trim() || undefined,
      description: statusEditDraft.description?.trim() || undefined
    });
    setEditingStatusId(null);
  };

  const cancelStatusEdit = () => {
    setEditingStatusId(null);
    setStatusEditDraft({ display_label: '', emoji: '', color: '#6366f1', description: '' });
  };

  const beginEditFlow = (flow: TaskStatusFlowRecord) => {
    setEditingFlowId(flow.id);
    setFlowEditDraft({
      id: flow.id,
      name: flow.name,
      display_label: flow.display_label || '',
      description: flow.description || '',
      status_ids: Array.isArray(flow.status_ids) ? [...flow.status_ids] : [],
      metadata: flow.metadata || undefined
    });
    setFlowStatusPicker('');
  };

  const cancelFlowEdit = () => {
    setEditingFlowId(null);
    setFlowEditDraft({ name: '', display_label: '', description: '', status_ids: [] });
    setFlowStatusPicker('');
  };

  const addStatusToFlowDraft = (statusId: string) => {
    if (!statusId) return;
    setFlowEditDraft((draft) => {
      if (draft.status_ids.includes(statusId)) return draft;
      return { ...draft, status_ids: [...draft.status_ids, statusId] };
    });
  };

  const removeStatusFromFlowDraft = (statusId: string) => {
    setFlowEditDraft((draft) => ({
      ...draft,
      status_ids: draft.status_ids.filter((id) => id !== statusId)
    }));
  };

  const moveStatusWithinFlowDraft = (index: number, direction: -1 | 1) => {
    setFlowEditDraft((draft) => {
      const next = [...draft.status_ids];
      const target = index + direction;
      if (target < 0 || target >= next.length) return draft;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...draft, status_ids: next };
    });
  };

  const saveFlowEdit = async () => {
    if (!editingFlowId || flowEditDraft.status_ids.length === 0) return;
    await onSaveStatusFlow({
      id: editingFlowId,
      name: flowEditDraft.name,
      display_label: flowEditDraft.display_label?.trim() || undefined,
      description: flowEditDraft.description?.trim() || undefined,
      status_ids: flowEditDraft.status_ids,
      metadata: flowEditDraft.metadata
    });
    onReloadMapping();
    cancelFlowEdit();
  };

  return (
    <div className="flex-1 flex">
      <div className="w-64 border-r border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold mb-4">Configuration Sections</h3>
        <div className="space-y-1">
          <button
            onClick={() => onConfigSectionChange('mapping')}
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm text-left transition-all flex items-center gap-2',
              configSection === 'mapping' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
            )}
          >
            <Layers className="h-4 w-4" />
            Workflow Mapping
          </button>
          <button
            onClick={() => onConfigSectionChange('types')}
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm text-left transition-all flex items-center gap-2',
              configSection === 'types' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
            )}
          >
            <Settings2 className="h-4 w-4" />
            Task Types
          </button>
          <button
            onClick={() => onConfigSectionChange('statuses')}
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm text-left transition-all flex items-center gap-2',
              configSection === 'statuses' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
            )}
          >
            <Shield className="h-4 w-4" />
            Status Catalog
          </button>
          <button
            onClick={() => onConfigSectionChange('flows')}
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm text-left transition-all flex items-center gap-2',
              configSection === 'flows' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
            )}
          >
            <Settings2 className="h-4 w-4" />
            Status Flows
          </button>
          <button
            onClick={() => onConfigSectionChange('settings')}
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm text-left transition-all flex items-center gap-2',
              configSection === 'settings' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
            )}
          >
            <Shield className="h-4 w-4" />
            System Settings
          </button>
        </div>

        <div className="mt-8 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">DEFAULT WORKFLOW</h4>
            <Select value={defaultWorkflow} onChange={(event) => updateDefaultWorkflow(event.target.value)} className="w-full">
              {items.map((workflow) => (
                <option key={workflow.name} value={workflow.name}>
                  {workflow.display_name || workflow.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">ENFORCEMENT</h4>
            <div className="flex items-center justify-between p-2 rounded-md bg-background">
              <span className="text-sm">Strict Mode</span>
              <button
                onClick={toggleEnforceMapping}
                className={cn('relative w-10 h-5 rounded-full transition-colors', enforceMapping ? 'bg-primary' : 'bg-muted')}
              >
                <div
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full shadow-sm transition-transform border border-border',
                    enforceMapping ? 'translate-x-5' : 'translate-x-0.5',
                    'bg-card'
                  )}
                />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Enforce task type mappings</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {configSection === 'mapping' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Workflow Mapping</h2>
              <p className="text-xs text-muted-foreground">Drag types between workflows • Auto-saves</p>
            </div>
            <MappingEditor key={mappingKey} />
          </div>
        )}


        {configSection === 'types' && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Custom Task Types</h2>
              <p className="text-sm text-muted-foreground">Create custom task types with emojis, colors, and default settings.</p>
            </div>
            <TypeManager onUpdate={onReloadMapping} />
          </div>
        )}

        {configSection === 'statuses' && (
          <div className="p-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Add Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    label="Status ID"
                    placeholder="e.g., ready_for_review"
                    value={statusDraft.name}
                    onChange={(event) => setStatusDraft((draft) => ({ ...draft, name: event.target.value }))}
                  />
                  <Input
                    label="Display Label"
                    placeholder="Ready for Review"
                    value={statusDraft.display_label}
                    onChange={(event) => setStatusDraft((draft) => ({ ...draft, display_label: event.target.value }))}
                  />
                  <Input
                    label="Emoji"
                    placeholder="🧐"
                    value={statusDraft.emoji}
                    onChange={(event) => setStatusDraft((draft) => ({ ...draft, emoji: event.target.value }))}
                  />
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleCreateStatus} disabled={!statusDraft.name.trim()}>
                    Add Status
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Global Status Catalog</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statusCatalog.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No custom statuses defined. The defaults will be used.
                  </p>
                ) : (
                  statusCatalog.map((status) => {
                    const isEditing = editingStatusId === status.id;
                    return (
                      <div key={status.id} className="rounded-md border border-border p-3 text-sm">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid md:grid-cols-3 gap-3">
                              <Input
                                label="Display Label"
                                value={statusEditDraft.display_label}
                                onChange={(event) => setStatusEditDraft((draft) => ({ ...draft, display_label: event.target.value }))}
                                placeholder="Human friendly name"
                              />
                              <Input
                                label="Emoji"
                                value={statusEditDraft.emoji}
                                onChange={(event) => setStatusEditDraft((draft) => ({ ...draft, emoji: event.target.value }))}
                                placeholder="e.g. 🧪"
                              />
                              <div className="flex flex-col text-xs text-muted-foreground">
                                <span>Color</span>
                                <input
                                  type="color"
                                  value={statusEditDraft.color || '#6366f1'}
                                  onChange={(event) => setStatusEditDraft((draft) => ({ ...draft, color: event.target.value }))}
                                  className="h-9 w-12 rounded border border-input cursor-pointer"
                                />
                              </div>
                            </div>
                            <Textarea
                              value={statusEditDraft.description}
                              onChange={(event) => setStatusEditDraft((draft) => ({ ...draft, description: event.target.value }))}
                              placeholder="Optional description or guidance"
                              rows={2}
                              className="text-xs"
                            />
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={cancelStatusEdit} className="gap-1">
                                <X className="h-3 w-3" />
                                Cancel
                              </Button>
                              <Button size="sm" onClick={saveStatusEdit} className="gap-1">
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{status.emoji || '🏷️'}</span>
                                <div>
                                  <div className="font-medium">{status.display_label || status.name}</div>
                                  <div className="text-xs text-muted-foreground">{status.id}</div>
                                </div>
                              </div>
                              {status.color && (
                                <div
                                  className="h-3 w-3 rounded-full border border-border"
                                  style={{ backgroundColor: status.color }}
                                  aria-label="status color"
                                />
                              )}
                              {status.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs">{status.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => beginEditStatus(status)}
                                className="h-8 w-8"
                                title="Edit status"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => void onDeleteStatus(status.id)}
                                title="Delete status"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {configSection === 'flows' && (
          <div className="p-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Create Status Flow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="Flow Name"
                    placeholder="e.g., review_cycle"
                    value={flowDraft.name}
                    onChange={(event) => setFlowDraft((draft) => ({ ...draft, name: event.target.value }))}
                  />
                  <Input
                    label="Statuses (comma separated)"
                    placeholder="todo, ready_for_review, in_progress, done"
                    value={flowDraft.status_ids}
                    onChange={(event) => setFlowDraft((draft) => ({ ...draft, status_ids: event.target.value }))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Available statuses: {statusCatalog.length ? statusCatalog.map((s) => s.id).join(', ') : 'todo, in_progress, blocked, done'}
                </p>
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleCreateFlow} disabled={!flowDraft.name.trim() || !flowDraft.status_ids.trim()}>
                    Save Flow
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Reusable Status Flows</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statusFlows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No reusable flows defined.</p>
                ) : (
                  statusFlows.map((flow) => {
                    const isEditing = editingFlowId === flow.id;
                    const draftStatuses = isEditing ? flowEditDraft.status_ids : flow.status_ids;
                    return (
                      <div key={flow.id} className="rounded-md border border-border p-3 text-sm">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid md:grid-cols-2 gap-3">
                              <Input
                                label="Display Label"
                                value={flowEditDraft.display_label}
                                onChange={(event) => setFlowEditDraft((draft) => ({ ...draft, display_label: event.target.value }))}
                                placeholder="Human readable name"
                              />
                              <Input
                                label="Description"
                                value={flowEditDraft.description}
                                onChange={(event) => setFlowEditDraft((draft) => ({ ...draft, description: event.target.value }))}
                                placeholder="Optional description"
                              />
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Statuses in order</p>
                              {draftStatuses.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Add at least one status.</p>
                              ) : (
                                <div className="space-y-1">
                                  {draftStatuses.map((statusId, idx) => {
                                    const meta = statusCatalog.find((status) => status.id === statusId);
                                    return (
                                      <div key={statusId} className="flex items-center justify-between rounded border border-border bg-background px-2 py-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-mono">{statusId}</span>
                                          <span className="text-xs text-muted-foreground">{meta?.display_label || meta?.name || ''}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => moveStatusWithinFlowDraft(idx, -1)}
                                            className="h-7 w-7"
                                            disabled={idx === 0}
                                            title="Move up"
                                          >
                                            <ArrowUp className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => moveStatusWithinFlowDraft(idx, 1)}
                                            className="h-7 w-7"
                                            disabled={idx === draftStatuses.length - 1}
                                            title="Move down"
                                          >
                                                <ArrowDown className="h-3 w-3" />
                                              </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => removeStatusFromFlowDraft(statusId)}
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            title="Remove status"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              <Select
                                value={flowStatusPicker}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setFlowStatusPicker('');
                                  addStatusToFlowDraft(value);
                                }}
                              >
                                <option value="">Add status…</option>
                                {statusCatalog
                                  .filter((status) => !draftStatuses.includes(status.id))
                                  .map((status) => (
                                    <option key={status.id} value={status.id}>
                                      {status.display_label || status.id}
                                    </option>
                                  ))}
                              </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={cancelFlowEdit} className="gap-1">
                                <X className="h-3 w-3" />
                                Cancel
                              </Button>
                              <Button size="sm" onClick={saveFlowEdit} className="gap-1" disabled={flowEditDraft.status_ids.length === 0}>
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">{flow.display_label || flow.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {(Array.isArray(flow.status_ids) ? flow.status_ids : JSON.parse(flow.status_ids as string)).join(' → ')}
                              </div>
                              {flow.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{flow.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => beginEditFlow(flow)}
                                className="h-8 w-8"
                                title="Edit flow"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => void (async () => { await onDeleteStatusFlow(flow.id); onReloadMapping(); })()}
                                title="Delete flow"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {configSection === 'settings' && (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">System Settings</h2>
              <p className="text-sm text-muted-foreground">Configure defaults and maintenance actions.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Defaults</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Default Workflow</span>
                    <Select value={defaultWorkflow} onChange={(event) => updateDefaultWorkflow(event.target.value)}>
                      {items.map((workflow) => (
                        <option key={workflow.name} value={workflow.name}>
                          {workflow.display_name || workflow.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground">Strict Mapping</span>
                    <div className="mt-2 flex items-center justify-between p-2 rounded-md bg-background">
                      <span className="text-sm">Enforce task type → workflow mapping</span>
                      <button
                        onClick={toggleEnforceMapping}
                        className={cn('relative w-10 h-5 rounded-full transition-colors', enforceMapping ? 'bg-primary' : 'bg-muted')}
                      >
                        <div
                          className={cn(
                            'absolute top-0.5 h-4 w-4 rounded-full shadow-sm transition-transform border border-border bg-card',
                            enforceMapping ? 'translate-x-5' : 'translate-x-0.5'
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-green-500" />
                  Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium text-sm mb-2">Restore Built-in Workflows</h4>
                    <p className="text-xs text-muted-foreground mb-3">Reset the default workflows to their original configuration.</p>
                    <Button variant="outline" size="sm" onClick={restoreBuiltInWorkflows}>
                      <Archive className="h-4 w-4 mr-2" />
                      Restore Defaults
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium text-sm mb-2">Workflow Snapshots</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Manually export or import workflows for backup and sharing.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const filePath = window.prompt('Enter snapshot path (optional). Leave blank for default .felix/workflows.snapshot.json', '');
                          if (filePath === null) return;
                          exportSnapshot(filePath.trim() ? filePath.trim() : undefined);
                        }}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export Snapshot
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const filePath = window.prompt('Enter snapshot path to import (optional). Leave blank for default .felix/workflows.snapshot.json', '');
                          if (filePath === null) return;
                          importSnapshot({ filePath: filePath.trim() ? filePath.trim() : undefined, overwrite: true });
                        }}
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Import Snapshot
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
