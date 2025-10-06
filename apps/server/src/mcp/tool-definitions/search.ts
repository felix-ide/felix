import type { McpToolDefinition } from './common.js';
import { COMMON_FILTER_PROPERTIES, withProjectProperty } from './common.js';

/**
 * Search tool - handles search operations
 */
export const SEARCH_TOOL: McpToolDefinition = {
  name: 'search',
  description: `PRIMARY SEARCH - Shows SKELETON VIEW for spotting patterns & refactoring!

EXAMPLES:
{ project: "/path", action: "search", query: "CodeIndexer" }  // See class structure
{ project: "/path", action: "search", query: "getUserById", view: "files+lines" }
{ project: "/path", action: "search", query: "CRUD operations", max_results: 20 }

Returns SKELETON VIEW (method signatures, line numbers) - perfect for:
- Spotting duplicate code patterns (e.g., repeated CRUD methods)
- Understanding class structure before refactoring
- Finding all usages quickly with semantic search
Use component IDs from results with context tool to get full source.`,
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
