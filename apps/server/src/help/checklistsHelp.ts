import type { HelpPack } from '../types/HelpTypes.js';

export const CHECKLISTS_HELP: HelpPack = {
  section: 'checklists',
  version: '1.0.0',
  human_md: `# Checklists — Canonical Names and Formats

Use named checklists to drive validation:
- Acceptance Criteria: 3+ Gherkin items (Given / When / Then)
- Test Verification: include both "unit" and "integration" or "e2e"
- Implementation Checklist: 3+ actionable steps

Payload shape (JSON)
\`\`\`json
{
  "checklists": [
    {
      "name": "Acceptance Criteria",
      "items": [ {"text": "Given …, When …, Then …"}, {"text": "Given …"}, {"text": "Given …"} ]
    },
    {
      "name": "Test Verification",
      "items": [ {"text": "Unit tests cover core logic"}, {"text": "Integration/E2E happy path executes"} ]
    },
    {
      "name": "Implementation Checklist",
      "items": [ {"text": "Define data model"}, {"text": "Wire API"}, {"text": "Add UI states"} ]
    },
    {
      "name": "Regression Testing",
      "items": [ {"text": "Smoke: affected screens"} ]
    }
  ]
}
\`\`\`
 
Example Acceptance Criteria items (text)
- Given a logged out user, When accessing /account, Then redirect to /login
- Given an invalid token, When fetching /api/items, Then respond 401
`,
  ai_guide: {
    purpose: 'Ensure canonical checklist names and semantics are present.',
    do: ['Use exact names', 'Add minimal but complete items', 'Include negative/edge case where critical'],
    dont: ['Do not use free-form names', 'Do not add fewer than required items'],
    params_contract: [
      { name: 'name', required: true, description: 'Checklist name' },
      { name: 'items[].text', required: true, description: 'Each item is an object with a text field' }
    ]
  }
};
