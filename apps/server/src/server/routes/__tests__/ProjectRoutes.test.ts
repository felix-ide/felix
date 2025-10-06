import express from 'express';
import request from 'supertest';

// Mutable mocks to vary per test
let currentProject: string | null = '/tmp/project';
const fakeIndexer: any = {
  clearIndex: jest.fn(async () => undefined),
  indexDirectory: jest.fn(async () => ({ success: true })),
  getStats: jest.fn(async () => ({
    componentCount: 2,
    componentEmbeddingCount: 1,
    relationshipCount: 0,
    fileCount: 3,
    languageBreakdown: { ts: 2 },
    ruleCount: 0,
    ruleEmbeddingCount: 0,
    taskCount: 0,
    taskEmbeddingCount: 0,
    noteCount: 0,
    noteEmbeddingCount: 0,
    lastUpdated: Date.now(),
  })),
  indexAllMetadataEntities: jest.fn(async () => ({ tasksIndexed: 1, notesIndexed: 1, rulesIndexed: 1, errors: [] })),
};

const projectInfo = {
  fullPath: '/tmp/project',
  name: 'project',
  codeIndexer: fakeIndexer,
};

const pm = {
  getProjects: () => [projectInfo],
  getProject: async (p: string) => (p === projectInfo.fullPath ? projectInfo : null),
  setProject: async (p: string) => ({ ...projectInfo, fullPath: p }),
};

jest.mock('../projectContext.js', () => ({
  projectManager: pm,
  getCurrentProject: () => currentProject,
  setCurrentProject: (p: string | null) => { currentProject = p; },
  getProjectIndexer: async (_p: string) => fakeIndexer,
}));

import router from '../projectRoutes.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', router);
  return app;
}

describe('projectRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentProject = '/tmp/project';
  });

  it('GET /api/projects lists projects', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.projects)).toBe(true);
  });

  it('POST /api/project/set 400 when missing path', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/project/set').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/project/set sets project and returns info', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/project/set').send({ path: '/tmp/project' });
    expect(res.status).toBe(200);
    expect(res.body.project_path).toBe('/tmp/project');
    expect(res.body.name).toBe('project');
  });

  it('GET /api/project/current returns nulls when none', async () => {
    currentProject = null;
    const app = makeApp();
    const res = await request(app).get('/api/project/current');
    expect(res.status).toBe(200);
    expect(res.body.current_project).toBeNull();
  });

  it('GET /api/project/stats formats stats when set', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/project/stats');
    expect(res.status).toBe(200);
    expect(res.body.components.total).toBe(2);
    expect(res.body.languages.ts).toBe(2);
  });

  it('POST /api/project/index triggers clear + index', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/project/index').send({ path: '/tmp/project' });
    expect(res.status).toBe(200);
    expect(fakeIndexer.clearIndex).toHaveBeenCalled();
    expect(fakeIndexer.indexDirectory).toHaveBeenCalled();
  });

  it('POST /api/project/index-metadata uses current project and returns counts', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/project/index-metadata');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.rulesIndexed).toBe(1);
  });
});

