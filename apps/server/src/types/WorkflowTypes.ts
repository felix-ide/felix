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
  // Optional structural requirements
  subtasks_required?: SubtaskRequirement[];
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
  | 'conclusions'
  | 'next_steps'
  | 'knowledge_rules'
  | 'rules_creation';

export interface SubtaskRequirement {
  label?: string;
  min?: number;
  task_type?: string;
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
