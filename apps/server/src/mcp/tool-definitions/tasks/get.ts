import type { McpToolDefinition } from '../common.js';

export const TASKS_GET_TOOL: McpToolDefinition = {
  name: 'tasks_get',
  description: 'Get a single task by ID.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      task_id: {
        type: 'string',
        description: 'Task ID to fetch'
      },
      include_notes: {
        type: 'boolean',
        description: 'Include attached notes in response',
        default: true
      },
      include_children: {
        type: 'boolean',
        description: 'Include child tasks in response',
        default: true
      },
      include_dependencies: {
        type: 'boolean',
        description: 'Include task dependencies in response',
        default: false
      }
    },
    required: ['project', 'task_id']
  }
};
