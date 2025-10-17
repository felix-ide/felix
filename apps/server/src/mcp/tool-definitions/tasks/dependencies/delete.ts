import type { McpToolDefinition } from '../../common.js';

export const TASKS_DEPENDENCIES_DELETE_TOOL: McpToolDefinition = {
  name: 'tasks_dependencies_delete',
  description: 'Remove a dependency between tasks.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      task_id: {
        type: 'string',
        description: 'Task ID that has the dependency'
      },
      dependency_task_id: {
        type: 'string',
        description: 'Task ID of the dependency to remove'
      },
      type: {
        type: 'string',
        enum: ['blocks', 'related', 'follows'],
        description: 'Optionally filter to specific dependency type'
      }
    },
    required: ['project', 'task_id', 'dependency_task_id']
  }
};
