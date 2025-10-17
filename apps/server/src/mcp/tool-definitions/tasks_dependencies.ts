import type { McpToolDefinition } from './common.js';

export const TASKS_DEPENDENCIES_TOOL: McpToolDefinition = {
  name: 'tasks_dependencies',
  description: 'Manage task dependencies: add or remove blocking, related, and follows relationships.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      action: {
        type: 'string',
        enum: ['add', 'remove'],
        description: 'add=create dependency, remove=delete dependency'
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
        description: '[add] Is this dependency required',
        default: true
      }
    },
    required: ['project', 'action', 'task_id', 'dependency_task_id']
  }
};
