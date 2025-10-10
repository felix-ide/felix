import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { felixService } from '@/services/felixService';
import type { TaskStatusRecord, TaskStatusFlowRecord } from '@/shared/api/workflowsClient';
import type { WorkflowDefinition } from '@client/features/workflows/components/WorkflowForm';
import { Bug, Code, FileText, Search as SearchIcon, Settings2, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';

export type EditorSection = 'basic' | 'configuration' | 'json';
export type ConfigSection = 'mapping' | 'types' | 'statuses' | 'flows' | 'settings';
export type WorkflowsTab = 'edit' | 'validate' | 'mapping';

export interface WorkflowListItem {
  name: string;
  display_name?: string;
  description?: string;
  required_sections?: any[];
  conditional_requirements?: any[];
  validation_rules?: any[];
  use_cases?: any[];
  [key: string]: unknown;
}

interface ValidationResult {
  is_valid: boolean;
  completion_percentage: number;
  missing_requirements?: Array<{ section_type: string; action_needed?: string; description?: string }>;
}

export interface UseWorkflowsSectionStateResult {
  items: WorkflowListItem[];
  selected: WorkflowDefinition | null;
  editor: string;
  rawObj: Record<string, unknown>;
  error: string;
  name: string;
  displayName: string;
  description: string;
  parseOk: boolean;
  form: WorkflowDefinition;
  dirty: boolean;
  tasks: any[];
  selectedTaskId: string;
  validation: ValidationResult | null;
  defaultWf: string;
  enforceMapping: boolean;
  tab: WorkflowsTab;
  editorSection: EditorSection;
  configSection: ConfigSection;
  configPanel: 'sections' | 'status' | 'bundles' | 'rules' | 'hierarchy';
  statusHints: string[];
  statusPresets: Array<{ id: string; label: string; states: string[] }>;
  statusCatalog: TaskStatusRecord[];
  statusFlows: TaskStatusFlowRecord[];
  saveStatus: (status: Partial<TaskStatusRecord> & { name: string }) => Promise<void>;
  removeStatus: (id: string) => Promise<void>;
  saveStatusFlow: (flow: Partial<TaskStatusFlowRecord> & { name: string; status_ids: string[] }) => Promise<void>;
  removeStatusFlow: (id: string) => Promise<void>;
  mappingKey: number;
  showNewDialog: boolean;
  newWorkflowName: string;
  searchQuery: string;
  filteredItems: WorkflowListItem[];
  setTab: (tab: WorkflowsTab) => void;
  setEditorSection: (section: EditorSection) => void;
  setConfigSection: (section: ConfigSection) => void;
  setConfigPanel: (panel: 'sections' | 'status' | 'bundles' | 'rules' | 'hierarchy') => void;
  setMappingKey: Dispatch<SetStateAction<number>>;
  setShowNewDialog: (value: boolean) => void;
  setNewWorkflowName: (value: string) => void;
  setSearchQuery: (value: string) => void;
  setForm: Dispatch<SetStateAction<WorkflowDefinition>>;
  setSelectedTaskId: (value: string) => void;
  setParseOk: (value: boolean) => void;
  setDirty: (value: boolean) => void;
  setValidation: (value: ValidationResult | null) => void;
  updateDefaultWorkflow: (workflowName: string) => Promise<void>;
  toggleEnforceMapping: () => Promise<void>;
  restoreBuiltInWorkflows: () => Promise<void>;
  exportSnapshot: (filePath?: string) => Promise<void>;
  importSnapshot: (options?: { filePath?: string; overwrite?: boolean }) => Promise<void>;
  handleSelect: (name: string, options?: { bypassDirtyCheck?: boolean }) => Promise<void>;
  handleNew: () => void;
  createNewWorkflow: () => void;
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
  bindField: (field: 'name' | 'display_name' | 'description', value: string) => void;
  onEditorChange: (text: string) => void;
  runValidation: () => Promise<void>;
  reloadWorkflows: () => Promise<void>;
  getWorkflowIcon: (name: string) => JSX.Element;
  getSectionIcon: (section: EditorSection) => JSX.Element | null;
}

const defaultWorkflowDefinition: WorkflowDefinition = {
  name: '',
  display_name: '',
  description: '',
  required_sections: [],
  conditional_requirements: [],
  validation_rules: [],
  validation_bundles: [],
  status_flow_ref: null,
  status_flow: { initial_state: '', states: [], transitions: [] },
} as WorkflowDefinition;

export function useWorkflowsSectionState(): UseWorkflowsSectionStateResult {
  const [items, setItems] = useState<WorkflowListItem[]>([]);
  const [selected, setSelected] = useState<WorkflowDefinition | null>(null);
  const [editor, setEditor] = useState<string>('');
  const [rawObj, setRawObj] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [parseOk, setParseOk] = useState<boolean>(true);
  const [form, setForm] = useState<WorkflowDefinition>(defaultWorkflowDefinition);
  const [dirty, setDirty] = useState<boolean>(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [defaultWf, setDefaultWf] = useState<string>('');
  const [enforceMapping, setEnforceMapping] = useState<boolean>(false);
  const [tab, setTab] = useState<WorkflowsTab>(() => {
    try {
      return (localStorage.getItem('workflows-tab') as WorkflowsTab) || 'edit';
    } catch {
      return 'edit';
    }
  });
  const [editorSection, setEditorSection] = useState<EditorSection>('basic');
  const [configPanel, setConfigPanel] = useState<'sections' | 'status' | 'bundles' | 'rules' | 'hierarchy'>('sections');
  const [availableStatuses, setAvailableStatuses] = useState<string[]>(['todo', 'in_progress', 'blocked', 'done']);
  const [statusCatalog, setStatusCatalog] = useState<TaskStatusRecord[]>([]);
  const [statusFlows, setStatusFlows] = useState<TaskStatusFlowRecord[]>([]);
  const [statusPresets, setStatusPresets] = useState<Array<{ id: string; label: string; states: string[] }>>([]);

  const loadStatusMetadata = useCallback(async () => {
    try {
      const [statusResult, flowResult] = await Promise.all([
        felixService.getWorkflowStatuses(),
        felixService.getWorkflowStatusFlows()
      ]);
      if (Array.isArray(statusResult?.statuses) && statusResult.statuses.length) {
        setStatusCatalog(statusResult.statuses as TaskStatusRecord[]);
        const normalized = Array.from(new Set(
          statusResult.statuses
            .map((status: TaskStatusRecord) => String(status.id || status.name || '').trim())
            .filter((status) => status.length > 0)
        ));
        if (normalized.length) {
          setAvailableStatuses(normalized);
        }
      }
      if (Array.isArray(flowResult?.flows)) {
        setStatusFlows(flowResult.flows as TaskStatusFlowRecord[]);
      }
      if (Array.isArray(flowResult?.presets)) {
        const presets = flowResult.presets.map((preset: any) => ({
          id: String(preset?.id || ''),
          label: String(preset?.label || preset?.id || ''),
          states: Array.isArray(preset?.states)
            ? preset.states.map((state: unknown) => String(state || '').trim()).filter(Boolean)
            : []
        }));
        setStatusPresets(presets);
      }
    } catch (err) {
      console.error('[Felix] Failed to load workflow statuses', err);
    }
  }, []);

  useEffect(() => {
    loadStatusMetadata().catch(() => undefined);
  }, [loadStatusMetadata]);

  const fallbackStatuses = useMemo(() => (
    availableStatuses.length ? availableStatuses : ['todo', 'in_progress', 'blocked', 'done']
  ), [availableStatuses]);

  const sanitizeStateName = useCallback((value: string) => {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, '')
      .replace(/[\s-]+/g, '_');
  }, []);

  const makeRandomId = useCallback(() => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `wf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }, []);

  const normalizeBundles = useCallback((bundles: any[] | undefined) => {
    if (!Array.isArray(bundles)) return [] as any[];
    return bundles.map((bundle: any, index: number) => ({
      id: bundle?.id || `bundle_${index}_${makeRandomId()}`,
      name: bundle?.name || '',
      description: bundle?.description || '',
      sections: Array.isArray(bundle?.sections) ? bundle.sections.filter(Boolean) : [],
      optional_sections: Array.isArray(bundle?.optional_sections) ? bundle.optional_sections.filter(Boolean) : [],
      rules: Array.isArray(bundle?.rules) ? bundle.rules.filter(Boolean) : [],
      subtasks: Array.isArray(bundle?.subtasks) ? bundle.subtasks : [],
      guidance_hint: bundle?.guidance_hint || ''
    }));
  }, [makeRandomId]);

  const sanitizeStatusFlow = useCallback((raw: any) => {
    const inputStates = Array.isArray(raw?.states) ? raw.states : [];
    const normalizedStates = inputStates
      .map((state: any) => sanitizeStateName(state))
      .filter((state) => state.length > 0);
    const baseStates = normalizedStates.length ? normalizedStates : fallbackStatuses;
    const uniqueStates = Array.from(new Set(
      baseStates
        .map((state) => sanitizeStateName(state))
        .filter((state) => state.length > 0)
    ));

    const transitionsInput = Array.isArray(raw?.transitions) ? raw.transitions : [];
    const sanitizedTransitions = transitionsInput
      .map((transition: any) => {
        if (!transition) return null;
        const fromRaw = transition.from === undefined ? '*' : transition.from;
        const from = fromRaw === '*' || fromRaw === 'any'
          ? '*'
          : sanitizeStateName(fromRaw);
        const to = sanitizeStateName(transition.to);
        if (!to) return null;
        if (from !== '*' && !uniqueStates.includes(from)) return null;
        if (!uniqueStates.includes(to)) return null;
        return {
          id: transition.id || makeRandomId(),
          from,
          to,
          label: transition.label || '',
          description: transition.description || '',
          required_bundles: Array.isArray(transition.required_bundles) ? transition.required_bundles.filter(Boolean) : [],
          optional_bundles: Array.isArray(transition.optional_bundles) ? transition.optional_bundles.filter(Boolean) : [],
          pre_prompt_template: transition.pre_prompt_template || '',
          post_prompt_template: transition.post_prompt_template || '',
          gate: transition.gate
            ? {
                require_acknowledgement: Boolean(transition.gate.require_acknowledgement),
                acknowledgement_prompt_template: transition.gate.acknowledgement_prompt_template || '',
                auto_checklist: transition.gate.auto_checklist || undefined
              }
            : undefined
        };
      })
      .filter((transition): transition is any => !!transition);

    const initialCandidate = sanitizeStateName(raw?.initial_state);
    const initial = initialCandidate && uniqueStates.includes(initialCandidate)
      ? initialCandidate
      : (sanitizedTransitions.find((transition) => transition.from !== '*' && uniqueStates.includes(transition.from))?.from
        || uniqueStates[0]
        || '');

    return {
      initial_state: initial,
      states: uniqueStates,
      transitions: sanitizedTransitions
    };
  }, [fallbackStatuses, makeRandomId, sanitizeStateName]);
  const [configSection, setConfigSection] = useState<ConfigSection>('mapping');
  const [mappingKey, setMappingKey] = useState<number>(0);
  const [showNewDialog, setShowNewDialog] = useState<boolean>(false);
  const [newWorkflowName, setNewWorkflowName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const slugify = useCallback((s: string) => {
    return (s || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_\s-]/g, '')
      .replace(/[\s-]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }, []);

  const reloadWorkflows = useCallback(async () => {
    const resp = await felixService.listWorkflows();
    setItems((resp.items || []) as WorkflowListItem[]);
  }, []);

  useEffect(() => {
    reloadWorkflows().catch((err) => {
      console.error('[Felix] Failed to load workflows', err);
    });
  }, [reloadWorkflows]);

  const loadInitialConfig = useCallback(async () => {
    try {
      setDefaultWf(await felixService.getDefaultWorkflow());
    } catch (err) {
      console.error('[Felix] Failed to load default workflow', err);
    }

    try {
      const { config } = await felixService.getWorkflowConfig();
      const value = (config as any).enforce_type_mapping;
      setEnforceMapping(value === true || value === 'true');
    } catch (err) {
      console.error('[Felix] Failed to load workflow config', err);
    }
  }, []);

  useEffect(() => {
    loadInitialConfig().catch(() => {
      /* handled above */
    });
  }, [loadInitialConfig]);

  const exportSnapshot = useCallback(async (filePath?: string) => {
    try {
      const result = await felixService.exportWorkflowSnapshot(filePath);
      window.alert(`Exported ${result.workflowCount} workflow(s) to ${result.filePath}`);
    } catch (err) {
      console.error('[Felix] Failed to export workflow snapshot', err);
      setError('Failed to export workflow snapshot');
    }
  }, []);

  const importSnapshot = useCallback(async (options: { filePath?: string; overwrite?: boolean } = {}) => {
    try {
      const result = await felixService.importWorkflowSnapshot(options);
      window.alert(`Imported ${result.workflowCount} workflow(s) (created ${result.created}, updated ${result.updated}) from ${result.filePath}`);
      await reloadWorkflows();
    } catch (err) {
      console.error('[Felix] Failed to import workflow snapshot', err);
      setError('Failed to import workflow snapshot');
    }
  }, [reloadWorkflows]);

  useEffect(() => {
    try {
      localStorage.setItem('workflows-tab', tab);
    } catch (err) {
      console.error('[Felix] Failed to persist workflows tab selection', err);
    }
  }, [tab]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty, normalizeBundles, sanitizeStatusFlow]);

  const handleSelect = useCallback(async (workflowName: string, options?: { bypassDirtyCheck?: boolean }) => {
    if (dirty && !options?.bypassDirtyCheck && !confirm('Discard unsaved changes?')) {
      return;
    }

    setError('');
    const wf = await felixService.getWorkflow(workflowName);

    if (!wf) {
      setError('Workflow not found');
      return;
    }

    const normalizedBundles = normalizeBundles(wf.validation_bundles);
    const statusFlow = sanitizeStatusFlow(wf.status_flow);

    const safe = {
      name: wf.name || workflowName,
      display_name: wf.display_name || workflowName,
      description: wf.description || '',
      required_sections: Array.isArray(wf.required_sections) ? wf.required_sections : [],
      conditional_requirements: Array.isArray(wf.conditional_requirements) ? wf.conditional_requirements : [],
      validation_rules: Array.isArray(wf.validation_rules) ? wf.validation_rules : [],
      use_cases: Array.isArray((wf as any).use_cases) ? (wf as any).use_cases : [],
      child_requirements: Array.isArray((wf as any).child_requirements) ? (wf as any).child_requirements : [],
      status_flow_ref: wf.status_flow_ref || null,
      validation_bundles: normalizedBundles,
      status_flow: statusFlow
    } as WorkflowDefinition;

    setSelected(safe);
    setEditor(JSON.stringify(safe, null, 2));
    setRawObj(safe as unknown as Record<string, unknown>);
    setForm(safe);
    setName(wf?.name || '');
    setDisplayName(wf?.display_name || '');
    setDescription(wf?.description || '');
    setParseOk(true);
    setDirty(false);
    setEditorSection('basic');
    setConfigPanel('sections');
  }, [dirty, normalizeBundles, sanitizeStatusFlow]);

  const handleNew = useCallback(() => {
    setShowNewDialog(true);
    setNewWorkflowName('');
  }, []);

  const createNewWorkflow = useCallback(() => {
    if (!newWorkflowName.trim()) {
      return;
    }

    const workflowName = slugify(newWorkflowName);
    const initialFlow = sanitizeStatusFlow({ states: fallbackStatuses });
    const definition = {
      name: workflowName,
      display_name: newWorkflowName,
      description: '',
      required_sections: [],
      conditional_requirements: [],
      validation_rules: [],
      validation_bundles: [],
      status_flow_ref: null,
      status_flow: initialFlow,
    } as WorkflowDefinition;

    setSelected(definition);
    setEditor(JSON.stringify(definition, null, 2));
    setRawObj(definition as unknown as Record<string, unknown>);
    setForm(definition);
    setName(workflowName);
    setDisplayName(newWorkflowName);
    setDescription('');
    setParseOk(true);
    setDirty(true);
    setShowNewDialog(false);
    setEditorSection('basic');
    setConfigPanel('sections');
  }, [fallbackStatuses, newWorkflowName, sanitizeStatusFlow, slugify]);

  const handleSave = useCallback(async () => {
    try {
      setError('');
      let definition: any;

      try {
        definition = JSON.parse(editor || '{}');
        setParseOk(true);
      } catch (err) {
        setParseOk(false);
        throw new Error('Invalid JSON in editor');
      }

      const normalizedName = slugify(name || displayName);

      if (!normalizedName) {
        throw new Error('Workflow name is required');
      }

      if (!/^[a-z0-9_]+$/.test(normalizedName)) {
        throw new Error('Workflow name must be snake_case [a-z0-9_]');
      }

      const base = { ...(rawObj || definition) } as any;
      const rawHadNameSchema = Array.isArray(base.required_sections) && base.required_sections.some((section: any) => section && section.name && !section.section_type);
      const normalizedSections = (form as any).required_sections || [];
      const mergedSections = rawHadNameSchema
        ? normalizedSections.map((section: any) => ({ name: section.section_type || section.name, required: !!section.required, ...section }))
        : normalizedSections;

      const sanitizedBundles = normalizeBundles((form as any).validation_bundles || base.validation_bundles);
      const sanitizedFlow = sanitizeStatusFlow((form as any).status_flow || base.status_flow);

      const merged = {
        ...base,
        name: normalizedName,
        display_name: displayName || normalizedName,
        description: description || base.description || '',
        required_sections: mergedSections || base.required_sections || [],
        conditional_requirements: (form as any).conditional_requirements || base.conditional_requirements || [],
        validation_rules: (form as any).validation_rules || base.validation_rules || [],
        validation_bundles: sanitizedBundles,
        status_flow_ref: (form as any).status_flow_ref ?? base.status_flow_ref ?? null,
        status_flow: sanitizedFlow,
        use_cases: (form as any).use_cases || base.use_cases,
        child_requirements: (form as any).child_requirements || base.child_requirements || [],
      };

      definition = merged;

      if (definition.required_sections && !Array.isArray(definition.required_sections)) {
        throw new Error('required_sections must be an array');
      }

      await felixService.upsertWorkflow(definition);
      await reloadWorkflows();
      setDirty(false);

      if (definition.name) {
        await handleSelect(definition.name, { bypassDirtyCheck: true });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    }
  }, [description, displayName, editor, form, handleSelect, name, normalizeBundles, rawObj, reloadWorkflows, sanitizeStatusFlow, slugify]);

  const handleDelete = useCallback(async () => {
    if (!selected?.name) {
      return;
    }

    if (!(await Promise.resolve(confirm('Delete this workflow?')))) {
      return;
    }

    await felixService.deleteWorkflow(selected.name);
    setSelected(null);
    setEditor('');
    setForm(defaultWorkflowDefinition);
    setName('');
    setDisplayName('');
    setDescription('');
    setDirty(false);
    await reloadWorkflows();
  }, [reloadWorkflows, selected]);

  const bindField = useCallback((field: 'name' | 'display_name' | 'description', value: string) => {
    if (field === 'name') {
      setName(value);
    }

    if (field === 'display_name') {
      setDisplayName(value);
    }

    if (field === 'description') {
      setDescription(value);
    }

    try {
      const next = { ...(form as any) };
      (next as any)[field] = field === 'name' ? slugify(value) : value;
      setForm(next as any);
      setEditor(JSON.stringify(next, null, 2));
      setParseOk(true);
      setError('');
      setDirty(true);
    } catch {
      setParseOk(false);
    }
  }, [form, slugify]);

  const onEditorChange = useCallback((text: string) => {
    setEditor(text);

    try {
      const obj = JSON.parse(text || '{}');
      setName(obj.name || name);
      setDisplayName(obj.display_name || displayName);
      setDescription(obj.description || description);
      const rawSections = obj.required_sections || [];
      const normalizedSections = Array.isArray(rawSections)
        ? rawSections.map((section: any) => ({
            section_type: section.section_type || section.name || 'description',
            required: section.required ?? true,
            conditional_logic: section.conditional_logic,
            validation_criteria: section.validation_criteria,
            validation_schema: section.validation_schema,
            format: section.format,
            min_items: section.min_items,
            min_rules: section.min_rules,
            help_text: section.help_text,
          }))
        : [];

      const normalizedBundles = normalizeBundles(obj.validation_bundles);
      const normalizedFlow = sanitizeStatusFlow(obj.status_flow);

      const nextForm = {
        name: obj.name || '',
        display_name: obj.display_name || '',
        description: obj.description || '',
        required_sections: normalizedSections,
        conditional_requirements: obj.conditional_requirements || [],
        validation_rules: obj.validation_rules || [],
        use_cases: obj.use_cases || [],
        child_requirements: obj.child_requirements || [],
        status_flow_ref: obj.status_flow_ref || null,
        validation_bundles: normalizedBundles,
        status_flow: normalizedFlow,
      } as any;

      setForm(nextForm);
      setRawObj({ ...obj, validation_bundles: normalizedBundles, status_flow: normalizedFlow });
      setParseOk(true);
      setError('');
      setDirty(true);
    } catch {
      setParseOk(false);
    }
  }, [description, displayName, name, normalizeBundles, sanitizeStatusFlow]);

  const loadTasks = useCallback(async () => {
    const resp = await felixService.listTasks({ limit: 200 });
    setTasks(resp.tasks || []);
  }, []);

  useEffect(() => {
    loadTasks().catch(() => {
      /* ignore */
    });
  }, [loadTasks]);

  const saveStatus = useCallback(async (status: Partial<TaskStatusRecord> & { name: string }) => {
    await felixService.saveWorkflowStatus(status);
    await loadStatusMetadata();
  }, [loadStatusMetadata]);

  const removeStatus = useCallback(async (id: string) => {
    await felixService.deleteWorkflowStatus(id);
    await loadStatusMetadata();
  }, [loadStatusMetadata]);

  const saveStatusFlow = useCallback(async (flow: Partial<TaskStatusFlowRecord> & { name: string; status_ids: string[] }) => {
    await felixService.saveWorkflowStatusFlow(flow);
    await loadStatusMetadata();
  }, [loadStatusMetadata]);

  const removeStatusFlow = useCallback(async (id: string) => {
    await felixService.deleteWorkflowStatusFlow(id);
    await loadStatusMetadata();
  }, [loadStatusMetadata]);

  const runValidation = useCallback(async () => {
    setValidation(null);

    try {
      const task = tasks.find((item: any) => item.id === selectedTaskId);

      if (!task) {
        setError('Select a task to validate against');
        return;
      }

      const result = await felixService.validateWorkflow(task, form.name || undefined);
      setValidation(result as ValidationResult);
    } catch (err: any) {
      setError(err.message || 'Validation failed');
    }
  }, [form.name, selectedTaskId, tasks]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return items.filter((workflow) => {
      if (!query) {
        return true;
      }

      return (
        workflow.display_name?.toLowerCase().includes(query) ||
        workflow.name?.toLowerCase().includes(query)
      );
    });
  }, [items, searchQuery]);

  const getWorkflowIcon = useCallback((workflowName: string) => {
    if (workflowName === 'feature_development') {
      return <Sparkles className="h-4 w-4 text-purple-500" />;
    }

    if (workflowName === 'bugfix') {
      return <Bug className="h-4 w-4 text-red-500" />;
    }

    if (workflowName === 'research') {
      return <SearchIcon className="h-4 w-4 text-blue-500" />;
    }

    return <FileText className="h-4 w-4 text-muted-foreground" />;
  }, []);

  const getSectionIcon = useCallback((section: EditorSection) => {
    if (section === 'basic') {
      return <FileText className={cn('h-3 w-3', editorSection === section && 'text-blue-500')} />;
    }

    if (section === 'configuration') {
      return <Settings2 className={cn('h-3 w-3', editorSection === section && 'text-purple-500')} />;
    }

    if (section === 'json') {
      return <Code className={cn('h-3 w-3', editorSection === section && 'text-green-500')} />;
    }

    return null;
  }, [editorSection]);

  const updateDefaultWorkflow = useCallback(async (workflowName: string) => {
    setDefaultWf(workflowName);
    try {
      await felixService.setDefaultWorkflow(workflowName);
    } catch (err: any) {
      setError(err.message || 'Failed to update default workflow');
    }
  }, []);

  const toggleEnforceMapping = useCallback(async () => {
    const next = !enforceMapping;
    setEnforceMapping(next);
    try {
      await felixService.setWorkflowConfig({ enforce_type_mapping: next });
    } catch (err: any) {
      setError(err.message || 'Failed to update workflow configuration');
    }
  }, [enforceMapping]);

  const restoreBuiltInWorkflows = useCallback(async () => {
    try {
      await felixService.reseedBuiltInWorkflows(true);
      await reloadWorkflows();
    } catch (err: any) {
      setError(err.message || 'Failed to restore workflows');
    }
  }, [reloadWorkflows]);

  return {
    items,
    selected,
    editor,
    rawObj,
    error,
    name,
    displayName,
    description,
    parseOk,
    form,
    dirty,
    tasks,
    selectedTaskId,
    validation,
    defaultWf,
    enforceMapping,
    tab,
    editorSection,
    configPanel,
    statusHints: availableStatuses,
    statusPresets,
    configSection,
    mappingKey,
    showNewDialog,
    newWorkflowName,
    searchQuery,
    filteredItems,
    setTab,
    setEditorSection,
    setConfigPanel,
    setConfigSection,
    setMappingKey,
    setShowNewDialog,
    setNewWorkflowName,
    setSearchQuery,
    setForm,
    setSelectedTaskId,
    setParseOk,
    setDirty,
    setValidation,
    updateDefaultWorkflow,
    toggleEnforceMapping,
    restoreBuiltInWorkflows,
    exportSnapshot,
    importSnapshot,
    handleSelect,
    handleNew,
    createNewWorkflow,
    handleSave,
    handleDelete,
    bindField,
    onEditorChange,
    runValidation,
    reloadWorkflows,
    getWorkflowIcon,
    getSectionIcon,
    statusCatalog,
    statusFlows,
    saveStatus,
    removeStatus,
    saveStatusFlow,
    removeStatusFlow,
  };
}
