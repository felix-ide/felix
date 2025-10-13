import type { McpToolDefinition } from './common.js';

export const RULES_TOOL: McpToolDefinition = {
  name: 'rules',
  description: `Coding standards and patterns system for maintaining consistency and best practices.

WHEN TO USE:
- Defining team coding standards and patterns
- Creating automated code generation templates
- Setting validation rules for code quality
- Documenting architectural decisions as enforceable rules
- Getting context-aware suggestions while coding

RULE TYPES:
- pattern: Coding patterns to follow (naming, structure)
- constraint: Validation rules (security, performance)
- semantic: Context-aware suggestions based on code meaning
- automation: Templates that generate boilerplate code

FEATURES:
- Triggers on file patterns, component types, or semantics
- Provides guidance or generates code automatically
- Tracks usage and effectiveness metrics
- Applies based on current context and intent
- Integrates with component relationships

WORKFLOW:
- Use get_applicable to find relevant rules for current context
- Apply rules manually or set auto_apply for automation
- Track effectiveness with analytics

⚠️ TOKEN LIMITS: List operations may be truncated. Use limit parameter to control results.

SEARCH: Use the main 'search' tool to find rules - it provides semantic search across all entities.`,
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
        description: 'Action to perform'
      },
      // For add action
      name: {
        type: 'string',
        description: 'Rule name (for add action)'
      },
      description: {
        type: 'string',
        description: 'Rule description (for add action)'
      },
      rule_type: {
        type: 'string',
        enum: ['pattern', 'constraint', 'semantic', 'automation'],
        description: 'Type of rule (for add action)'
      },
      guidance_text: {
        type: 'string',
        description: 'Human-readable guidance (for add action)'
      },
      code_template: {
        type: 'string',
        description: 'Code template for automation rules (for add action)'
      },
      validation_script: {
        type: 'string',
        description: 'Validation logic for constraint rules (for add action)'
      },
      trigger_patterns: {
        type: 'object',
        description: 'Smart trigger patterns (for add action)',
        properties: {
          files: {
            type: 'array',
            items: { type: 'string' },
            description: 'File patterns'
          },
          components: {
            type: 'array',
            items: { type: 'string' },
            description: 'Component types'
          },
          relationships: {
            type: 'array',
            items: { type: 'string' },
            description: 'Relationship types'
          }
        }
      },
      semantic_triggers: {
        type: 'object',
        description: 'Semantic triggers (for add action)',
        properties: {
          patterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Code patterns'
          },
          business_domains: {
            type: 'array',
            items: { type: 'string' },
            description: 'Business domains'
          },
          architectural_layers: {
            type: 'array',
            items: { type: 'string' },
            description: 'Architecture layers'
          }
        }
      },
      context_conditions: {
        type: 'object',
        description: 'Context conditions (for add action)'
      },
      priority: {
        type: 'number',
        description: 'Rule priority 1-10 (for add action)',
        default: 5
      },
      auto_apply: {
        type: 'boolean',
        description: 'Auto-generate code vs suggest (for add action)',
        default: false
      },
      confidence_threshold: {
        type: 'number',
        description: 'Confidence threshold 0.0-1.0 (for add action)',
        default: 0.8
      },
      // For get/update/delete actions
      rule_id: {
        type: 'string',
        description: 'ID of rule to get/update/delete'
      },
      // For update action - fields that can be updated
      active: {
        type: 'boolean',
        description: 'Whether the rule is active (for update action)'
      },
      // For get_tree action
      root_rule_id: {
        type: 'string',
        description: 'Root rule ID for tree (for get_tree action, omit for all root rules)'
      },
      include_inactive: {
        type: 'boolean',
        description: 'Include inactive rules (for get_tree action)',
        default: false
      },
      // For list action
      rule_type_filter: {
        type: 'string',
        enum: ['pattern', 'constraint', 'semantic', 'automation'],
        description: 'Filter by rule type (for list action)'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of rules to return (for list action)',
        default: 20
      },
      offset: {
        type: 'number', 
        description: 'Number of rules to skip for pagination (for list action)',
        default: 0
      },
      // For get_applicable action
      entity_type: {
        type: 'string',
        description: 'Type of entity (for get_applicable action)'
      },
      entity_id: {
        type: 'string',
        description: 'Entity ID (for get_applicable action)'
      },
      context: {
        type: 'object',
        description: 'Context for rule matching (for get_applicable action)',
        properties: {
          current_task: { type: 'string' },
          user_intent: { type: 'string' },
          file_content: { type: 'string' }
        }
      },
      include_suggestions: {
        type: 'boolean',
        description: 'Include rule suggestions (for get_applicable action)',
        default: true
      },
      include_automation: {
        type: 'boolean',
        description: 'Include automation rules (for get_applicable action)',
        default: true
      },
      // For apply_rule action
      apply_rule_id: {
        type: 'string',
        description: 'ID of rule to apply (for apply_rule action)'
      },
      target_entity: {
        type: 'object',
        description: 'Target entity to apply rule to (for apply_rule action)',
        properties: {
          entity_type: { type: 'string' },
          entity_id: { type: 'string' },
          file_path: { type: 'string' }
        }
      },
      application_context: {
        type: 'object',
        description: 'Application context (for apply_rule action)',
        properties: {
          user_intent: { type: 'string' },
          current_task_id: { type: 'string' },
          force_apply: { type: 'boolean', default: false }
        }
      },
      // For get_analytics action
      days_since: {
        type: 'number',
        description: 'Number of days to analyze (for get_analytics action)',
        default: 30
      },
      // For track_application action
      track_entity_type: {
        type: 'string',
        description: 'Entity type for tracking (for track_application action)'
      },
      track_entity_id: {
        type: 'string',
        description: 'Entity ID for tracking (for track_application action)'
      },
      applied_context: {
        type: 'object',
        description: 'Context when rule was applied (for track_application action)'
      },
      user_action: {
        type: 'string',
        enum: ['accepted', 'modified', 'rejected', 'ignored'],
        description: 'User action taken (for track_application action)'
      },
      generated_code: {
        type: 'string',
        description: 'Generated code if automation rule (for track_application action)'
      },
      feedback_score: {
        type: 'number',
        minimum: 1,
        maximum: 5,
        description: 'User feedback score 1-5 (for track_application action)'
      }
    },
    required: ['project', 'action']
  }
};

/**
 * Get all consolidated tools
 */
