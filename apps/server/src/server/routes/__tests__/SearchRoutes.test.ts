import express from 'express';
import request from 'supertest';
import os from 'os';
import fs from 'fs';
import path from 'path';

import router from '../searchRoutes.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', router);
  return app;
}

describe('searchRoutes basic behaviors', () => {
  it('GET /api/search responds 400 when no project set', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/search');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('GET /api/files/browse lists directory entries', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'browse-'));
    const sub = path.join(tmp, 'dirA');
    fs.mkdirSync(sub);
    const f1 = path.join(tmp, 'a.txt');
    fs.writeFileSync(f1, 'hello');

    const app = makeApp();
    const res = await request(app).get('/api/files/browse').query({ path: tmp });
    expect(res.status).toBe(200);
    expect(res.body.path).toBe(tmp);
    // Should include both the file and the directory
    const names = (res.body.entries || []).map((e: any) => e.name).sort();
    expect(names).toEqual(['a.txt', 'dirA']);
  });
});
