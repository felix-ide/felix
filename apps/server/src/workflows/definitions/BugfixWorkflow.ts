import { WorkflowDefinition } from '../../types/WorkflowTypes';

export const BugfixWorkflow: WorkflowDefinition = {
  name: 'bugfix',
  display_name: 'Bug Fix',
  description: 'Structured workflow for bug resolution with root cause analysis and validation',

  required_sections: [
    {
      section_type: 'title',
      required: true,
      validation_criteria: {
        min_length: 10,
        max_length: 100
      },
      help_text: 'Clear description of the bug (10-100 chars)'
    },
    {
      section_type: 'description',
      required: true,
      validation_criteria: {
        min_length: 30
      },
      help_text: 'Detailed description of the bug, its impact, and affected users/systems'
    },
    {
      section_type: 'reproduction_steps',
      required: true,
      validation_criteria: {
        min_checklist_items: 2,
        format: 'checklist'
      },
      help_text: 'Step-by-step instructions to reproduce the bug (minimum 2 steps)'
    },
    {
      section_type: 'root_cause_analysis',
      required: true,
      validation_criteria: {
        requires_linked_note: true,
        note_type: 'documentation',
        min_length: 100
      },
      help_text: 'Detailed analysis in a linked note explaining what caused the bug and why it wasn\'t caught earlier'
    }
  ],

  conditional_requirements: [],

  validation_rules: [
    {
      id: 'reproduction_steps_clarity',
      name: 'Reproduction Steps Clarity',
      description: 'Reproduction steps must be clear, numbered, and actionable',
      rule_type: 'content',
      error_message: 'Each reproduction step must be specific and actionable (not "try to reproduce" or "test the feature")'
    },
    {
      id: 'root_cause_depth',
      name: 'Root Cause Analysis Depth',
      description: 'Root cause must identify the underlying issue, not just symptoms',
      rule_type: 'content',
      error_message: 'Root cause analysis must explain WHY the bug occurred and what systemic issue allowed it'
    },
    {
      id: 'checklist_non_empty',
      name: 'Non-Empty Checklist Items',
      description: 'All checklist items must have meaningful content',
      rule_type: 'content',
      error_message: 'Checklist items cannot be empty or contain only placeholder text'
    },
    {
      id: 'regression_test_validation',
      name: 'Regression Test Required',
      description: 'Bug fixes must include regression tests to prevent recurrence',
      rule_type: 'content',
      error_message: 'Add automated tests that would have caught this bug'
    }
  ],

  validation_bundles: [
    {
      id: 'bug_analyzed',
      name: 'Bug Analyzed',
      description: 'Bug is understood with clear reproduction steps and root cause',
      sections: ['title', 'description', 'reproduction_steps', 'root_cause_analysis'],
      rules: ['reproduction_steps_clarity', 'root_cause_depth'],
      guidance_hint: 'Document clear reproduction steps and perform root cause analysis before fixing.'
    },
    {
      id: 'fix_ready',
      name: 'Fix Ready',
      description: 'Bug fix implemented with tests',
      sections: ['reproduction_steps', 'root_cause_analysis'],
      rules: ['checklist_non_empty', 'regression_test_validation'],
      guidance_hint: 'Implement the fix and add regression tests to prevent this bug from recurring.'
    }
  ],

  status_flow: {
    initial_state: 'reported',
    states: ['reported', 'analyzing', 'in_progress', 'in_review', 'verified', 'done', 'wont_fix'],
    transitions: [
      {
        id: 'reported_to_analyzing',
        from: 'reported',
        to: 'analyzing',
        label: 'Start Analysis',
        description: 'Begin investigating the bug',
        gate: {
          auto_checklist: {
            name: 'Bug Triage',
            items: [
              'Verify bug can be reproduced',
              'Determine severity and priority',
              'Identify affected users/systems',
              'Check if duplicate of existing bug'
            ],
            merge_strategy: 'replace'
          }
        }
      },
      {
        id: 'analyzing_to_in_progress',
        from: 'analyzing',
        to: 'in_progress',
        label: 'Start Fix',
        description: 'Root cause identified, begin implementing fix',
        required_bundles: ['bug_analyzed'],
        pre_prompt_template: 'Review the root cause analysis and reproduction steps. Plan the fix to address the underlying issue.',
        gate: {
          require_acknowledgement: true,
          acknowledgement_prompt_template: 'Root cause has been identified. Ready to implement fix.',
          auto_checklist: {
            name: 'Implementation Checklist',
            items: [
              'Implement fix for root cause (not just symptoms)',
              'Add unit tests covering the bug scenario',
              'Add integration/e2e tests if applicable',
              'Update error handling to prevent similar issues',
              'Document any workarounds or limitations'
            ],
            merge_strategy: 'replace'
          }
        }
      },
      {
        id: 'in_progress_to_in_review',
        from: 'in_progress',
        to: 'in_review',
        label: 'Submit for Review',
        description: 'Fix implemented, request code review',
        required_bundles: ['fix_ready'],
        gate: {
          auto_checklist: {
            name: 'Review Checklist',
            items: [
              'Fix verified locally using reproduction steps',
              'All tests pass (unit, integration)',
              'Regression tests added and passing',
              'Code reviewed for similar issues elsewhere'
            ],
            merge_strategy: 'append'
          }
        }
      },
      {
        id: 'in_review_to_in_progress',
        from: 'in_review',
        to: 'in_progress',
        label: 'Request Changes',
        description: 'Return to fix implementation'
      },
      {
        id: 'in_review_to_verified',
        from: 'in_review',
        to: 'verified',
        label: 'Approve Fix',
        description: 'Fix approved, ready for verification in staging',
        gate: {
          auto_checklist: {
            name: 'Verification Checklist',
            items: [
              'Deploy fix to staging environment',
              'Verify bug is fixed using original reproduction steps',
              'Run full regression test suite',
              'Verify no new bugs introduced'
            ],
            merge_strategy: 'replace'
          }
        }
      },
      {
        id: 'verified_to_done',
        from: 'verified',
        to: 'done',
        label: 'Deploy to Production',
        description: 'Fix verified and deployed to production',
        gate: {
          require_acknowledgement: true,
          acknowledgement_prompt_template: 'Fix has been verified in staging. Ready for production deployment.'
        }
      },
      {
        id: 'any_to_wont_fix',
        from: '*',
        to: 'wont_fix',
        label: 'Won\'t Fix',
        description: 'Bug will not be fixed (document reason)'
      }
    ]
  },

  child_requirements: [
    {
      child_task_type: 'task',
      required_workflow: 'simple',
      min_count: 0,
      max_count: 3,
      label: 'Fix Tasks (Optional)',
      description: 'For complex bugs, break down the fix into smaller implementation tasks',
      validation: {
        at_least_one_in: ['in_progress', 'done']
      }
    }
  ],

  use_cases: [
    'Bug fixes',
    'Error resolution',
    'Performance issues',
    'Security vulnerabilities',
    'Data corruption fixes',
    'UI/UX defects'
  ]
};
