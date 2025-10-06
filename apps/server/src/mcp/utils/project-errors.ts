/**
 * Utility for generating helpful error messages related to project management
 */

import path from 'path';
import fs from 'fs/promises';
import { projectManager } from '../project-manager.js';

/**
 * Generate a helpful error message when a project is not found
 */
export async function getProjectNotFoundError(projectNameOrPath: string): Promise<string> {
  const absolutePath = path.resolve(projectNameOrPath);

  try {
    // Check if the path exists on disk
    await fs.access(absolutePath);

    // Path exists but not indexed
    return (
      `📁 Project path exists but is not indexed: ${projectNameOrPath}\n\n` +
      `To use this project, you need to index it first:\n` +
      `{ action: "index", path: "${absolutePath}" }\n\n` +
      `Or check already indexed projects:\n` +
      `{ action: "list" }`
    );
  } catch {
    // Path doesn't exist or isn't accessible
    const availableProjects = projectManager.getProjects();

    let helpMessage = `❌ Project not found: ${projectNameOrPath}\n\n`;

    // Check if it might be a typo of an existing project
    const similarProjects = availableProjects.filter(p =>
      p.name.toLowerCase().includes(projectNameOrPath.toLowerCase()) ||
      p.path.toLowerCase().includes(projectNameOrPath.toLowerCase())
    );

    if (similarProjects.length > 0) {
      helpMessage += `Did you mean one of these?\n`;
      similarProjects.forEach(p => {
        helpMessage += `  • ${p.name}: ${p.path}\n`;
      });
      helpMessage += `\n`;
    }

    helpMessage += `Available options:\n`;
    helpMessage += `1. Check indexed projects: { action: "list" }\n`;
    helpMessage += `2. Index a new project: { action: "index", path: "/absolute/path/to/project" }\n`;

    if (availableProjects.length > 0) {
      helpMessage += `\nCurrently indexed projects:\n`;
      availableProjects.slice(0, 5).forEach(p => {
        helpMessage += `  • ${p.name}: ${p.path}\n`;
      });
      if (availableProjects.length > 5) {
        helpMessage += `  ... and ${availableProjects.length - 5} more (use { action: "list" } to see all)\n`;
      }
    }

    return helpMessage;
  }
}

/**
 * Check if a project needs to be indexed and provide guidance
 */
export async function checkProjectStatus(projectNameOrPath: string): Promise<{
  exists: boolean;
  indexed: boolean;
  message?: string;
}> {
  // First check if it's already indexed
  const projectInfo = await projectManager.getProject(projectNameOrPath);
  if (projectInfo) {
    return { exists: true, indexed: true };
  }

  // Check if path exists on disk
  const absolutePath = path.resolve(projectNameOrPath);
  try {
    await fs.access(absolutePath);
    return {
      exists: true,
      indexed: false,
      message: `Project exists at ${absolutePath} but needs to be indexed first. Use: { action: "index", path: "${absolutePath}" }`
    };
  } catch {
    return {
      exists: false,
      indexed: false,
      message: `Project path does not exist: ${absolutePath}`
    };
  }
}