import type { McpToolDefinition } from './common.js';

export const NOTES_TOOL: McpToolDefinition = {
  name: 'notes',
  description: `Documentation and diagram management with markdown, mermaid, excalidraw. Creates hierarchical docs and Knowledge Bases.

PURPOSE: Capture architecture docs, diagrams, mockups, warnings. Create structured Knowledge Bases from templates.

Required: project, action(add|get|list|update|delete|get_tree|help)
Create/Update: title, content, note_type(note|warning|documentation|excalidraw)=note, entity_links[{entity_type,entity_id,link_strength}], stable_tags[], kb_template(project|feature_planning|refactor|initial_planning)
Query: note_id, query, semantic=T, tags[], limit=20, kb_ids[] (filter to specific KBs)
Tree: root_note_id, include_all=T

FORMATS: Markdown, \`\`\`mermaid diagrams (flowchart, sequence, ERD, etc.), \`\`\`excalidraw drawings
LINKING: Attach to tasks, components, files, rules via entity_links - notes appear in their context automatically
WORKFLOWS: Tasks require specific note types (Architecture, ERD, API Contract) for spec_ready gate
KNOWLEDGE BASES: Use kb_template to create structured KB from template. Filter list by kb_ids to scope to specific KBs.

EXAMPLE: Create project KB with kb_template='project', or filter notes with kb_ids=['kb_project'] to see only project KB notes`,
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
      // Knowledge Base creation
      kb_template: {
        type: 'string',
        enum: ['project', 'feature_planning', 'refactor', 'initial_planning'],
        description: 'Create a Knowledge Base from template (for add action). Creates structured note hierarchy.'
      },
      // For list/search actions
      query: {
        type: 'string',
        description: 'Search query (for search action)'
      },
      kb_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter notes to specific Knowledge Base(s) (for list action). Use KB IDs like "kb_project".'
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
