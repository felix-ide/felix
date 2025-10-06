import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import { createTempProject, buildIndexer, listen, httpJson } from './testUtils';
import { createComponentRouter } from '../componentRoutes';

// Hoisted ESM mock to bind project-manager functions to our real indexer
let injectedIndexer: any;
vi.mock('../../mcp/project-manager.js', () => ({
  getProjectIndexer: vi.fn(async () => injectedIndexer),
  getCurrentProject: vi.fn(() => '/fake/project'),
}));

describe('componentsRoutes (real indexer + DB)', () => {
  let server: any; let base: string; let cleanupDir: string;

  beforeAll(async () => {
    cleanupDir = createTempProject({
      'src/a.ts': 'export function foo(){ return 1 }',
      'README.md': '# Docs\n\nSee src/a.ts'
    });
    const { indexer } = await buildIndexer(cleanupDir);
    injectedIndexer = indexer; // used by mocked project-manager (for routes that call directly)
    const app = (await import('express')).default();
    app.use((await import('body-parser')).default.json());
    const router = createComponentRouter({
      getCurrentProject: () => cleanupDir,
      getProjectIndexer: async () => indexer,
    });
    app.use('/api/components', router as any);
    const l = listen(app); server = l.server; base = l.base;
  });

  afterAll(async () => {
    server?.close();
  });

  it('GET / returns items and components', async () => {
    const res = await httpJson('GET', `${base}/api/components?limit=10`);
    expect(Array.isArray(res.items)).toBe(true);
    expect(Array.isArray(res.components)).toBe(true);
  });
});
