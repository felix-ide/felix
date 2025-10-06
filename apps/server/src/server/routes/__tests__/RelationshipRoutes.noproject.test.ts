import express from 'express';
import request from 'supertest';

jest.mock('../projectContext.js', () => ({
  getProjectIndexer: async () => ({}),
  getCurrentProject: () => null,
}));

import router from '../relationshipRoutes.js';

function makeApp() {
  const app = express();
  app.use('/api/relationships', router);
  return app;
}

describe('relationshipRoutes (no project)', () => {
  it('GET / returns 400 when no project', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/relationships');
    expect(res.status).toBe(400);
  });
});

