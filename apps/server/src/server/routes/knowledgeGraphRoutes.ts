import express from 'express';
import { getProjectIndexer, getCurrentProject } from './projectContext.js';
import { resolveProject, requireProjectIndexer, type ProjectRequest } from '../middleware/projectMiddleware.js';

const router = express.Router();

// Apply project resolution middleware
router.use(resolveProject);

// Get knowledge graph
router.get('/knowledge-graph', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    const { depth = 2, component_id } = req.query;
    
    const graph = await indexer.getKnowledgeGraph({
      depth: parseInt(depth as string),
      componentId: component_id as string
    });
    
    res.json(graph);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get component graph
router.get('/knowledge-graph/component/:id', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    const { id } = req.params;
    const { depth = 2 } = req.query;
    
    const graph = await indexer.getComponentGraph(id, parseInt(depth as string));
    
    res.json(graph);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get dependency graph
router.get('/knowledge-graph/dependencies', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    const graph = await indexer.buildDependencyGraph();
    
    res.json({ graph });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Find circular dependencies
router.get('/knowledge-graph/circular-dependencies', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    const cycles = await indexer.findCircularDependencies();
    
    res.json({ cycles });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;