import type { McpToolDefinition } from './common.js';

export const KB_TOOL: McpToolDefinition = {
  name: 'kb',
  description: `First-class Knowledge Base management for hierarchical documentation trees.

KBs are hierarchical documentation structures where:
• Each node can contain markdown, mermaid diagrams, excalidraw drawings
• Diagrams can span multiple nodes (not crammed into one page)
• Different systems/topics get their own sections
• Rules and guidance attached to specific nodes
• Templates define entire tree structures

ACTIONS:
• create: Create KB from template or add node to existing KB
• get: Get KB/node (use include_children for tree structure)
• update: Update node content/title or KB config
• delete: Remove node from tree
• list: List all KBs or nodes in KB
• move: Move node to different parent
• templates: List available KB templates
• analyze: Analyze project for template config values`,
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      action: {
        type: 'string',
        enum: ['create', 'get', 'update', 'delete', 'list', 'search', 'move',
               'templates', 'analyze'],
        description: 'create=new KB/node, get=fetch KB/node, update=modify, delete=remove, list=fetch many, search=search within KB, move=relocate node, templates=list templates, analyze=detect config'
      },

      // Identifiers
      kb_id: {
        type: 'string',
        description: '[get/update/delete/list/search] KB ID or root node ID'
      },
      node_id: {
        type: 'string',
        description: '[get/update/delete/move] Node ID'
      },
      parent_id: {
        type: 'string',
        description: '[create/move] Parent node ID for child nodes'
      },

      // For create
      template_name: {
        type: 'string',
        description: '[create/analyze] KB template (project, refactor, etc.)'
      },
      title: {
        type: 'string',
        description: '[create/update] Node/KB title'
      },
      content: {
        type: 'string',
        description: '[create/update] Node content (markdown with diagrams)'
      },
      config: {
        type: 'object',
        description: '[create/update] KB configuration values'
      },
      metadata: {
        type: 'object',
        description: '[create/update] Node metadata (icon, color, etc.)'
      },

      // For get
      include_children: {
        type: 'boolean',
        description: '[get] Include child nodes (returns tree structure)',
        default: false
      },
      include_content: {
        type: 'boolean',
        description: '[get] Include node content in response',
        default: true
      },
      include_rules: {
        type: 'boolean',
        description: '[get] Include attached rules',
        default: false
      },

      // For search
      query: {
        type: 'string',
        description: '[search] Search query for content within KB'
      },
      search_type: {
        type: 'string',
        enum: ['semantic', 'keyword', 'both'],
        description: '[search] Type of search to perform',
        default: 'semantic'
      },

      // For list
      limit: {
        type: 'number',
        description: '[list/search] Maximum results to return',
        default: 20
      },

      // For analyze
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: '[analyze] Specific config fields to detect'
      }
    },
    required: ['project', 'action']
  }
};