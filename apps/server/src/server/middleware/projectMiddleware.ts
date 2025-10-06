/**
 * Middleware for stateless project resolution
 * 
 * Allows HTTP API to work without sessions by accepting project
 * via query parameter or header.
 */

import { Request, Response, NextFunction } from 'express';
import { getProjectIndexer, getCurrentProject } from '../routes/projectContext.js';
import { logger } from '../../shared/logger.js';

export interface ProjectRequest extends Request {
  projectIndexer?: any;
  projectPath?: string;
}

/**
 * Middleware to resolve project from request parameters
 * 
 * Checks in order:
 * 1. Query parameter: ?project=/path/to/project
 * 2. Header: X-Project-Path
 * 3. Current session project (backward compatibility)
 */
export async function resolveProject(
  req: ProjectRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check query parameter first (support URL-encoded values)
    let projectPath = req.query.project as string;
    if (projectPath) {
      try {
        // Only decode if it looks URL-encoded to avoid double-decoding
        projectPath = /%[0-9A-Fa-f]{2}/.test(projectPath) ? decodeURIComponent(projectPath) : projectPath;
      } catch {
        // Fallback: keep original if decoding fails
      }
    }
    
    // Check header if no query param (try both x-project-path and x-project-id)
    if (!projectPath && req.headers['x-project-path']) {
      const raw = req.headers['x-project-path'] as string;
      try {
        projectPath = /%[0-9A-Fa-f]{2}/.test(raw) ? decodeURIComponent(raw) : raw;
      } catch {
        projectPath = raw;
      }
    }
    if (!projectPath && req.headers['x-project-id']) {
      const raw = req.headers['x-project-id'] as string;
      try {
        projectPath = /%[0-9A-Fa-f]{2}/.test(raw) ? decodeURIComponent(raw) : raw;
      } catch {
        projectPath = raw;
      }
    }
    
    // If no project specified, try to use current project
    if (!projectPath) {
      const currentProject = getCurrentProject();
      if (currentProject) {
        projectPath = currentProject;
      } else {
        req.projectPath = undefined;
        req.projectIndexer = undefined;
        return next();
      }
    }
    
    // Get the project indexer - creates if needed (original behavior)
    const indexer = await getProjectIndexer(projectPath);
    
    // Attach to request for route handlers
    req.projectPath = projectPath;
    req.projectIndexer = indexer;
    
    next();
  } catch (error) {
    logger.error('Project resolution error:', error);
    res.status(500).json({ 
      error: 'Failed to resolve project',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Helper function to get indexer from request with proper error handling
 */
export function requireProjectIndexer(req: ProjectRequest, res: Response): any | null {
  if (!req.projectIndexer) {
    res.status(400).json({ 
      error: 'No project specified',
      message: 'Please provide project via ?project=/path/to/project query parameter or X-Project-Path header'
    });
    return null;
  }
  return req.projectIndexer;
}
