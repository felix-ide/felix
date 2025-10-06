import { WorkflowDefinition } from '../../types/WorkflowTypes';

export const BugfixWorkflow: WorkflowDefinition = {
  name: 'bugfix',
  display_name: 'Bug Fix',
  description: 'Structured approach for bug resolution',
  required_sections: [
    {
      section_type: 'reproduction_steps',
      required: true,
      validation_criteria: {
        must_contain_sections: ['## Reproduction Steps', '### Steps to Reproduce'],
        min_checklist_items: 2,
        format: 'checklist'
      },
      help_text: 'Document clear steps to reproduce the bug'
    },
    {
      section_type: 'root_cause_analysis',
      required: true,
      validation_criteria: {
        requires_linked_note: true,
        note_type: 'documentation',
        must_contain_sections: ['## Root Cause Analysis']
      },
      help_text: 'Create detailed analysis of what caused the bug'
    },
    {
      section_type: 'implementation_checklist',
      required: true,
      validation_criteria: {
        min_checklist_items: 2,
        must_contain_sections: ['## Implementation Checklist']
      },
      help_text: 'Add implementation steps to fix the bug'
    },
    {
      section_type: 'test_verification',
      required: true,
      validation_criteria: {
        min_checklist_items: 2,
        must_contain_sections: ['## Test Verification'],
        format: 'checklist'
      },
      help_text: 'Add test cases to verify the fix works'
    },
    {
      section_type: 'regression_testing',
      required: true,
      validation_criteria: {
        must_contain_sections: ['## Regression Testing', '### Regression Tests'],
        min_checklist_items: 1
      },
      help_text: 'Add regression tests to prevent future occurrences'
    }
  ],
  conditional_requirements: [],
  validation_rules: [
    {
      id: 'bugfix_reproduction_clarity',
      name: 'Reproduction Steps Clarity',
      description: 'Reproduction steps must be clear and actionable',
      validation_function: 'checkReproductionStepsQuality'
    },
    {
      id: 'bugfix_root_cause_depth',
      name: 'Root Cause Analysis Depth',
      description: 'Root cause analysis must identify the underlying issue',
      validation_function: 'checkRootCauseQuality'
    }
  ],
  use_cases: [
    'Bug fixes',
    'Error resolution',
    'Performance issues',
    'Security vulnerabilities',
    'Data corruption fixes'
  ]
};