import express from 'express';
import { resolveProject, requireProjectIndexer, type ProjectRequest } from '../middleware/projectMiddleware.js';
import { logger } from '../../shared/logger.js';
import { createFileBrowserHandler } from './search/filesystem.js';
import { createLegacySearchHandler } from './search/legacySearch.js';
import { createGetSearchHandler } from './search/getSearchHandler.js';
import { buildContextResponse } from '../context/contextBuilder.js';

const router = express.Router();

router.use(resolveProject);

router.get('/files/browse', createFileBrowserHandler());

router.post('/search', createLegacySearchHandler());

router.get('/search', createGetSearchHandler());

// Semantic similarity search endpoint
router.post('/search/similarity', async (req: ProjectRequest, res: any) => {
  try {
    const { query, limit = 10 } = req.body;
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    const results = await indexer.searchBySimilarity(query, limit);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Semantic search endpoint (alias for similarity)
router.post('/search/semantic', async (req: ProjectRequest, res: any) => {
  try {
    const { query, limit = 10 } = req.body;
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    const results = await indexer.searchBySimilarity(query, limit);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/context', async (req: ProjectRequest, res: any) => {
  try {
    const {
      entity_id,
      file_path,
      line,
      depth = 2,
      include_source = true,
      include_relationships = true,
      include_documentation = true,
      include_metadata = true,
      include_notes = true,
      include_rules = true,
      include_tasks = false,
      target_tokens = 1000000,
      output_format = 'json',
      priority_components = [],
      language_filter = [],
      query = ''
    } = req.query;

    let resolvedEntityId = entity_id;

    if (!resolvedEntityId && file_path) {
      const projectInfo = requireProjectIndexer(req, res);
      if (!projectInfo) return;

      const components = await projectInfo.searchComponents({ filePath: file_path as string, limit: 100 });
      if (components.items.length > 0) {
        const targetLine = parseInt(line as string, 10) || 1;
        const matchingComponent = components.items.find((c: any) =>
          c.location && c.location.startLine <= targetLine && c.location.endLine >= targetLine
        );
        resolvedEntityId = matchingComponent ? matchingComponent.id : components.items[0].id;
      }
    }

    if (!resolvedEntityId) {
      return res.status(400).json({ error: 'entity_id or file_path is required' });
    }

    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;

    const depthValue = parseInt(depth as string, 10);
    const targetTokenValue = parseInt(target_tokens as string, 10);

    const normalizedPriorityComponents = Array.isArray(priority_components)
      ? priority_components.map((value) => String(value))
      : undefined;
    const normalizedLanguageFilter = Array.isArray(language_filter)
      ? language_filter.map((value) => String(value))
      : undefined;

    const contextResult = await buildContextResponse(indexer, resolvedEntityId as string, {
      depth: Number.isFinite(depthValue) ? depthValue : undefined,
      includeSource: include_source !== 'false',
      includeRelationships: include_relationships !== 'false',
      includeDocumentation: include_documentation !== 'false',
      includeMetadata: include_metadata !== 'false',
      includeNotes: include_notes !== 'false',
      includeRules: include_rules !== 'false',
      includeTasks: include_tasks !== 'false',
      targetTokens: Number.isFinite(targetTokenValue) ? targetTokenValue : undefined,
      outputFormat: typeof output_format === 'string' ? output_format : undefined,
      priorityComponents: normalizedPriorityComponents,
      languageFilter: normalizedLanguageFilter,
      query: typeof query === 'string' && query.length > 0 ? query : undefined
    });

    if (!contextResult) {
      return res.status(404).json({ error: `Entity not found: ${resolvedEntityId}` });
    }

    res.json(contextResult);
  } catch (error) {
    logger.error('Context generation error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
