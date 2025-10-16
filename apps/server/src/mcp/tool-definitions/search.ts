import type { McpToolDefinition } from './common.js';
import { COMMON_FILTER_PROPERTIES, withProjectProperty } from './common.js';

/**
 * Consolidated search tool - handles search, context retrieval, indexing, and stats
 */
export const SEARCH_TOOL: McpToolDefinition = {
  name: 'search',
  description: `Code intelligence tool with 4 actions:

• search: Find components/tasks/notes/rules by semantic meaning. Returns skeleton views with line numbers.
• context: Get full source + relationships for a component. Replaces Read tool for exploring code.
• index: Force full re-index (drops DB, rebuilds with embeddings). Use after major refactoring or file moves.
• stats: Get project statistics (component count, languages, file count).

Typical workflow: search → get component_id → context → get full source + call graphs`,
  inputSchema: {
    type: 'object',
    properties: withProjectProperty({
      action: {
        type: 'string',
        enum: ['search', 'context', 'index', 'stats'],
        description: 'search=find code, context=get relationships, index=rebuild database, stats=get counts'
      },

      // Search-specific
      query: {
        type: 'string',
        description: '[search] Semantic search query (e.g., "error handling", "database pooling")'
      },
      entity_types: {
        type: 'array',
        items: { type: 'string', enum: ['component', 'task', 'note', 'rule'] },
        description: '[search] What to search: component=code, task=tasks, note=documentation, rule=coding standards'
      },
      kb_ids: {
        type: 'array',
        items: { type: 'string' },
        description: '[search] Limit notes to specific Knowledge Bases (e.g., ["kb_project"])'
      },
      ...COMMON_FILTER_PROPERTIES,
      code_first: {
        type: 'boolean',
        description: '[search] Rank code components higher than tasks/notes/rules in results',
        default: true
      },
      skeleton_verbose: {
        type: 'boolean',
        description: '[search] Include more detail in skeleton output (less minification)',
        default: false
      },
      context_window_size: {
        type: 'number',
        description: '[search] Maximum tokens for results (controls how much is returned)',
        default: 25000
      },
      max_results: {
        type: 'number',
        description: '[search] Maximum number of results to return',
        default: 10
      },
      similarity_threshold: {
        type: 'number',
        description: '[search] Minimum similarity score 0.0-1.0 (lower=more results, less relevant)',
        default: 0.3
      },
      view: {
        type: 'string',
        enum: ['ids', 'names', 'files', 'files+lines', 'full'],
        description: '[search] Output detail: ids=just IDs, names=IDs+names, files=IDs+filepaths, files+lines=IDs+filepaths+line ranges, full=everything'
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: '[search] Specific fields to return (overrides view). E.g., ["id","name","filePath"]'
      },
      output_format: {
        type: 'string',
        enum: ['text', 'json', 'markdown'],
        description: '[search/context] text=formatted, json=structured, markdown=formatted with markdown',
        default: 'text'
      },

      // Context-specific
      component_id: {
        type: 'string',
        description: '[context] Component ID from search results to get full context for'
      },
      depth: {
        type: 'number',
        description: '[context] How many relationship hops to traverse (1=direct, 2=direct+indirect)',
        default: 2
      },
      include_source: {
        type: 'boolean',
        description: '[context] Include full source code (use this instead of Read tool)',
        default: true
      },
      include_relationships: {
        type: 'boolean',
        description: '[context] Include call graphs, imports, inheritance relationships',
        default: true
      },
      include_metadata: {
        type: 'boolean',
        description: '[context] Include component metadata (types, signatures, etc.)',
        default: true
      },
      include_documentation: {
        type: 'boolean',
        description: '[context] Include docstrings and comments',
        default: true
      },
      include_notes: {
        type: 'boolean',
        description: '[context] Include related documentation notes',
        default: true
      },
      include_rules: {
        type: 'boolean',
        description: '[context] Include applicable coding rules and standards',
        default: true
      },
      include_tasks: {
        type: 'boolean',
        description: '[context] Include related tasks',
        default: false
      },
      lens: {
        type: 'string',
        enum: ['default','structure','callers','callees','imports','inheritance','data-flow','doc-heavy','rule-heavy','full'],
        description: '[context] Relationship view: callers=who uses this (impact), callees=what this uses (dependencies), inheritance=class hierarchies, imports=module dependencies, structure=file organization, data-flow=data paths, doc-heavy=emphasize docs, rule-heavy=emphasize rules, full=everything'
      },
      rel_types: {
        type: 'array',
        items: { type: 'string' },
        description: '[context] Filter to specific relationship types (e.g., ["calls","imports","extends"])'
      },
      direction: {
        type: 'string',
        enum: ['in','out','both'],
        description: '[context] Relationship direction: in=incoming (who uses this), out=outgoing (what this uses), both=bidirectional',
        default: 'both'
      },
      target_token_size: {
        type: 'number',
        description: '[context] Target token budget for output (controls response size)',
        default: 25000
      },
      budget_tokens: {
        type: 'number',
        description: '[context] Hard token limit for output (overrides target_token_size)'
      },
      rules_mode: {
        type: 'string',
        enum: ['summary','full'],
        description: '[context] summary=rule titles only, full=complete rule definitions with guidance/templates',
        default: 'summary'
      },
      docs_limit: {
        type: 'number',
        description: '[context] Maximum number of documentation snippets to include',
        default: 3
      },
      rules_limit: {
        type: 'number',
        description: '[context] Maximum number of rules to include',
        default: 3
      },
      rel_limit: {
        type: 'number',
        description: '[context] Maximum relationships per type (e.g., max 50 callers, max 50 callees)',
        default: 50
      },
      priority_components: {
        type: 'array',
        items: { type: 'string' },
        description: '[context] Component IDs to prioritize in output (will appear first/get more detail)'
      },
      language_filter: {
        type: 'array',
        items: { type: 'string' },
        description: '[context] Only include relationships to components in these languages (e.g., ["typescript","javascript"])'
      },
      user_intent: {
        type: 'string',
        description: '[context] What you are trying to do (e.g., "fixing bug", "adding feature") - helps select relevant rules'
      },
      current_task_id: {
        type: 'string',
        description: '[context] Current task ID - helps select task-specific rules and context'
      }
    }),
    required: ['project', 'action']
  }
};
