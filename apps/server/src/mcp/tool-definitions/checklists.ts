import type { McpToolDefinition } from './common.js';

export const CHECKLISTS_TOOL: McpToolDefinition = {
  name: 'checklists',
  description: `Checklists (compact). Manage named checklists for a task.

Actions: add | update | toggle_item | add_item | remove_item | delete | get_progress.
Idempotency: add/update are idempotent by checklist name; toggle is reversible.
Reference: items belong to a task via task_id + checklist name.`,
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      action: {
        type: 'string',
        enum: ['add', 'update', 'toggle_item', 'add_item', 'remove_item', 'delete', 'get_progress', 'help'],
        description: 'Action to perform'
      },
      task_id: {
        type: 'string',
        description: 'ID of the task containing the checklist'
      },
      // For add/update/delete actions
      name: {
        type: 'string',
        description: 'Checklist name (for add action)'
      },
      checklist_name: {
        type: 'string',
        description: 'Current checklist name (for update/toggle/add_item/remove_item/delete actions)'
      },
      new_name: {
        type: 'string',
        description: 'New name for checklist (for update action)'
      },
      items: {
        type: 'array',
        items: { type: 'string' },
        description: 'Initial items for new checklist or replacement items (for add/update actions)'
      },
      // For toggle_item/remove_item actions
      item_index: {
        type: 'number',
        description: 'Index of item to toggle/remove (0-based)'
      },
      item_text: {
        type: 'string',
        description: 'Text of item to toggle/remove (alternative to index)'
      },
      // For add_item action
      text: {
        type: 'string',
        description: 'Text for new item (for add_item action)'
      },
      position: {
        type: 'number',
        description: 'Position to insert new item (for add_item action, defaults to end)'
      }
    },
    required: ['project', 'action', 'task_id']
  }
};

/**
 * Degradation management tool - consolidated degradation operations
 */
