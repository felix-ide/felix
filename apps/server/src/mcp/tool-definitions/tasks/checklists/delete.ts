import type { McpToolDefinition } from '../../common.js';

export const TASKS_CHECKLISTS_DELETE_TOOL: McpToolDefinition = {
  name: 'tasks_checklists_delete',
  description: 'Delete an entire checklist.',
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
        description: 'Name of the checklist to delete'
      }
    },
    required: ['project', 'task_id', 'checklist']
  }
};
