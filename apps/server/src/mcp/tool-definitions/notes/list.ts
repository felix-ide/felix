import type { McpToolDefinition } from '../common.js';

export const NOTES_LIST_TOOL: McpToolDefinition = {
  name: 'notes_list',
  description: 'List notes with optional filtering by tags, Knowledge Base, etc.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      kb_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter notes to specific Knowledge Base(s). Use KB IDs like "kb_project".'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by tags'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of notes to return',
        default: 20
      }
    },
    required: ['project']
  }
};
