import type { McpToolDefinition } from '../common.js';

export const NOTES_GET_TOOL: McpToolDefinition = {
  name: 'notes_get',
  description: 'Get a single note by ID.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      note_id: {
        type: 'string',
        description: 'Note ID to fetch'
      }
    },
    required: ['project', 'note_id']
  }
};
