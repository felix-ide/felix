import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import router from '../searchRoutes.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', router);
  return app;
}

describe('searchRoutes files/browse edge cases', () => {
  it('returns 404 for non-existent path', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/files/browse').query({ path: '/definitely/does/not/exist' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when path is a file', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'browse-file-'));
    const f1 = path.join(tmp, 'a.txt');
    fs.writeFileSync(f1, 'hello');
    const app = makeApp();
    const res = await request(app).get('/api/files/browse').query({ path: f1 });
    expect(res.status).toBe(400);
  });
});

