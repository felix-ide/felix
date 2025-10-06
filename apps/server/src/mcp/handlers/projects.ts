import { projectManager } from '../project-manager.js';
import { createJsonContent, createTextContent, type ProjectsGetStatsRequest, type ProjectsIndexRequest, type ProjectsSetRequest, type ProjectsToolRequest } from '../types/contracts.js';

export async function handleProjectsTools(request: ProjectsToolRequest) {
  switch (request.action) {
    case 'index': {
      const { path: projectPath, force, with_embeddings } = request as ProjectsIndexRequest;
      if (!projectPath) throw new Error('Path is required for index action');
      const project = await projectManager.indexProject(projectPath, force, { withEmbeddings: with_embeddings !== false });
      return { content: [createTextContent(`Project "${project.name}" indexed successfully at ${project.fullPath}`)] };
    }
    case 'get_stats': {
      const { path: projectPath } = request as ProjectsGetStatsRequest;
      if (!projectPath) throw new Error('Path is required for get_stats action');
      const stats = await projectManager.getProjectStats(projectPath);
      return { content: [createJsonContent({ project: projectPath, stats })] };
    }
    default:
      throw new Error(`Unknown projects action: ${(request as { action: string }).action}`);
  }
}
