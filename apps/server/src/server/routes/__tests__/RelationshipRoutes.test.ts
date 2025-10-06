import express from 'express';
import request from 'supertest';

const fakeIndexer: any = {
  searchRelationships: jest.fn(async (_opts: any) => ({
    items: [
      { id: 'r1', type: 'imports', sourceId: 'a', targetId: 'b', metadata: {} },
    ],
    total: 1,
    hasMore: false,
    offset: 0,
    limit: 100,
  })),
  getAllRelationships: jest.fn(async () => ([
    { id: 'r2', type: 'uses', source_id: 'x', target_id: 'y', start_line: 1, end_line: 1, start_column: 0, end_column: 0, metadata: {} },
  ])),
};

jest.mock('../projectContext.js', () => ({
  getProjectIndexer: async () => fakeIndexer,
  getCurrentProject: () => '/tmp/project',
}));

import router from '../relationshipRoutes.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/relationships', router);
  return app;
}

describe('relationshipRoutes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/relationships returns paged items with compat field', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/relationships');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(Array.isArray(res.body.relationships)).toBe(true);
  });

  it('GET /api/relationships/all returns transformed relationships', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/relationships/all');
    expect(res.status).toBe(200);
    expect(res.body.relationships[0].sourceId).toBe('x');
  });
});

