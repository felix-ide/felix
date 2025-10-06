import type { HelpPack } from '../types/HelpTypes.js';

export const WORKFLOWS_HELP: HelpPack = {
  section: 'workflows',
  version: '1.0.0',
  human_md: `# Workflows — Validation and Mapping

Workflows define the required artifacts for each task type and drive validation.

Key Points
- Validation is strict and identical in dev/prod.
- Spec Readiness (feature_development) requires:
  - Architecture note (documentation + mermaid)
  - ERD note (documentation + erDiagram)
  - API Contract note (documentation + openapi: 3.1)
  - Task checklists on the task: "Acceptance Criteria" (≥3 G/W/T), "Implementation Checklist" (≥3), "Test Verification" (≥2 with 'unit' and 'integration' or 'e2e'), "Regression Testing" (≥1)
  - Rules Creation: add entity_links with at least one { entity_type:'rule', entity_id }
- Conditional items can be marked N/A with a structured waiver and reason.

Validation Flow

\`\`\`mermaid
flowchart TD
  A[Task + Artifacts] --> B[Validate]
  B -- missing --> C[Guidance]
  C --> A
  B -- pass --> D[Spec Ready]
\`\`\`

Tips
- Keep notes small but complete; use templates.
- Use canonical names to avoid retries.
`,
  ai_guide: {
    purpose: 'Return deterministic missing requirements and map them to next actions.',
    validation_gates: [
      { id: 'architecture', description: 'documentation + mermaid' },
      { id: 'erd', description: 'documentation + erDiagram' },
      { id: 'api_contract', description: 'documentation + openapi: 3.1.x' },
      { id: 'acceptance_criteria', description: 'Gherkin format' },
      { id: 'test_verification', description: 'unit + integration/e2e' }
    ],
    stepper_flows: {
      validate_and_fix: {
        title: 'Validate and fix missing items',
        steps: [
          { tool: 'workflows', action: 'validate', args: { task: { id: '{{task_id}}' } } },
          { tool: 'notes', action: 'add', args: { note_type: 'documentation', title: '...', content: '...', entity_links: [{ entity_type: 'task', entity_id: '{{task_id}}' }] } },
          { tool: 'checklists', action: 'add', args: { name: '...', items: ['...'] } },
          { tool: 'workflows', action: 'validate', args: { task: { id: '{{task_id}}' } } }
        ]
      }
    },
    do: ['Always pass the task id to validate', 'Fix items using exact names/templates'],
    dont: ['Do not infer from description; link real artifacts']
  }
};
