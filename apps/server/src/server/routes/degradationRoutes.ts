import express from 'express';
import { getProjectIndexer, getCurrentProject } from './projectContext.js';
import { resolveProject, requireProjectIndexer, type ProjectRequest } from '../middleware/projectMiddleware.js';

const router = express.Router();

// Apply project resolution middleware
router.use(resolveProject);

// Get degradation status
router.get('/degradation/status', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    const status = await indexer.getDegradationStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Run cleanup
router.post('/degradation/cleanup', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    const result = await indexer.runDegradationCleanup();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Configure degradation
router.post('/degradation/configure', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    const { config } = req.body;
    const result = await indexer.configureDegradation(config);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Start degradation scheduler
router.post('/degradation/start', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    const result = await indexer.startDegradation();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Stop degradation scheduler
router.post('/degradation/stop', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    const result = await indexer.stopDegradation();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;