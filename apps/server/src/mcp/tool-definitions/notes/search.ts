import type { McpToolDefinition } from '../common.js';

export const NOTES_SEARCH_TOOL: McpToolDefinition = {
  name: 'notes_search',
  description: 'Search notes semantically with optional filtering.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      query: {
        type: 'string',
        description: 'Search query'
      },
      semantic: {
        type: 'boolean',
        description: 'Use semantic search',
        default: true
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
    required: ['project', 'query']
  }
};
