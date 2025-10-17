import type { HelpPack } from '../types/HelpTypes.js';

export const CHECKLISTS_HELP: HelpPack = {
  section: 'checklists',
  version: '2.0.0',
  human_md: `# Checklists — Canonical Names and Formats

Checklists are managed via the tasks tool using the checklist_updates parameter.

Use named checklists to drive validation:
- Acceptance Criteria: 3+ Gherkin items (Given / When / Then)
- Test Verification: include both "unit" and "integration" or "e2e"
- Implementation Checklist: 3+ actionable steps

## Creating checklists (on task creation)
\`\`\`json
{
  "checklists": [
    {
      "name": "Acceptance Criteria",
      "items": [ {"text": "Given …, When …, Then …"}, {"text": "Given …"}, {"text": "Given …"} ]
    }
  ]
}
\`\`\`

## Updating checklists (via tasks tool update action)
\`\`\`json
{
  "checklist_updates": [
    { "checklist": "Acceptance Criteria", "operation": "toggle", "index": 0 },
    { "checklist": "Acceptance Criteria", "operation": "add", "text": "Given …", "position": 2 },
    { "checklist": "Implementation Checklist", "operation": "remove", "index": 1 },
    { "checklist": "Acceptance Criteria", "operation": "move", "from": 0, "to": 2 }
  ]
}
\`\`\`

Operations: toggle, add, remove, move, update (text), delete (entire checklist)

Example Acceptance Criteria items (text)
- Given a logged out user, When accessing /account, Then redirect to /login
- Given an invalid token, When fetching /api/items, Then respond 401
`,
  ai_guide: {
    purpose: 'Ensure canonical checklist names and semantics are present. Checklists are managed via tasks tool.',
    do: ['Use exact canonical names', 'Use atomic checklist_updates operations', 'Add minimal but complete items', 'Include negative/edge case where critical'],
    dont: ['Do not use free-form names', 'Do not add fewer than required items', 'Do not use separate checklists tool (deprecated)'],
    params_contract: [
      { name: 'checklists[].name', required: true, description: 'Checklist name (for task creation)' },
      { name: 'checklists[].items[].text', required: true, description: 'Each item is an object with a text field' },
      { name: 'checklist_updates[].checklist', required: true, description: 'Name of checklist to modify (for task updates)' },
      { name: 'checklist_updates[].operation', required: true, description: 'toggle | add | remove | move | update | delete' }
    ]
  }
};
