/**
 * Project API Routes - COPIED from web-ui/server.js
 */

import express from 'express';
import path from 'path';
import { projectManager, getCurrentProject, setCurrentProject, getProjectIndexer } from './projectContext.js';
import { logger } from '../../shared/logger.js';

const router = express.Router();

// Get all projects
router.get('/projects', async (req: any, res: any) => {
  try {
    const projects = projectManager.getProjects();
    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Set/load a project (connects to existing or auto-loads)
router.post('/project/set', async (req: any, res: any) => {
  try {
    const { path: projectPath } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }

    // This will auto-load if already indexed, or connect if not
    const projectInfo = await projectManager.getProject(projectPath);
    let project = projectInfo;

    if (!project) {
      // Project not loaded, try to set it (connect without indexing)
      project = await projectManager.setProject(projectPath);
    }

    // Track current project for the web UI
    setCurrentProject(project.fullPath);

    res.json({
      success: true,
      message: 'Project set successfully',
      project: project.fullPath,
      project_path: project.fullPath,
      project_name: project.name,
      name: project.name
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/project/current', async (req: any, res: any) => {
  try {
    const currentProjectPath = getCurrentProject();
    if (!currentProjectPath) {
      return res.json({ current_project: null, name: null });
    }

    // Get the project info
    const projectInfo = await projectManager.getProject(currentProjectPath);
    if (!projectInfo) {
      // Project was unloaded or path invalid
      setCurrentProject(null);
      return res.json({ current_project: null, name: null });
    }

    res.json({
      current_project: projectInfo.fullPath,
      project: projectInfo.fullPath, // Backward compatibility
      name: projectInfo.name
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/project/stats', async (req: any, res: any) => {
  try {
    const currentProjectPath = getCurrentProject();
    if (!currentProjectPath) {
      return res.json({
        components: { total: 0, with_embeddings: 0 },
        files: 0,
        functions: 0,
        classes: 0,
        notes: 0,
        tasks: 0
      });
    }

    const projectInfo = await projectManager.getProject(currentProjectPath);
    if (!projectInfo) {
      return res.json({
        components: { total: 0, with_embeddings: 0 },
        files: 0,
        functions: 0,
        classes: 0,
        notes: 0,
        tasks: 0
      });
    }

    const stats = await projectInfo.codeIndexer.getStats();
    
    // Transform to match expected format
    const formattedStats = {
      components: {
        total: stats.componentCount,
        with_embeddings: stats.componentEmbeddingCount
      },
      relationships: {
        total: stats.relationshipCount
      },
      files: stats.fileCount,
      languages: stats.languageBreakdown,
      metadata: {
        rules: { total: stats.ruleCount, with_embeddings: stats.ruleEmbeddingCount },
        tasks: { total: stats.taskCount, with_embeddings: stats.taskEmbeddingCount },
        notes: { total: stats.noteCount, with_embeddings: stats.noteEmbeddingCount }
      },
      lastUpdated: stats.lastUpdated
    };
    
    res.json({
      ...formattedStats,
      stats: formattedStats // Add stats field for backward compatibility
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Watcher status for debugging file-change staleness
router.get('/project/watcher-status', async (req: any, res: any) => {
  try {
    const currentProjectPath = getCurrentProject();
    if (!currentProjectPath) {
      return res.json({ enabled: false, reason: 'no_project' });
    }

    const info = await projectManager.getProject(currentProjectPath);
    if (!info) {
      return res.json({ enabled: false, reason: 'not_found' });
    }

    const watcher: any = info.watcher;
    const stats = (watcher && (watcher as any).__stats) || info.watcherStats || null;
    res.json({
      enabled: !!watcher,
      ready: !!stats?.ready,
      counts: stats ? { add: stats.add, change: stats.change, unlink: stats.unlink } : null,
      lastEvent: stats?.lastEvent || null,
      options: stats?.options || null
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/project/index', async (req: any, res: any) => {
  try {
    const { path, includeTests, projectPath } = req.body;
    const targetPath = path || projectPath || getCurrentProject();

    if (!targetPath) {
      return res.status(400).json({ error: 'No project set. Use set_project first.' });
    }

    // Use the existing indexer instance for this project
    const indexer = await getProjectIndexer(targetPath);
    setCurrentProject(targetPath);

    // Restore previous behavior: always clear before a full re-index
    logger.info('Clearing existing index data before re-indexing');
    await indexer.clearIndex();

    const result = await indexer.indexDirectory(targetPath, { includeTests });
    const stats = await indexer.getStats();
    res.json({
      success: result.success,
      message: 'Indexing completed',
      indexed: stats.componentCount,
      result
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Generate embeddings for metadata entities (rules, tasks, notes)
router.post('/project/index-metadata', async (req: any, res: any) => {
  try {
    const currentProjectPath = getCurrentProject();
    if (!currentProjectPath) {
      return res.status(400).json({ error: 'No project set. Use set_project first.' });
    }

    const projectInfo = await projectManager.getProject(currentProjectPath);
    if (!projectInfo) {
      return res.status(400).json({ error: 'Project not found' });
    }

    const indexer = projectInfo.codeIndexer;
    logger.info('Generating embeddings for metadata entities');
    
    const result = await indexer.indexAllMetadataEntities();
    
    res.json({ 
      success: true, 
      message: 'Metadata embeddings generated',
      tasksIndexed: result.tasksIndexed,
      notesIndexed: result.notesIndexed,
      rulesIndexed: result.rulesIndexed,
      errors: result.errors
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
