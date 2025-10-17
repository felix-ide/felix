import type { McpToolDefinition } from '../../common.js';

export const TASKS_DEPENDENCIES_WRITE_TOOL: McpToolDefinition = {
  name: 'tasks_dependencies_write',
  description: 'Add a dependency between tasks.',
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
        description: 'Task ID that this task depends on'
      },
      type: {
        type: 'string',
        enum: ['blocks', 'related', 'follows'],
        description: 'Type of dependency',
        default: 'blocks'
      },
      required: {
        type: 'boolean',
        description: 'Is this dependency required',
        default: true
      }
    },
    required: ['project', 'task_id', 'dependency_task_id']
  }
};
