import express from 'express';
import request from 'supertest';

describe('componentRoutes basic', () => {
  it('covers list/search/by-file/files/:id paths', async () => {
    jest.doMock('../projectContext.js', () => ({
      getCurrentProject: () => '/tmp/project',
      getProjectIndexer: async () => ({
        searchComponents: async (_q: any) => ({ items: [{ id: 'f1', name: 'FileA', type: 'file', filePath: '/p/a.ts' }] }),
        getComponentsInFile: async (_: string) => ([{ id: 'c1', name: 'N', type: 'function' }]),
        getAllComponents: async () => ({ items: [{ id: 'c2', name: 'Z', type: 'class' }] }),
        getComponent: async (id: string) => id === 'missing' ? null : ({ id, filePath: '/p/a.ts', name: 'FileA', type: id==='f1'?'file':'class' }),
        findSimilarComponents: async () => ([{ id: 'c3', score: 0.8 }]),
      }),
    }));
    const router = (await import('../componentRoutes.js')).default;
    const app = express();
    app.use('/api/components', router);

    expect((await request(app).get('/api/components')).status).toBe(200);
    expect((await request(app).get('/api/components/search')).status).toBe(200);
    expect((await request(app).get('/api/components/by-file')).status).toBe(400);
    expect((await request(app).get('/api/components/by-file').query({ file_path: '/p/a.ts' })).status).toBe(200);
    expect((await request(app).get('/api/components/files')).status).toBe(200);
    expect((await request(app).get('/api/components/files/f1/components')).status).toBe(200);
    expect((await request(app).get('/api/components/missing')).status).toBe(404);
    expect((await request(app).get('/api/components/f1')).status).toBe(200);
    expect((await request(app).get('/api/components/f1/similar')).status).toBe(200);
  });
});

