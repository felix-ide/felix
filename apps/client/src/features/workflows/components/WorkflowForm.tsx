import React from 'react';
import { Select } from '@client/shared/ui/Select';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { Textarea } from '@client/shared/ui/Textarea';
import { Checkbox } from '@client/shared/ui/checkbox';
import {
  Plus, Trash2, ChevronUp, ChevronDown,
  FileText, Settings, Info,
  Type, ListChecks, SlidersHorizontal
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { TaskStatusRecord, TaskStatusFlowRecord } from '@/shared/api/workflowsClient';

// Local types aligned with backend expectations
export type WorkflowSectionType =
  | 'title'
  | 'description'
  | 'architecture'
  | 'mockups'
  | 'implementation_checklist'
  | 'test_checklist'
  | 'rules'
  | 'reproduction_steps'
  | 'root_cause_analysis'
  | 'test_verification'
  | 'regression_testing'
  | 'research_goals'
  | 'findings_documentation'
  | 'conclusions'
  | 'next_steps'
  | 'knowledge_rules'
  | 'rules_creation';

type SectionFormat = 'mermaid_note' | 'excalidraw_note' | 'checklist' | 'note' | 'text';

export interface ValidationCriteria {
  min_length?: number;
  max_length?: number;
  min_checklist_items?: number;
  requires_linked_note?: boolean;
  requires_linked_rules?: boolean;
  note_type?: 'documentation' | 'excalidraw' | 'warning';
  must_contain_mermaid?: boolean;
  must_contain_sections?: string[];
  format?: 'checklist' | 'note' | 'text';
  conditional?: string;
  min_rules?: number;
  rule_types?: string[];
}

export interface WorkflowSection {
  section_type: WorkflowSectionType;
  required: boolean;
  conditional_logic?: string;
  validation_criteria?: ValidationCriteria;
  validation_schema?: any;
  format?: SectionFormat;
  min_items?: number;
  min_rules?: number;
  help_text?: string;
}

export interface ConditionalRequirement {
  id: string;
  section_type: WorkflowSectionType;
  condition: string;
  required_when_true: boolean;
  required_when_false: boolean;
  fallback_message?: string;
}

export interface SubtaskRequirement {
  label?: string;
  min?: number;
  task_type?: string;
  status_in?: Array<'todo'|'in_progress'|'blocked'|'done'|'cancelled'>;
  tags_any?: string[];
  with_checklist?: string;
  with_note?: string;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  rule_type?: 'required' | 'format' | 'length' | 'content';
  validation_function?: string;
  error_message?: string;
}

export interface WorkflowDefinition {
  name: string;
  display_name: string;
  description: string;
  required_sections: WorkflowSection[];
  conditional_requirements: ConditionalRequirement[];
  validation_rules: ValidationRule[];
  use_cases?: string[];
  subtasks_required?: SubtaskRequirement[];
  validation_bundles?: WorkflowValidationBundle[];
  status_flow?: WorkflowStatusFlow;
}

export interface WorkflowValidationBundle {
  id: string;
  name: string;
  description?: string;
  sections?: WorkflowSectionType[];
  optional_sections?: WorkflowSectionType[];
  rules?: string[];
  subtasks?: Array<SubtaskRequirement & { optional?: boolean }>;
  guidance_hint?: string;
}

export interface WorkflowStatusFlow {
  initial_state?: string;
  states: string[];
  transitions: WorkflowTransition[];
}

export interface WorkflowTransition {
  id: string;
  from: string;
  to: string;
  label?: string;
  description?: string;
  required_bundles?: string[];
  optional_bundles?: string[];
  pre_prompt_template?: string;
  post_prompt_template?: string;
  gate?: WorkflowTransitionGateConfig;
}

export interface WorkflowTransitionGateConfig {
  require_acknowledgement?: boolean;
  acknowledgement_prompt_template?: string;
  auto_checklist?: {
    name: string;
    items: string[];
    merge_strategy?: 'append' | 'replace';
  };
}

export interface WorkflowFormProps {
  value: WorkflowDefinition;
  onChange: (next: WorkflowDefinition) => void;
  activePanel?: 'sections' | 'status' | 'bundles' | 'rules';
  statusHints?: string[];
  statePresets?: Array<{ id: string; label: string; states: string[] }>;
  statusCatalog?: TaskStatusRecord[];
  statusFlows?: TaskStatusFlowRecord[];
}

const SECTION_TYPES: WorkflowSectionType[] = [
  'title','description','architecture','mockups','implementation_checklist','test_checklist','rules',
  'reproduction_steps','root_cause_analysis','test_verification','regression_testing','research_goals',
  'findings_documentation','conclusions','next_steps','knowledge_rules','rules_creation'
];

const SECTION_FORMATS: SectionFormat[] = ['text','note','checklist','mermaid_note','excalidraw_note'];

const getSectionIcon = (type: WorkflowSectionType) => {
  if (type.includes('checklist')) return <ListChecks className="h-4 w-4" />;
  if (type.includes('architecture') || type.includes('mockup')) return <FileText className="h-4 w-4" />;
  if (type.includes('rules')) return <Settings className="h-4 w-4" />;
  return <Type className="h-4 w-4" />;
};

export function WorkflowForm({
  value,
  onChange,
  activePanel,
  statusHints,
  statePresets,
  statusCatalog = [],
  statusFlows = []
}: WorkflowFormProps) {
  const wf = value;
  const panel: 'sections' | 'status' | 'bundles' | 'rules' = activePanel ?? 'sections';
  const panelMeta = {
    sections: {
      title: 'Sections & Guidance',
      description: 'Define the sections, formats, and guidance that every task in this workflow must complete.'
    },
    status: {
      title: 'Status Flow',
      description: 'Manage the shared statuses and transitions, including prompts, gates, and auto-generated checklists.'
    },
    bundles: {
      title: 'Validation Bundles',
      description: 'Group required sections, subtasks, and rules into reusable bundles you can attach to multiple transitions.'
    },
    rules: {
      title: 'Conditional Requirements & Rules',
      description: 'Add conditional requirements and custom validation rules that the validator runs before transitions.'
    }
  } as const;
  const computedStatusHints = statusHints ?? [];
  const computedPresets = statePresets ?? [];
  const [expandedSections, setExpandedSections] = React.useState<Set<number>>(new Set());
  const [expandedBundles, setExpandedBundles] = React.useState<Set<number>>(new Set());
  const [expandedTransitions, setExpandedTransitions] = React.useState<Set<number>>(new Set());
  const [newStateName, setNewStateName] = React.useState('');
  const makeId = React.useCallback(() => (
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  ), []);
  const cleanStateName = React.useCallback((value: string) => (
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, '')
      .replace(/[\s-]+/g, '_')
  ), []);
  const formatStateLabel = React.useCallback((value: string) => value.replace(/_/g, ' '), []);

  const update = (partial: Partial<WorkflowDefinition>) => onChange({ ...wf, ...partial } as WorkflowDefinition);

  const flowById = React.useMemo(() => {
    const map = new Map<string, TaskStatusFlowRecord>();
    (statusFlows || []).forEach((flow) => {
      if (flow?.id) {
        map.set(flow.id, flow);
      }
    });
    return map;
  }, [statusFlows]);

  const markCustomFlow = React.useCallback(() => {
    if (wf.status_flow_ref !== null) {
      update({ status_flow_ref: null });
    }
  }, [update, wf.status_flow_ref]);
  const sectionTypes = React.useMemo(() => {
    const extras = new Set<string>();
    for (const s of (wf.required_sections||[]) as any[]) {
      if (s?.section_type && !SECTION_TYPES.includes(s.section_type)) extras.add(String(s.section_type));
    }
    return [...SECTION_TYPES, ...Array.from(extras)] as WorkflowSectionType[];
  }, [wf.required_sections]);

  // Sections handlers
  const addSection = () => {
    update({ required_sections: [...(wf.required_sections||[]), {
      section_type: 'description', required: true, format: 'text'
    }] });
  };
  const updateSection = (idx: number, patch: Partial<WorkflowSection>) => {
    const copy = [...(wf.required_sections||[])];
    copy[idx] = { ...copy[idx], ...patch } as WorkflowSection;
    update({ required_sections: copy });
  };
  const removeSection = (idx: number) => {
    const copy = [...(wf.required_sections||[])];
    copy.splice(idx,1);
    update({ required_sections: copy });
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const copy = [...(wf.required_sections||[])];
    const j = idx + dir;
    if (j < 0 || j >= copy.length) return;
    const tmp = copy[idx];
    copy[idx] = copy[j]!;
    copy[j] = tmp!;
    update({ required_sections: copy });
  };

  const toggleSectionExpanded = (idx: number) => {
    const next = new Set(expandedSections);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setExpandedSections(next);
  };

  // Validation bundles handlers
  const bundles = wf.validation_bundles || [];
  const availableRules = wf.validation_rules || [];
  const setBundles = (next: WorkflowValidationBundle[]) => update({ validation_bundles: next });

  const toggleBundleExpanded = (idx: number) => {
    const next = new Set(expandedBundles);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setExpandedBundles(next);
  };

  const addBundle = () => {
    const nextBundle: WorkflowValidationBundle = {
      id: makeId(),
      name: '',
      description: '',
      sections: []
    };
    setBundles([...(bundles || []), nextBundle]);
    setExpandedBundles(new Set(expandedBundles).add((bundles || []).length));
  };

  const updateBundle = (idx: number, patch: Partial<WorkflowValidationBundle>) => {
    const copy = [...(bundles || [])];
    copy[idx] = { ...copy[idx], ...patch } as WorkflowValidationBundle;
    setBundles(copy);
  };

  const removeBundle = (idx: number) => {
    const copy = [...(bundles || [])];
    copy.splice(idx, 1);
    setBundles(copy);
    const next = new Set<number>();
    expandedBundles.forEach((value) => {
      if (value === idx) return;
      next.add(value > idx ? value - 1 : value);
    });
    setExpandedBundles(next);
  };

  const toggleBundleSection = (idx: number, section: WorkflowSectionType, field: 'sections' | 'optional_sections') => {
    const current = bundles?.[idx];
    const existing = new Set(current?.[field] || []);
    if (existing.has(section)) {
      existing.delete(section);
    } else {
      existing.add(section);
    }
    updateBundle(idx, { [field]: Array.from(existing) } as Partial<WorkflowValidationBundle>);
  };

  const toggleBundleRule = (idx: number, ruleId: string) => {
    const current = bundles?.[idx];
    const existing = new Set(current?.rules || []);
    if (existing.has(ruleId)) {
      existing.delete(ruleId);
    } else {
      existing.add(ruleId);
    }
    updateBundle(idx, { rules: Array.from(existing) });
  };

  const updateBundleGuidance = (idx: number, value: string) => {
    updateBundle(idx, { guidance_hint: value });
  };

  // Status flow handlers
  const statusFlow: WorkflowStatusFlow = wf.status_flow ?? { initial_state: '', states: [], transitions: [] };
  const setStatusFlow = (next: WorkflowStatusFlow) => update({ status_flow: next });

  const updateStatusFlow = (patch: Partial<WorkflowStatusFlow>) => {
    setStatusFlow({ ...statusFlow, ...patch });
  };

  const suggestionChips = React.useMemo(() => {
    const existing = new Set(statusFlow.states || []);
    return computedStatusHints
      .map((hint) => {
        const sanitized = cleanStateName(hint);
        return {
          raw: hint,
          sanitized
        };
      })
      .filter(({ sanitized }) => sanitized && !existing.has(sanitized));
  }, [cleanStateName, computedStatusHints, statusFlow.states]);

  const addStateValue = (value: string) => {
    const sanitized = cleanStateName(value);
    if (!sanitized) return;
    const existing = statusFlow.states || [];
    if (existing.includes(sanitized)) return;
    setStatusFlow({
      initial_state: statusFlow.initial_state || sanitized,
      states: [...existing, sanitized],
      transitions: [...(statusFlow.transitions || [])]
    });
    markCustomFlow();
  };

  const addState = () => {
    addStateValue(`state_${(statusFlow.states || []).length + 1}`);
  };

  const updateStateValue = (idx: number, value: string) => {
    const sanitized = cleanStateName(value);
    if (!sanitized) return;
    const nextStates = [...(statusFlow.states || [])];
    const previous = nextStates[idx];
    if (previous === sanitized) return;
    nextStates[idx] = sanitized;
    const nextTransitions = (statusFlow.transitions || []).map((transition) => {
      if (transition.from === previous) {
        return { ...transition, from: sanitized };
      }
      if (transition.to === previous) {
        return { ...transition, to: sanitized };
      }
      return transition;
    });
    const nextInitial = statusFlow.initial_state === previous ? sanitized : statusFlow.initial_state;
    setStatusFlow({
      initial_state: nextInitial,
      states: Array.from(new Set(nextStates)),
      transitions: nextTransitions
    });
    markCustomFlow();
  };

  const removeState = (idx: number) => {
    const target = statusFlow.states?.[idx];
    const nextStates = (statusFlow.states || []).filter((_, i) => i !== idx);
    const nextTransitions = (statusFlow.transitions || []).filter(t => t.from !== target && t.to !== target);
    const nextInitial = statusFlow.initial_state === target ? (nextStates[0] || '') : statusFlow.initial_state;
    setStatusFlow({
      initial_state: nextInitial,
      states: nextStates,
      transitions: nextTransitions
    });
    markCustomFlow();
  };

  const setInitialStateValue = (value: string) => {
    if (!value) {
      updateStatusFlow({ initial_state: '' });
      markCustomFlow();
      return;
    }
    const sanitized = cleanStateName(value);
    if (!sanitized || !(statusFlow.states || []).includes(sanitized)) {
      return;
    }
    updateStatusFlow({ initial_state: sanitized });
    markCustomFlow();
  };

  const applyStatePreset = (presetId: string | null, states: string[]) => {
    const normalized = states.map((state) => cleanStateName(state)).filter(Boolean);
    const uniqueStates = Array.from(new Set(normalized));
    const filteredTransitions = (statusFlow.transitions || []).filter((transition) => {
      const fromOk = transition.from === '*' || uniqueStates.includes(transition.from);
      const toOk = uniqueStates.includes(transition.to);
      return fromOk && toOk;
    });
    setStatusFlow({
      initial_state: uniqueStates[0] || '',
      states: uniqueStates,
      transitions: filteredTransitions
    });
    if (presetId && flowById.has(presetId)) {
      update({ status_flow_ref: presetId });
    } else {
      update({ status_flow_ref: null });
    }
  };

  const addTransition = () => {
    const defaultFrom = statusFlow.states?.[0] || 'todo';
    const defaultTo = statusFlow.states?.[1] || (statusFlow.states?.[0] || 'done');
    const nextTransition: WorkflowTransition = {
      id: makeId(),
      from: defaultFrom,
      to: defaultTo,
      required_bundles: []
    };
    const transitions = [...(statusFlow.transitions || []), nextTransition];
    setStatusFlow({ ...statusFlow, transitions });
    setExpandedTransitions(new Set(expandedTransitions).add(transitions.length - 1));
  };

  const updateTransition = (idx: number, patch: Partial<WorkflowTransition>) => {
    const transitions = [...(statusFlow.transitions || [])];
    transitions[idx] = { ...transitions[idx], ...patch } as WorkflowTransition;
    setStatusFlow({ ...statusFlow, transitions });
  };

  const removeTransition = (idx: number) => {
    const transitions = [...(statusFlow.transitions || [])];
    transitions.splice(idx, 1);
    setStatusFlow({ ...statusFlow, transitions });
    const next = new Set<number>();
    expandedTransitions.forEach((value) => {
      if (value === idx) return;
      next.add(value > idx ? value - 1 : value);
    });
    setExpandedTransitions(next);
  };

  const toggleTransitionBundle = (idx: number, bundleId: string, field: 'required_bundles' | 'optional_bundles') => {
    const transition = statusFlow.transitions?.[idx];
    const existing = new Set(transition?.[field] || []);
    if (existing.has(bundleId)) {
      existing.delete(bundleId);
    } else {
      existing.add(bundleId);
    }
    updateTransition(idx, { [field]: Array.from(existing) } as Partial<WorkflowTransition>);
  };

  const toggleTransitionExpanded = (idx: number) => {
    const next = new Set(expandedTransitions);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setExpandedTransitions(next);
  };

  const updateGateConfig = (idx: number, mutator: (gate: WorkflowTransitionGateConfig) => WorkflowTransitionGateConfig | null) => {
    const gate = statusFlow.transitions?.[idx]?.gate || {};
    const result = mutator({ ...gate });
    if (!result) {
      updateTransition(idx, { gate: undefined });
      return;
    }
    const cleaned: WorkflowTransitionGateConfig = { ...result };
    if (!cleaned.require_acknowledgement) delete cleaned.require_acknowledgement;
    if (!cleaned.acknowledgement_prompt_template) delete cleaned.acknowledgement_prompt_template;
    if (!cleaned.auto_checklist) delete cleaned.auto_checklist;
    if (!cleaned.require_acknowledgement && !cleaned.acknowledgement_prompt_template && !cleaned.auto_checklist) {
      updateTransition(idx, { gate: undefined });
      return;
    }
    updateTransition(idx, { gate: cleaned });
  };

  const toggleGateRequirement = (idx: number, checked: boolean) => {
    updateGateConfig(idx, (gate) => {
      const next = { ...gate };
      if (checked) {
        next.require_acknowledgement = true;
      } else {
        delete next.require_acknowledgement;
        delete next.acknowledgement_prompt_template;
      }
      return next;
    });
  };

  const updateGatePrompt = (idx: number, value: string) => {
    updateGateConfig(idx, (gate) => ({
      ...gate,
      acknowledgement_prompt_template: value
    }));
  };

  const toggleAutoChecklist = (idx: number, checked: boolean) => {
    updateGateConfig(idx, (gate) => {
      const next = { ...gate } as WorkflowTransitionGateConfig;
      if (checked) {
        next.auto_checklist = gate.auto_checklist || { name: '', items: [], merge_strategy: 'append' };
      } else {
        delete next.auto_checklist;
      }
      return next;
    });
  };

  const updateAutoChecklistName = (idx: number, value: string) => {
    updateGateConfig(idx, (gate) => ({
      ...gate,
      auto_checklist: {
        ...(gate.auto_checklist || { merge_strategy: 'append', items: [] }),
        name: value
      }
    }));
  };

  const updateAutoChecklistItems = (idx: number, value: string) => {
    const items = value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    updateGateConfig(idx, (gate) => ({
      ...gate,
      auto_checklist: {
        ...(gate.auto_checklist || { merge_strategy: 'append', name: '' }),
        items
      }
    }));
  };

  const updateAutoChecklistStrategy = (idx: number, value: 'append' | 'replace') => {
    updateGateConfig(idx, (gate) => ({
      ...gate,
      auto_checklist: {
        ...(gate.auto_checklist || { name: '', items: [] }),
        merge_strategy: value
      }
    }));
  };

  const guidanceExamples: Record<WorkflowSectionType, string> = {
    title: 'Short, action-oriented title (<= 80 chars).',
    description: 'Context, goals, non-goals, constraints. Include links to prior art.',
    architecture: 'Use mermaid C4 or component diagram. Call out boundaries and data flow.',
    mockups: 'Attach screenshots or link Figma frames. Mention edge cases.',
    implementation_checklist: '- [ ] Add domain models\n- [ ] Wire API routes\n- [ ] Write migrations',
    test_checklist: '- [ ] Unit tests\n- [ ] Integration tests\n- [ ] E2E happy path',
    rules: 'List codified rules or guidelines this change must follow.',
    reproduction_steps: 'Enumerate steps to reproduce the bug reliably.',
    root_cause_analysis: 'What failed, why it failed, and where detection lagged.',
    test_verification: 'Describe how you verified the fix; include logs/screens.',
    regression_testing: 'Areas touched by the change to retest.',
    research_goals: 'What do we want to learn? Success criteria.',
    findings_documentation: 'Summarize findings with citations.',
    conclusions: 'Key takeaways and decisions.',
    next_steps: 'Concrete follow-ups with owners and dates.',
    knowledge_rules: 'Rules to add to knowledge base from this work.',
    rules_creation: 'Describe any new rules created and their intent.'
  } as const;

  // Conditionals
  const uid = () => makeId();
  const addConditional = () => {
    update({ conditional_requirements: [...(wf.conditional_requirements||[]), {
      id: uid(), section_type: 'description', condition: '', required_when_true: true, required_when_false: false
    }] });
  };
  const updateConditional = (idx: number, patch: Partial<ConditionalRequirement>) => {
    const copy = [...(wf.conditional_requirements||[])];
    copy[idx] = { ...copy[idx], ...patch } as ConditionalRequirement;
    update({ conditional_requirements: copy });
  };
  const removeConditional = (idx: number) => {
    const copy = [...(wf.conditional_requirements||[])];
    copy.splice(idx,1);
    update({ conditional_requirements: copy });
  };

  // Validation rules
  const addRule = () => {
    update({ validation_rules: [...(wf.validation_rules||[]), { id: crypto.randomUUID(), name: '', description: '', rule_type: 'required' }] });
  };
  const updateRule = (idx: number, patch: Partial<ValidationRule>) => {
    const copy = [...(wf.validation_rules||[])];
    copy[idx] = { ...copy[idx], ...patch } as ValidationRule;
    update({ validation_rules: copy });
  };
  const removeRule = (idx: number) => {
    const copy = [...(wf.validation_rules||[])];
    copy.splice(idx,1);
    update({ validation_rules: copy });
  };
  const sectionsEditor = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Required Sections</h3>
        <Button size="sm" onClick={addSection} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Section
        </Button>
      </div>

      {(wf.required_sections||[]).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
          No sections defined. Click "Add Section" to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {(wf.required_sections||[]).map((sec, idx) => (
            <div key={idx} className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-muted-foreground">
                    {getSectionIcon(sec.section_type)}
                  </div>

                  <div className="flex-1 grid grid-cols-12 gap-3">
                    <div className="col-span-4">
                      <Select
                        value={sec.section_type || 'description'}
                        onChange={(e)=>updateSection(idx, { section_type: e.target.value as WorkflowSectionType })}
                      >
                        {sectionTypes.map(t => <option key={t} value={t}>{String(t).replace(/_/g,' ')}</option>)}
                      </Select>
                    </div>

                    <div className="col-span-3">
                      <Select
                        value={sec.format || 'text'}
                        onChange={(e)=>updateSection(idx, { format: e.target.value as SectionFormat })}
                      >
                        {SECTION_FORMATS.map(f => <option key={f} value={f}>{f.replace(/_/g,' ')}</option>)}
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={sec.min_items ?? ''}
                        onChange={(e)=>updateSection(idx, { min_items: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="Min items"
                      />
                    </div>

                    <div className="col-span-3 flex items-center gap-2">
                      <Checkbox
                        checked={!!sec.required}
                        onCheckedChange={(c)=>updateSection(idx, { required: !!c })}
                      />
                      <label className="text-sm cursor-pointer">Required</label>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => moveSection(idx, -1)}
                      disabled={idx === 0}
                      className="h-8 w-8"
                      title="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => moveSection(idx, 1)}
                      disabled={idx === (wf.required_sections?.length || 1) - 1}
                      className="h-8 w-8"
                      title="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleSectionExpanded(idx)}
                      className="h-8 w-8"
                      title={expandedSections.has(idx) ? "Hide advanced options" : "Show advanced options"}
                    >
                      <SlidersHorizontal className={cn(
                        "h-4 w-4",
                        expandedSections.has(idx) && "text-primary"
                      )} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeSection(idx)}
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 ml-7">
                  <Textarea
                    value={sec.help_text || ''}
                    onChange={(e) => updateSection(idx, { help_text: e.target.value })}
                    placeholder="Guidance shown to users for this section..."
                    rows={2}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateSection(idx, { help_text: guidanceExamples[sec.section_type] || '' })}
                    className="mt-2 text-xs gap-1"
                  >
                    <Info className="h-3 w-3" />
                    Use Example
                  </Button>
                </div>

                {expandedSections.has(idx) && (
                  <div className="mt-4 ml-7 p-3 bg-muted/50 rounded-lg space-y-3">
                    <h4 className="text-xs font-medium text-muted-foreground">Advanced Settings</h4>

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Conditional Logic"
                        value={sec.conditional_logic || ''}
                        onChange={(e) => updateSection(idx, { conditional_logic: e.target.value })}
                        placeholder="e.g., task_type === 'bug'"
                        className="text-sm"
                      />

                      <Input
                        label="Min Rules"
                        type="number"
                        value={sec.min_rules ?? ''}
                        onChange={(e) => updateSection(idx, { min_rules: e.target.value ? Number(e.target.value) : undefined })}
                        className="text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Min Length"
                        type="number"
                        value={sec.validation_criteria?.min_length ?? ''}
                        onChange={(e) => updateSection(idx, {
                          validation_criteria: {
                            ...(sec.validation_criteria || {}),
                            min_length: e.target.value ? Number(e.target.value) : undefined
                          }
                        })}
                        className="text-sm"
                      />

                      <Input
                        label="Max Length"
                        type="number"
                        value={sec.validation_criteria?.max_length ?? ''}
                        onChange={(e) => updateSection(idx, {
                          validation_criteria: {
                            ...(sec.validation_criteria || {}),
                            max_length: e.target.value ? Number(e.target.value) : undefined
                          }
                        })}
                        className="text-sm"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={!!sec.validation_criteria?.requires_linked_note}
                          onCheckedChange={(c) => updateSection(idx, {
                            validation_criteria: {
                              ...(sec.validation_criteria || {}),
                              requires_linked_note: !!c
                            }
                          })}
                        />
                        Requires linked note
                      </label>

                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={!!sec.validation_criteria?.requires_linked_rules}
                          onCheckedChange={(c) => updateSection(idx, {
                            validation_criteria: {
                              ...(sec.validation_criteria || {}),
                              requires_linked_rules: !!c
                            }
                          })}
                        />
                        Requires linked rules
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const bundlesEditor = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Validation Bundles</h3>
        <Button size="sm" variant="outline" onClick={addBundle} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Bundle
        </Button>
      </div>

      {bundles.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
          No validation bundles defined.
        </div>
      ) : (
        <div className="space-y-3">
          {bundles.map((bundle, idx) => {
            const expanded = expandedBundles.has(idx);
            return (
              <div key={bundle.id || idx} className="border border-border rounded-lg bg-card/40">
                <div className="flex items-start justify-between p-3">
                  <div>
                    <div className="text-sm font-medium">{bundle.name || `Bundle ${idx + 1}`}</div>
                    <div className="text-xs text-muted-foreground">
                      ID: <code>{bundle.id}</code> · {(bundle.sections || []).length} required section(s)
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleBundleExpanded(idx)}
                      className="h-8 px-2 text-xs"
                    >
                      {expanded ? 'Hide' : 'Edit'}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeBundle(idx)}
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      title="Remove bundle"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <Input
                      label="Display Name"
                      value={bundle.name || ''}
                      onChange={(event) => updateBundle(idx, { name: event.target.value })}
                      placeholder="e.g., Spec Ready Checklist"
                    />

                    <Textarea
                      value={bundle.description || ''}
                      onChange={(event) => updateBundle(idx, { description: event.target.value })}
                      placeholder="Describe when to use this bundle..."
                      rows={2}
                      className="text-sm"
                    />

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Required Sections</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {sectionTypes.map((section) => (
                          <label key={section} className="flex items-center gap-2 text-xs">
                            <Checkbox
                              checked={(bundle.sections || []).includes(section)}
                              onCheckedChange={() => toggleBundleSection(idx, section, 'sections')}
                            />
                            {getSectionIcon(section)} {section}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Optional Sections</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {sectionTypes.map((section) => (
                          <label key={section} className="flex items-center gap-2 text-xs">
                            <Checkbox
                              checked={(bundle.optional_sections || []).includes(section)}
                              onCheckedChange={() => toggleBundleSection(idx, section, 'optional_sections')}
                            />
                            {getSectionIcon(section)} {section}
                          </label>
                        ))}
                      </div>
                    </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Validation Rules</p>
                        {availableRules.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Add validation rules below to reference them here.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {availableRules.map((rule) => {
                              const identifier = rule.id || rule.name || '';
                              if (!identifier) return null;
                              return (
                                <label key={identifier} className="flex items-start gap-2 text-xs">
                                  <Checkbox
                                    checked={(bundle.rules || []).includes(identifier)}
                                    onCheckedChange={() => toggleBundleRule(idx, identifier)}
                                  />
                                  <span className="flex-1">
                                    <span className="block font-medium text-xs text-foreground">
                                      {rule.name || identifier}
                                    </span>
                                    {rule.description && (
                                      <span className="block text-[11px] text-muted-foreground leading-snug">
                                        {rule.description}
                                      </span>
                                    )}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    <Textarea
                      value={bundle.guidance_hint || ''}
                      onChange={(event) => updateBundleGuidance(idx, event.target.value)}
                      placeholder="AI guidance shown when this bundle is requested..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const statusEditor = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Status Flow</h3>
        <Button size="sm" variant="outline" onClick={addTransition} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Transition
        </Button>
      </div>

      {computedPresets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {computedPresets.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant="outline"
              size="xs"
              onClick={() => applyStatePreset(preset.id ?? null, preset.states)}
              className="h-7"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">States</p>
            <Button size="sm" variant="outline" onClick={addState} className="text-xs h-7">
              Add State
            </Button>
          </div>
          <div className="space-y-2">
            {statusFlow.states && statusFlow.states.length > 0 ? (
              statusFlow.states.map((state, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={state}
                    onChange={(event) => updateStateValue(idx, event.target.value)}
                    placeholder="e.g., spec_ready"
                    className="text-sm"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeState(idx)}
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                    title="Remove state"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground border border-dashed border-border rounded-md py-4 text-center">
                No workflow states configured.
              </div>
            )}
          </div>

          {suggestionChips.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {suggestionChips.map(({ raw, sanitized }) => (
                <Button
                  key={sanitized}
                  type="button"
                  size="xs"
                  variant="ghost"
                  className="h-7 px-3 border border-dashed border-border"
                  onClick={() => addStateValue(sanitized)}
                >
                  {formatStateLabel(sanitized || raw)}
                </Button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Input
              value={newStateName}
              onChange={(event) => setNewStateName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addStateValue(newStateName);
                  setNewStateName('');
                }
              }}
              placeholder="Add custom state (e.g., ready_for_review)"
              className="text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                addStateValue(newStateName);
                setNewStateName('');
              }}
              disabled={!newStateName.trim()}
            >
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Initial State</p>
          <select
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
            value={statusFlow.initial_state || ''}
            onChange={(event) => setInitialStateValue(event.target.value)}
          >
            <option value="">(none)</option>
              {(statusFlow.states || []).map((state) => (
                <option key={state} value={state}>{formatStateLabel(state)}</option>
              ))}
            </select>
          </div>
      </div>

      {(statusFlow.transitions || []).length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
          No transitions defined.
        </div>
      ) : (
        <div className="space-y-3">
          {(statusFlow.transitions || []).map((transition, idx) => {
            const expanded = expandedTransitions.has(idx);
            return (
              <div key={transition.id || idx} className="border border-border rounded-lg bg-card/40">
                <div className="flex items-start justify-between p-3">
                  <div>
                    <div className="text-sm font-medium">
                      {transition.label || `${transition.from === '*' ? 'any' : formatStateLabel(transition.from)} → ${formatStateLabel(transition.to)}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {transition.from === '*' ? 'any' : formatStateLabel(transition.from)} → {formatStateLabel(transition.to)}{' '}
                      {(transition.required_bundles || []).length > 0 && (
                        <>· {(transition.required_bundles || []).length} bundle(s)</>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleTransitionExpanded(idx)}
                      className="h-8 px-2 text-xs"
                    >
                      {expanded ? 'Hide' : 'Edit'}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeTransition(idx)}
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      title="Remove transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">From</label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                          value={transition.from}
                          onChange={(event) => updateTransition(idx, { from: event.target.value })}
                        >
                          <option value="*">Any</option>
                            {(statusFlow.states || []).map((state) => (
                              <option key={state} value={state}>{formatStateLabel(state)}</option>
                            ))}
                          </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">To</label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                          value={transition.to}
                          onChange={(event) => updateTransition(idx, { to: event.target.value })}
                        >
                            {(statusFlow.states || []).map((state) => (
                              <option key={state} value={state}>{formatStateLabel(state)}</option>
                            ))}
                          </select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <Input
                        label="Label"
                        value={transition.label || ''}
                        onChange={(event) => updateTransition(idx, { label: event.target.value })}
                        placeholder="e.g., Start Work"
                      />
                      <Input
                        label="Description"
                        value={transition.description || ''}
                        onChange={(event) => updateTransition(idx, { description: event.target.value })}
                        placeholder="Short description of this transition"
                      />
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Required Bundles</p>
                      {bundles.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No bundles available.</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {bundles.map((bundleOption) => (
                            <label key={bundleOption.id} className="flex items-center gap-2 text-xs">
                              <Checkbox
                                checked={(transition.required_bundles || []).includes(bundleOption.id)}
                                onCheckedChange={() => toggleTransitionBundle(idx, bundleOption.id, 'required_bundles')}
                              />
                              {bundleOption.name || bundleOption.id}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Optional Bundles</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {bundles.map((bundleOption) => (
                          <label key={bundleOption.id} className="flex items-center gap-2 text-xs">
                            <Checkbox
                              checked={(transition.optional_bundles || []).includes(bundleOption.id)}
                              onCheckedChange={() => toggleTransitionBundle(idx, bundleOption.id, 'optional_bundles')}
                            />
                            {bundleOption.name || bundleOption.id}
                          </label>
                        ))}
                      </div>
                    </div>

                    <Textarea
                      value={transition.pre_prompt_template || ''}
                      onChange={(event) => updateTransition(idx, { pre_prompt_template: event.target.value })}
                      placeholder="Prompt shown when this transition is requested..."
                      rows={2}
                      className="text-sm"
                    />

                    <Textarea
                      value={transition.post_prompt_template || ''}
                      onChange={(event) => updateTransition(idx, { post_prompt_template: event.target.value })}
                      placeholder="Prompt shown after this transition succeeds..."
                      rows={2}
                      className="text-sm"
                    />

                    <div className="border border-border rounded-md bg-background/70 p-3 space-y-3">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Checkbox
                            checked={Boolean(transition.gate?.require_acknowledgement)}
                            onCheckedChange={(checked) => toggleGateRequirement(idx, Boolean(checked))}
                          />
                          Require acknowledgement before status change
                        </label>

                        {transition.gate?.require_acknowledgement && (
                          <Textarea
                            value={transition.gate?.acknowledgement_prompt_template || ''}
                            onChange={(event) => updateGatePrompt(idx, event.target.value)}
                            placeholder="Prompt shown to the AI when the acknowledgement token is issued..."
                            rows={2}
                            className="text-sm"
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Checkbox
                            checked={Boolean(transition.gate?.auto_checklist)}
                            onCheckedChange={(checked) => toggleAutoChecklist(idx, Boolean(checked))}
                          />
                          Attach auto-generated checklist on this transition
                        </label>

                        {transition.gate?.auto_checklist && (
                          <div className="space-y-2">
                            <Input
                              label="Checklist Name"
                              value={transition.gate.auto_checklist.name || ''}
                              onChange={(event) => updateAutoChecklistName(idx, event.target.value)}
                              placeholder="e.g., Spec Validation"
                            />
                            <Textarea
                              value={(transition.gate.auto_checklist.items || []).join('\n')}
                              onChange={(event) => updateAutoChecklistItems(idx, event.target.value)}
                              placeholder="One item per line"
                              rows={3}
                              className="text-sm"
                            />
                            <Select
                              label="Merge Strategy"
                              value={transition.gate.auto_checklist.merge_strategy || 'append'}
                              onChange={(event) => updateAutoChecklistStrategy(idx, event.target.value as 'append' | 'replace')}
                            >
                              <option value="append">Append missing items</option>
                              <option value="replace">Replace existing checklist</option>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const rulesEditor = (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Conditional Requirements</h3>
          <Button size="sm" onClick={addConditional} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Condition
          </Button>
        </div>

        {(wf.conditional_requirements||[]).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
            No conditional requirements defined.
          </div>
        ) : (
          <div className="space-y-2">
            {(wf.conditional_requirements||[]).map((cond, idx) => (
              <div key={idx} className="border border-border rounded-lg p-4 bg-card">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-3">
                    <Select
                      label="Section"
                      value={cond.section_type || 'description'}
                      onChange={(e) => updateConditional(idx, { section_type: e.target.value as WorkflowSectionType })}
                    >
                      {sectionTypes.map(t => <option key={t} value={t}>{String(t).replace(/_/g,' ')}</option>)}
                    </Select>
                  </div>

                  <div className="col-span-4">
                    <Input
                      label="Condition"
                      value={cond.condition || ''}
                      onChange={(e) => updateConditional(idx, { condition: e.target.value })}
                      placeholder="e.g., task_type === 'bug'"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-sm font-medium mb-1.5 block">If True</label>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={!!cond.required_when_true}
                        onCheckedChange={(c) => updateConditional(idx, { required_when_true: !!c })}
                      />
                      <span className="text-sm">Required</span>
                    </label>
                  </div>

                  <div className="col-span-2">
                    <label className="text-sm font-medium mb-1.5 block">If False</label>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={!!cond.required_when_false}
                        onCheckedChange={(c) => updateConditional(idx, { required_when_false: !!c })}
                      />
                      <span className="text-sm">Required</span>
                    </label>
                  </div>

                  <div className="col-span-1 flex items-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeConditional(idx)}
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3">
                  <Input
                    label="Fallback Message"
                    value={cond.fallback_message || ''}
                    onChange={(e) => updateConditional(idx, { fallback_message: e.target.value })}
                    placeholder="Message shown when condition doesn't apply..."
                    className="text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Validation Rules</h3>
          <Button size="sm" onClick={addRule} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
        </div>

        {(wf.validation_rules||[]).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
            No validation rules defined.
          </div>
        ) : (
          <div className="space-y-2">
            {(wf.validation_rules||[]).map((rule, idx) => (
              <div key={idx} className="border border-border rounded-lg p-4 bg-card">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-3">
                    <Input
                      label="Rule Name"
                      value={rule.name || ''}
                      onChange={(e) => updateRule(idx, { name: e.target.value })}
                      placeholder="e.g., Title length"
                    />
                  </div>

                  <div className="col-span-5">
                    <Input
                      label="Description"
                      value={rule.description || ''}
                      onChange={(e) => updateRule(idx, { description: e.target.value })}
                      placeholder="What this rule validates..."
                    />
                  </div>

                  <div className="col-span-3">
                    <Select
                      label="Rule Type"
                      value={rule.rule_type || 'required'}
                      onChange={(e) => updateRule(idx, { rule_type: e.target.value as any })}
                    >
                      <option value="required">Required</option>
                      <option value="format">Format</option>
                      <option value="length">Length</option>
                      <option value="content">Content</option>
                    </Select>
                  </div>

                  <div className="col-span-1 flex items-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeRule(idx)}
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3">
                  <Input
                    label="Error Message"
                    value={rule.error_message || ''}
                    onChange={(e) => updateRule(idx, { error_message: e.target.value })}
                    placeholder="Message shown when validation fails..."
                    className="text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold">{panelMeta[panel].title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{panelMeta[panel].description}</p>
      </div>

      {panel === 'sections' && sectionsEditor}
      {panel === 'bundles' && bundlesEditor}
      {panel === 'status' && statusEditor}
      {panel === 'rules' && rulesEditor}
    </div>
  );
}
