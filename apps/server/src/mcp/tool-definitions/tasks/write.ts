import type { McpToolDefinition } from '../common.js';

export const TASKS_WRITE_TOOL: McpToolDefinition = {
  name: 'tasks_write',
  description: 'Create or update a task. Returns task with validation guidance showing what\'s needed for spec_ready.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      mode: {
        type: 'string',
        enum: ['create', 'update'],
        description: 'create=new task, update=modify existing'
      },
      task_id: {
        type: 'string',
        description: 'Task ID (required for update mode)'
      },
      title: {
        type: 'string',
        description: 'Task title'
      },
      description: {
        type: 'string',
        description: 'Task description'
      },
      parent_id: {
        type: 'string',
        description: 'Parent task ID for hierarchical structure'
      },
      task_type: {
        type: 'string',
        description: 'Type of task (epic, story, task, bug, etc). Custom types allowed via mapping.',
        default: 'task'
      },
      task_status: {
        type: 'string',
        enum: ['todo', 'in_progress', 'blocked', 'done', 'cancelled'],
        description: 'Task status'
      },
      task_priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
        description: 'Task priority',
        default: 'medium'
      },
      spec_state: {
        type: 'string',
        enum: ['draft', 'spec_in_progress', 'spec_ready'],
        description: 'Spec gating state. Gate: status cannot move to in_progress unless spec_state=spec_ready.'
      },
      spec_waivers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            reason: { type: 'string' },
            added_by: { type: 'string' },
            added_at: { type: 'string' }
          },
          required: ['code', 'reason']
        },
        description: 'Structured waivers for conditional requirements (advanced)'
      },
      estimated_effort: {
        type: 'string',
        description: 'Estimated effort'
      },
      actual_effort: {
        type: 'string',
        description: 'Actual effort spent'
      },
      due_date: {
        type: 'string',
        description: 'Due date'
      },
      assigned_to: {
        type: 'string',
        description: 'User assigned to this task'
      },
      workflow: {
        type: 'string',
        description: 'Workflow type for the task. When changed, task status resets to new workflow\'s initial state.'
      },
      checklists: {
        type: 'array',
        items: { type: 'object' },
        description: 'Initial checklists (for create mode)'
      },
      entity_links: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            entity_type: { type: 'string' },
            entity_id: { type: 'string' },
            entity_name: { type: 'string' },
            link_strength: { type: 'string' }
          }
        },
        description: 'Links to CODE entities (components, files, etc.). To attach notes to tasks, use notes tool.'
      },
      stable_tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Task tags'
      },
      sort_order: {
        type: 'number',
        description: 'Manual sort order for tasks'
      },
      transition_gate_token: {
        type: 'string',
        description: 'Token for workflow transition gates (internal)'
      },
      transition_gate_response: {
        type: 'string',
        description: 'Response for workflow transition gates (internal)'
      },
      skip_validation: {
        type: 'boolean',
        description: 'Skip validation and guidance generation',
        default: false
      },
      include_guidance: {
        type: 'boolean',
        description: 'Return AI guidance pack with task',
        default: true
      }
    },
    required: ['project', 'mode']
  }
};
