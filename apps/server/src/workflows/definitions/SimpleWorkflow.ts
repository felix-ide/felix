import { WorkflowDefinition } from '../../types/WorkflowTypes';

export const SimpleWorkflow: WorkflowDefinition = {
  name: 'simple',
  display_name: 'Simple Task',
  description: 'Basic task with minimal requirements',
  required_sections: [
    {
      section_type: 'title',
      required: true,
      validation_criteria: {
        min_length: 3,
        max_length: 200
      }
    },
    {
      section_type: 'description',
      required: false,
      validation_criteria: {
        min_length: 0,
        max_length: 5000
      }
    }
  ],
  conditional_requirements: [],
  validation_rules: [],
  status_flow_ref: 'flow_simple',

  status_flow: {
    transitions: [
      {
        id: 'todo_to_in_progress',
        from: 'todo',
        to: 'in_progress',
        label: 'Start Task',
        description: 'Begin working on the task'
      },
      {
        id: 'in_progress_to_done',
        from: 'in_progress',
        to: 'done',
        label: 'Complete',
        description: 'Mark task as complete'
      },
      {
        id: 'any_to_cancelled',
        from: '*',
        to: 'cancelled',
        label: 'Cancel',
        description: 'Cancel task'
      }
    ]
  },

  use_cases: [
    'Quick bug fixes',
    'Small updates',
    'Documentation tweaks',
    'Configuration changes',
    'Minor refactoring'
  ]
};