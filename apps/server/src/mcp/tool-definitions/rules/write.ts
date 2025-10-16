import type { McpToolDefinition } from '../common.js';

export const RULES_WRITE_TOOL: McpToolDefinition = {
  name: 'rules_write',
  description: `Create or update a coding standard, pattern, or automation rule.

Rules trigger based on file patterns, component types, or semantic context to enforce naming conventions, code patterns, and architectural standards.

Types: pattern=naming/structure, constraint=validation, semantic=context-aware suggestions, automation=code generation`,
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      mode: {
        type: 'string',
        enum: ['create', 'update'],
        description: 'create=new rule, update=modify existing'
      },
      rule_id: {
        type: 'string',
        description: 'Rule ID (required for update mode)'
      },
      name: {
        type: 'string',
        description: 'Rule name (short identifier, required for create)'
      },
      description: {
        type: 'string',
        description: 'What this rule enforces and why'
      },
      rule_type: {
        type: 'string',
        enum: ['pattern', 'constraint', 'semantic', 'automation'],
        description: 'pattern=naming/structure rules, constraint=validation rules, semantic=context-aware suggestions, automation=code generation (required for create)'
      },
      guidance_text: {
        type: 'string',
        description: 'Human-readable explanation shown to user when rule triggers (required for create)'
      },
      code_template: {
        type: 'string',
        description: 'Code template for automation rules (can include placeholders)'
      },
      validation_script: {
        type: 'string',
        description: 'Validation logic for constraint rules (checks if code follows pattern)'
      },
      trigger_patterns: {
        type: 'object',
        description: 'When to trigger: file paths (e.g., ["**/*.service.ts"]), component types (e.g., ["class","function"]), relationship types (e.g., ["calls","imports"])',
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
        description: 'Semantic context triggers: code patterns to match, business domains, architectural layers',
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
        description: 'Additional context conditions for triggering (flexible object)'
      },
      exclusion_patterns: {
        type: 'object',
        description: 'Patterns to exclude from rule triggering'
      },
      priority: {
        type: 'number',
        description: 'Priority 1-10 (higher=shown first when multiple rules match)',
        default: 5
      },
      auto_apply: {
        type: 'boolean',
        description: 'true=automatically apply rule, false=suggest to user',
        default: false
      },
      merge_strategy: {
        type: 'string',
        description: 'How to merge multiple matching rules',
        default: 'append'
      },
      confidence_threshold: {
        type: 'number',
        description: 'Minimum confidence 0.0-1.0 to trigger (lower=triggers more often)',
        default: 0.8
      },
      active: {
        type: 'boolean',
        description: 'Enable/disable rule without deleting it'
      },
      parent_id: {
        type: 'string',
        description: 'Parent rule ID for hierarchical organization'
      },
      sort_order: {
        type: 'number',
        description: 'Display order within parent'
      },
      stable_tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags for categorizing rules'
      },
      entity_links: {
        type: 'array',
        items: { type: 'object' },
        description: 'Links to other entities (components, files, tasks, notes)'
      }
    },
    required: ['project', 'mode']
  }
};
