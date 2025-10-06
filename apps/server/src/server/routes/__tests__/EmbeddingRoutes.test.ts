import express from 'express';
import request from 'supertest';

describe('embeddingRoutes', () => {
  function appWith(fakeIndexer: any) {
    jest.doMock('../projectContext.js', () => ({ getProjectIndexer: async () => fakeIndexer }));
    const router = require('../embeddingRoutes.js').default;
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    return app;
  }

  it('generate/search/get/stats', async () => {
    const fake = {
      generateAllEmbeddings: async () => ({ ok: true }),
      searchBySimilarity: async () => ([{ id: 'e1' }]),
      getEmbedding: async (_t: string, id: string) => (id === 'missing' ? null : { id }),
      getEmbeddingStats: async () => ({ total: 1 })
    };
    const app = appWith(fake);
    expect((await request(app).post('/api/embeddings/generate?project=/tmp').send({})).status).toBe(200);
    const s = await request(app).post('/api/embeddings/search?project=/tmp').send({ query: 'x' });
    expect(s.status).toBe(200);
    expect((await request(app).get('/api/embeddings/component/missing').query({ project: '/tmp' })).status).toBe(404);
    expect((await request(app).get('/api/embeddings/component/e1').query({ project: '/tmp' })).status).toBe(200);
    expect((await request(app).get('/api/embeddings/stats').query({ project: '/tmp' })).status).toBe(200);
  });
});
