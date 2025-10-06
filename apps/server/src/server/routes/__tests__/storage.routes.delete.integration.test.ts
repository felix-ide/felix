import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'node:http';
import { AddressInfo } from 'node:net';
import express from 'express';
import bodyParser from 'body-parser';
import { DatabaseManager } from '../../../features/storage/DatabaseManager';

function createApp(db: DatabaseManager) {
  const app = express();
  app.use(bodyParser.json());
  const compRepo = db.getComponentRepository();
  const relRepo = db.getRelationshipRepository();

  app.post('/api/components', async (req, res) => {
    res.json(await compRepo.storeComponent(req.body));
  });
  app.delete('/api/components/:id', async (req, res) => {
    res.json(await compRepo.deleteComponent(req.params.id));
  });
  app.get('/api/components', async (_req, res) => {
    res.json(await compRepo.searchComponents({ limit: 100 }));
  });

  app.post('/api/relationships', async (req, res) => {
    res.json(await relRepo.storeRelationship(req.body));
  });
  app.get('/api/relationships', async (_req, res) => {
    res.json(await relRepo.searchRelationships({ limit: 100 }));
  });
  app.get('/api/relationships/by-source/:id', async (req, res) => {
    res.json(await relRepo.searchRelationships({ sourceId: req.params.id, limit: 100 }));
  });

  return app;
}

function listen(app: express.Express) {
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  return { server, url: `http://127.0.0.1:${port}` };
}

async function httpJson(method: string, url: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? Buffer.from(JSON.stringify(body)) : undefined;
    const req = request.request({
      method,
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': String(data.length) } : {}
    }, res => {
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
        catch { resolve({}); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

describe('Storage routes DELETE integration', () => {
  let db: DatabaseManager;
  let server: any; let base: string;

  beforeAll(async () => {
    db = new DatabaseManager(process.cwd());
    await db.initialize();
    const app = createApp(db);
    const l = listen(app);
    server = l.server; base = l.url;
  });

  afterAll(async () => {
    server?.close();
    await db.disconnect();
  });

  it('deletes a component and cascades relationships', async () => {
    const comp = {
      id: 'dc-1', name: 'Del', type: 'class', language: 'ts', filePath: '/d.ts',
      location: { startLine: 1, endLine: 1, startColumn: 0, endColumn: 0 }
    };
    const comp2 = { ...comp, id: 'dc-2', name: 'Del2' };
    await httpJson('POST', `${base}/api/components`, comp);
    await httpJson('POST', `${base}/api/components`, comp2);

    const rel = { id: 'dr-1', type: 'uses', sourceId: 'dc-1', targetId: 'dc-2' };
    const r = await httpJson('POST', `${base}/api/relationships`, rel);
    expect(r.success).toBe(true);

    // Verify pre-state
    const before = await httpJson('GET', `${base}/api/relationships`);
    expect(Array.isArray(before.items) && before.items.length > 0).toBe(true);

    // Delete component and assert relationship removed
    const del = await httpJson('DELETE', `${base}/api/components/dc-1`);
    expect(del.success).toBe(true);

    const after = await httpJson('GET', `${base}/api/relationships/by-source/dc-1`);
    expect(Array.isArray(after.items) ? after.items.length : 0).toBe(0);
  });
});
