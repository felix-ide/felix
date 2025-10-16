import type { McpToolDefinition } from '../../common.js';

export const TASKS_CHECKLISTS_MOVE_TOOL: McpToolDefinition = {
  name: 'tasks_checklists_move',
  description: 'Reorder checklist items.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      task_id: {
        type: 'string',
        description: 'Task ID containing the checklist'
      },
      checklist: {
        type: 'string',
        description: 'Name of the checklist'
      },
      from: {
        type: 'number',
        description: 'Source index (0-based)'
      },
      to: {
        type: 'number',
        description: 'Target index (0-based)'
      }
    },
    required: ['project', 'task_id', 'checklist', 'from', 'to']
  }
};
