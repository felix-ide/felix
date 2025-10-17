import type { McpToolDefinition } from '../common.js';

export const RULES_ANALYTICS_TOOL: McpToolDefinition = {
  name: 'rules_analytics',
  description: 'Get usage analytics for rules showing how often they trigger, acceptance rates, and user feedback.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      days_since: {
        type: 'number',
        description: 'Analyze last N days of rule usage',
        default: 30
      }
    },
    required: ['project']
  }
};
