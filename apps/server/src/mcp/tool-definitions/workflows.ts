import type { McpToolDefinition } from './common.js';

export const WORKFLOWS_TOOL: McpToolDefinition = {
  name: 'workflows',
  description: 'Administrative tool for workflow configuration. Use action: "help" to get full schema and available actions.',
  inputSchema: {
    type: 'object',
    properties: {
      project: { type: 'string', description: 'Project name or path' },
      action: { type: 'string', description: 'Action to perform. Use "help" to see all available actions and parameters.' }
    },
    required: ['project', 'action']
  }
};


/**
 * Tasks tool - consolidated task management
 * 
 * To attach a note to a task, use the notes tool with:
 * entity_links: [{ entity_type: 'task', entity_id: 'task_123' }]
 */
