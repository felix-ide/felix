import type { McpToolDefinition } from './common.js';

export const NOTES_TOOL: McpToolDefinition = {
  name: 'notes',
  description: `Create and manage documentation with markdown, mermaid, and excalidraw.

EXAMPLES:
{ project: "my-app", action: "add", title: "Architecture", content: "# System Design\n..." }
{ project: "my-app", action: "list", limit: 10 }
{ project: "my-app", action: "get", note_id: "note_123" }

Supports mermaid (\`\`\`mermaid), excalidraw (\`\`\`excalidraw), markdown.
Link to tasks: entity_links: [{ entity_type: "task", entity_id: "task_123" }]`,
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      action: {
        type: 'string',
        enum: ['add', 'get', 'list', 'update', 'delete', 'get_tree', 'help'],
        description: 'Action to perform'
      },
      // For add action
      title: {
        type: 'string',
        description: 'Note title (for add/update actions)'
      },
      content: {
        type: 'string',
        description: 'Note content (for add/update actions)'
      },
      note_type: {
        type: 'string',
        enum: ['note', 'warning', 'documentation', 'excalidraw'],
        description: 'Type of note (for add action)',
        default: 'note'
      },
      entity_links: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            entity_type: { 
              type: 'string',
              description: 'Type: component, file, project, relationship, directory, task'
            },
            entity_id: { 
              type: 'string',
              description: 'ID of the entity'
            },
            link_strength: {
              type: 'string',
              enum: ['primary', 'secondary', 'reference'],
              description: 'Strength of the link'
            }
          },
          required: ['entity_type', 'entity_id']
        },
        description: 'Entities to link this note to (for add/update actions). Example: [{ entity_type: "task", entity_id: "task_123" }]'
      },
      stable_tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Note tags (for add/update actions)'
      },
      // For list/search actions
      query: {
        type: 'string',
        description: 'Search query (for search action)'
      },
      semantic: {
        type: 'boolean',
        description: 'Use semantic search (for search action)',
        default: true
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by tags (for list/search actions)'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of notes to return (for list/search actions)',
        default: 20
      },
      // For get/update/delete actions
      note_id: {
        type: 'string',
        description: 'ID of note to get/update/delete'
      },
      // For get_tree action
      root_note_id: {
        type: 'string',
        description: 'Root note ID for tree (for get_tree action, omit for all root notes)'
      },
      include_all: {
        type: 'boolean',
        description: 'Include all notes vs only active (for get_tree action)',
        default: true
      }
    },
    required: ['project', 'action']
  }
};

/**
 * Workflows tool - parity with HTTP for AI/user flows
 */
