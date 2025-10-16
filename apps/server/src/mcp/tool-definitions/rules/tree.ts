import type { McpToolDefinition } from '../common.js';

export const RULES_TREE_TOOL: McpToolDefinition = {
  name: 'rules_tree',
  description: 'Get hierarchical tree of rules showing parent-child relationships.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      root_rule_id: {
        type: 'string',
        description: 'Start from this rule (omit to get all root rules)'
      },
      include_inactive: {
        type: 'boolean',
        description: 'Include disabled rules',
        default: false
      }
    },
    required: ['project']
  }
};
