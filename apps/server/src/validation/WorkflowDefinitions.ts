/**
 * Built-in workflow definitions for structured task creation
 */

import { WorkflowDefinition, WorkflowType } from '../types/WorkflowTypes.js';
import { FeatureDevelopmentWorkflow as FEATURE_DEVELOPMENT_WORKFLOW } from '../workflows/definitions/FeatureDevelopmentWorkflow.js';
import { BugfixWorkflow as BUGFIX_WORKFLOW } from '../workflows/definitions/BugfixWorkflow.js';
import { ResearchWorkflow as RESEARCH_WORKFLOW } from '../workflows/definitions/ResearchWorkflow.js';

/**
 * Simple Task Workflow - Minimal structure for small, straightforward tasks
 */
export const SIMPLE_WORKFLOW: WorkflowDefinition = {
  name: 'simple',
  display_name: 'Simple Task',
  description: 'Lightweight workflow for small, straightforward tasks that don\'t require extensive planning',

  required_sections: [
    {
      section_type: 'title',
      required: true,
      validation_criteria: {
        min_length: 5,
        max_length: 100
      },
      help_text: 'Clear, concise task description (5-100 chars)'
    },
    {
      section_type: 'description',
      required: false,
      validation_criteria: {
        min_length: 10
      },
      help_text: 'Optional details about what needs to be done'
    }
  ],

  conditional_requirements: [],

  validation_rules: [
    {
      id: 'checklist_non_empty',
      name: 'Non-Empty Checklist Items',
      description: 'Checklist items must have meaningful content',
      rule_type: 'content',
      error_message: 'Checklist items cannot be empty or contain only placeholder text'
    }
  ],

  validation_bundles: [
    {
      id: 'task_ready',
      name: 'Task Ready',
      description: 'Task is clearly defined and ready to work on',
      sections: ['title'],
      rules: ['checklist_non_empty'],
      guidance_hint: 'Ensure the task is clearly defined with actionable steps.'
    }
  ],

  status_flow: {
    initial_state: 'todo',
    states: ['todo', 'in_progress', 'done', 'cancelled'],
    transitions: [
      {
        id: 'todo_to_in_progress',
        from: 'todo',
        to: 'in_progress',
        label: 'Start Task',
        description: 'Begin working on the task',
        required_bundles: ['task_ready'],
        gate: {
          auto_checklist: {
            name: 'Task Execution',
            items: [
              'Complete the task as described',
              'Test changes if applicable',
              'Update documentation if needed'
            ],
            merge_strategy: 'replace'
          }
        }
      },
      {
        id: 'in_progress_to_done',
        from: 'in_progress',
        to: 'done',
        label: 'Complete Task',
        description: 'Mark task as complete',
        gate: {
          require_acknowledgement: true,
          acknowledgement_prompt_template: 'Task completed successfully.'
        }
      },
      {
        id: 'any_to_cancelled',
        from: '*',
        to: 'cancelled',
        label: 'Cancel',
        description: 'Cancel this task'
      }
    ]
  },

  child_requirements: [],

  use_cases: [
    'Quick fixes and patches',
    'Small code updates',
    'Documentation tweaks',
    'Minor refactoring',
    'Configuration changes',
    'Dependency updates',
    'Code cleanup tasks'
  ]
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
