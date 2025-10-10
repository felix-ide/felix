import { WorkflowDefinition } from '../../types/WorkflowTypes';

/**
 * Story Workflow - User story with acceptance criteria
 * Demonstrates middle layer: Epic → Story → Task
 */
export const StoryWorkflow: WorkflowDefinition = {
  name: 'story',
  display_name: 'User Story',
  description: 'User story delivering specific value, broken down from an epic',

  required_sections: [
    {
      section_type: 'title',
      required: true,
      validation_criteria: {
        min_length: 10,
        max_length: 100
      },
      help_text: 'Story title as user narrative: "As a [user], I want to [action] so that [benefit]"'
    },
    {
      section_type: 'description',
      required: true,
      validation_criteria: {
        min_length: 100
      },
      help_text: 'Detailed description of user need, context, and expected behavior'
    },
    {
      section_type: 'acceptance_criteria',
      required: true,
      validation_criteria: {
        min_checklist_items: 3
      },
      help_text: 'At least 3 acceptance criteria in Given/When/Then format defining done'
    },
    {
      section_type: 'mockups',
      required: false,
      validation_criteria: {
        requires_linked_note: true,
        note_type: 'excalidraw'
      },
      conditional_logic: 'has_frontend_work',
      help_text: 'Excalidraw mockups for UI changes (required if frontend work)'
    }
  ],

  conditional_requirements: [
    {
      id: 'story_mockups_frontend',
      section_type: 'mockups',
      condition: 'has_frontend_work',
      required_when_true: true,
      required_when_false: false,
      fallback_message: 'UI mockups required for frontend stories'
    }
  ],

  validation_rules: [
    {
      id: 'story_acceptance_criteria_gherkin',
      name: 'Gherkin Acceptance Criteria',
      description: 'Story acceptance criteria must use Given/When/Then format',
      rule_type: 'format',
      error_message: 'Each acceptance criterion must follow Given/When/Then (Gherkin) format for clarity'
    },
    {
      id: 'story_task_breakdown',
      name: 'Story Task Breakdown',
      description: 'Stories must be broken down into implementable tasks',
      rule_type: 'content',
      error_message: 'Break story down into 2-5 implementable tasks'
    },
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
      id: 'story_defined',
      name: 'Story Defined',
      description: 'Story with clear acceptance criteria',
      sections: ['title', 'description', 'acceptance_criteria'],
      optional_sections: ['mockups'],
      rules: ['story_acceptance_criteria_gherkin', 'checklist_non_empty'],
      guidance_hint: 'Define the story with clear acceptance criteria. Add mockups if UI changes are involved.'
    },
    {
      id: 'tasks_ready',
      name: 'Tasks Ready',
      description: 'Story broken down into tasks',
      sections: [],
      rules: ['story_task_breakdown'],
      guidance_hint: 'Break the story into 2-5 implementable tasks, each small enough to complete in a day or two.'
    }
  ],

  status_flow: {
    initial_state: 'draft',
    states: ['draft', 'ready', 'in_progress', 'in_review', 'done'],
    transitions: [
      {
        id: 'draft_to_ready',
        from: 'draft',
        to: 'ready',
        label: 'Mark Ready',
        description: 'Story defined with acceptance criteria',
        required_bundles: ['story_defined'],
        gate: {
          auto_checklist: {
            name: 'Story Readiness',
            items: [
              'Story follows "As a [user], I want [action] so that [benefit]" format',
              'Acceptance criteria are clear and testable',
              'UI mockups created (if applicable)',
              'Story sized appropriately (not too large)',
              'Dependencies identified'
            ],
            merge_strategy: 'replace'
          }
        }
      },
      {
        id: 'ready_to_in_progress',
        from: 'ready',
        to: 'in_progress',
        label: 'Start Work',
        description: 'Begin implementing story',
        required_bundles: ['tasks_ready'],
        pre_prompt_template: 'Starting story implementation. Follow the task breakdown and acceptance criteria.',
        gate: {
          require_acknowledgement: true,
          acknowledgement_prompt_template: 'Story has been broken down into tasks. Ready to start implementation.'
        }
      },
      {
        id: 'in_progress_to_in_review',
        from: 'in_progress',
        to: 'in_review',
        label: 'Submit for Review',
        description: 'All tasks complete, request review',
        gate: {
          auto_checklist: {
            name: 'Review Checklist',
            items: [
              'All tasks are complete',
              'All acceptance criteria met',
              'Tests written and passing',
              'Code reviewed',
              'Ready for QA/acceptance testing'
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
        description: 'Return to development'
      },
      {
        id: 'in_review_to_done',
        from: 'in_review',
        to: 'done',
        label: 'Accept Story',
        description: 'Story accepted and deployed',
        gate: {
          require_acknowledgement: true,
          acknowledgement_prompt_template: 'Story meets all acceptance criteria and has been accepted.',
          auto_checklist: {
            name: 'Story Acceptance',
            items: [
              'All acceptance criteria verified',
              'Deployed to production',
              'Stakeholder demo completed',
              'Documentation updated'
            ],
            merge_strategy: 'append'
          }
        }
      }
    ]
  },

  child_requirements: [
    {
      child_task_type: 'task',
      required_workflow: 'simple',
      min_count: 2,
      max_count: 5,
      label: 'Implementation Tasks',
      description: 'Stories should be broken down into 2-5 implementable tasks',
      validation: {
        at_least_one_in: ['in_progress', 'done']
      }
    },
    {
      child_task_type: 'subtask',
      required_workflow: 'simple',
      min_count: 0,
      max_count: 10,
      label: 'Subtasks (Optional)',
      description: 'Tasks can optionally be broken down further into subtasks for very detailed work',
      validation: {
        at_least_one_in: ['in_progress', 'done']
      }
    }
  ],

  use_cases: [
    'User stories in agile development',
    'Feature requests from users',
    'Product backlog items',
    'Sprint planning items',
    'Increment deliverables'
  ]
};
