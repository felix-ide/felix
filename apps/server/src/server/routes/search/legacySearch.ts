import type { Response, RequestHandler } from 'express';
import type { ProjectRequest } from '../../middleware/projectMiddleware.js';
import { requireProjectIndexer } from '../../middleware/projectMiddleware.js';

/**
 * Legacy POST /search handler maintained for backwards compatibility.
 * Extracted wholesale from the previous monolithic router so the logic can
 * be tested independently of the GET search pipeline.
 */
export function createLegacySearchHandler(): RequestHandler {
  return async function legacySearch(req: ProjectRequest, res: Response) {
    try {
      const { query, limit = 100, entity_types, search_type, type } = req.body ?? {};
      const postIndexer = requireProjectIndexer(req, res);
      if (!postIndexer) return;

      if ((search_type === 'semantic' || type === 'semantic') && query) {
        const results = await postIndexer.searchBySimilarity(query, limit);
        const mappedResults = results.map((r: any) => ({
          ...r.component,
          entity_type: 'component',
          similarity: r.similarity
        }));
        res.json({
          results: mappedResults,
          items: mappedResults,
          total: results.length,
          hasMore: false,
          offset: 0,
          limit
        });
        return;
      }

      const regularIndexer = requireProjectIndexer(req, res);
      if (!regularIndexer) return;

      const allResults: any[] = [];
      const types = Array.isArray(entity_types) && entity_types.length
        ? entity_types
        : ['component', 'rule', 'task', 'note'];

      for (const entityType of types) {
        if (entityType === 'component') {
          const components = await regularIndexer.searchComponents({
            name: query,
            limit: Math.floor(limit / 4)
          });
          allResults.push(...components.items.map((c: any) => ({
            ...c,
            entity_type: 'component'
          })));
          continue;
        }

        if (entityType === 'rule') {
          const rules = await regularIndexer.listRules(true);
          const filtered = rules
            .filter((r: any) => !query || r.name.toLowerCase().includes(String(query).toLowerCase()))
            .slice(0, Math.floor(limit / 4));
          allResults.push(...filtered.map((r: any) => ({
            ...r,
            entity_type: 'rule'
          })));
          continue;
        }

        if (entityType === 'task') {
          const tasks = await regularIndexer.listTasks({ limit: Math.floor(limit / 4) });
          const filtered = tasks.filter((t: any) => !query || t.title.toLowerCase().includes(String(query).toLowerCase()));
          allResults.push(...filtered.map((t: any) => ({
            ...t,
            entity_type: 'task'
          })));
          continue;
        }

        if (entityType === 'note') {
          const notes = await regularIndexer.listNotes({ limit: Math.floor(limit / 4) });
          const filtered = notes.filter((n: any) => !query || (n.title || n.content || '').toLowerCase().includes(String(query).toLowerCase()));
          allResults.push(...filtered.map((n: any) => ({
            ...n,
            entity_type: 'note'
          })));
        }
      }

      res.json({
        results: allResults.slice(0, limit),
        items: allResults.slice(0, limit),
        total: allResults.length,
        hasMore: allResults.length > limit,
        offset: 0,
        limit
      });
      return;
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
      return;
    }
  };
}
