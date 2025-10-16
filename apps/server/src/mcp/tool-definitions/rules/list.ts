import type { McpToolDefinition } from '../common.js';

export const RULES_LIST_TOOL: McpToolDefinition = {
  name: 'rules_list',
  description: 'List rules with optional filtering by type and active status.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      rule_type: {
        type: 'string',
        enum: ['pattern', 'constraint', 'semantic', 'automation'],
        description: 'Only return rules of this type'
      },
      active: {
        type: 'boolean',
        description: 'Filter by active status'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of rules to return',
        default: 20
      },
      offset: {
        type: 'number',
        description: 'Skip this many rules (for pagination)',
        default: 0
      },
      view: {
        type: 'string',
        description: 'Projection preset for result fields'
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific fields to return (overrides view)'
      },
      output_format: {
        type: 'string',
        enum: ['text', 'json'],
        description: 'Output format',
        default: 'text'
      }
    },
    required: ['project']
  }
};
