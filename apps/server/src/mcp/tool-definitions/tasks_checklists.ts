import type { McpToolDefinition } from './common.js';

export const TASKS_CHECKLISTS_TOOL: McpToolDefinition = {
  name: 'tasks_checklists',
  description: 'Manage task checklists: add, update, toggle, move, and delete items or entire checklists.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      action: {
        type: 'string',
        enum: ['create', 'update', 'toggle', 'move', 'delete_item', 'delete'],
        description: 'create=add item, update=modify item, toggle=check/uncheck, move=reorder, delete_item=remove item, delete=remove checklist'
      },
      task_id: {
        type: 'string',
        description: 'Task ID containing the checklist'
      },
      checklist: {
        type: 'string',
        description: 'Name of the checklist'
      },

      // For create/update
      text: {
        type: 'string',
        description: '[create/update] Item text'
      },
      index: {
        type: 'number',
        description: '[update/toggle/delete_item] Item index (0-based)'
      },
      position: {
        type: 'number',
        description: '[create] Position to insert new item (defaults to end)'
      },

      // For move
      from: {
        type: 'number',
        description: '[move] Source index (0-based)'
      },
      to: {
        type: 'number',
        description: '[move] Target index (0-based)'
      }
    },
    required: ['project', 'action', 'task_id', 'checklist']
  }
};
