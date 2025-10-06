import express from 'express';
import request from 'supertest';

describe('knowledgeGraphRoutes', () => {
  function mkApp() {
    const fake = {
      getKnowledgeGraph: async () => ({ nodes: [], edges: [] }),
      getComponentGraph: async () => ({ nodes: [], edges: [] }),
      buildDependencyGraph: async () => (new Map([['a',['b']]])),
      findCircularDependencies: async () => ([['a','b','a']])
    };
    jest.doMock('../projectContext.js', () => ({ getProjectIndexer: async () => fake }));
    const router = require('../knowledgeGraphRoutes.js').default;
    const app = express();
    app.use('/api', router);
    return app;
  }

  it('graph endpoints respond', async () => {
    const app = mkApp();
    expect((await request(app).get('/api/knowledge-graph').query({ project: '/p' })).status).toBe(200);
    expect((await request(app).get('/api/knowledge-graph/component/c1').query({ project: '/p' })).status).toBe(200);
    expect((await request(app).get('/api/knowledge-graph/dependencies').query({ project: '/p' })).status).toBe(200);
    expect((await request(app).get('/api/knowledge-graph/circular-dependencies').query({ project: '/p' })).status).toBe(200);
  });
});

