/**
 * Built-in workflow definitions for structured task creation
 */

import { WorkflowDefinition, WorkflowType } from '../types/WorkflowTypes.js';
import { FeatureDevelopmentWorkflow as FEATURE_DEVELOPMENT_WORKFLOW } from '../workflows/definitions/FeatureDevelopmentWorkflow.js';
import { BugfixWorkflow as BUGFIX_WORKFLOW } from '../workflows/definitions/BugfixWorkflow.js';
import { ResearchWorkflow as RESEARCH_WORKFLOW } from '../workflows/definitions/ResearchWorkflow.js';

export const SIMPLE_WORKFLOW: WorkflowDefinition = {
  name: 'simple',
  display_name: 'Simple Task',
  description: 'Basic task with minimal requirements',
  required_sections: [
    {
      section_type: 'title',
      required: true
    },
    {
      section_type: 'description',
      required: false
    }
  ],
  conditional_requirements: [],
  validation_rules: [],
  use_cases: ['Quick fixes', 'Small updates', 'Documentation tweaks', 'Minor refactoring']
};

/**
 * All built-in workflows
 */
export const BUILT_IN_WORKFLOWS: WorkflowDefinition[] = [
  SIMPLE_WORKFLOW,
  FEATURE_DEVELOPMENT_WORKFLOW,
  BUGFIX_WORKFLOW,
  RESEARCH_WORKFLOW
];

/**
 * Default workflow configuration
 */
export const DEFAULT_WORKFLOW_CONFIG = {
  default_workflow: 'feature_development' as WorkflowType,
  allow_override: true,
  strict_validation: true,
  emergency_bypass_enabled: true,
  conditional_rules_enabled: true
};

/**
 * Get workflow by name
 */
export function getWorkflowDefinition(name: string): WorkflowDefinition | undefined {
  return BUILT_IN_WORKFLOWS.find(w => w.name === name);
}

/**
 * Get all workflow names
 */
export function getWorkflowNames(): string[] {
  return BUILT_IN_WORKFLOWS.map(w => w.name);
}

/**
 * Check if a workflow name is valid
 */
export function isValidWorkflow(name: string): boolean {
  return BUILT_IN_WORKFLOWS.some(w => w.name === name);
}
