import express from 'express';
import { getProjectIndexer, getCurrentProject } from './projectContext.js';
import { logger } from '../../shared/logger.js';

const router = express.Router();

// Get relationships with pagination
router.get('/', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project selected' });
    }

    const indexer = await getProjectIndexer(currentProject);
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const { type, sourceId, targetId } = req.query;
    
    // Search for relationships
    const result = await indexer.searchRelationships({
      type,
      sourceId,
      targetId,
      limit,
      offset
    });
    
    // Return with relationships field for compatibility
    res.json({
      ...result,
      relationships: result.items // Add relationships field for backward compatibility
    });
  } catch (error) {
    logger.error('Failed to get relationships:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get all relationships
router.get('/all', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project selected' });
    }

    const indexer = await getProjectIndexer(currentProject);

    // Use the proper storage adapter method to get all relationships
    const rawRelationships = await indexer.getAllRelationships();

    // Transform the relationships to match UI expectations (camelCase)
    const relationships = rawRelationships.map((rel: any) => ({
      id: rel.id,
      type: rel.type,
      sourceId: rel.source_id || rel.sourceId,
      targetId: rel.target_id || rel.targetId,
      location: rel.start_line ? {
        startLine: rel.start_line,
        endLine: rel.end_line,
        startColumn: rel.start_column,
        endColumn: rel.end_column
      } : undefined,
      metadata: rel.metadata || {}
    }));

    res.json({ relationships });
  } catch (error) {
    logger.error('Failed to get all relationships:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get relationships by component with advanced filtering
router.get('/by-component/:componentId', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project selected' });
    }

    const indexer = await getProjectIndexer(currentProject);
    const { componentId } = req.params;
    const {
      depth,
      direction,
      relationshipTypes,
      limit
    } = req.query;

    const relationshipRepo = indexer.getDatabaseManager()?.getRelationshipRepository();
    if (!relationshipRepo) {
      return res.status(500).json({ error: 'Relationship repository not available' });
    }

    // Parse relationship types
    const types = relationshipTypes
      ? (Array.isArray(relationshipTypes) ? relationshipTypes : relationshipTypes.split(','))
      : undefined;

    const relationships = await relationshipRepo.getRelationshipsByComponent(componentId, {
      depth: depth ? parseInt(depth) : undefined,
      direction: direction || 'both',
      relationshipTypes: types,
      limit: limit ? parseInt(limit) : undefined
    });

    res.json({ relationships });
  } catch (error) {
    logger.error('Failed to get relationships by component:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get relationship graph for visualization
router.get('/graph/:componentId', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project selected' });
    }

    const indexer = await getProjectIndexer(currentProject);
    const { componentId } = req.params;
    const {
      depth,
      direction,
      relationshipTypes
    } = req.query;

    const relationshipRepo = indexer.getDatabaseManager()?.getRelationshipRepository();
    if (!relationshipRepo) {
      return res.status(500).json({ error: 'Relationship repository not available' });
    }

    // Parse relationship types
    const types = relationshipTypes
      ? (Array.isArray(relationshipTypes) ? relationshipTypes : relationshipTypes.split(','))
      : undefined;

    const graph = await relationshipRepo.getRelationshipGraph(componentId, {
      depth: depth ? parseInt(depth) : 3,
      direction: direction || 'both',
      relationshipTypes: types
    });

    res.json({
      nodes: Array.from(graph.nodes.values()),
      edges: graph.edges,
      depth: graph.depth,
      cyclesDetected: graph.cyclesDetected
    });
  } catch (error) {
    logger.error('Failed to get relationship graph:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get callers (incoming calls)
router.get('/callers/:componentId', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project selected' });
    }

    const indexer = await getProjectIndexer(currentProject);
    const { componentId } = req.params;
    const depth = req.query.depth ? parseInt(req.query.depth) : 1;

    const relationshipRepo = indexer.getDatabaseManager()?.getRelationshipRepository();
    if (!relationshipRepo) {
      return res.status(500).json({ error: 'Relationship repository not available' });
    }

    const relationships = await relationshipRepo.getRelationshipsByComponent(componentId, {
      depth,
      direction: 'in',
      relationshipTypes: ['calls', 'called_by']
    });

    res.json({ relationships });
  } catch (error) {
    logger.error('Failed to get callers:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get callees (outgoing calls)
router.get('/callees/:componentId', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project selected' });
    }

    const indexer = await getProjectIndexer(currentProject);
    const { componentId } = req.params;
    const depth = req.query.depth ? parseInt(req.query.depth) : 1;

    const relationshipRepo = indexer.getDatabaseManager()?.getRelationshipRepository();
    if (!relationshipRepo) {
      return res.status(500).json({ error: 'Relationship repository not available' });
    }

    const relationships = await relationshipRepo.getRelationshipsByComponent(componentId, {
      depth,
      direction: 'out',
      relationshipTypes: ['calls']
    });

    res.json({ relationships });
  } catch (error) {
    logger.error('Failed to get callees:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get data flow relationships
router.get('/dataflow/:componentId', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project selected' });
    }

    const indexer = await getProjectIndexer(currentProject);
    const { componentId } = req.params;
    const depth = req.query.depth ? parseInt(req.query.depth) : 2;

    const relationshipRepo = indexer.getDatabaseManager()?.getRelationshipRepository();
    if (!relationshipRepo) {
      return res.status(500).json({ error: 'Relationship repository not available' });
    }

    const relationships = await relationshipRepo.getRelationshipsByComponent(componentId, {
      depth,
      direction: 'both',
      relationshipTypes: [
        'uses_field',
        'transforms_data',
        'passes_to',
        'returns_from',
        'reads_from',
        'writes_to',
        'derives_from',
        'modifies'
      ]
    });

    res.json({ relationships });
  } catch (error) {
    logger.error('Failed to get data flow:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
