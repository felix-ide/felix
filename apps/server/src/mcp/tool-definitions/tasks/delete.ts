import type { McpToolDefinition } from '../common.js';

export const TASKS_DELETE_TOOL: McpToolDefinition = {
  name: 'tasks_delete',
  description: 'Delete a task.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      task_id: {
        type: 'string',
        description: 'Task ID to delete'
      }
    },
    required: ['project', 'task_id']
  }
};
