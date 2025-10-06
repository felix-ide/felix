import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('fileRoutes', () => {
  it('list and read within temp project', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proj-'));
    fs.writeFileSync(path.join(tmp, 'a.txt'), 'hello');
    jest.doMock('../projectContext.js', () => ({ getCurrentProject: () => tmp }));

    const router = (await import('../fileRoutes.js')).default;
    const app = express();
    app.use('/api/files', router);
    const list = await request(app).get('/api/files/list').query({ path: '.' });
    expect(list.status).toBe(200);
    const read = await request(app).get('/api/files/read').query({ path: 'a.txt' });
    expect(read.status).toBe(200);
    expect(read.body.content).toBe('hello');
  });
});

