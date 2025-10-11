import type { McpToolDefinition } from './common.js';

export const WORKFLOWS_TOOL: McpToolDefinition = {
  name: 'workflows',
  description: `Workflow configuration and task validation. Workflows are templates that define requirements for different task types.

What this tool does:
- Validates tasks against workflow requirements (most common use)
- Configures workflow definitions and status flows (admin/setup)
- Most projects have workflows pre-configured - use 'list' to see available workflows

Common validation workflow:
1. User creates task with tasks tool (action: add)
2. Optionally validate with workflows tool (action: validate) to check spec readiness
3. Tasks tool automatically includes validation in add/update responses

Actions:
Validation:
- validate: Check if task meets workflow requirements {is_valid, completion_percentage, missing_requirements, can_override}
  Note: Pass childTasks array in task object to validate child_requirements (e.g., task: { childTasks: [{id, task_type, task_status}] })
- scaffold: Get guidance for missing requirements (dry_run=true default, set false to create items)

Configuration (admin):
- list/get: View available workflows
- create: Define new workflow template (fails if name exists - use update instead)
- update: Modify existing workflow definition
- delete: Remove workflow definition
- get_default/set_default: Default workflow for new tasks
- set_type_mapping/get_type_mapping: Map task types to workflows
- resolve: Get workflow for a task type

Status management:
- list_statuses/upsert_status/delete_status: Define available task statuses
- list_status_flows/upsert_status_flow/delete_status_flow: Define status progressions
- get_flow_mapping/set_flow_mapping: Map task types to status flows

Example workflow requirements (feature_development):
- Notes: Architecture (mermaid), ERD (erDiagram), API Contract (openapi 3.1)
- Checklists: "Acceptance Criteria" (≥3 G/W/T), "Implementation Checklist" (≥3), "Test Verification" (≥2 unit+integration/e2e), "Regression Testing" (≥1)
- Rules: entity_links with ≥1 {entity_type:'rule', entity_id}
- Child Requirements: Tasks can require specific child tasks (e.g., feature requires child tasks of type 'task' using 'simple' workflow)
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
        enum: [
          'list',
          'get',
          'create',
          'update',
          'delete',
          'get_default',
          'set_default',
          'get_config',
          'update_config',
          'set_type_mapping',
          'get_type_mapping',
          'resolve',
          'validate',
          'scaffold',
          'guide',
          'reseed',
          'help',
          'list_statuses',
          'upsert_status',
          'delete_status',
          'list_status_flows',
          'upsert_status_flow',
          'delete_status_flow',
          'get_flow_mapping',
          'set_flow_mapping'
        ],
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
      dry_run: { type: 'boolean', default: true, description: 'Guidance only when true; only write on false' },
      // Reseed
      force: { type: 'boolean', default: false, description: 'Force update existing workflows (for reseed action)' },
      // Status catalog
      status_id: { type: 'string', description: 'Existing status identifier (for delete/update)' },
      status: {
        type: 'object',
        description: 'Task status payload for upsert_status',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          display_label: { type: 'string' },
          emoji: { type: 'string' },
          color: { type: 'string' },
          description: { type: 'string' }
        }
      },
      // Status flows
      flow_id: { type: 'string', description: 'Existing status-flow identifier (for delete/update)' },
      flow: {
        type: 'object',
        description: 'Task status flow payload for upsert_status_flow',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          display_label: { type: 'string' },
          description: { type: 'string' },
          status_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Ordered list of status ids composing the flow'
          },
          metadata: { type: 'object' }
        },
        required: ['name', 'status_ids']
      },
      // Flow mapping
      flow_map: {
        type: 'object',
        description: 'Bulk task-type to flow mapping for set_flow_mapping',
        additionalProperties: { type: 'string' }
      },
      flow_id_for_type: {
        type: 'string',
        description: 'Flow identifier to assign via set_flow_mapping'
      }
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
