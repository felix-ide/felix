import type { McpToolDefinition } from './common.js';

/**
 * Projects tool - handles project management without sessions
 */
export const PROJECTS_TOOL: McpToolDefinition = {
  name: 'projects',
  description: `Project management - Index/re-index projects or get statistics.

Projects auto-load when used, so you only need this tool to:
- Index a project (first time or re-index with force: true)
- Get statistics about a project

EXAMPLES:
{ action: "index", path: "/path/to/project" }  // Index or connect
{ action: "index", path: "/path/to/project", force: true }  // Force re-index
{ action: "get_stats", path: "/path/to/project" }`,
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['index', 'get_stats'],
        description: 'Action to perform'
      },
      path: {
        type: 'string',
        description: 'Path to project directory'
      },
      force: {
        type: 'boolean',
        description: 'Force re-indexing even if already indexed (for index action)',
        default: false
      },
      with_embeddings: {
        type: 'boolean',
        description: 'Include embedding generation during index (slower; defaults to true). If false, embeddings run in background.',
        default: true
      }
    },
    required: ['action', 'path']
  }
};
