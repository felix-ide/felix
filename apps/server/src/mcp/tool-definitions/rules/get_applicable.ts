import type { McpToolDefinition } from '../common.js';

export const RULES_GET_APPLICABLE_TOOL: McpToolDefinition = {
  name: 'rules_get_applicable',
  description: 'Find rules that match a specific entity and context. Returns applicable rules based on file patterns, component types, and semantic triggers.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      entity_type: {
        type: 'string',
        description: 'Type of entity (e.g., "component", "file")'
      },
      entity_id: {
        type: 'string',
        description: 'Entity ID to check rules against'
      },
      context: {
        type: 'object',
        description: 'Additional context for matching: current_task (what you\'re doing), user_intent (e.g., "fixing bug"), file_content (code being edited)',
        properties: {
          current_task: { type: 'string' },
          user_intent: { type: 'string' },
          file_content: { type: 'string' }
        }
      },
      include_suggestions: {
        type: 'boolean',
        description: 'Include non-automation rules (suggestions/guidance)',
        default: true
      },
      include_automation: {
        type: 'boolean',
        description: 'Include automation rules (code generation)',
        default: true
      }
    },
    required: ['project', 'entity_type', 'entity_id']
  }
};
