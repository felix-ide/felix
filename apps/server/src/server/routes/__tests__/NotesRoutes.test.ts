import express from 'express';
import request from 'supertest';

describe('notesRoutes', () => {
  it('lists, CRUD, tree, export/import', async () => {
    jest.doMock('../projectContext.js', () => ({
      getCurrentProject: () => '/tmp/project',
      getProjectIndexer: async () => ({
        listNotes: async () => ([{ id: 'n1', title: 'A', entity_links: [] }]),
        getNote: async (id: string) => (id === 'missing' ? null : { id, title: 'A' }),
        addNote: async (n: any) => ({ id: 'n2', ...n }),
        updateNote: async () => true,
        deleteNote: async () => true,
        getNoteTree: async () => ([{ id: 'n1' }]),
        exportNotes: async () => ({ ok: true }),
        importNotes: async () => ({ imported: 1 })
      })
    }));

    const router = (await import('../notesRoutes.js')).default;
    const app = express();
    app.use(express.json());
    app.use('/api', router);

    expect((await request(app).get('/api/notes')).status).toBe(200);
    expect((await request(app).get('/api/notes/missing')).status).toBe(404);
    expect((await request(app).post('/api/notes').send({ content: 'c' })).status).toBe(200);
    expect((await request(app).put('/api/notes/n1').send({ title: 'Z' })).status).toBe(200);
    expect((await request(app).delete('/api/notes/n1')).status).toBe(200);
    expect((await request(app).get('/api/notes/tree')).status).toBe(200);
    expect((await request(app).post('/api/notes/export').send({})).status).toBe(200);
    expect((await request(app).post('/api/notes/import').send({ data: {} })).status).toBe(200);
  });
});

