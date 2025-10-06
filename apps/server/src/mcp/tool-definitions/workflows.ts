import type { McpToolDefinition } from './common.js';

export const WORKFLOWS_TOOL: McpToolDefinition = {
  name: 'workflows',
  description: `Workflow registry + validate (compact).

Actions:
- list|get|create|update|delete
- get_default|set_default
- get_config|update_config
- set_type_mapping|get_type_mapping|resolve
- validate (read-only): returns { is_valid, completion_percentage, missing_requirements[], completed_requirements[], workflow, can_override }
- scaffold: guidance-first; dry_run=true by default (no writes)

Spec Readiness Quick Ref (feature_development):
- Architecture note (documentation + mermaid)
- ERD note (documentation + erDiagram)
- API Contract note (documentation + openapi: 3.1)
- Task checklists on the task:
  • "Acceptance Criteria" (≥3 items with Given/When/Then)
  • "Implementation Checklist" (≥3 items)
  • "Test Verification" (≥2 items containing 'unit' and 'integration' or 'e2e')
  • "Regression Testing" (≥1 item)
- Rules: tasks.entity_links must include ≥1 { entity_type:'rule', entity_id }
`,
  // Quick Ref for AIs:
  // Spec Readiness (feature_development):
  // - Architecture note (documentation + mermaid)
  // - ERD note (documentation + erDiagram)
  // - API Contract note (documentation + openapi: 3.1)
  // - Task checklists on the task: "Acceptance Criteria" (>=3 G/W/T),
  //   "Implementation Checklist" (>=3), "Test Verification" (>=2 with 'unit' and 'integration' or 'e2e'),
  //   "Regression Testing" (>=1)
  // - Rules: tasks.entity_links must include at least one { entity_type:'rule', entity_id }
  inputSchema: {
    type: 'object',
    properties: {
      project: { type: 'string', description: 'Project name or path' },
      action: {
        type: 'string',
        enum: ['list','get','create','update','delete','get_default','set_default','get_config','update_config','set_type_mapping','get_type_mapping','resolve','validate','scaffold','guide','reseed','help'],
        description: 'Action to perform'
      },
      // Common
      workflow_name: { type: 'string', description: 'Workflow name (for get/update/delete/resolve)' },
      workflow: { type: 'object', description: 'Workflow definition (for create)' },
      updates: { type: 'object', description: 'Partial workflow updates (for update/update_config)' },
      // Type mapping
      task_type: { type: 'string', description: 'Task type for mapping/resolve' },
      // Validation
      task: { type: 'object', description: 'Task-like object (title, description, task_type, tags, entity_links, checklists)' },
      // Scaffold
      task_id: { type: 'string', description: 'Parent task id for scaffold' },
      sections: { type: 'array', items: { type: 'string' }, description: 'Sections to scaffold (e.g., ["subtasks"])' },
      dry_run: { type: 'boolean', default: true, description: 'Guidance only when true; only write on false' }
    },
    required: ['project','action']
  }
};


/**
 * Tasks tool - consolidated task management
 * 
 * To attach a note to a task, use the notes tool with:
 * entity_links: [{ entity_type: 'task', entity_id: 'task_123' }]
 */
