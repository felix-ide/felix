import type { McpToolDefinition } from '../common.js';

export const RULES_DELETE_TOOL: McpToolDefinition = {
  name: 'rules_delete',
  description: 'Delete a rule permanently.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      rule_id: {
        type: 'string',
        description: 'Rule ID to delete'
      }
    },
    required: ['project', 'rule_id']
  }
};
