/**
 * Shared project context for all route handlers
 * Tracks the current project for the web UI
 */

import { projectManager } from '../../mcp/project-manager.js';

// Track the current project for the web UI (per-session ideally, but global for now)
let currentProjectPath: string | null = null;

/**
 * Get the current project path
 */
export function getCurrentProject(): string | null {
  return currentProjectPath;
}

/**
 * Set the current project path
 */
export function setCurrentProject(projectPath: string | null): void {
  currentProjectPath = projectPath;
}

/**
 * Get the project indexer for the given path
 * Auto-loads the project if already indexed
 */
export async function getProjectIndexer(projectPath: string): Promise<any> {
  // First try to get existing project
  let project = await projectManager.getProject(projectPath);

  // If not found, set it (connect without indexing)
  if (!project) {
    project = await projectManager.setProject(projectPath);
  }

  return project.codeIndexer;
}

/**
 * Get project info for the given path
 */
export async function getProjectInfo(projectPath: string): Promise<any> {
  return await projectManager.getProject(projectPath);
}

// Re-export projectManager for direct use
export { projectManager };