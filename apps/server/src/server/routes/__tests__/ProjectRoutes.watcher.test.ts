import express from 'express';
import request from 'supertest';

let currentProject: string | null = '/tmp/project';
const pm: any = {
  getProjects: () => [],
  getProject: async (p: string) => {
    if (p !== '/tmp/project') return null;
    if ((global as any).__WATCHER_CASE__ === 'not_found') return null;
    if ((global as any).__WATCHER_CASE__ === 'stats') {
      return { watcherStats: { ready: true, add: 1, change: 2, unlink: 0, lastEvent: 'add', options: { persistent: true } } };
    }
    return { watcher: null };
  }
};

jest.mock('../projectContext.js', () => ({
  projectManager: pm,
  getCurrentProject: () => currentProject,
  setCurrentProject: (p: string | null) => { currentProject = p; },
}));

import router from '../projectRoutes.js';

function makeApp() {
  const app = express();
  app.use('/api', router);
  return app;
}

describe('projectRoutes watcher-status', () => {
  beforeEach(() => { currentProject = '/tmp/project'; (global as any).__WATCHER_CASE__ = undefined; });

  it('returns no_project when none set', async () => {
    currentProject = null;
    const app = makeApp();
    const res = await request(app).get('/api/project/watcher-status');
    expect(res.status).toBe(200);
    expect(res.body.reason).toBe('no_project');
  });

  it('returns not_found when project missing', async () => {
    (global as any).__WATCHER_CASE__ = 'not_found';
    const app = makeApp();
    const res = await request(app).get('/api/project/watcher-status');
    expect(res.status).toBe(200);
    expect(res.body.reason).toBe('not_found');
  });

  it('returns stats when available', async () => {
    (global as any).__WATCHER_CASE__ = 'stats';
    const app = makeApp();
    const res = await request(app).get('/api/project/watcher-status');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });
});

