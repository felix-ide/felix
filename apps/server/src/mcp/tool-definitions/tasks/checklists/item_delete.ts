import type { McpToolDefinition } from '../../common.js';

export const TASKS_CHECKLISTS_ITEM_DELETE_TOOL: McpToolDefinition = {
  name: 'tasks_checklists_item_delete',
  description: 'Delete a specific checklist item.',
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
      index: {
        type: 'number',
        description: 'Item index (0-based)'
      }
    },
    required: ['project', 'task_id', 'checklist', 'index']
  }
};
