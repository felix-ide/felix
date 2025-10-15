import type { McpToolDefinition } from './common.js';
import { COMMON_FILTER_PROPERTIES, withProjectProperty } from './common.js';

/**
 * Search tool - handles search operations
 */
export const SEARCH_TOOL: McpToolDefinition = {
  name: 'search',
  description: `Semantic search over indexed code (AST) and documentation. RAG-augmented: returns code + relevant rules/docs. Default skeleton view shows function signatures with line numbers.

WHAT THIS IS:
• Semantic search using embeddings - finds code by meaning, not keywords
• AST-indexed codebase - searches parsed structure, not raw text
• RAG architecture - automatically pulls relevant rules, documentation snippets, and notes
• Returns skeleton views by default - function signatures, parameters, return types, line ranges
• Smart ranking with reranking - code-first bias surfaces implementations over docs

KEY CAPABILITIES:
• Semantic matching: "error handling" finds catch blocks, error callbacks, validation logic across different patterns
• Skeleton output: See method signatures and line numbers without reading full implementations
• Pattern discovery: Find similar implementations across files for refactoring candidates
• Precise targeting: Get file paths + line ranges for surgical edits (edit lines 45-67, not whole file)
• Cross-entity search: Search code, tasks, notes, rules in one query
• KB scoping: Restrict searches to specific Knowledge Bases for focused results

RAG INTEGRATION:
Search automatically enriches results with relevant context from the knowledge graph - coding standards, architectural docs, related rules. The context tool uses same RAG approach to pull applicable rules and documentation when viewing components.

Required: project, action(search|search_related), query
Filters: entity_types[component,task,note,rule][], kb_ids[] (scope to Knowledge Bases), component_types[], lang[], path_include[], path_exclude[]
Output: view[ids,names,files,files+lines,full], fields[], output_format(text|json)=text, skeleton_verbose=F
Tuning: code_first=T, max_results=10, similarity_threshold=0.3, context_window_size=25000

WORKFLOW: search (get skeleton + line numbers) → context tool (get full source + relationships + RAG context)

EXAMPLES:
• "database connection pooling" → finds connection managers, pool classes, connection handlers (semantic matching)
• "validation" path_include=["api/"] → validation logic in API layer only, with line numbers for each function
• "authentication" kb_ids=['kb_project'] entity_types=['note'] → search project documentation only`,
  inputSchema: {
    type: 'object',
    properties: withProjectProperty({
      action: {
        type: 'string',
        enum: ['search', 'search_related'],
        description: 'Type of search to perform'
      },
      query: {
        type: 'string',
        description: 'Search query'
      },
      entity_types: {
        type: 'array',
        items: { type: 'string', enum: ['component', 'task', 'note', 'rule'] },
        description: 'Restrict search to specific entity types'
      },
      kb_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter note results to specific Knowledge Base(s). Use KB IDs like "kb_project".'
      },
      ...COMMON_FILTER_PROPERTIES,
      code_first: {
        type: 'boolean',
        description: 'Bias reranking heavily toward code components',
        default: true
      },
      skeleton_verbose: {
        type: 'boolean',
        description: 'Prefer full skeleton details in search output (less minification)',
        default: false
      },
      context_window_size: {
        type: 'number',
        description: 'Token budget for results',
        default: 25000
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of components to return',
        default: 10
      },
      discovery_limit: {
        type: 'number',
        description: 'Maximum number of components to analyze for discovery suggestions',
        default: 50
      },
      similarity_threshold: {
        type: 'number',
        description: 'Minimum similarity threshold for discovery results (0.0-1.0)',
        default: 0.3
      },
      view: {
        type: 'string',
        enum: ['ids', 'names', 'files', 'files+lines', 'full'],
        description: 'Projection preset (ids|names|files|files+lines|full).'
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Explicit field list to return (overrides view)'
      },
      output_format: {
        type: 'string',
        enum: ['text', 'json'],
        description: 'Return optimized text (default) or JSON rows',
        default: 'text'
      }
    }),
    required: ['project', 'action', 'query']
  }
};
