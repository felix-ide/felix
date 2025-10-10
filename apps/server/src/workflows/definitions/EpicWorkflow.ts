import { WorkflowDefinition } from '../../types/WorkflowTypes';

/**
 * Epic Workflow - Top-level organizational unit for large features
 * Demonstrates full hierarchy: Epic → Story → Task
 */
export const EpicWorkflow: WorkflowDefinition = {
  name: 'epic',
  display_name: 'Epic',
  description: 'Large-scale initiative requiring multiple stories and comprehensive planning',

  required_sections: [
    {
      section_type: 'title',
      required: true,
      validation_criteria: {
        min_length: 15,
        max_length: 120
      },
      help_text: 'Epic title describing the business value (15-120 chars)'
    },
    {
      section_type: 'description',
      required: true,
      validation_criteria: {
        min_length: 200
      },
      help_text: 'Comprehensive description covering business goals, user impact, success metrics, and constraints'
    },
    {
      section_type: 'architecture',
      required: true,
      validation_criteria: {
        requires_linked_note: true,
        note_type: 'documentation',
        must_contain_mermaid: true
      },
      help_text: 'High-level architecture overview with C4 context or container diagrams showing how this epic fits into the system'
    }
  ],

  conditional_requirements: [],

  validation_rules: [
    {
      id: 'epic_architecture_c4',
      name: 'Epic Architecture C4 Diagram',
      description: 'Epic architecture must include C4 context or container diagram showing system-level impact',
      rule_type: 'content',
      error_message: 'Epic requires C4 context or container diagram to show how this initiative fits into the broader system architecture'
    },
    {
      id: 'epic_story_breakdown',
      name: 'Epic Story Breakdown',
      description: 'Epics must be broken down into user stories',
      rule_type: 'content',
      error_message: 'Break down this epic into 3-10 user stories, each delivering specific user value'
    }
  ],

  validation_bundles: [
    {
      id: 'epic_planning',
      name: 'Epic Planning Complete',
      description: 'Epic planning phase with vision and architecture documented',
      sections: ['title', 'description', 'architecture'],
      rules: ['epic_architecture_c4'],
      guidance_hint: 'Document the epic vision, business goals, and high-level architecture before breaking down into stories.'
    },
    {
      id: 'stories_defined',
      name: 'Stories Defined',
      description: 'Epic broken down into user stories',
      sections: [],
      rules: ['epic_story_breakdown'],
      guidance_hint: 'Create 3-10 user stories that each deliver specific user value. Each story should follow the story workflow.'
    }
  ],

  status_flow: {
    initial_state: 'draft',
    states: ['draft', 'planning', 'ready', 'in_progress', 'done'],
    transitions: [
      {
        id: 'draft_to_planning',
        from: 'draft',
        to: 'planning',
        label: 'Start Planning',
        description: 'Begin epic planning phase',
        gate: {
          auto_checklist: {
            name: 'Epic Planning',
            items: [
              'Define business goals and success metrics',
              'Identify key stakeholders',
              'Document high-level architecture',
              'Estimate epic effort and timeline',
              'Identify risks and dependencies'
            ],
            merge_strategy: 'replace'
          }
        }
      },
      {
        id: 'planning_to_ready',
        from: 'planning',
        to: 'ready',
        label: 'Mark Ready',
        description: 'Planning complete, epic ready for story breakdown',
        required_bundles: ['epic_planning'],
        gate: {
          require_acknowledgement: true,
          acknowledgement_prompt_template: 'Epic planning is complete. Architecture and business goals are documented. Ready to break down into stories.',
          auto_checklist: {
            name: 'Story Breakdown',
            items: [
              'Break epic into 3-10 user stories',
              'Prioritize stories by business value',
              'Define acceptance criteria for each story',
              'Estimate story points',
              'Identify story dependencies'
            ],
            merge_strategy: 'append'
          }
        }
      },
      {
        id: 'ready_to_in_progress',
        from: 'ready',
        to: 'in_progress',
        label: 'Start Work',
        description: 'Begin working on stories',
        required_bundles: ['stories_defined'],
        pre_prompt_template: 'Starting epic execution. Ensure stories are prioritized and ready for development.',
        gate: {
          require_acknowledgement: true,
          acknowledgement_prompt_template: 'Epic has been broken down into stories. Starting work on highest priority stories.'
        }
      },
      {
        id: 'in_progress_to_done',
        from: 'in_progress',
        to: 'done',
        label: 'Complete Epic',
        description: 'All stories complete, epic delivered',
        gate: {
          require_acknowledgement: true,
          acknowledgement_prompt_template: 'All stories are complete. Epic delivered successfully.',
          auto_checklist: {
            name: 'Epic Completion',
            items: [
              'All stories are done',
              'Epic deployed to production',
              'Success metrics verified',
              'Stakeholder sign-off received',
              'Documentation updated',
              'Retrospective completed'
            ],
            merge_strategy: 'append'
          }
        }
      }
    ]
  },

  child_requirements: [
    {
      child_task_type: 'story',
      required_workflow: 'story',
      min_count: 3,
      max_count: 10,
      label: 'User Stories',
      description: 'Epics must be broken down into 3-10 user stories, each delivering specific user value',
      validation: {
        at_least_one_in: ['in_progress', 'done']
      }
    }
  ],

  use_cases: [
    'Large-scale product features',
    'Major platform initiatives',
    'Multi-quarter projects',
    'Cross-team initiatives',
    'Product launches'
  ]
};
