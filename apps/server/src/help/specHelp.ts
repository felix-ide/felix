import type { HelpPack } from '../types/HelpTypes.js';

export const SPEC_HELP: HelpPack = {
  section: 'spec',
  version: '1.0.0',
  human_md: `# Spec Pack — One-Page Overview

Spec Pack bundles everything needed to implement a task:
- Core task info (title/description/type/status/spec_state)
- Linked notes (Architecture, ERD, API, Observability)
- Checklists (Acceptance Criteria, Test Verification, Implementation)
- Validation summary + Guidance next actions

Find it via the Spec Bundle API or MCP action.

\`\`\`mermaid
flowchart TD
  B[Bundle] --> N[Notes]
  B --> C[Checklists]
  B --> V[Validation]
  B --> G[Guidance]
\`\`\`
`,
  ai_guide: {
    purpose: 'Fetch the bundle and follow guidance to reach spec_ready.',
    stepper_flows: {
      use_bundle: {
        title: 'Use spec-bundle to plan',
        steps: [
          { tool: 'tasks', action: 'get_spec_bundle', args: { task_id: '{{task_id}}', compact: true } },
          { tool: 'workflows', action: 'validate', args: { task: { id: '{{task_id}}' } } }
        ]
      }
    }
  }
};
