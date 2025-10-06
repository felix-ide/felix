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
}

export interface WorkflowFormProps {
  value: WorkflowDefinition;
  onChange: (next: WorkflowDefinition) => void;
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

export function WorkflowForm({ value, onChange }: WorkflowFormProps) {
  const wf = value;
  const [expandedSections, setExpandedSections] = React.useState<Set<number>>(new Set());

  const update = (partial: Partial<WorkflowDefinition>) => onChange({ ...wf, ...partial } as WorkflowDefinition);
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
  const uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
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

  return (
    <div className="space-y-6">
      {/* Sections Editor */}
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

                  {/* Help text */}
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

                  {/* Advanced settings */}
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

      {/* Conditional Requirements */}
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

      {/* Validation Rules */}
      <div className="space-y-4">
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
    </div>
  );
}
