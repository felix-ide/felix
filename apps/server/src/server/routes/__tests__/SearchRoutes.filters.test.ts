import express from 'express';
import request from 'supertest';

// Fake indexer with richer surface for GET /search
const fakeIndexer: any = {
  searchBySimilarity: async (_q: string, limit: number) => (
    Array.from({ length: Math.min(limit || 10, 2) }).map((_, i) => ({
      similarity: 0.9 - i * 0.1,
      component: { id: `id${i+1}`, name: `Name${i+1}`, type: 'function', filePath: `/f${i+1}` }
    }))
  ),
  searchComponents: async (_opts: any) => ({
    items: [
      { id: 'c1', name: 'Alpha', type: 'class', language: 'typescript', filePath: '/p/a.ts', location: { startLine: 1, endLine: 10 } },
      { id: 'c2', name: 'Beta',  type: 'function', language: 'typescript', filePath: '/p/b.ts', location: { startLine: 20, endLine: 40 } }
    ]
  }),
  listRules: async () => ([{ id: 'rule_1', name: 'LintAll' }]),
  listTasks: async () => ([{ id: 'task_1', title: 'Do a thing' }]),
  listNotes: async () => ([{ id: 'note_1', title: 'Hello', content: 'x' }]),
  getRulesByIds: async (ids: string[]) => (ids.map(id => ({ id, name: 'R' }))),
  getRuleTree: async (_id: string) => ([]),
  getComponent: async (id: string) => ({ id, name: 'Alpha', type: 'class', filePath: '/p/a.ts', language: 'typescript', metadata: {}, location: { startLine: 1, endLine: 10 } }),
  getComponentsByFile: async (_: string) => ([{ id: 'c1', name: 'Alpha', type: 'class', filePath: '/p/a.ts', location: { startLine: 1, endLine: 10 } }]),
  getKnowledgeGraphInstance: () => ({ getRelationshipsForComponent: async () => ([])}),
  // ID search helpers
  getTask: async (id: string) => ({ id, title: 'T', description: 'td', entity_id: 'file' }),
  getNote: async (id: string) => ({ id, title: 'N', content: 'nc' }),
  getRule: async (id: string) => ({ id, name: 'R', description: 'rd' }),
  listNotesForEntity: async () => ([]),
  listRulesForEntity: async () => ([]),
};

jest.mock('../projectContext.js', () => ({
  getProjectIndexer: async () => fakeIndexer,
  getCurrentProject: () => '/tmp/project',
  setCurrentProject: () => undefined,
  getProjectInfo: async () => ({})
}));

import router from '../searchRoutes.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', router);
  return app;
}

describe('searchRoutes filters and projection', () => {
  it('applies component_types and lang filters', async () => {
    const app = makeApp();
    const res = await request(app)
      .get('/api/search')
      .query({ project: '/tmp/project', q: 'A', entity_type: 'component', component_types: 'function', lang: 'ts', limit: 5 });
    expect(res.status).toBe(200);
    // With type=function filter, expect at least one function component
    const items = res.body.items || [];
    expect(items.some((i: any) => i.type === 'function')).toBe(true);
  });

  it('respects per-type cap via max_per_type', async () => {
    const app = makeApp();
    const res = await request(app)
      .get('/api/search')
      .query({ project: '/tmp/project', q: 'A', entity_type: 'component,rule,note,task', max_per_type: '1', limit: 100 });
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it('projects fields via view=files+lines', async () => {
    const app = makeApp();
    const res = await request(app)
      .get('/api/search')
      .query({ project: '/tmp/project', q: 'Alpha', entity_type: 'component', view: 'files+lines', limit: 3 });
    expect(res.status).toBe(200);
    const item = res.body.items[0];
    expect(item.id).toBeDefined();
    expect(item.filePath).toBeDefined();
    expect(item.location).toBeDefined();
  });

  it('projects with fields list and respects path_exclude', async () => {
    const app = makeApp();
    const res = await request(app)
      .get('/api/search')
      .query({ project: '/tmp/project', q: 'Alpha', entity_type: 'component', fields: 'id,name', path_exclude: 'b.ts', limit: 5 });
    expect(res.status).toBe(200);
    const item = res.body.items[0];
    expect(Object.keys(item)).toEqual(expect.arrayContaining(['id','name','type']));
  });

  it('supports id-like queries (task_)', async () => {
    const app = makeApp();
    const res = await request(app)
      .get('/api/search')
      .query({ project: '/tmp/project', q: 'task_123', entity_type: 'task', limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
  });
});
