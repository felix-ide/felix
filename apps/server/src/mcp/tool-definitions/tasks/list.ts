import type { McpToolDefinition } from '../common.js';

export const TASKS_LIST_TOOL: McpToolDefinition = {
  name: 'tasks_list',
  description: 'List tasks with optional filtering and pagination.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      parent_id: {
        type: 'string',
        description: 'Filter by parent task ID'
      },
      task_status: {
        type: 'string',
        enum: ['todo', 'in_progress', 'blocked', 'done', 'cancelled'],
        description: 'Filter by task status'
      },
      task_type: {
        type: 'string',
        description: 'Filter by task type'
      },
      include_children: {
        type: 'boolean',
        description: 'Include child tasks in results',
        default: true
      },
      limit: {
        type: 'number',
        description: 'Maximum number of tasks to return',
        default: 20
      },
      offset: {
        type: 'number',
        description: 'Number of tasks to skip for pagination',
        default: 0
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific fields to return (e.g., ["id", "title", "status"]). Omit for full task objects.'
      },
      output_format: {
        type: 'string',
        enum: ['text', 'json'],
        description: 'Return optimized text or JSON rows',
        default: 'text'
      },
      context_window_size: {
        type: 'number',
        description: 'Token budget for results (text mode)',
        default: 25000
      }
    },
    required: ['project']
  }
};
