import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';


// Mock ContextGenerationAPI from code-intelligence so /context stays light
jest.mock('@felix/code-intelligence', () => ({
  ContextGenerationAPI: class {
    async generateContext() {
      return {
        formattedOutput: 'ctx',
        components: [{ id: 'comp-1', name: 'Comp', type: 'class', filePath: '/x', location: { startLine: 1, endLine: 2 } }],
        relationships: [],
        metadata: { foo: 'bar' }
      } as any;
    }
  }
}));

// Fake indexer used by project middleware mock
const fakeIndexer: any = {
  searchBySimilarity: async (q: string, limit: number) => (
    Array.from({ length: Math.min(limit || 10, 3) }).map((_, i) => ({
      similarity: 0.9 - i * 0.1,
      component: { id: `id${i+1}`, name: `Name${i+1}`, type: 'function', filePath: `/f${i+1}` }
    }))
  ),
  searchComponents: async (opts: any) => ({
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
  getKnowledgeGraphInstance: () => ({
    getRelationshipsForComponent: async () => ([])
  })
};

// Mock project context to supply our fake indexer
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

describe('searchRoutes (project set)', () => {
  it('POST /api/search with type=semantic returns similarity results', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/search?project=/tmp/project').send({ type: 'semantic', query: 'foo', limit: 3 });
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it('POST /api/search regular across entity types returns combined items', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/search?project=/tmp/project').send({ query: 'a', entity_types: ['component','rule','task','note'], limit: 10 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('GET /api/search basic query produces items + counts', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/search').query({ project: '/tmp/project', q: 'Alpha', entity_type: 'component', limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.entity_counts).toBeDefined();
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it('GET /api/search with include_details enriches rules', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/search').query({ project: '/tmp/project', q: 'x', entity_type: 'rule', include_details: 'true', limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.results).toBeDefined();
  });

  it('GET /api/context resolves by file_path+line and returns content', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/context').query({ project: '/tmp/project', file_path: '/p/a.ts', line: 2, include_relationships: 'false' });
    expect(res.status).toBe(200);
    expect(res.body.content).toBe('ctx');
    expect(res.body.components?.length).toBeGreaterThan(0);
  });

  it('GET /api/context resolves by entity_id and honors toggles', async () => {
    const app = makeApp();
    const res = await request(app)
      .get('/api/context')
      .query({ project: '/tmp/project', entity_id: 'c1', include_relationships: 'true', include_stats: 'true', language_filter: 'ts,js' });
    expect(res.status).toBe(200);
    expect(res.body.content).toBe('ctx');
  });

  it('POST /api/search/semantic uses searchBySimilarity', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/search/semantic').send({ project: '/tmp/project', query: 'alpha', limit: 2 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  it('POST /api/search/similarity uses searchBySimilarity', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/search/similarity').send({ project: '/tmp/project', query: 'alpha', limit: 2 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });
});
