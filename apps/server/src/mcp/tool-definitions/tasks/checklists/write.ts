import type { McpToolDefinition } from '../../common.js';

export const TASKS_CHECKLISTS_WRITE_TOOL: McpToolDefinition = {
  name: 'tasks_checklists_write',
  description: 'Add or update a checklist item.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      mode: {
        type: 'string',
        enum: ['create', 'update'],
        description: 'create=add new item, update=modify existing item'
      },
      task_id: {
        type: 'string',
        description: 'Task ID containing the checklist'
      },
      checklist: {
        type: 'string',
        description: 'Name of the checklist to modify'
      },
      index: {
        type: 'number',
        description: 'Item index (0-based, required for update mode)'
      },
      text: {
        type: 'string',
        description: 'Item text'
      },
      position: {
        type: 'number',
        description: 'Position to insert new item (for create mode, defaults to end)'
      }
    },
    required: ['project', 'mode', 'task_id', 'checklist', 'text']
  }
};
