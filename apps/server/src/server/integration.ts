/**
 * Felix Server Integration Module
 * 
 * This module exports all the necessary components to integrate Felix
 * into another Express application without running a separate server.
 */

import express, { Router, Application } from 'express';
import { WebSocketServer } from 'ws';
import path from 'path';

// Route imports
import projectRoutes from './routes/projectRoutes.js';
import notesRoutes from './routes/notesRoutes.js';
import tasksRoutes from './routes/tasksRoutes.js';
import rulesRoutes from './routes/rulesRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import componentRoutes from './routes/componentRoutes.js';
import relationshipRoutes from './routes/relationshipRoutes.js';
import { logger } from '../shared/logger.js';

// MCP server setup
import { setupMCPRoutesHttpStreaming } from './mcpServerHttpStreaming.js';

// Project management - use injectable version
import { 
  InjectableProjectManager,
  getCurrentProject, 
  setCurrentProject,
  type ProjectInfo 
} from '../mcp/project-manager-injectable.js';

// Storage and database
import { DatabaseManager } from '../features/storage/DatabaseManager.js';
import { CodeIndexer } from '../features/indexing/api/CodeIndexer.js';
import { DATABASE_PREFIX } from '../cli/helpers.js';


export interface FelixIntegrationOptions {
  /**
   * Base path for mounting Felix routes (default: '/felix')
   */
  basePath?: string;
  
  /**
   * Custom database manager instance (if not provided, creates a new instance)
   */
  databaseManager?: DatabaseManager;
  
  /**
   * Socket.io server instance for real-time features
   */
  wss?: WebSocketServer;
  
  /**
   * Enable MCP server endpoints (default: true)
   */
  enableMCP?: boolean;
  
  /**
   * Disable file watcher (default: false). Overrides env.
   */
  disableFileWatcher?: boolean;
  
  
  /**
   * Custom exclude paths for file operations
   */
  excludePaths?: string[];
  
  /**
   * Maximum file size in bytes (default: 50MB)
   */
  maxFileSize?: number;
  
  /**
   * Enable logging (default: true)
   */
  logging?: boolean;
}

export interface FelixRoutes {
  /**
   * Main API router with all Felix endpoints
   */
  apiRouter: Router;
  
  /**
   * MCP server router (if enabled)
   */
  mcpRouter?: Router;
  
  
  /**
   * WebSocket server instance
   */
  webSocketServer?: WebSocketServer;
  
  /**
   * Project manager instance for direct access
   */
  projectManager: InjectableProjectManager;
}

/**
 * Creates Felix routes that can be mounted on any Express app
 */
export async function createFelixRoutes(options: FelixIntegrationOptions = {}): Promise<FelixRoutes> {
  const {
    basePath = '/felix',
    databaseManager,
    wss,
    enableMCP = true,
    disableFileWatcher = (process.env.DISABLE_FILE_WATCHER === 'true'),
    excludePaths = [
      'node_modules', '.git', 'dist', 'build', '.env', 'coverage', 
      '.next', '.nuxt', '.vscode', '.idea', 'target', 'bin', 'obj',
      '*.log', '*.tmp', '.DS_Store', 'Thumbs.db', '.cache', '.yarn',
      '__pycache__', '.pytest_cache', '.mypy_cache', '.venv', 'venv'
    ],
    maxFileSize = 50 * 1024 * 1024, // 50MB
    logging = true
  } = options;

  // Create project manager with injectable database
  const projectManager = new InjectableProjectManager({
    databaseManager,
    // Do not gate file watching on websockets; honor explicit option/env only
    disableFileWatcher
  });

  // Create main API router
  const apiRouter = Router();

  // Mount all API routes
  // Always mount project routes - they're needed for Felix to function
  apiRouter.use(projectRoutes);
  apiRouter.use(notesRoutes);
  apiRouter.use(tasksRoutes);
  apiRouter.use(rulesRoutes);
  apiRouter.use(searchRoutes);
  apiRouter.use('/components', componentRoutes);
  apiRouter.use('/relationships', relationshipRoutes);

  // Health check
  apiRouter.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      uptime: process.uptime(),
      activeProjects: projectManager.getProjects().length
    });
  });

  const result: FelixRoutes = {
    apiRouter,
    projectManager
  };

  // Setup MCP routes if enabled
  if (enableMCP) {
    const mcpRouter = Router();
    setupMCPRoutesHttpStreaming(mcpRouter as any);
    result.mcpRouter = mcpRouter;
  }

  // Add project endpoint for external integrations
  apiRouter.post('/project', (req, res) => {
    const { projectPath } = req.body;
    logger.info(`Setting project: ${projectPath}`);
    
    // Update project manager if needed
    if (projectPath) {
      const projects = projectManager.getProjects();
      if (projects.length === 0 || projects[0]?.path !== projectPath) {
        projectManager.setProject(projectPath);
      }
      // Always set as current project
      setCurrentProject(projectPath);
    }
    
    res.json({ success: true, project: projectPath });
  });
  
  apiRouter.get('/project', (req, res) => {
    const currentProjectPath = getCurrentProject();
    const name = currentProjectPath ? path.basename(currentProjectPath) : null;
    res.json({ 
      current_project: currentProjectPath,
      name: name
    });
  });

  // Setup WebSocket server if provided
  if (wss) {
    result.webSocketServer = wss;
  }

  return result;
}

/**
 * Mounts Felix routes on an Express application
 */
export function mountFelix(
  app: Application, 
  routes: FelixRoutes,
  options: { basePath?: string } = {}
): void {
  const { basePath = '/felix' } = options;

  // Mount main API routes
  app.use(`${basePath}/api`, routes.apiRouter);

  // Mount MCP routes if available
  if (routes.mcpRouter) {
    app.use(`${basePath}/mcp`, routes.mcpRouter);
  }

}

/**
 * Export all necessary components for direct access
 */
export {
  InjectableProjectManager,
  getCurrentProject,
  setCurrentProject,
  CodeIndexer,
  DatabaseManager
};

// Re-export types
export type { ProjectInfo } from '../mcp/project-manager-injectable.js';
