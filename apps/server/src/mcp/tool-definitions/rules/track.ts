import type { McpToolDefinition } from '../common.js';

export const RULES_TRACK_TOOL: McpToolDefinition = {
  name: 'rules_track',
  description: 'Record rule application for analytics. Tracks user actions (accepted/modified/rejected/ignored) and feedback.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      rule_id: {
        type: 'string',
        description: 'Rule ID that was applied'
      },
      entity_type: {
        type: 'string',
        description: 'Entity type where rule was applied'
      },
      entity_id: {
        type: 'string',
        description: 'Entity ID where rule was applied'
      },
      applied_context: {
        type: 'object',
        description: 'Context when rule was applied (for analytics)'
      },
      user_action: {
        type: 'string',
        enum: ['accepted', 'modified', 'rejected', 'ignored'],
        description: 'What user did: accepted=used as-is, modified=changed then used, rejected=dismissed, ignored=no action'
      },
      generated_code: {
        type: 'string',
        description: 'Code that was generated (for automation rules)'
      },
      feedback_score: {
        type: 'number',
        minimum: 1,
        maximum: 5,
        description: 'User rating 1-5 (1=bad, 5=excellent)'
      }
    },
    required: ['project', 'rule_id']
  }
};
