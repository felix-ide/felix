import type { McpToolDefinition } from './common.js';

export const NOTES_TOOL: McpToolDefinition = {
  name: 'notes',
  description: `Documentation and diagram management with markdown, mermaid, excalidraw. Creates hierarchical docs and Knowledge Bases.

FORMATS: Markdown, \`\`\`mermaid diagrams (flowchart, sequence, ERD, etc.), \`\`\`excalidraw drawings
LINKING: Attach to tasks, components, files, rules via entity_links - notes appear in their context automatically
WORKFLOWS: Tasks require specific note types (Architecture, ERD, API Contract) for spec_ready gate
KNOWLEDGE BASES: Use kb_template to create structured KB from template. Filter list by kb_ids to scope to specific KBs.`,
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      action: {
        type: 'string',
        enum: ['create', 'get', 'update', 'delete', 'list', 'search'],
        description: 'create=new note, get=fetch one, update=modify, delete=remove, list=fetch many, search=semantic search'
      },

      // For create/update
      note_id: {
        type: 'string',
        description: '[get/update/delete] Note ID'
      },
      title: {
        type: 'string',
        description: '[create/update] Note title'
      },
      content: {
        type: 'string',
        description: '[create/update] Note content (markdown, mermaid diagrams, excalidraw)'
      },
      note_type: {
        type: 'string',
        enum: ['note', 'warning', 'documentation', 'excalidraw'],
        description: '[create/update] Type of note',
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
        description: '[create/update] Entities to link this note to. Example: [{ entity_type: "task", entity_id: "task_123" }]'
      },
      stable_tags: {
        type: 'array',
        items: { type: 'string' },
        description: '[create/update] Note tags'
      },
      parent_id: {
        type: 'string',
        description: '[create/update] Parent note ID for hierarchical notes'
      },
      kb_template: {
        type: 'string',
        enum: ['project', 'feature_planning', 'refactor', 'initial_planning'],
        description: '[create] Create a Knowledge Base from template. Creates structured note hierarchy.'
      },

      // For list/search
      kb_ids: {
        type: 'array',
        items: { type: 'string' },
        description: '[list/search] Filter notes to specific Knowledge Base(s). Use KB IDs like "kb_project".'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: '[list/search] Filter by tags'
      },
      limit: {
        type: 'number',
        description: '[list/search] Maximum number of notes to return',
        default: 20
      },

      // For search
      query: {
        type: 'string',
        description: '[search] Search query'
      },
      semantic: {
        type: 'boolean',
        description: '[search] Use semantic search',
        default: true
      }
    },
    required: ['project', 'action']
  }
};
