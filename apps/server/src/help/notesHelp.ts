import type { HelpPack } from '../types/HelpTypes.js';

export const NOTES_HELP: HelpPack = {
  section: 'notes',
  version: '1.0.0',
  human_md: `# Notes — Templates and Linking

Use notes for Architecture, ERD, API Contracts, and Observability. Link notes to tasks so validation can find them.

Templates
- Architecture (documentation):
\`\`\`mermaid
flowchart TD
  A[Service] --> B[DB]
\`\`\`

- ERD (documentation):
\`\`\`mermaid
erDiagram
  USER ||--o{ ORDER : places
\`\`\`

- API Contract (documentation):
\`\`\`yaml
openapi: 3.1.0
paths: {}
\`\`\`

- Observability (documentation):
## Metrics\n- [ ] ...\n\n## Logs\n- [ ] ...\n\n## Alerts\n- [ ] ...

Linking
- Either direction is recognized by validation:
  - Preferred: add the note with entity_links: [{ entity_type: 'task', entity_id: '<TASK_ID>' }]
  - Also accepted: update the task with entity_links: [{ entity_type: 'note', entity_id: '<NOTE_ID>' }]

Validator content cues (strict):
- Architecture requires a fenced mermaid block.
- ERD requires the literal token "erDiagram" within the note content.
- API Contract requires the literal token "openapi: 3.1" within the note content.

Examples
- ERD note
\`\`\`json
{ "title":"ERD: Feature", "note_type":"documentation", "content":"\`\`\`mermaid\nerDiagram\n\`\`\`", "entity_links":[{"entity_type":"task","entity_id":"<TASK_ID>"}] }
\`\`\`
- API note
\`\`\`json
{ "title":"API Contract: Feature", "note_type":"documentation", "content":"\`\`\`yaml\nopenapi: 3.1.0\npaths: {}\n\`\`\`", "entity_links":[{"entity_type":"task","entity_id":"<TASK_ID>"}] }
\`\`\`
`,
  ai_guide: {
    purpose: 'Create minimal, valid notes linked to the task using canonical templates.',
    do: ['Use mermaid for Architecture/ERD', 'Use OpenAPI 3.1 for API contracts', 'Always include entity_links → task'],
    dont: ['Do not attach images instead of diagrams', 'Do not skip linking'],
    params_contract: [
      { name: 'note_type', required: true, description: 'documentation | excalidraw' },
      { name: 'entity_links[].entity_type', required: true, description: 'set to task' },
      { name: 'entity_links[].entity_id', required: true, description: 'task id' }
    ],
    idempotency: 'Multiple add calls are allowed; prefer one note per artifact type.'
  }
};
