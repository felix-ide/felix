import type { McpToolDefinition } from './common.js';

export const WORKFLOWS_TOOL: McpToolDefinition = {
  name: 'workflows',
  description: `Admin tool for configuring workflow templates that define task requirements. Most users don't need this - tasks tool provides automatic validation and guidance.

PURPOSE: Define what makes a task "spec ready" per task type. System validates tasks against these rules.

Required: project, action
Validation(for checking): validate(task), scaffold(task_id,sections[],dry_run=T)
Config(admin only): list|get(workflow_name), create(workflow), update(workflow_name,updates), delete(workflow_name)
Defaults: get_default, set_default(workflow_name), reseed(force=F)
Mappings: set_type_mapping(task_type,workflow_name), get_type_mapping, resolve(task_type)
Status System: list_statuses, upsert_status, delete_status, list_status_flows, upsert_status_flow, get_flow_mapping, set_flow_mapping

HOW IT WORKS:
- Workflows define requirements: notes (with diagram types), checklists (with min counts), rules, child tasks
- Tasks tool auto-validates against assigned workflow
- Validation blocks status=in_progress until spec_state=spec_ready
- Use tasks tool for normal work; use workflows tool to customize requirements

TYPICAL USE: Most users never touch this - just use tasks tool. Advanced users customize workflows for team standards.`,
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
