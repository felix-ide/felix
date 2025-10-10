/**
 * Core workflow types for structured task creation
 */

import { CreateTaskParams as BaseCreateTaskParams } from '@felix/code-intelligence';

export interface WorkflowDefinition {
  name: string;
  display_name: string;
  description: string;
  required_sections: WorkflowSection[];
  conditional_requirements: ConditionalRequirement[];
  validation_rules: ValidationRule[];
  use_cases?: string[];
  // Hierarchical task structure requirements
  child_requirements?: ChildTaskRequirement[];
  // Optional structural requirements (deprecated in favor of child_requirements)
  subtasks_required?: SubtaskRequirement[];
  validation_bundles?: WorkflowValidationBundle[];
  status_flow_ref?: string | null;
  status_flow?: WorkflowStatusFlow;
}

/**
 * Defines what child tasks are required under this workflow
 */
export interface ChildTaskRequirement {
  // What type of child task is required
  child_task_type: string; // e.g., 'story', 'task', 'subtask'

  // What workflow the child must follow
  required_workflow: string;

  // Minimum number required
  min_count?: number;

  // Maximum number allowed (optional)
  max_count?: number;

  // Label for UI/guidance
  label?: string;

  // Description for why these children are needed
  description?: string;

  // Additional validation for children
  validation?: {
    // All children must be in these statuses for parent to advance
    all_must_be_in?: Array<'todo'|'in_progress'|'blocked'|'done'|'cancelled'>;

    // At least one child must be in these statuses
    at_least_one_in?: Array<'todo'|'in_progress'|'blocked'|'done'|'cancelled'>;

    // Children must have specific tags
    required_tags?: string[];
  };
}

export interface WorkflowSection {
  section_type: WorkflowSectionType;
  required: boolean;
  conditional_logic?: string;
  validation_criteria?: ValidationCriteria;
  validation_schema?: ValidationSchema;
  format?: SectionFormat;
  min_items?: number;
  min_rules?: number;
  help_text?: string;
}

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

export type WorkflowSectionType =
  | 'title'
  | 'description'
  | 'architecture'
  | 'erd'
  | 'api_contract'
  | 'observability'
  | 'decision_record'
  | 'acceptance_criteria'
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
  | 'findings'
  | 'conclusions'
  | 'next_steps'
  | 'knowledge_rules'
  | 'rules_creation'
  | 'scope_definition';

export interface SubtaskRequirement {
  label?: string;
  min?: number;
  task_type?: string;
  required_workflow?: string; // Workflow that child tasks must follow
  status_in?: Array<'todo'|'in_progress'|'blocked'|'done'|'cancelled'>;
  tags_any?: string[];
  with_checklist?: string;
  with_note?: string;
}

export type SectionFormat = 
  | 'mermaid_note'
  | 'excalidraw_note'
  | 'checklist'
  | 'note'
  | 'text';

export interface ConditionalRequirement {
  id: string;
  section_type: WorkflowSectionType;
  condition: string;
  required_when_true: boolean;
  required_when_false: boolean;
  fallback_message?: string;
  context_detection?: {
    keywords: string[];
    file_patterns: string[];
    entity_types: string[];
  };
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  rule_type?: 'required' | 'format' | 'length' | 'content';
  validator?: (value: any) => ValidationResult;
  validation_function?: string;
  error_message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface ValidationSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface TaskContext {
  type: 'frontend' | 'backend' | 'full-stack';
  detected_from: ('keywords' | 'files' | 'tags' | 'explicit')[];
  confidence: number;
}

export interface WorkflowValidationError {
  error: string;
  missing_requirements: string[];
  workflow_used: string;
  can_override: boolean;
  suggestions?: string[];
}

export interface CreateTaskParams extends BaseCreateTaskParams {
  workflow?: string;
  skip_validation?: boolean;
}

export interface ValidationStatus {
  is_valid: boolean;
  completion_percentage: number;
  missing_requirements: MissingRequirement[];
  completed_requirements: string[];
  workflow: string;
  can_override: boolean;
  bundle_id?: string;
  bundle_name?: string;
  // Optional: future gate signals
  // spec_state_satisfied?: boolean;
}

export interface MissingRequirement {
  section_type: WorkflowSectionType;
  description: string;
  action_needed: string;
  is_conditional: boolean;
  condition_not_met?: string;
}

export type WorkflowType = 'simple' | 'feature_development' | 'bugfix' | 'research';

export interface WorkflowConfig {
  default_workflow: WorkflowType;
  allow_override: boolean;
  strict_validation: boolean;
  emergency_bypass_enabled: boolean;
  conditional_rules_enabled: boolean;
}

export type SpecState = 'draft' | 'spec_in_progress' | 'spec_ready';

export interface SpecWaiver {
  code: string; // matches section_type or requirement code
  reason: string;
  added_by?: string;
  added_at?: string; // ISO
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

export interface TransitionGatePayload {
  gate_id: string;
  transition_id: string;
  workflow: string;
  target_status: string;
  prompt: string;
  issued_token: string;
  created_at: string;
}

