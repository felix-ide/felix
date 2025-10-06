import express from 'express';
import { getProjectIndexer as realGetProjectIndexer, getCurrentProject as realGetCurrentProject } from './projectContext.js';
import { logger } from '../../shared/logger.js';

type ProjectProvider = {
  getCurrentProject: () => string | null;
  getProjectIndexer: (projectPath: string) => Promise<any>;
};

export function createComponentRouter(provider: ProjectProvider = {
  getCurrentProject: realGetCurrentProject,
  getProjectIndexer: realGetProjectIndexer,
}) {
  const router = express.Router();

  // Get components with pagination and search
  router.get('/', async (req: any, res: any) => {
    try {
    const currentProject = provider.getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project selected' });
    }

    const indexer = await provider.getProjectIndexer(currentProject);
    
    // Parse query parameters
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type;
    const name = req.query.name;
    
    // Search for components
    const searchResult = await indexer.searchComponents({
      type,
      name,
      limit,
      offset
    });
    
    // Return with both 'items' and 'components' for compatibility
    res.json({
      ...searchResult,
      components: searchResult.items // Add components field for backward compatibility
    });
  } catch (error) {
    logger.error('Failed to get components:', error);
    res.status(500).json({ error: (error as Error).message });
  }
  });

// Search components
  router.get('/search', async (req: any, res: any) => {
    try {
    const currentProject = provider.getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project selected' });
    }

    const indexer = await provider.getProjectIndexer(currentProject);
    const { name, type, file_path } = req.query;
    
    const searchResult = await indexer.searchComponents({
      name,
      type,
      file_path,
      limit: parseInt(req.query.limit) || 100
    });
    
    // Return with both 'items' and 'components' for compatibility
    res.json({
      ...searchResult,
      components: searchResult.items // Add components field for backward compatibility
    });
  } catch (error) {
    logger.error('Failed to search components:', error);
    res.status(500).json({ error: (error as Error).message });
  }
  });

// Get components by file - MUST come before /:id route
  router.get('/by-file', async (req: any, res: any) => {
    try {
    const currentProject = provider.getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project selected' });
    }

    const indexer = await provider.getProjectIndexer(currentProject);
    const { file_path } = req.query;
    
    if (!file_path) {
      return res.status(400).json({ error: 'file_path parameter required' });
    }

    const components = await indexer.getComponentsInFile(file_path);
    res.json(components);
  } catch (error) {
    logger.error('Failed to get components by file:', error);
    res.status(500).json({ error: (error as Error).message });
  }
  });

// Get all file components
  router.get('/files', async (req: any, res: any) => {
    try {
    const currentProject = provider.getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project selected' });
    }

    const indexer = await provider.getProjectIndexer(currentProject);
    
    // Use the storage adapter to search for file type components
    const searchResult = await indexer.searchComponents({
      type: 'file',
      limit: 10000 // Get all files
    });
    
    const files = searchResult.items;
    
    res.json({ files });
  } catch (error) {
    logger.error('Failed to get file components:', error);
    res.status(500).json({ error: (error as Error).message });
  }
  });

// Get components within a specific file
  router.get('/files/:fileId/components', async (req: any, res: any) => {
    try {
    const { fileId } = req.params;
    const currentProject = provider.getCurrentProject();
    
    if (!currentProject) {
      return res.status(400).json({ error: 'No project selected' });
    }

    const indexer = await provider.getProjectIndexer(currentProject);
    
    // Get the file component first
    const fileComponent = await indexer.getComponent(fileId);
    
    if (!fileComponent) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get all components in this file
    const components = await indexer.getComponentsInFile(fileComponent.filePath);
    
    res.json({ 
      file: fileComponent,
      components: components.filter((c: any) => c.id !== fileId) // Exclude the file itself
    });
  } catch (error) {
    logger.error('Failed to get file components:', error);
    res.status(500).json({ error: (error as Error).message });
  }
  });

// Get all components
  router.get('/all', async (req: any, res: any) => {
    try {
    const currentProject = provider.getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project selected' });
    }

    const indexer = await provider.getProjectIndexer(currentProject);

    // Support pagination if provided
    const limit = parseInt(req.query.limit) || 10000;
    const offset = parseInt(req.query.offset) || 0;

    // Get all components via indexer shim; normalize to array shape
    const result = await indexer.getAllComponents(limit, offset);
    const components = result && result.items ? result.items : (Array.isArray(result) ? result : []);

    res.json({ components });
  } catch (error) {
    logger.error('Failed to get all components:', error);
    res.status(500).json({ error: (error as Error).message });
  }
  });

// Get component by ID - MUST come after all specific routes
  router.get('/:id', async (req: any, res: any) => {
    try {
    const currentProject = provider.getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project selected' });
    }

    const indexer = await provider.getProjectIndexer(currentProject);
    const component = await indexer.getComponent(req.params.id);
    
    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }
    
    res.json(component);
  } catch (error) {
    logger.error('Failed to get component:', error);
    res.status(500).json({ error: (error as Error).message });
  }
  });

// Get similar components
  router.get('/:id/similar', async (req: any, res: any) => {
    try {
    const currentProject = provider.getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project selected' });
    }

    const indexer = await provider.getProjectIndexer(currentProject);
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    // Get the component first
    const component = await indexer.getComponent(id);
    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }
    
    // Find similar components
    const similar = await indexer.findSimilarComponents(id, limit);
    
    res.json({ similar });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
  });

  return router;
}

// Default export preserves current behavior
const router = createComponentRouter();
export default router;
