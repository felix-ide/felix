import express from 'express';
import request from 'supertest';

describe('helpRoutes', () => {
  it('lists sections and gets a section', async () => {
    const router = (await import('../helpRoutes.js')).default;
    const app = express();
    app.use('/api', router);
    expect((await request(app).get('/api/help')).status).toBe(200);
    expect((await request(app).get('/api/help/tasks')).status).toBe(200);
  });
});

