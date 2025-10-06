import express from 'express';
import { getProjectIndexer, getCurrentProject } from './projectContext.js';
import { resolveProject, requireProjectIndexer, type ProjectRequest } from '../middleware/projectMiddleware.js';

const router = express.Router();

// Apply project resolution middleware
router.use(resolveProject);

// Generate embeddings for all entities
router.post('/embeddings/generate', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    const { entity_types = ['component', 'task', 'note', 'rule'] } = req.body;
    
    const result = await indexer.generateAllEmbeddings(entity_types);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Search by similarity
router.post('/embeddings/search', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    const { query, limit = 10, entity_types } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }
    
    const results = await indexer.searchBySimilarity(query, limit, entity_types);
    
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get embedding for specific entity
router.get('/embeddings/:entity_type/:entity_id', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    const { entity_type, entity_id } = req.params;
    
    const embedding = await indexer.getEmbedding(entity_type, entity_id);
    
    if (!embedding) {
      return res.status(404).json({ error: 'Embedding not found' });
    }
    
    res.json({ embedding });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get embeddings statistics
router.get('/embeddings/stats', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    const stats = await indexer.getEmbeddingStats();
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;