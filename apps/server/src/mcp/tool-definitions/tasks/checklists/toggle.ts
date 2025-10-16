import type { McpToolDefinition } from '../../common.js';

export const TASKS_CHECKLISTS_TOGGLE_TOOL: McpToolDefinition = {
  name: 'tasks_checklists_toggle',
  description: 'Toggle checklist item completion status.',
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
