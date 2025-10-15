import type { McpToolDefinition } from './common.js';

/**
 * Projects tool - handles project management without sessions
 */
export const PROJECTS_TOOL: McpToolDefinition = {
  name: 'projects',
  description: `Project indexing and statistics. Auto-loads when used by other tools - rarely need to call directly.

PURPOSE: Index content for search/context tools. Tracks files, components, relationships. Creates embeddings for semantic search.

Required: action(index|get_stats), path
Optional: force=F (force re-index), with_embeddings=T (include embeddings, F=background)

WHEN TO USE:
- Index new project first time (auto-creates databases)
- Force re-index after major refactoring or file structure changes
- Get statistics to see what's indexed

AUTO-LOADING: Other tools (search, context) auto-load projects - you rarely call this directly
EXAMPLE: Force re-index after moving files around to update relationships`,
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
