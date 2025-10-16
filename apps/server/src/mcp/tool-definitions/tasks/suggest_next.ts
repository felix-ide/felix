import type { McpToolDefinition } from '../common.js';

export const TASKS_SUGGEST_NEXT_TOOL: McpToolDefinition = {
  name: 'tasks_suggest_next',
  description: 'Get AI suggestions for the next task to work on.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      assignee: {
        type: 'string',
        description: 'Filter by assignee'
      },
      context: {
        type: 'string',
        description: 'Context for smart suggestions'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of suggestions to return',
        default: 20
      }
    },
    required: ['project']
  }
};
