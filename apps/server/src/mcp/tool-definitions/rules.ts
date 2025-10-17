import type { McpToolDefinition } from './common.js';

export const RULES_TOOL: McpToolDefinition = {
  name: 'rules',
  description: `Create or update coding standards, patterns, and automation rules.

Rules trigger based on file patterns, component types, or semantic context to enforce naming conventions, code patterns, and architectural standards.

Types: pattern=naming/structure, constraint=validation, semantic=context-aware suggestions, automation=code generation`,
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      action: {
        type: 'string',
        enum: ['create', 'get', 'update', 'delete', 'list', 'get_applicable', 'apply', 'analytics', 'track'],
        description: 'create=new rule, get=fetch one, update=modify, delete=remove, list=fetch many, get_applicable=find matching rules, apply=execute rule, analytics=usage stats, track=record usage'
      },

      // For create/update
      rule_id: {
        type: 'string',
        description: '[get/update/delete/apply/track] Rule ID'
      },
      name: {
        type: 'string',
        description: '[create/update] Rule name (short identifier)'
      },
      description: {
        type: 'string',
        description: '[create/update] What this rule enforces and why'
      },
      rule_type: {
        type: 'string',
        enum: ['pattern', 'constraint', 'semantic', 'automation'],
        description: '[create/update/list] pattern=naming/structure rules, constraint=validation rules, semantic=context-aware suggestions, automation=code generation'
      },
      guidance_text: {
        type: 'string',
        description: '[create/update] Human-readable explanation shown to user when rule triggers'
      },
      code_template: {
        type: 'string',
        description: '[create/update] Code template for automation rules (can include placeholders)'
      },
      validation_script: {
        type: 'string',
        description: '[create/update] Validation logic for constraint rules (checks if code follows pattern)'
      },
      trigger_patterns: {
        type: 'object',
        description: '[create/update] When to trigger: file paths, component types, relationship types',
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
        description: '[create/update] Semantic context triggers: code patterns, business domains, architectural layers',
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
        description: '[create/update] Additional context conditions for triggering (flexible object)'
      },
      exclusion_patterns: {
        type: 'object',
        description: '[create/update] Patterns to exclude from rule triggering'
      },
      priority: {
        type: 'number',
        description: '[create/update] Priority 1-10 (higher=shown first when multiple rules match)',
        default: 5
      },
      auto_apply: {
        type: 'boolean',
        description: '[create/update] true=automatically apply rule, false=suggest to user',
        default: false
      },
      merge_strategy: {
        type: 'string',
        description: '[create/update] How to merge multiple matching rules',
        default: 'append'
      },
      confidence_threshold: {
        type: 'number',
        description: '[create/update] Minimum confidence 0.0-1.0 to trigger (lower=triggers more often)',
        default: 0.8
      },
      active: {
        type: 'boolean',
        description: '[create/update/list] Enable/disable rule without deleting it'
      },
      parent_id: {
        type: 'string',
        description: '[create/update] Parent rule ID for hierarchical organization'
      },
      sort_order: {
        type: 'number',
        description: '[create/update] Display order within parent'
      },
      stable_tags: {
        type: 'array',
        items: { type: 'string' },
        description: '[create/update] Tags for categorizing rules'
      },
      entity_links: {
        type: 'array',
        items: { type: 'object' },
        description: '[create/update] Links to other entities (components, files, tasks, notes)'
      },

      // For list
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
      view: {
        type: 'string',
        description: '[list] Projection preset for result fields'
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: '[list] Specific fields to return (overrides view)'
      },
      output_format: {
        type: 'string',
        enum: ['text', 'json'],
        description: '[list] Output format',
        default: 'text'
      },

      // For get_applicable
      entity_type: {
        type: 'string',
        description: '[get_applicable/track] Type of entity (e.g., "component", "file")'
      },
      entity_id: {
        type: 'string',
        description: '[get_applicable/track] Entity ID to check rules against'
      },
      context: {
        type: 'object',
        description: '[get_applicable] Additional context for matching: current_task, user_intent, file_content',
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

      // For apply
      target_entity: {
        type: 'object',
        description: '[apply] Where to apply: entity_type, entity_id, file_path',
        properties: {
          entity_type: { type: 'string' },
          entity_id: { type: 'string' },
          file_path: { type: 'string' }
        }
      },
      application_context: {
        type: 'object',
        description: '[apply] How to apply: user_intent, current_task_id, force_apply',
        properties: {
          user_intent: { type: 'string' },
          current_task_id: { type: 'string' },
          force_apply: { type: 'boolean', default: false }
        }
      },

      // For analytics
      days_since: {
        type: 'number',
        description: '[analytics] Analyze last N days of rule usage',
        default: 30
      },

      // For track
      applied_context: {
        type: 'object',
        description: '[track] Context when rule was applied (for analytics)'
      },
      user_action: {
        type: 'string',
        enum: ['accepted', 'modified', 'rejected', 'ignored'],
        description: '[track] What user did: accepted=used as-is, modified=changed then used, rejected=dismissed, ignored=no action'
      },
      generated_code: {
        type: 'string',
        description: '[track] Code that was generated (for automation rules)'
      },
      feedback_score: {
        type: 'number',
        minimum: 1,
        maximum: 5,
        description: '[track] User rating 1-5 (1=bad, 5=excellent)'
      }
    },
    required: ['project', 'action']
  }
};
