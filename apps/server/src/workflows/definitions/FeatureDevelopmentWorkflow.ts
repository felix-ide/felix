import { WorkflowDefinition } from '../../types/WorkflowTypes';

export const FeatureDevelopmentWorkflow: WorkflowDefinition = {
  name: 'feature_development',
  display_name: 'Feature Development',
  description: 'Full structured workflow for new features',
  required_sections: [
    {
      section_type: 'architecture',
      required: true,
      validation_criteria: {
        requires_linked_note: true,
        note_type: 'documentation',
        must_contain_mermaid: true
      },
      help_text: 'Create linked note with mermaid diagrams showing system architecture'
    },
    {
      section_type: 'erd',
      required: true,
      validation_criteria: {
        requires_linked_note: true,
        note_type: 'documentation',
        must_contain_sections: ['erDiagram']
      },
      help_text: 'Add ERD note with a mermaid erDiagram for tables and relations'
    },
    {
      section_type: 'api_contract',
      required: true,
      validation_criteria: {
        requires_linked_note: true,
        note_type: 'documentation',
        must_contain_sections: ['openapi: 3.1']
      },
      help_text: 'Attach OpenAPI 3.1 snippet documenting any changed/added endpoints'
    },
    {
      section_type: 'mockups',
      required: true,
      validation_criteria: {
        requires_linked_note: true,
        note_type: 'excalidraw',
        conditional: 'frontend_work'
      },
      help_text: 'Create excalidraw mockups for UI components (optional for backend-only work)'
    },
    {
      section_type: 'observability',
      required: false,
      validation_criteria: {
        requires_linked_note: true,
        note_type: 'documentation',
        must_contain_sections: ['## Metrics','## Logs','## Alerts']
      },
      help_text: 'Define metrics, logs, and alert rules to add/update (if applicable)'
    },
    {
      section_type: 'acceptance_criteria',
      required: true,
      validation_criteria: {
        min_checklist_items: 3,
        must_contain_sections: ['Given', 'When', 'Then']
      },
      help_text: 'Define 3+ Gherkin-style criteria (Given/When/Then)'
    },
    {
      section_type: 'implementation_checklist',
      required: true,
      validation_criteria: {
        min_checklist_items: 3,
        must_contain_sections: ['## Implementation Checklist']
      },
      help_text: 'Add detailed implementation checklist with at least 3 items'
    },
    {
      section_type: 'test_verification',
      required: true,
      validation_criteria: {
        min_checklist_items: 2,
        must_contain_sections: ['## Test Verification']
      },
      help_text: 'Add verification steps (unit + integration) that demonstrate the feature works'
    },
    {
      section_type: 'regression_testing',
      required: true,
      validation_criteria: {
        min_checklist_items: 1,
        must_contain_sections: ['## Regression Testing']
      },
      help_text: 'List areas impacted by this change that must be re-tested'
    },
    {
      section_type: 'rules_creation',
      required: true,
      validation_criteria: {
        requires_linked_rules: true,
        min_rules: 1
      },
      help_text: 'Create rules to capture learnings from this implementation'
    }
  ],
  conditional_requirements: [
    {
      id: 'feature_development_mockups_frontend_conditional',
      section_type: 'mockups',
      condition: 'frontend_work',
      required_when_true: true,
      required_when_false: false,
      context_detection: {
        keywords: ['ui', 'component', 'styling', 'frontend', 'react', 'vue', 'angular'],
        file_patterns: ['.tsx', '.jsx', '.vue', '.css', '.scss'],
        entity_types: ['ui_component']
      }
    }
  ],
  validation_rules: [
    {
      id: 'feature_development_architecture_mermaid_check',
      name: 'Architecture Must Include Mermaid',
      description: 'Architecture documentation must include mermaid diagrams',
      validation_function: 'checkMermaidInLinkedNotes'
    },
    {
      id: 'feature_development_checklist_completeness',
      name: 'Implementation Checklist Completeness',
      description: 'Implementation checklist must have detailed, actionable items',
      validation_function: 'checkChecklistQuality'
    }
  ],
  use_cases: [
    'New feature development',
    'Major enhancements',
    'Complex integrations',
    'New API endpoints',
    'Database schema changes'
  ]
};
