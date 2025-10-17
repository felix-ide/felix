import type { McpToolDefinition } from '../common.js';

export const RULES_APPLY_TOOL: McpToolDefinition = {
  name: 'rules_apply',
  description: 'Apply a specific rule to a target entity. Executes the rule and returns generated code or validation results.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      rule_id: {
        type: 'string',
        description: 'Rule ID to apply'
      },
      target_entity: {
        type: 'object',
        description: 'Where to apply: entity_type (e.g., "component"), entity_id, file_path',
        properties: {
          entity_type: { type: 'string' },
          entity_id: { type: 'string' },
          file_path: { type: 'string' }
        }
      },
      application_context: {
        type: 'object',
        description: 'How to apply: user_intent (what you\'re doing), current_task_id, force_apply (skip confirmation)',
        properties: {
          user_intent: { type: 'string' },
          current_task_id: { type: 'string' },
          force_apply: { type: 'boolean', default: false }
        }
      }
    },
    required: ['project', 'rule_id', 'target_entity']
  }
};
