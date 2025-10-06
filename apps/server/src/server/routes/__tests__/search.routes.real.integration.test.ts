import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createTempProject, buildIndexer, mountRouterWithProject, listen, httpJson } from './testUtils';

describe('searchRoutes (real indexer + DB, regular search)', () => {
  let server: any; let base: string; let cleanupDir: string;

  beforeAll(async () => {
    cleanupDir = createTempProject({
      'src/a.ts': 'export function alpha(){ return 1 }',
      'src/b.ts': 'export class Bravo {}'
    });
    const { indexer } = await buildIndexer(cleanupDir);
    const { app, router } = await mountRouterWithProject('../searchRoutes', indexer);
    app.use('/api', router);
    const l = listen(app); server = l.server; base = l.base;
  });

  afterAll(async () => { server?.close(); });

  it('POST /search (regular) returns component items', async () => {
    const res = await httpJson('POST', `${base}/api/search`, { query: 'a', limit: 5, entity_types: ['component'] });
    expect(Array.isArray(res.items)).toBe(true);
  });
});

