import type { McpToolDefinition } from './common.js';

export const CONTEXT_TOOL: McpToolDefinition = {
  name: 'context',
  description: `AST-based context retrieval with relationship graph traversal. RAG-augmented: returns source + call graphs + inheritance + applicable rules/docs. Replaces Read tool for code exploration.

WHAT THIS IS:
• AST-indexed component retrieval - full source code with parsed structure metadata
• Relationship graph traversal - navigates calls, imports, inheritance, data flow from the code graph
• RAG integration - automatically retrieves applicable rules, documentation snippets, and notes
• Configurable lens system - different relationship views for different analysis needs
• Token-optimized output - includes skeleton views with precise line numbers for large files

KEY CAPABILITIES:
• Call graph analysis: See all callers (who uses this) and callees (what this uses)
• Inheritance tracking: Full class hierarchies, interface implementations, method overrides
• Import chain navigation: Trace dependencies and module relationships
• Skeleton with line numbers: Function signatures with precise ranges (e.g., lines 234-256) for surgical edits
• RAG context retrieval: Pulls relevant coding standards, architectural docs, and rules automatically
• Multi-hop traversal: Follow relationships N hops deep (default 2) to understand broader context

LENS SYSTEM (relationship view presets):
• lens='callers' → All functions/classes that call/use this component (impact analysis)
• lens='callees' → Everything this component calls (dependency analysis, logic flow)
• lens='inheritance' → Class hierarchies, interfaces, extends/implements relationships
• lens='imports' → Import chains and module dependencies
• lens='structure' → File organization, exports, module structure
• lens='data-flow' → Data flow through the system
• lens='doc-heavy' → Emphasize documentation and comments
• lens='rule-heavy' → Emphasize applicable coding rules and standards

RAG AUGMENTATION:
Automatically enriches component context with relevant rules (coding standards, patterns), documentation snippets (architecture notes, API docs), and related tasks. Context is semantically matched to your query/intent for maximum relevance.

Required: project, component_id
Depth: depth=2 (relationship hops), direction(in|out|both)=both
Content: include_source=T, include_relationships=T, include_metadata=T, include_documentation=T, include_notes=T, include_rules=T, include_tasks=F
Lens: lens[default,structure,callers,callees,imports,inheritance,data-flow,doc-heavy,rule-heavy,full]
Filters: rel_types[], language_filter[], priority_components[], query, user_intent, current_task_id
Output: output_format(markdown|json)=json, target_token_size=25000, budget_tokens
Limits: docs_limit=3, rules_limit=3, rel_limit=50, rules_mode(summary|full)=summary

WORKFLOW: search (find components) → context (get source + relationships + RAG context) → make informed changes

USE CASES:
• Impact analysis: lens='callers' shows all 47 call sites before refactoring
• Dependency analysis: lens='callees' shows what this calls, understand logic flow
• Architecture understanding: lens='imports' + lens='structure' for module relationships
• Large file editing: Get skeleton with line numbers, edit specific ranges without reading entire file`,
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
