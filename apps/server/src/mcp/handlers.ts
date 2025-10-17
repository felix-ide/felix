/**
 * MCP Handlers v2 - Router-only facade.
 * Delegates tool handling to scoped modules to keep logic modular.
 */

import { projectManager } from './project-manager.js';
import { logger } from '../shared/logger.js';
import { handleWorkflowTools } from './workflow-handlers.js';
import { handleSearchTools as searchHandler } from './handlers/search.js';
import { handleTasksTools as tasksHandler } from './handlers/tasks.js';
import { handleNotesTools as notesHandler } from './handlers/notes.js';
import { handleRulesTools as rulesHandler } from './handlers/rules.js';

/**
 * Main handler router for consolidated MCP tools.
 */
export async function handleToolCall(name: string, args: any): Promise<any> {
  try {
    logger.info(`[HANDLER] Tool: ${name}`);

    switch (name) {
      case 'search':
        return await searchHandler(args);
      case 'notes':
        return await notesHandler(args);
      case 'tasks':
        return await tasksHandler(args);
      case 'rules':
        return await rulesHandler(args);
      case 'workflows': {
        const { project } = args;
        if (!project) {
          throw new Error('Project is required for workflow tools');
        }
        const projectInfo = await projectManager.getProject(project);
        if (!projectInfo) {
          throw new Error(`Project not found: ${project}`);
        }
        return await handleWorkflowTools(args, (projectInfo as any).codeIndexer?.dbManager);
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[HANDLER] Error in ${name}: ${errorMessage}`);

    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}
