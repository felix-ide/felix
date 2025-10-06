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
  use_cases: [
    'Quick bug fixes',
    'Small updates',
    'Documentation tweaks',
    'Configuration changes',
    'Minor refactoring'
  ]
};