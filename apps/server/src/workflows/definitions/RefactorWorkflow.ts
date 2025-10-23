import { WorkflowDefinition } from '../../types/WorkflowTypes';

/**
 * Refactor Workflow
 *
 * Structured workflow for code refactoring with proper impact analysis,
 * migration planning, and verification. Supports both simple refactors
 * and major architectural changes.
 *
 * WHEN TO USE KB:
 * - Simple refactors (rename, extract method): No KB needed
 * - Major refactors (restructure, architectural changes): KB recommended
 * - Breaking changes: KB required for migration documentation
 */
export const RefactorWorkflow: WorkflowDefinition = {
  name: 'refactor',
  display_name: 'Code Refactoring',
  description: 'Structured refactoring with impact analysis, migration planning, and verification. KB required for major refactors.',

  required_sections: [
    {
      section_type: 'title',
      required: true,
      validation_criteria: {
        min_length: 10,
        max_length: 120
      },
      help_text: 'Clear description of what is being refactored (10-120 chars)'
    },
    {
      section_type: 'description',
      required: true,
      validation_criteria: {
        min_length: 50
      },
      help_text: 'Current problems, proposed changes, and expected benefits'
    },
    {
      section_type: 'description', // Using existing type, refactor scope goes in description
      required: true,
      validation_criteria: {
        min_checklist_items: 2
      },
      help_text: 'Define scope: What files/modules affected, what stays unchanged'
    }
  ],

  conditional_requirements: [],  // Simplified - KB requirement handled in validation rules

  validation_rules: [
    {
      id: 'impact_analysis_required',
      name: 'Impact Analysis Required',
      description: 'Must analyze impact using search tools before refactoring',
      rule_type: 'content',
      error_message: 'Use mcp__felix__search with lens=callers to find all consumers, lens=callees for dependencies. Document findings in task or KB.'
    },
    {
      id: 'signature_changes_documented',
      name: 'Signature Changes Documented',
      description: 'All function/class signature changes must be documented',
      rule_type: 'content',
      error_message: 'Document all signature changes with before/after examples. Include import changes and type updates.'
    },
    {
      id: 'test_verification_required',
      name: 'Test Verification Required',
      description: 'Must identify and update affected tests',
      rule_type: 'content',
      error_message: 'List all tests that need updates. Run tests before and after refactor to ensure nothing breaks.'
    },
    {
      id: 'kb_for_major_refactors',
      name: 'KB Required for Major Refactors',
      description: 'Refactors affecting >10 files or with breaking changes need a KB',
      rule_type: 'content',
      error_message: 'Create a refactor KB using the refactor template to track analysis, plan, and progress.'
    }
  ],

  validation_bundles: [
    {
      id: 'impact_analysis',
      name: 'Impact Analysis',
      description: 'Analyze what code will be affected',
      sections: ['description'],
      rules: ['impact_analysis_required'],
      guidance_hint: 'Use search tools: lens=callers (who uses this), lens=callees (what this uses), lens=inheritance (class hierarchies).'
    },
    {
      id: 'migration_planning',
      name: 'Migration Planning',
      description: 'Plan the refactor execution',
      sections: ['description'],
      rules: ['signature_changes_documented', 'test_verification_required'],
      guidance_hint: 'Document: order of changes, signature updates, test modifications, verification steps.'
    },
    {
      id: 'kb_setup',
      name: 'KB Setup',
      description: 'Setup refactor KB for major changes',
      sections: [],  // KB is optional, not a required section
      rules: ['kb_for_major_refactors'],
      guidance_hint: 'Create KB with refactor template. Use it to track discoveries, plan, and coordinate changes.'
    }
  ],

  status_flow_ref: null,

  status_flow: {
    initial_state: 'analysis',
    states: ['analysis', 'planning', 'in_progress', 'verification', 'done', 'cancelled'],
    transitions: [
      {
        id: 'analysis_to_planning',
        from: 'analysis',
        to: 'planning',
        label: 'Complete Impact Analysis',
        description: 'Impact analysis complete using search tools',
        required_bundles: ['impact_analysis'],
        pre_prompt_template: 'Analyze all code impacts using mcp__felix__search. Find callers, callees, and related components. Document findings.',
        gate: {
          require_acknowledgement: true,
          acknowledgement_prompt_template: 'Impact analysis is complete. All affected code identified and documented.\n\n✅ CHECKPOINT: Review the impact analysis to ensure nothing was missed.\n\nTo proceed to planning, update this task status to "planning" with the transition gate token "{{gate_token}}". Use the mcp__felix__tasks tool with action "update", task_id "{{task.id}}", task_status "planning", and transition_gate_token "{{gate_token}}".',
          auto_checklist: {
            name: 'Impact Analysis Checklist',
            items: [
              'Used search tool with lens=callers to find consumers',
              'Used search tool with lens=callees to find dependencies',
              'Identified all files that need changes',
              'Identified all tests that need updates',
              'Documented breaking changes (if any)',
              'Created refactor KB (if >10 files affected)'
            ],
            merge_strategy: 'replace'
          }
        }
      },
      {
        id: 'planning_to_in_progress',
        from: 'planning',
        to: 'in_progress',
        label: 'Start Refactoring',
        description: 'Begin implementing refactor according to plan',
        required_bundles: ['migration_planning'],
        pre_prompt_template: 'Follow the migration plan. Update code in the planned order. Keep tests passing at each step if possible.',
        gate: {
          auto_checklist: {
            name: 'Refactor Execution Plan',
            items: [
              'Follow the documented order of changes',
              'Update signatures as documented',
              'Update imports and type references',
              'Run tests after each major change',
              'Update tests that need modifications',
              'Document any deviations from plan',
              'Update KB with progress (if using KB)'
            ],
            merge_strategy: 'replace'
          }
        }
      },
      {
        id: 'in_progress_to_verification',
        from: 'in_progress',
        to: 'verification',
        label: 'Verify Refactor',
        description: 'All changes complete, verify everything works',
        pre_prompt_template: 'Run all tests. Verify no functionality was broken. Check that all consumers still work correctly.',
        gate: {
          require_acknowledgement: true,
          acknowledgement_prompt_template: 'Refactoring is complete. Ready for verification.\n\n✅ CHECKPOINT: Run all tests and verify functionality.\n\nTo proceed to verification, update this task status to "verification" with the transition gate token "{{gate_token}}". Use the mcp__felix__tasks tool with action "update", task_id "{{task.id}}", task_status "verification", and transition_gate_token "{{gate_token}}".',
          auto_checklist: {
            name: 'Verification Checklist',
            items: [
              'All unit tests pass',
              'All integration tests pass',
              'All e2e tests pass',
              'Manual testing of affected features',
              'Performance is acceptable (no regressions)',
              'Code follows project conventions',
              'All TODOs from refactor resolved'
            ],
            merge_strategy: 'append'
          }
        }
      },
      {
        id: 'verification_to_in_progress',
        from: 'verification',
        to: 'in_progress',
        label: 'Fix Issues',
        description: 'Return to fix any issues found during verification'
      },
      {
        id: 'verification_to_done',
        from: 'verification',
        to: 'done',
        label: 'Complete Refactor',
        description: 'Refactor verified and complete',
        gate: {
          require_acknowledgement: true,
          acknowledgement_prompt_template: 'Refactor has been verified. All tests pass and functionality is preserved.\n\n✅ CHECKPOINT: Confirm refactor is complete.\n\nTo mark this task complete, update the status to "done" with the transition gate token "{{gate_token}}". Use the mcp__felix__tasks tool with action "update", task_id "{{task.id}}", task_status "done", and transition_gate_token "{{gate_token}}".',
          auto_checklist: {
            name: 'Completion Checklist',
            items: [
              'All planned changes implemented',
              'All tests updated and passing',
              'Migration guide created (if breaking changes)',
              'Documentation updated',
              'Code review completed',
              'KB archived (if used)'
            ],
            merge_strategy: 'append'
          }
        }
      },
      {
        id: 'any_to_cancelled',
        from: '*',
        to: 'cancelled',
        label: 'Cancel',
        description: 'Refactor cancelled'
      }
    ]
  },

  use_cases: [
    'Renaming classes, functions, or variables across codebase',
    'Extracting common code into shared utilities',
    'Restructuring module organization',
    'Changing design patterns (e.g., callbacks to promises)',
    'Updating deprecated API usage',
    'Performance optimizations requiring structural changes',
    'Database schema migrations',
    'Breaking API changes with migration path'
  ]
};