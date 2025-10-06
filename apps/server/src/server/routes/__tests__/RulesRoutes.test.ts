import express from 'express';
import request from 'supertest';

describe('rulesRoutes', () => {
  const fake = () => ({
    listRules: async () => ([{ id: 'r1', name: 'A' }]),
    addRule: async (r: any) => ({ id: 'r2', ...r }),
    getRuleTree: async () => ([{ id: 'root' }]),
    getRulesByIds: async (ids: string[]) => (ids.map(id => ({ id, name: 'N' }))),
    getRule: async (id: string) => (id === 'missing' ? null : { id, name: 'X' }),
    updateRule: async () => true,
    deleteRule: async () => true,
    exportRules: async () => ({ ok: true }),
    importRules: async () => ({ imported: 1 }),
    trackRuleApplication: async () => true,
    getRuleAnalytics: async () => ({ counts: [] }),
    getApplicableRules: async () => ([{ id: 'r1' }]),
    applyRule: async () => ({ applied: true })
  });

  function appWith(fakeIndexer: any) {
    jest.doMock('../projectContext.js', () => ({
      getProjectIndexer: async () => fakeIndexer,
      getCurrentProject: () => '/tmp/project'
    }));
    const router = require('../rulesRoutes.js').default;
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    return app;
  }

  it('CRUD + details + tree + apply + track', async () => {
    const app = appWith(fake());
    expect((await request(app).get('/api/rules').query({ project: '/tmp/project' })).status).toBe(200);
    expect((await request(app).post('/api/rules?project=/tmp/project').send({ name: 'R', rule_type: 'pattern' })).status).toBe(200);
    expect((await request(app).get('/api/rules/tree').query({ project: '/tmp/project' })).status).toBe(200);
    expect((await request(app).post('/api/rules/details?project=/tmp/project').send({ ids: ['r1'] })).status).toBe(200);
    expect((await request(app).get('/api/rules/missing').query({ project: '/tmp/project' })).status).toBe(404);
    expect((await request(app).get('/api/rules/r1').query({ project: '/tmp/project' })).status).toBe(200);
    expect((await request(app).put('/api/rules/r1?project=/tmp/project').send({ name: 'Z' })).status).toBe(200);
    expect((await request(app).delete('/api/rules/r1').query({ project: '/tmp/project' })).status).toBe(200);
    expect((await request(app).post('/api/rules/export?project=/tmp/project').send({})).status).toBe(200);
    expect((await request(app).post('/api/rules/import?project=/tmp/project').send({ data: {} })).status).toBe(200);
    expect((await request(app).post('/api/rules/r1/applications?project=/tmp/project').send({})).status).toBe(200);
    expect((await request(app).get('/api/rules/applicable').query({ project: '/tmp/project' })).status).toBe(200);
    expect((await request(app).post('/api/rules/r1/apply?project=/tmp/project').send({ entity_type: 'component', entity_id: 'x' })).status).toBe(200);
    expect((await request(app).post('/api/rules/track?project=/tmp/project').send({ rule_id: 'r1' })).status).toBe(200);
  });
});

