import express from 'express';
import request from 'supertest';

// Mock the project middleware to always inject a fake indexer
const fakeIndexer: any = {
  getDegradationStatus: jest.fn(async () => ({ enabled: true, lastRun: 0 })),
  runDegradationCleanup: jest.fn(async () => ({ ok: true, removed: 3 })),
  configureDegradation: jest.fn(async (_cfg: any) => ({ ok: true })),
  startDegradation: jest.fn(async () => ({ ok: true })),
  stopDegradation: jest.fn(async () => ({ ok: true })),
};

jest.mock('../../middleware/projectMiddleware.js', () => ({
  resolveProject: (req: any, _res: any, next: any) => { req.projectIndexer = fakeIndexer; next(); },
  requireProjectIndexer: (req: any) => req.projectIndexer,
}));

import router from '../degradationRoutes.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', router);
  return app;
}

describe('degradationRoutes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/degradation/status returns status', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/degradation/status');
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
  });

  it('POST cleanup/configure/start/stop succeed', async () => {
    const app = makeApp();
    const cleanup = await request(app).post('/api/degradation/cleanup');
    const configure = await request(app).post('/api/degradation/configure').send({ config: { intervalHours: 12 } });
    const start = await request(app).post('/api/degradation/start');
    const stop = await request(app).post('/api/degradation/stop');
    expect(cleanup.status).toBe(200);
    expect(configure.status).toBe(200);
    expect(start.status).toBe(200);
    expect(stop.status).toBe(200);
  });
});
