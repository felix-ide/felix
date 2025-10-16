import type { McpToolDefinition } from '../common.js';

export const RULES_GET_TOOL: McpToolDefinition = {
  name: 'rules_get',
  description: 'Fetch a single rule by ID.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      rule_id: {
        type: 'string',
        description: 'Rule ID to fetch'
      }
    },
    required: ['project', 'rule_id']
  }
};
