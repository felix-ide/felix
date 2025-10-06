import express from 'express';
import request from 'supertest';
const fakeIndexer = {
  listTasks: async ({ limit }: any) => Array.from({ length: Number(limit) || 2 }).map((_, i) => ({ id: `t${i+1}`, title: `Task ${i+1}`, entity_links: [] })),
} as any;

describe('tasksRoutes minimal coverage', () => {
  it('GET /api/tasks responds 400 when no project set', async () => {
    const router = (await import('../tasksRoutes.js')).default;
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  }, 15000);
});

describe('tasksRoutes with project set', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('POST /api/tasks creates a task and returns guidance by default', async () => {
    jest.doMock('../projectContext.js', () => ({
      getCurrentProject: () => '/tmp/project',
      getProjectIndexer: async () => ({
        addTask: async (t: any) => ({ id: 't1', ...t }),
        dbManager: {}
      }),
    }));

    const router = (await import('../tasksRoutes.js')).default;
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    const res = await request(app).post('/api/tasks?include_guidance=false').send({ title: 'X' });
    expect(res.status).toBe(200);
    expect(res.body.task.id).toBe('t1');
    expect(res.body.task).toBeDefined();
  });

  it('PUT /api/tasks/:id updates a task and returns guidance', async () => {
    jest.doMock('../projectContext.js', () => ({
      getCurrentProject: () => '/tmp/project',
      getProjectIndexer: async () => ({ updateTask: async (_id: string, patch: any) => ({ id: 't1', ...patch }), dbManager: {} }),
    }));

    const router = (await import('../tasksRoutes.js')).default;
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    const res = await request(app).put('/api/tasks/t1?include_guidance=false').send({ title: 'Y' });
    expect(res.status).toBe(200);
    expect(res.body.task.title).toBe('Y');
    expect(res.body.task).toBeDefined();
  });

  it('GET /api/tasks/dependencies lists incoming/outgoing', async () => {
    jest.doMock('../projectContext.js', () => ({
      getCurrentProject: () => '/tmp/project',
      getProjectIndexer: async () => ({
        listTaskDependencies: async () => ([{ id: 'd1', dependent_task_id: 'a', dependency_task_id: 'b' }])
      }),
    }));
    const router = (await import('../tasksRoutes.js')).default;
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    const res = await request(app).get('/api/tasks/dependencies');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.dependencies)).toBe(true);
  });

  it('POST/DELETE /api/tasks/:id/dependencies creates and deletes a dependency', async () => {
    const store: any[] = [];
    jest.doMock('../projectContext.js', () => ({
      getCurrentProject: () => '/tmp/project',
      getProjectIndexer: async () => ({
        addTaskDependency: async (d: any) => (store.push(d), { id: 'dep1', ...d }),
        removeTaskDependency: async (_: string) => (store.pop(), true)
      }),
    }));
    const router = (await import('../tasksRoutes.js')).default;
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    const addRes = await request(app).post('/api/tasks/tA/dependencies').send({ dependency_task_id: 'tB' });
    expect(addRes.status).toBe(200);
    expect(addRes.body.dependency.id).toBe('dep1');
    const delRes = await request(app).delete('/api/tasks/tA/dependencies/dep1');
    expect(delRes.status).toBe(200);
  });

  it('GET/POST checklist endpoints work', async () => {
    let toggled = false;
    jest.doMock('../projectContext.js', () => ({
      getCurrentProject: () => '/tmp/project',
      getProjectIndexer: async () => ({
        getTask: async (_: string) => ({ id: 't1', checklists: [{ name: 'Checklist', items: ['a'] }] }),
        addChecklist: async () => true,
        toggleChecklistItem: async () => { toggled = true; }
      }),
    }));
    const router = (await import('../tasksRoutes.js')).default;
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    const list = await request(app).get('/api/tasks/t1/checklists');
    expect(list.status).toBe(200);
    const add = await request(app).post('/api/tasks/t1/checklists').send({ name: 'X', items: ['1'] });
    expect(add.status).toBe(200);
    const toggle = await request(app).put('/api/tasks/t1/checklists/Checklist/toggle').send({ item_index: 0 });
    expect(toggle.status).toBe(200);
    expect(toggled).toBe(true);
  });

  it('POST export/import works', async () => {
    jest.doMock('../projectContext.js', () => ({
      getCurrentProject: () => '/tmp/project',
      getProjectIndexer: async () => ({
        exportTasks: async () => ({ ok: true }),
        importTasks: async () => ({ imported: 1 })
      }),
    }));
    const router = (await import('../tasksRoutes.js')).default;
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    const exp = await request(app).post('/api/tasks/export').send({});
    expect(exp.status).toBe(200);
    const imp = await request(app).post('/api/tasks/import').send({ data: {} });
    expect(imp.status).toBe(200);
  });
});
