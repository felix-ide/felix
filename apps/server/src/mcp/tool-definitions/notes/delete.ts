import type { McpToolDefinition } from '../common.js';

export const NOTES_DELETE_TOOL: McpToolDefinition = {
  name: 'notes_delete',
  description: 'Delete a note.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      note_id: {
        type: 'string',
        description: 'Note ID to delete'
      }
    },
    required: ['project', 'note_id']
  }
};
