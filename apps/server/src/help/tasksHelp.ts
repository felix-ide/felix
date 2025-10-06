import type { HelpPack } from '../types/HelpTypes.js';

export const TASKS_HELP: HelpPack = {
  section: 'tasks',
  version: '1.0.0',
  human_md: `# Tasks — Spec-Gated Workflow

Use tasks to plan and gate work as a complete spec pack. You can start incomplete, then move to ready when validation passes.

State & Gate

\`\`\`mermaid
flowchart LR
  D[Draft] --> I[Spec In Progress]
  I --> R[Spec Ready]
  R --> W[In Progress]
\`\`\`

- Gate: You cannot set status to In Progress until Spec Ready.
- Forward-only: Draft → Spec In Progress → Spec Ready.

What makes a task Ready?
- Architecture note (documentation) with a mermaid diagram.
- ERD note (documentation) with \`erDiagram\`.
- API Contract note (documentation) with \`openapi: 3.1.x\`.
- Acceptance Criteria checklist (3+ Gherkin items: Given/When/Then).
- Test Verification checklist (unit + integration/e2e tokens).
- Implementation checklist (3+ items).

Prep Flow (visual)

\`\`\`mermaid
sequenceDiagram
  participant You
  participant App
  You->>App: Create/Update Task
  You->>App: Add notes (Arch, ERD, API)
  You->>App: Add checklists (AC, Tests, Impl)
  You->>App: Validate
  App-->>You: Missing? show guidance
  You->>App: Fix + Validate
  You->>App: Set Spec Ready
\`\`\`

Tips
- Keep notes minimal but complete; use provided templates.
- Name checklists exactly: "Acceptance Criteria", "Test Verification", "Implementation Checklist".
- Link notes to the task so validation can find them.
`,
  ai_guide: {
    purpose: 'Plan tasks as spec packs; gate coding until the spec is ready.',
    state_machine: [
      {
        name: 'spec_state',
        states: ['draft','spec_in_progress','spec_ready'],
        transitions: [
          { from: 'draft', to: 'spec_in_progress' },
          { from: 'spec_in_progress', to: 'spec_ready', guard: 'validation passes' }
        ]
      },
      {
        name: 'task_status',
        states: ['todo','in_progress','blocked','done','cancelled'],
        transitions: [{ from: 'todo', to: 'in_progress', guard: 'spec_state=spec_ready' }]
      }
    ],
    allowed_actions_by_state: {
      draft: ['tasks.get','workflows.validate','notes.add','checklists.add','tasks.update','tasks.get_spec_bundle','workflows.scaffold','tasks.set_spec_state'],
      spec_in_progress: ['tasks.get','workflows.validate','notes.add','checklists.add','tasks.update','tasks.get_spec_bundle','workflows.scaffold','tasks.set_spec_state'],
      spec_ready: ['tasks.get','tasks.update(task_status=in_progress)','workflows.validate','notes.add','checklists.add']
    },
    validation_gates: [
      { id: 'architecture', description: 'Documentation note with mermaid fenced block', maps_to: ['notes.add'] },
      { id: 'erd', description: 'Documentation note with erDiagram', maps_to: ['notes.add'] },
      { id: 'api_contract', description: 'Documentation note with openapi: 3.1.x', maps_to: ['notes.add'] },
      { id: 'acceptance_criteria', description: '3+ Gherkin items (Given/When/Then)', maps_to: ['checklists.add'] },
      { id: 'test_verification', description: 'Min 2 items including unit + integration/e2e', maps_to: ['checklists.add'] },
      { id: 'implementation_checklist', description: '3+ actionable items', maps_to: ['checklists.add'] }
    ],
    stepper_flows: {
      spec_prep: {
        title: 'Prepare spec to Ready',
        steps: [
          { tool: 'tasks', action: 'get_spec_bundle', args: { compact: true } },
          { tool: 'workflows', action: 'validate', args: {} },
          { tool: 'notes', action: 'add', args: { note_type: 'documentation', title: 'Architecture', content: '```mermaid\nflowchart TD\n A-->B\n```', entity_links: [{ entity_type: 'task', entity_id: '{{task_id}}' }] } },
          { tool: 'notes', action: 'add', args: { note_type: 'documentation', title: 'ERD', content: '```mermaid\nerDiagram\n```', entity_links: [{ entity_type: 'task', entity_id: '{{task_id}}' }] } },
          { tool: 'notes', action: 'add', args: { note_type: 'documentation', title: 'API Contract', content: '```yaml\nopenapi: 3.1.0\npaths: {}\n```', entity_links: [{ entity_type: 'task', entity_id: '{{task_id}}' }] } },
          { tool: 'checklists', action: 'add', args: { name: 'Acceptance Criteria', items: ['Given ..., When ..., Then ...','Given ..., When ..., Then ...','Given ..., When ..., Then ...'] } },
          { tool: 'checklists', action: 'add', args: { name: 'Test Verification', items: ['Unit: ...','Integration: ...'] } },
          { tool: 'checklists', action: 'add', args: { name: 'Implementation Checklist', items: ['Data model','API routes','UI states'] } },
          { tool: 'workflows', action: 'validate', args: {} },
          { tool: 'tasks', action: 'update', args: { spec_state: 'spec_ready' } }
        ]
      },
      start_work: {
        title: 'Start implementation',
        steps: [ { tool: 'tasks', action: 'update', args: { task_status: 'in_progress' } } ]
      }
    },
    examples: [
      {
        title: 'One-shot: fetch bundle and see missing items',
        calls: [
          { tool: 'tasks', action: 'get_spec_bundle', args: { task_id: '{{task_id}}', compact: true } },
          { tool: 'workflows', action: 'validate', args: { task: { id: '{{task_id}}' } } }
        ]
      }
    ],
    do: [
      'Use exact checklist names (Acceptance Criteria, Test Verification, Implementation Checklist)',
      'Link notes to the task via entity_links',
      'Validate after each write group and before setting spec_ready'
    ],
    dont: [
      'Do not set task_status=in_progress before spec_ready',
      'Do not attach screenshots instead of ERD/API snippets',
      'Do not rename canonical checklist names'
    ],
    params_contract: [
      { name: 'checklists[].name', required: true, description: 'Exact canonical names required' },
      { name: 'notes.note_type', required: true, description: 'documentation | excalidraw' }
    ],
    idempotency: 'All ensure/add operations are idempotent by name; safe to retry.',
    error_recovery: [
      { error: 'Gate prevents in_progress', fix: 'Set spec_state=spec_ready by passing validation' },
      { error: 'Validation missing ERD', fix: 'Add ERD note with mermaid erDiagram block linked to the task' }
    ],
    rate_limits: [ { scope: 'validation.loop', limit: 'Suggest ≤10 writes per loop' } ]
  }
};
