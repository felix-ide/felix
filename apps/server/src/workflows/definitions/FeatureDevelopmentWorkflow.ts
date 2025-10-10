import { WorkflowDefinition } from '../../types/WorkflowTypes';

/**
 * Feature Development Workflow
 *
 * This is a META-WORKFLOW that defines the organizational structure and rules
 * for feature development. It guides the AI on how to properly use the
 * Epic → Story → Task → Subtask hierarchy system.
 *
 * HIERARCHY RULES:
 * - Large initiatives: Start with Epic (which requires 3-10 Stories)
 * - Medium features: Start with Story (which requires 2-5 Tasks)
 * - Small features: Start with Task directly
 * - Epics → Stories → Tasks → Subtasks (each level enforces the next)
 */
export const FeatureDevelopmentWorkflow: WorkflowDefinition = {
  name: 'feature_development',
  display_name: 'Feature Development Framework',
  description: 'Comprehensive organizational framework for feature development. Defines rules for using Epic → Story → Task → Subtask hierarchy correctly with validation bundles and quality gates.',

  required_sections: [
    {
      section_type: 'title',
      required: true,
      validation_criteria: {
        min_length: 10,
        max_length: 120
      },
      help_text: 'Feature title describing the business value (10-120 chars)'
    },
    {
      section_type: 'description',
      required: true,
      validation_criteria: {
        min_length: 100
      },
      help_text: 'Comprehensive description: business goals, user impact, success metrics, constraints'
    },
    {
      section_type: 'scope_definition',
      required: true,
      validation_criteria: {
        min_checklist_items: 3
      },
      help_text: 'Define scope: What is included, what is NOT included, and key constraints'
    }
  ],

  conditional_requirements: [],

  validation_rules: [
    {
      id: 'hierarchy_structure_validation',
      name: 'Proper Hierarchy Structure',
      description: 'Feature development must use the proper Epic → Story → Task → Subtask structure',
      rule_type: 'content',
      error_message: 'Large features must start with Epic (3-10 stories), medium features with Story (2-5 tasks), small features can use Task directly. Follow the hierarchy: Epic → Story → Task → Subtask.'
    },
    {
      id: 'epic_requires_stories',
      name: 'Epics Require Stories',
      description: 'When using Epic workflow, must create 3-10 child Stories',
      rule_type: 'content',
      error_message: 'Epics must be broken down into 3-10 user stories. Each story delivers specific user value.'
    },
    {
      id: 'story_requires_tasks',
      name: 'Stories Require Tasks',
      description: 'When using Story workflow, must create 2-5 child Tasks',
      rule_type: 'content',
      error_message: 'Stories must be broken down into 2-5 implementation tasks. Keep stories small enough to complete in a sprint.'
    },
    {
      id: 'spec_before_implementation',
      name: 'Specification Before Implementation',
      description: 'All planning, architecture, and design must be complete before starting implementation',
      rule_type: 'content',
      error_message: 'Complete all spec work (architecture diagrams, ERD, mockups, acceptance criteria) before transitioning to in_progress status.'
    },
    {
      id: 'architecture_required_for_features',
      name: 'Architecture Documentation Required',
      description: 'Features require architecture diagrams showing system design',
      rule_type: 'content',
      error_message: 'Create architecture documentation with mermaid diagrams (C4, component, or sequence diagrams) before implementation.'
    },
    {
      id: 'erd_required_for_data_changes',
      name: 'ERD Required for Database Changes',
      description: 'Features with database changes require ERD documentation',
      rule_type: 'content',
      error_message: 'Document database schema changes with mermaid erDiagram showing all tables, fields, and relationships.'
    },
    {
      id: 'mockups_required_for_ui',
      name: 'UI Mockups Required for Frontend Work',
      description: 'Features with UI changes require Excalidraw mockups',
      rule_type: 'content',
      error_message: 'Create Excalidraw mockups showing all UI states (default, loading, error, empty) before frontend implementation.'
    },
    {
      id: 'acceptance_criteria_gherkin',
      name: 'Gherkin Acceptance Criteria',
      description: 'Acceptance criteria must follow Given/When/Then format',
      rule_type: 'format',
      error_message: 'Write acceptance criteria in Gherkin format: Given [context], When [action], Then [outcome].'
    },
    {
      id: 'test_coverage_required',
      name: 'Comprehensive Test Coverage',
      description: 'Features require unit, integration, and e2e tests',
      rule_type: 'content',
      error_message: 'Add unit tests, integration tests, and e2e tests for critical user flows before marking complete.'
    },
    {
      id: 'checklist_non_empty',
      name: 'Non-Empty Checklist Items',
      description: 'All checklist items must have meaningful content',
      rule_type: 'content',
      error_message: 'Checklist items cannot be empty or contain placeholder text like "TODO" or "TBD".'
    }
  ],

  validation_bundles: [
    {
      id: 'hierarchy_planning',
      name: 'Hierarchy Planning',
      description: 'Determine the correct hierarchy level to start with based on feature size',
      sections: ['title', 'description', 'scope_definition'],
      rules: ['hierarchy_structure_validation', 'checklist_non_empty'],
      guidance_hint: 'Large initiative (months)? Use Epic. Medium feature (weeks)? Use Story. Small task (days)? Use Task directly. Follow Epic → Story → Task → Subtask hierarchy.'
    },
    {
      id: 'architecture_spec',
      name: 'Architecture Specification',
      description: 'Architecture and system design documented with diagrams',
      sections: ['description'],
      rules: ['architecture_required_for_features', 'spec_before_implementation'],
      guidance_hint: 'Create mermaid diagrams showing: C4 context/container for system-level, component diagrams for modules, sequence diagrams for flows.'
    },
    {
      id: 'data_model_spec',
      name: 'Data Model Specification',
      description: 'Database schema and ERD documented before implementation',
      sections: [],
      rules: ['erd_required_for_data_changes', 'spec_before_implementation'],
      guidance_hint: 'Document all tables, fields, relationships, indexes, and constraints in mermaid erDiagram format.'
    },
    {
      id: 'ui_spec',
      name: 'UI Specification',
      description: 'UI mockups and interaction design documented',
      sections: [],
      rules: ['mockups_required_for_ui', 'spec_before_implementation'],
      guidance_hint: 'Create Excalidraw mockups for all screens and states. Include: default view, loading, error handling, empty states, and user interactions.'
    },
    {
      id: 'acceptance_criteria_defined',
      name: 'Acceptance Criteria Defined',
      description: 'Clear, testable acceptance criteria in Gherkin format',
      sections: [],
      rules: ['acceptance_criteria_gherkin', 'checklist_non_empty'],
      guidance_hint: 'Define acceptance criteria as: Given [initial state], When [user action], Then [expected outcome]. Make criteria specific and testable.'
    },
    {
      id: 'implementation_complete',
      name: 'Implementation Complete',
      description: 'Code implemented with comprehensive test coverage',
      sections: [],
      rules: ['test_coverage_required', 'checklist_non_empty'],
      guidance_hint: 'Implement feature following architecture spec. Add unit tests (all functions), integration tests (API/database), e2e tests (critical flows).'
    }
  ],

  status_flow: {
    initial_state: 'planning',
    states: ['planning', 'spec_ready', 'in_progress', 'in_review', 'done', 'cancelled'],
    transitions: [
      {
        id: 'planning_to_spec_ready',
        from: 'planning',
        to: 'spec_ready',
        label: 'Complete Specification',
        description: 'All planning, architecture, and design work complete',
        required_bundles: ['hierarchy_planning', 'architecture_spec', 'data_model_spec', 'ui_spec', 'acceptance_criteria_defined'],
        pre_prompt_template: 'Review all specification work: hierarchy structure, architecture diagrams, ERD, UI mockups, and acceptance criteria. Ensure everything is documented before implementation.',
        gate: {
          require_acknowledgement: true,
          acknowledgement_prompt_template: 'Specification is complete. Hierarchy is planned (Epic/Story/Task structure chosen), architecture is documented, data model is defined, UI is designed, and acceptance criteria are clear.',
          auto_checklist: {
            name: 'Spec Completeness Check',
            items: [
              'Correct hierarchy chosen (Epic for large, Story for medium, Task for small)',
              'Architecture diagrams show all components and interactions',
              'ERD documents all database changes (if applicable)',
              'UI mockups cover all states and flows (if applicable)',
              'Acceptance criteria are testable and in Gherkin format',
              'All edge cases and error scenarios documented',
              'Performance and scalability considerations noted',
              'Security implications reviewed'
            ],
            merge_strategy: 'replace'
          }
        }
      },
      {
        id: 'spec_ready_to_in_progress',
        from: 'spec_ready',
        to: 'in_progress',
        label: 'Start Implementation',
        description: 'Begin implementing according to spec',
        pre_prompt_template: 'Follow the architecture and design documented in spec. Create Epic/Story/Task hierarchy as planned. Implement code with tests.',
        gate: {
          auto_checklist: {
            name: 'Implementation Workflow',
            items: [
              'Create hierarchy: Epic (if large) → Stories → Tasks',
              'Start with highest priority Epic/Story/Task',
              'Follow architecture diagrams for implementation',
              'Implement database migrations if schema changes',
              'Write unit tests for all business logic',
              'Write integration tests for APIs and data layer',
              'Write e2e tests for critical user flows',
              'Keep all acceptance criteria in mind',
              'Document any deviations from spec'
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
        description: 'Implementation complete, request review',
        required_bundles: ['implementation_complete'],
        pre_prompt_template: 'Verify: All Epic → Story → Task work is complete, all tests pass, all acceptance criteria met.',
        gate: {
          require_acknowledgement: true,
          acknowledgement_prompt_template: 'Implementation is complete with passing tests. All hierarchy tasks are done. Ready for review.',
          auto_checklist: {
            name: 'Pre-Review Checklist',
            items: [
              'All Epics/Stories/Tasks in hierarchy are complete',
              'All acceptance criteria verified and met',
              'Unit tests pass (100% of new code)',
              'Integration tests pass',
              'E2E tests pass for critical flows',
              'Code follows project style guidelines',
              'Documentation updated (README, API docs, inline comments)',
              'No sensitive data or credentials in code',
              'Performance is acceptable (no regressions)',
              'Security review completed'
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
        description: 'Return to implementation for revisions'
      },
      {
        id: 'in_review_to_done',
        from: 'in_review',
        to: 'done',
        label: 'Approve & Complete',
        description: 'Feature approved and ready for deployment',
        gate: {
          require_acknowledgement: true,
          acknowledgement_prompt_template: 'Feature has been reviewed and approved. All Epic/Story/Task work is complete and meets quality standards.',
          auto_checklist: {
            name: 'Completion Checklist',
            items: [
              'Code review approved',
              'All feedback addressed',
              'Deployed to staging environment',
              'Smoke tests passed in staging',
              'All acceptance criteria verified in staging',
              'Product owner/stakeholder sign-off received',
              'Documentation finalized',
              'Ready for production deployment'
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
        description: 'Feature development cancelled'
      }
    ]
  },

  child_requirements: [
    {
      child_task_type: 'epic',
      required_workflow: 'epic',
      min_count: 0,
      max_count: 3,
      label: 'Epics (for very large features)',
      description: 'For large initiatives, break down into epics. Each epic contains 3-10 stories.',
      validation: {
        at_least_one_in: ['in_progress', 'done']
      }
    },
    {
      child_task_type: 'story',
      required_workflow: 'story',
      min_count: 0,
      max_count: 10,
      label: 'Stories (for medium features)',
      description: 'For medium features, break down into user stories. Each story contains 2-5 tasks.',
      validation: {
        at_least_one_in: ['in_progress', 'done']
      }
    },
    {
      child_task_type: 'task',
      required_workflow: 'simple',
      min_count: 0,
      max_count: 20,
      label: 'Tasks (for small features)',
      description: 'For small features, create tasks directly without epics/stories.',
      validation: {
        at_least_one_in: ['in_progress', 'done']
      }
    }
  ],

  use_cases: [
    'Feature development (any size: use Epic for large, Story for medium, Task for small)',
    'Full-stack features with frontend and backend work',
    'Features requiring database schema changes',
    'New API endpoints and integrations',
    'Major enhancements to existing features',
    'Multi-team initiatives requiring coordination',
    'Product launches and releases'
  ]
};
