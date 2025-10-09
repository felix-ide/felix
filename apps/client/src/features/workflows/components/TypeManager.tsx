import { useEffect, useMemo, useState } from 'react';
import { Input } from '@client/shared/ui/Input';
import { Button } from '@client/shared/ui/Button';
import { Select } from '@client/shared/ui/Select';
import { Textarea } from '@client/shared/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@client/shared/ui/Card';
import { EmojiPicker } from '@client/shared/ui/EmojiPicker';
import { felixService } from '@/services/felixService';
import {
  Plus, Trash2, Upload, Download, Edit2, X,
  AlertCircle, Palette, Tag, FileText, Settings
} from 'lucide-react';
import { cn } from '@/utils/cn';

type TypesMeta = Record<string, {
  emoji?: string;
  color?: string;
  default_priority?: 'low'|'medium'|'high'|'critical';
  default_tags?: string[];
  default_description_template?: string
}>;

const BUILTIN = new Set(['epic','story','task','subtask','milestone','bug','spike','chore']);

interface TypeManagerProps {
  onUpdate?: () => void;
}

export function TypeManager({ onUpdate }: TypeManagerProps = {}) {
  const [mapping, setMapping] = useState<Record<string,string>>({});
  const [flowMapping, setFlowMapping] = useState<Record<string,string>>({});
  const [workflows, setWorkflows] = useState<Array<{ value: string; label: string }>>([]);
  const [statusFlowOptions, setStatusFlowOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [meta, setMeta] = useState<TypesMeta>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Edit mode
  const [editingType, setEditingType] = useState<string | null>(null);

  // New type form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newType, setNewType] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [newWorkflow, setNewWorkflow] = useState('feature_development');
  const [newFlow, setNewFlow] = useState<string>('');
  const [newDefaultPriority, setNewDefaultPriority] = useState<'low'|'medium'|'high'|'critical'>('medium');
  const [newDefaultTags, setNewDefaultTags] = useState('');
  const [newDescriptionTemplate, setNewDescriptionTemplate] = useState('');

  // Import/Export
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [wfList, mappingPayload, cfg, flows] = await Promise.all([
          felixService.listWorkflows(),
          felixService.getWorkflowMapping(),
          felixService.getWorkflowConfig(),
          felixService.getWorkflowStatusFlows()
        ]);
        setWorkflows((wfList.items || []).map((w: any) => ({ value: w.name, label: w.display_name || w.name })));
        setMapping(mappingPayload.workflowMap || {});
        setFlowMapping(mappingPayload.flowMap || {});
        setStatusFlowOptions(
          (flows.flows || []).map((flow: any) => ({
            value: flow.id,
            label: flow.display_label || flow.name
          }))
        );
        if (!newFlow && (flows.flows || []).length) {
          setNewFlow((flows.flows || [])[0].id);
        }
        try {
          const m = cfg.config && (cfg.config as any).types_metadata;
          const parsed = typeof m === 'string' ? JSON.parse(m) : m || {};
          setMeta(parsed);
        } catch {
          setMeta({});
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load type metadata');
      }
    })();
  }, []);

  const customTypes = useMemo(() => {
    const names = new Set<string>();
    Object.keys(mapping || {}).forEach((name) => {
      if (!BUILTIN.has(name)) names.add(name);
    });
    Object.keys(flowMapping || {}).forEach((name) => {
      if (!BUILTIN.has(name)) names.add(name);
    });
    return Array.from(names).sort();
  }, [mapping, flowMapping]);

  const saveMeta = async (next: TypesMeta) => {
    setBusy(true); setError('');
    try {
      await felixService.setWorkflowConfig({ types_metadata: JSON.stringify(next) });
      setMeta(next);
    } catch (e:any) {
      setError(e.message||'Failed to save');
    } finally { setBusy(false); }
  };

  const onUpdateMeta = (type: string, patch: Partial<TypesMeta[string]>) => {
    const next = { ...meta, [type]: { ...(meta[type]||{}), ...patch } };
    saveMeta(next);
    onUpdate?.();
  };

  const updateTypeWorkflow = async (type: string, workflowName: string) => {
    setBusy(true); setError('');
    try {
      await felixService.setWorkflowMapping(type, workflowName);
      setMapping((prev) => ({ ...prev, [type]: workflowName }));
      onUpdate?.();
    } catch (e:any) {
      setError(e.message || 'Failed to update workflow');
    } finally {
      setBusy(false);
    }
  };

  const updateTypeFlow = async (type: string, flowId: string | null) => {
    setBusy(true); setError('');
    try {
      await felixService.setStatusFlowMapping(type, flowId);
      setFlowMapping((prev) => {
        const next = { ...prev };
        if (flowId) {
          next[type] = flowId;
        } else {
          delete next[type];
        }
        return next;
      });
      onUpdate?.();
    } catch (e:any) {
      setError(e.message || 'Failed to update status flow');
    } finally {
      setBusy(false);
    }
  };

  const onRemoveType = async (type: string) => {
    if (!confirm(`Delete task type "${type}"?`)) return;
    setBusy(true); setError('');
    try {
      // Remove from mapping
      const newMapping = { ...mapping };
      delete newMapping[type];
      await felixService.setWorkflowMappingBulk(newMapping);

      await felixService.setStatusFlowMapping(type, null);

      // Remove from metadata
      const newMeta = { ...meta };
      delete newMeta[type];
      await felixService.setWorkflowConfig({ types_metadata: JSON.stringify(newMeta) });

      setMapping(newMapping);
      const nextFlowMapping = { ...flowMapping };
      delete nextFlowMapping[type];
      setFlowMapping(nextFlowMapping);
      setMeta(newMeta);
      onUpdate?.();
    } catch (e:any) {
      setError(e.message||'Failed to remove type');
    } finally { setBusy(false); }
  };

  const onAddType = async () => {
    const t = newType.trim();
    if (!t) return;

    setBusy(true);
    setError('');
    try {
      await felixService.setWorkflowMapping(t, newWorkflow);
      await felixService.setStatusFlowMapping(t, newFlow || null);
      const nextMeta = {
        ...meta,
        [t]: {
          emoji: newEmoji || undefined,
          color: newColor || undefined,
          default_priority: newDefaultPriority,
          default_tags: newDefaultTags ? newDefaultTags.split(',').map(s=>s.trim()).filter(Boolean) : undefined,
          default_description_template: newDescriptionTemplate || undefined
        }
      };
      await felixService.setWorkflowConfig({ types_metadata: JSON.stringify(nextMeta) });
      setMeta(nextMeta);
      setMapping({ ...mapping, [t]: newWorkflow });
      setFlowMapping((prev) => {
        const next = { ...prev };
        if (newFlow) {
          next[t] = newFlow;
        } else {
          delete next[t];
        }
        return next;
      });
      onUpdate?.();

      // Reset form
      setNewType('');
      setNewEmoji('');
      setNewColor('#6366f1');
      setNewWorkflow('feature_development');
      setNewFlow(statusFlowOptions[0]?.value || '');
      setNewDefaultPriority('medium');
      setNewDefaultTags('');
      setNewDescriptionTemplate('');
      setShowNewForm(false);
    } catch (e:any) {
      setError(e.message||'Failed to add type');
    } finally { setBusy(false); }
  };

  const exportJson = () => {
    const payload = { mapping, flow_mapping: flowMapping, types_metadata: meta };
    const text = JSON.stringify(payload, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-types-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importJson = async () => {
    setBusy(true); setError('');
    try {
      const obj = JSON.parse(importText || '{}');
      if (obj.mapping && typeof obj.mapping === 'object') {
        await felixService.setWorkflowMappingBulk(obj.mapping);
        setMapping(obj.mapping);
      }
      if (obj.flow_mapping && typeof obj.flow_mapping === 'object') {
        await felixService.setStatusFlowMappingBulk(obj.flow_mapping);
        setFlowMapping(obj.flow_mapping);
      }
      if (obj.types_metadata && typeof obj.types_metadata === 'object') {
        await felixService.setWorkflowConfig({ types_metadata: JSON.stringify(obj.types_metadata) });
        setMeta(obj.types_metadata);
      }
      setShowImport(false); setImportText('');
      onUpdate?.();
    } catch (e:any) { setError(e.message || 'Invalid JSON'); }
    finally { setBusy(false); }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowNewForm(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Type
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowImport(!showImport)}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exportJson}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>

      {/* Import Dialog */}
      {showImport && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Import Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"mapping": {"initiative":"feature_development"}, "types_metadata": {"initiative": {"emoji":"🚀","color":"#ff5722"}}}'
              className="font-mono text-xs h-32"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={() => { setShowImport(false); setImportText(''); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={importJson} disabled={!importText.trim() || busy}>
                Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Type Form */}
      {showNewForm && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-base">Create New Task Type</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowNewForm(false)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-2">
                <Input
                  label="Type Name"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="e.g. initiative"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5">Emoji</label>
                <div className="flex items-center gap-2">
                  <EmojiPicker value={newEmoji} onChange={setNewEmoji} />
                  <span className="text-2xl">{newEmoji || '❓'}</span>
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="h-10 w-10 rounded border border-input cursor-pointer"
                  />
                  <div
                    className="h-10 flex-1 rounded border border-input"
                    style={{ backgroundColor: newColor }}
                  />
                </div>
              </div>

              <div className="col-span-3">
                <Select
                  label="Default Workflow"
                  value={newWorkflow}
                  onChange={(e) => setNewWorkflow(e.target.value)}
                >
                  {workflows.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </div>

              <div className="col-span-3">
                <Select
                  label="Status Flow"
                  value={newFlow}
                  onChange={(e) => setNewFlow(e.target.value)}
                >
                  <option value="">(not set)</option>
                  {statusFlowOptions.length === 0 && <option value="">No flows available</option>}
                  {statusFlowOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </div>

              <div className="col-span-2">
                <Select
                  label="Default Priority"
                  value={newDefaultPriority}
                  onChange={(e) => setNewDefaultPriority(e.target.value as any)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Select>
              </div>

              <div className="col-span-6">
                <Input
                  label="Default Tags"
                  value={newDefaultTags}
                  onChange={(e) => setNewDefaultTags(e.target.value)}
                  placeholder="Comma-separated tags"
                />
              </div>

              <div className="col-span-6">
                <Textarea
                  label="Description Template"
                  value={newDescriptionTemplate}
                  onChange={(e) => setNewDescriptionTemplate(e.target.value)}
                  placeholder="Optional markdown template"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewForm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={onAddType}
                disabled={!newType.trim() || busy}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Type
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Types Grid */}
      {customTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm mb-4">No custom task types configured</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNewForm(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create First Type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {customTypes.map((t) => (
            <Card key={t} className="relative overflow-hidden">
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: meta[t]?.color || '#6b7280' }}
              />

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta[t]?.emoji || '📋'}</span>
                    <div>
                      <h3 className="font-semibold">{t}</h3>
                      <p className="text-xs text-muted-foreground space-x-2">
                        <span>Workflow: {workflows.find(w => w.value === mapping[t])?.label || mapping[t] || '—'}</span>
                        <span>• Flow: {statusFlowOptions.find(o => o.value === flowMapping[t])?.label || flowMapping[t] || '—'}</span>
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        label="Workflow"
                        value={mapping[t] || ''}
                        onChange={(e) => updateTypeWorkflow(t, e.target.value)}
                      >
                        {workflows.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                      <Select
                        label="Status Flow"
                        value={flowMapping[t] || ''}
                        onChange={(e) => updateTypeFlow(t, e.target.value || null)}
                      >
                        <option value="">(not set)</option>
                        {statusFlowOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingType(editingType === t ? null : t)}
                      className="h-7 w-7"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onRemoveType(t)}
                      className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-2">
                {editingType === t ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <EmojiPicker
                        value={meta[t]?.emoji || ''}
                        onChange={(emoji) => onUpdateMeta(t, { emoji })}
                      />
                      <input
                        type="color"
                        value={meta[t]?.color || '#6b7280'}
                        onChange={(e) => onUpdateMeta(t, { color: e.target.value })}
                        className="h-10 w-10 rounded border border-input cursor-pointer"
                      />
                      <Select
                        value={meta[t]?.default_priority || 'medium'}
                        onChange={(e) => onUpdateMeta(t, { default_priority: e.target.value as any })}
                        className="flex-1"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </Select>
                    </div>
                    <Input
                      value={(meta[t]?.default_tags || []).join(', ')}
                      onChange={(e) => onUpdateMeta(t, {
                        default_tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      placeholder="Default tags..."
                    />
                    <Textarea
                      value={meta[t]?.default_description_template || ''}
                      onChange={(e) => onUpdateMeta(t, { default_description_template: e.target.value })}
                      placeholder="Description template..."
                      rows={2}
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingType(null)}
                      className="w-full"
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Palette className="h-3 w-3 text-muted-foreground" />
                        <div
                          className="h-3 w-3 rounded"
                          style={{ backgroundColor: meta[t]?.color || '#6b7280' }}
                        />
                      </div>
                      <div className={cn("flex items-center gap-1", getPriorityColor(meta[t]?.default_priority || 'medium'))}>
                        <AlertCircle className="h-3 w-3" />
                        <span className="capitalize">{meta[t]?.default_priority || 'medium'}</span>
                      </div>
                    </div>

                    {meta[t]?.default_tags && meta[t].default_tags!.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        {meta[t].default_tags!.map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-muted rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {meta[t]?.default_description_template && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        <FileText className="h-3 w-3 inline mr-1" />
                        {meta[t].default_description_template}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
