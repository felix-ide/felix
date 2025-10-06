import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EntityLink } from '@client/shared/components/EntityLinksSection';
import type { RuleData } from '@/types/api';

export interface RuleFormState {
  name: string;
  description: string;
  rule_type: RuleData['rule_type'];
  guidance_text: string;
  priority: number;
  auto_apply: boolean;
  active: boolean;
  code_template: string;
  validation_script: string;
  trigger_patterns: Record<string, unknown>;
  semantic_triggers: Record<string, unknown>;
  context_conditions: Record<string, unknown>;
  exclusion_patterns: Record<string, unknown>;
  merge_strategy: RuleData['merge_strategy'];
  confidence_threshold: number;
  entity_links: EntityLink[];
  stable_tags: string[];
  stable_links: Record<string, unknown>;
  fragile_links: Record<string, unknown>;
}

export interface RuleCardEditingApi {
  isEditing: boolean;
  formState: RuleFormState;
  newTag: string;
  startEditing: () => void;
  cancelEditing: () => void;
  commitEditing: () => Partial<RuleData>;
  setNewTag: (value: string) => void;
  updateField: <K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
}

const createInitialState = (rule: RuleData): RuleFormState => ({
  name: rule.name,
  description: rule.description || '',
  rule_type: rule.rule_type,
  guidance_text: rule.guidance_text || '',
  priority: rule.priority,
  auto_apply: rule.auto_apply,
  active: rule.active,
  code_template: rule.code_template || '',
  validation_script: rule.validation_script || '',
  trigger_patterns: rule.trigger_patterns ? { ...rule.trigger_patterns } : {},
  semantic_triggers: rule.semantic_triggers ? { ...rule.semantic_triggers } : {},
  context_conditions: rule.context_conditions ? { ...rule.context_conditions } : {},
  exclusion_patterns: rule.exclusion_patterns ? { ...rule.exclusion_patterns } : {},
  merge_strategy: (rule.merge_strategy ?? 'append') as RuleData['merge_strategy'],
  confidence_threshold: rule.confidence_threshold ?? 0.8,
  entity_links: rule.entity_links ? [...rule.entity_links] : [],
  stable_tags: rule.stable_tags ? [...rule.stable_tags] : [],
  stable_links: rule.stable_links ? { ...rule.stable_links } : {},
  fragile_links: rule.fragile_links ? { ...rule.fragile_links } : {},
});

const sanitizeUpdates = (state: RuleFormState): Partial<RuleData> => ({
  name: state.name.trim(),
  description: state.description.trim() || undefined,
  rule_type: state.rule_type,
  guidance_text: state.guidance_text.trim(),
  priority: state.priority,
  auto_apply: state.auto_apply,
  active: state.active,
  code_template: state.code_template.trim() || undefined,
  validation_script: state.validation_script.trim() || undefined,
  trigger_patterns: Object.keys(state.trigger_patterns || {}).length > 0 ? state.trigger_patterns : undefined,
  semantic_triggers: Object.keys(state.semantic_triggers || {}).length > 0 ? state.semantic_triggers : undefined,
  context_conditions: Object.keys(state.context_conditions || {}).length > 0 ? state.context_conditions : undefined,
  exclusion_patterns: Object.keys(state.exclusion_patterns || {}).length > 0 ? state.exclusion_patterns : undefined,
  merge_strategy: state.merge_strategy,
  confidence_threshold: state.confidence_threshold,
  stable_tags: state.stable_tags.length > 0 ? state.stable_tags : undefined,
  entity_links: state.entity_links.length > 0 ? state.entity_links : undefined,
  stable_links: Object.keys(state.stable_links || {}).length > 0 ? state.stable_links : undefined,
  fragile_links: Object.keys(state.fragile_links || {}).length > 0 ? state.fragile_links : undefined,
});

export function useRuleCardEditing(rule: RuleData): RuleCardEditingApi {
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<RuleFormState>(() => createInitialState(rule));
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (!isEditing) {
      setFormState(createInitialState(rule));
      setNewTag('');
    }
  }, [rule, isEditing]);

  const updateField = useCallback(<K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const startEditing = useCallback(() => {
    setFormState(createInitialState(rule));
    setNewTag('');
    setIsEditing(true);
  }, [rule]);

  const cancelEditing = useCallback(() => {
    setFormState(createInitialState(rule));
    setNewTag('');
    setIsEditing(false);
  }, [rule]);

  const commitEditing = useCallback(() => {
    const updates = sanitizeUpdates(formState);
    setIsEditing(false);
    setNewTag('');
    return updates;
  }, [formState]);

  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setFormState((prev) => (
      prev.stable_tags.includes(trimmed)
        ? prev
        : { ...prev, stable_tags: [...prev.stable_tags, trimmed] }
    ));
    setNewTag('');
  }, []);

  const removeTag = useCallback((tag: string) => {
    setFormState((prev) => ({
      ...prev,
      stable_tags: prev.stable_tags.filter((existing) => existing !== tag),
    }));
  }, []);

  return useMemo(() => ({
    isEditing,
    formState,
    newTag,
    startEditing,
    cancelEditing,
    commitEditing,
    setNewTag,
    updateField,
    addTag,
    removeTag,
  }), [isEditing, formState, newTag, startEditing, cancelEditing, commitEditing, updateField, addTag, removeTag]);
}
