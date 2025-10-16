import type { McpToolDefinition } from '../common.js';

export const NOTES_WRITE_TOOL: McpToolDefinition = {
  name: 'notes_write',
  description: 'Create or update a note. Can create Knowledge Bases from templates.',
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
        description: 'create=new note, update=modify existing'
      },
      note_id: {
        type: 'string',
        description: 'Note ID (required for update mode)'
      },
      title: {
        type: 'string',
        description: 'Note title'
      },
      content: {
        type: 'string',
        description: 'Note content (markdown, mermaid diagrams, excalidraw)'
      },
      note_type: {
        type: 'string',
        enum: ['note', 'warning', 'documentation', 'excalidraw'],
        description: 'Type of note',
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
        description: 'Entities to link this note to. Example: [{ entity_type: "task", entity_id: "task_123" }]'
      },
      stable_tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Note tags'
      },
      parent_id: {
        type: 'string',
        description: 'Parent note ID for hierarchical notes'
      },
      kb_template: {
        type: 'string',
        enum: ['project', 'feature_planning', 'refactor', 'initial_planning'],
        description: 'Create a Knowledge Base from template (for create mode). Creates structured note hierarchy.'
      }
    },
    required: ['project', 'mode']
  }
};
