import type { McpToolDefinition } from './common.js';

export const CONTEXT_TOOL: McpToolDefinition = {
  name: 'context',
  description: `PRIMARY TOOL for code exploration and refactoring - REPLACES Read tool!

REFACTORING WORKFLOW:
1. Use search to find component IDs (shows skeleton view - spot patterns!)
2. Use context to get full source + relationships for those components

EXAMPLES:
{ project: "/path", component_id: "CodeIndexer|file:CodeIndexer.ts|class:CodeIndexer" }
{ project: "/path", component_id: "Handler|file:api.ts|function:handleRequest", output_format: "json" }

Returns FULL SOURCE CODE with relationships. Skeleton from search shows structure,
then context gives you the actual code. Perfect for spotting duplicate patterns!`,
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      component_id: {
        type: 'string',
        description: 'The ID of the component to generate context for'
      },
      depth: {
        type: 'number',
        description: 'How many relationship hops to include',
        default: 2
      },
      include_source: {
        type: 'boolean',
        description: 'Include full original source code for editing (use this instead of Read tool!)',
        default: true
      },
      target_token_size: {
        type: 'number',
        description: 'Target token budget for the generated context (controls output length)',
        default: 25000
      },
      output_format: {
        type: 'string',
        enum: ['markdown', 'json'],
        description: 'Output format for the context',
        default: 'json'
      },
      include_relationships: {
        type: 'boolean',
        description: 'Include relationships in the context',
        default: true
      },
      include_metadata: {
        type: 'boolean',
        description: 'Include component metadata',
        default: true
      },
      include_documentation: {
        type: 'boolean',
        description: 'Include documentation and comments',
        default: true
      },
      include_notes: {
        type: 'boolean',
        description: 'Include notes from metadata.db',
        default: true
      },
      include_rules: {
        type: 'boolean',
        description: 'Include applicable rules intelligently',
        default: true
      },
      include_tasks: {
        type: 'boolean',
        description: 'Include related tasks',
        default: false
      },
      priority_components: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of component IDs to prioritize'
      },
      language_filter: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by specific languages (e.g. ["javascript", "typescript"])'
      },
      query: {
        type: 'string',
        description: 'Search terms to prioritize relevant content'
      },
      user_intent: {
        type: 'string',
        description: 'User intent for context-aware rule selection (e.g., "implementing auth", "fixing bug")'
      },
      current_task_id: {
        type: 'string',
        description: 'ID of current task for context-aware rules'
      },
      // Lens controls (camera metaphor)
      lens: {
        type: 'string',
        enum: ['default','structure','callers','callees','imports','inheritance','data-flow','doc-heavy','rule-heavy','full'],
        description: 'View preset emphasizing different relationship groups'
      },
      rel_types: {
        type: 'array',
        items: { type: 'string' },
        description: 'Limit relationship types (e.g., ["calls","imports","extends"])'
      },
      direction: {
        type: 'string',
        enum: ['in','out','both'],
        description: 'Relationship direction for callers/callees lenses',
        default: 'both'
      },
      budget_tokens: {
        type: 'number',
        description: 'Overall token budget for code/docs/rules/relationships'
      },
      rules_mode: {
        type: 'string',
        enum: ['summary','full'],
        description: 'Return full rule payload (guidance, templates, triggers) or summary',
        default: 'summary'
      },
      docs_limit: {
        type: 'number',
        description: 'Max number of documentation snippets to include',
        default: 3
      },
      rules_limit: {
        type: 'number',
        description: 'Max number of rules to include',
        default: 3
      },
      rel_limit: {
        type: 'number',
        description: 'Max number of relationships to include (per group)',
        default: 50
      }
    },
    required: ['project', 'component_id']
  }
};

/**
 * Notes tool - consolidated notes management
 * 
 * To attach a note to any entity (including tasks), use entity_links:
 * - entity_links: [{ entity_type: 'task', entity_id: 'task_123' }]
 */
