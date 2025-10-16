import type { McpToolDefinition } from './common.js';

export const RULES_TOOL: McpToolDefinition = {
  name: 'rules',
  description: `Manage coding standards, patterns, and automation rules. Rules trigger based on file patterns, component types, or semantic context.

Use for: Enforcing naming conventions, code patterns, architectural standards. Can suggest guidance or auto-generate code.

Types: pattern=naming/structure, constraint=validation, semantic=context-aware suggestions, automation=code generation

Common workflow: get_applicable → apply_rule → track_application (for analytics)`,
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      action: {
        type: 'string',
        enum: ['add', 'get', 'list', 'update', 'delete', 'get_applicable', 'apply_rule', 'get_tree', 'get_analytics', 'track_application'],
        description: 'add=create rule, get=fetch one, list=fetch many, update=modify, delete=remove, get_applicable=find matching rules, apply_rule=execute rule, get_tree=hierarchy, get_analytics=usage stats, track_application=record usage'
      },
      // For add action
      name: {
        type: 'string',
        description: '[add] Rule name (short identifier)'
      },
      description: {
        type: 'string',
        description: '[add] What this rule enforces and why'
      },
      rule_type: {
        type: 'string',
        enum: ['pattern', 'constraint', 'semantic', 'automation'],
        description: '[add] pattern=naming/structure rules, constraint=validation rules, semantic=context-aware suggestions, automation=code generation'
      },
      guidance_text: {
        type: 'string',
        description: '[add] Human-readable explanation shown to user when rule triggers'
      },
      code_template: {
        type: 'string',
        description: '[add] Code template for automation rules (can include placeholders)'
      },
      validation_script: {
        type: 'string',
        description: '[add] Validation logic for constraint rules (checks if code follows pattern)'
      },
      trigger_patterns: {
        type: 'object',
        description: '[add] When to trigger: file paths (e.g., ["**/*.service.ts"]), component types (e.g., ["class","function"]), relationship types (e.g., ["calls","imports"])',
        properties: {
          files: {
            type: 'array',
            items: { type: 'string' },
            description: 'File glob patterns (e.g., "src/**/*.ts")'
          },
          components: {
            type: 'array',
            items: { type: 'string' },
            description: 'Component types to match (e.g., "class", "function", "interface")'
          },
          relationships: {
            type: 'array',
            items: { type: 'string' },
            description: 'Relationship types to match (e.g., "calls", "imports", "extends")'
          }
        }
      },
      semantic_triggers: {
        type: 'object',
        description: '[add] Semantic context triggers: code patterns to match, business domains, architectural layers',
        properties: {
          patterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Code patterns (e.g., "async function", "class.*Repository")'
          },
          business_domains: {
            type: 'array',
            items: { type: 'string' },
            description: 'Business domains (e.g., "authentication", "payments", "user-management")'
          },
          architectural_layers: {
            type: 'array',
            items: { type: 'string' },
            description: 'Architectural layers (e.g., "controller", "service", "repository", "ui")'
          }
        }
      },
      context_conditions: {
        type: 'object',
        description: '[add] Additional context conditions for triggering (flexible object)'
      },
      priority: {
        type: 'number',
        description: '[add] Priority 1-10 (higher=shown first when multiple rules match)',
        default: 5
      },
      auto_apply: {
        type: 'boolean',
        description: '[add] true=automatically apply rule, false=suggest to user',
        default: false
      },
      confidence_threshold: {
        type: 'number',
        description: '[add] Minimum confidence 0.0-1.0 to trigger (lower=triggers more often)',
        default: 0.8
      },
      // For get/update/delete actions
      rule_id: {
        type: 'string',
        description: '[get/update/delete] Rule ID to operate on'
      },
      // For update action
      active: {
        type: 'boolean',
        description: '[update] Enable/disable rule without deleting it'
      },
      // For get_tree action
      root_rule_id: {
        type: 'string',
        description: '[get_tree] Start from this rule (omit to get all root rules)'
      },
      include_inactive: {
        type: 'boolean',
        description: '[get_tree/list] Include disabled rules',
        default: false
      },
      // For list action
      rule_type_filter: {
        type: 'string',
        enum: ['pattern', 'constraint', 'semantic', 'automation'],
        description: '[list] Only return rules of this type'
      },
      limit: {
        type: 'number',
        description: '[list] Maximum number of rules to return',
        default: 20
      },
      offset: {
        type: 'number',
        description: '[list] Skip this many rules (for pagination)',
        default: 0
      },
      // For get_applicable action
      entity_type: {
        type: 'string',
        description: '[get_applicable/apply_rule] Type of entity (e.g., "component", "file")'
      },
      entity_id: {
        type: 'string',
        description: '[get_applicable/apply_rule] Entity ID to check rules against'
      },
      context: {
        type: 'object',
        description: '[get_applicable] Additional context for matching: current_task (what you\'re doing), user_intent (e.g., "fixing bug"), file_content (code being edited)',
        properties: {
          current_task: { type: 'string' },
          user_intent: { type: 'string' },
          file_content: { type: 'string' }
        }
      },
      include_suggestions: {
        type: 'boolean',
        description: '[get_applicable] Include non-automation rules (suggestions/guidance)',
        default: true
      },
      include_automation: {
        type: 'boolean',
        description: '[get_applicable] Include automation rules (code generation)',
        default: true
      },
      // For apply_rule action
      apply_rule_id: {
        type: 'string',
        description: '[apply_rule] Rule ID to apply'
      },
      target_entity: {
        type: 'object',
        description: '[apply_rule] Where to apply: entity_type (e.g., "component"), entity_id, file_path',
        properties: {
          entity_type: { type: 'string' },
          entity_id: { type: 'string' },
          file_path: { type: 'string' }
        }
      },
      application_context: {
        type: 'object',
        description: '[apply_rule] How to apply: user_intent (what you\'re doing), current_task_id, force_apply (skip confirmation)',
        properties: {
          user_intent: { type: 'string' },
          current_task_id: { type: 'string' },
          force_apply: { type: 'boolean', default: false }
        }
      },
      // For get_analytics action
      days_since: {
        type: 'number',
        description: '[get_analytics] Analyze last N days of rule usage',
        default: 30
      },
      // For track_application action
      track_entity_type: {
        type: 'string',
        description: '[track_application] Entity type where rule was applied'
      },
      track_entity_id: {
        type: 'string',
        description: '[track_application] Entity ID where rule was applied'
      },
      applied_context: {
        type: 'object',
        description: '[track_application] Context when rule was applied (for analytics)'
      },
      user_action: {
        type: 'string',
        enum: ['accepted', 'modified', 'rejected', 'ignored'],
        description: '[track_application] What user did: accepted=used as-is, modified=changed then used, rejected=dismissed, ignored=no action'
      },
      generated_code: {
        type: 'string',
        description: '[track_application] Code that was generated (for automation rules)'
      },
      feedback_score: {
        type: 'number',
        minimum: 1,
        maximum: 5,
        description: '[track_application] User rating 1-5 (1=bad, 5=excellent)'
      }
    },
    required: ['project', 'action']
  }
};
