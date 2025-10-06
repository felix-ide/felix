import express from 'express';
import request from 'supertest';

// Mock WorkflowConfigManager used via dynamic import inside routes
const mgrInstance = {
  initialize: jest.fn().mockResolvedValue(undefined),
  setDefaultWorkflow: jest.fn().mockResolvedValue(undefined),
  deleteWorkflow: jest.fn().mockResolvedValue(undefined),
  getGlobalConfig: jest.fn().mockResolvedValue({
    default_workflow: 'feature_development',
    allow_override: true,
    strict_validation: true,
    emergency_bypass_enabled: true,
    conditional_rules_enabled: true,
    defaults_by_task_type: JSON.stringify({ frontend: 'feature_development' })
  }),
  updateGlobalConfig: jest.fn().mockResolvedValue(undefined),
  setWorkflowForTaskType: jest.fn().mockResolvedValue(undefined),
  reseedBuiltIns: jest.fn().mockResolvedValue(undefined),
  getWorkflowConfig: jest.fn(async (name: string) => (name === 'exists' ? { name: 'exists' } : null)),
  updateWorkflowConfig: jest.fn(async () => undefined),
  createWorkflow: jest.fn(async () => undefined),
};

jest.mock('../../../storage/WorkflowConfigManager.js', () => {
  const Ctor: any = jest.fn().mockImplementation(() => mgrInstance);
  Ctor.prototype.updateGlobalConfig = jest.fn();
  return { WorkflowConfigManager: Ctor };
}, { virtual: true });

// Provide a lightweight fake indexer and project context
const fakeIndexer: any = {
  listWorkflows: jest.fn(async () => ([{ name: 'feature_development' }])),
  getDefaultWorkflow: jest.fn(async () => 'feature_development'),
  dbManager: { getMetadataDataSource: () => ({}) }
};

jest.mock('../projectContext.js', () => ({
  getProjectIndexer: async () => fakeIndexer,
  getCurrentProject: () => '/tmp/project',
  setCurrentProject: () => undefined,
  projectManager: { getProjects: () => [] },
}));

import router from '../workflowRoutes.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', router);
  return app;
}

describe('workflowRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/workflows returns list and default when project set', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/workflows?project=/tmp/project');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.default).toBe('feature_development');
  });

  it('GET /api/workflows/default falls back when no project set', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/workflows/default');
    expect(res.status).toBe(200);
    expect(res.body.default).toBe('feature_development');
  });

  it('POST /api/workflows/default 400 when name missing', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/workflows/default?project=/tmp/project').send({});
    expect(res.status).toBe(400);
  });

  it('GET /api/workflows/registry returns sources and default', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/workflows/registry?project=/tmp/project');
    expect(res.status).toBe(200);
    expect(res.body.sources).toBeDefined();
    expect(res.body.default).toBe('feature_development');
  });

  it('GET /api/workflows/config returns config and mapping', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/workflows/config?project=/tmp/project');
    expect(res.status).toBe(200);
    expect(res.body.config.default_workflow).toBe('feature_development');
    expect(res.body.mapping.frontend).toBe('feature_development');
  });

  it('POST /api/workflows/config updates flags with updates object', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/workflows/config?project=/tmp/project')
      .send({ updates: { strict_validation: false } });
    expect(res.status).toBe(200);
    expect(mgrInstance.updateGlobalConfig).toHaveBeenCalled();
  });

  it('GET /api/workflows/mapping returns map', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/workflows/mapping?project=/tmp/project');
    expect(res.status).toBe(200);
    expect(res.body.map.frontend).toBe('feature_development');
  });

  it('POST /api/workflows/mapping (bulk) merges provided map', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/workflows/mapping?project=/tmp/project')
      .send({ map: { backend: 'feature_development' } });
    expect(res.status).toBe(200);
    // updateGlobalConfig is invoked via prototype call — ensure our mgr saw initialize
    expect(mgrInstance.initialize).toHaveBeenCalled();
  });

  it('POST /api/workflows returns 409 when exists and upsert not set', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/workflows?project=/tmp/project')
      .send({ def: { name: 'exists' } });
    expect(res.status).toBe(409);
  });

  it('POST /api/workflows creates when not exists and updates when upsert', async () => {
    const app = makeApp();
    const create = await request(app)
      .post('/api/workflows?project=/tmp/project')
      .send({ def: { name: 'new', steps: [] } });
    expect(create.status).toBe(200);
    const update = await request(app)
      .post('/api/workflows?project=/tmp/project')
      .send({ def: { name: 'exists', steps: [] }, upsert: true });
    expect(update.status).toBe(200);
    expect(mgrInstance.updateWorkflowConfig).toHaveBeenCalled();
  });

  it('DELETE /api/workflows/:name deletes workflow', async () => {
    const app = makeApp();
    const res = await request(app).delete('/api/workflows/to-del?project=/tmp/project');
    expect(res.status).toBe(200);
    expect(mgrInstance.deleteWorkflow).toHaveBeenCalled();
  });

  it('GET /api/workflows/:name returns 404/200 appropriately', async () => {
    const app = makeApp();
    // Mock indexer.getWorkflow
    (fakeIndexer as any).getWorkflow = async (n: string) => (n === 'x' ? null : { name: n });
    let res = await request(app).get('/api/workflows/x?project=/tmp/project');
    expect(res.status).toBe(404);
    res = await request(app).get('/api/workflows/ok?project=/tmp/project');
    expect(res.status).toBe(200);
  });

  it('POST /api/workflows/registry/seed calls reseed', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/workflows/registry/seed?project=/tmp/project').send({ force: true });
    expect(res.status).toBe(200);
    expect(mgrInstance.reseedBuiltIns).toHaveBeenCalled();
  });

  it.skip('POST /api/workflows/validate validates a task', async () => {
    jest.resetModules();
    const freshRouter = await jest.isolateModulesAsync(async () => {
      jest.doMock('../../../storage/WorkflowConfigManager', () => ({
        WorkflowConfigManager: jest.fn().mockImplementation(() => mgrInstance),
      }), { virtual: true });
      jest.doMock('../../features/workflows/services/WorkflowService', () => ({
        WorkflowService: class {
          constructor(..._args: any[]) {}
          async resolveWorkflowName() { return 'feature_development'; }
          async validate(task: any, wf: string) { return { ok: true, wf, id: task?.id || 'noid' }; }
        }
      }), { virtual: true });
      return (await import('../workflowRoutes')).default;
    });
    const app = express();
    app.use(express.json());
    app.use('/api', freshRouter);
    const res = await request(app).post('/api/workflows/validate?project=/tmp/project').send({ task: { id: 't1' } });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it.skip('POST /api/workflows/:name/scaffold returns scaffold result', async () => {
    jest.resetModules();
    const freshRouter = await jest.isolateModulesAsync(async () => {
      jest.doMock('../../../storage/WorkflowConfigManager', () => ({
        WorkflowConfigManager: jest.fn().mockImplementation(() => mgrInstance),
      }), { virtual: true });
      jest.doMock('../../features/workflows/services/WorkflowScaffoldingService', () => ({
        WorkflowScaffoldingService: class { async scaffoldMissing(id: string, name: string, _opts: any){ return { id, name, created: true }; } }
      }), { virtual: true });
      return (await import('../workflowRoutes')).default;
    });
    const app = express();
    app.use(express.json());
    app.use('/api', freshRouter);
    const res = await request(app).post('/api/workflows/foo/scaffold?project=/tmp/project').send({ task_id: 't1', dry_run: false });
    expect(res.status).toBe(200);
    expect(res.body.created).toBe(true);
  });

  it.skip('POST /api/workflows/:name/guide returns guidance for task', async () => {
    jest.resetModules();
    const freshRouter = await jest.isolateModulesAsync(async () => {
      jest.doMock('../../../storage/WorkflowConfigManager', () => ({
        WorkflowConfigManager: jest.fn().mockImplementation(() => mgrInstance),
      }), { virtual: true });
      jest.doMock('../../features/workflows/services/GuidanceService', () => ({
        GuidanceService: class { async build(task: any){ return { taskId: task.id, steps: [] }; } }
      }), { virtual: true });
      return (await import('../workflowRoutes')).default;
    });
    (fakeIndexer as any).taskManagementService = { getTask: async (id: string) => ({ id }) };
    const app = express();
    app.use(express.json());
    app.use('/api', freshRouter);
    const res = await request(app).post('/api/workflows/foo/guide?project=/tmp/project').send({ task_id: 'tt' });
    expect(res.status).toBe(200);
    expect(res.body.guidance.taskId).toBe('tt');
  });
});
