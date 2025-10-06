import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'node:http';
import { AddressInfo } from 'node:net';
import express from 'express';
import bodyParser from 'body-parser';
import { DatabaseManager } from '../../../features/storage/DatabaseManager';

// Minimal in-process server mounting storage-like routes for smoke test
function createApp(db: DatabaseManager) {
  const app = express();
  app.use(bodyParser.json());
  const compRepo = db.getComponentRepository();
  const relRepo = db.getRelationshipRepository();

  app.post('/api/components', async (req, res) => {
    const r = await compRepo.storeComponent(req.body);
    res.json(r);
  });
  app.get('/api/components', async (req, res) => {
    const r = await compRepo.searchComponents({ limit: 100 });
    res.json(r);
  });
  app.post('/api/relationships', async (req, res) => {
    const r = await relRepo.storeRelationship(req.body);
    res.json(r);
  });
  app.get('/api/relationships', async (req, res) => {
    const r = await relRepo.searchRelationships({ limit: 100 });
    res.json(r);
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

describe('Storage routes smoke', () => {
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

  it('inserts and lists components and relationships', async () => {
    const comp = {
      id: 'cmp-1', name: 'Comp', type: 'class', language: 'ts', filePath: '/x.ts',
      location: { startLine: 1, endLine: 2, startColumn: 0, endColumn: 0 }
    };
    const r1 = await httpJson('POST', `${base}/api/components`, comp);
    expect(r1.success).toBe(true);

    // Create second component for FK
    await httpJson('POST', `${base}/api/components`, { ...comp, id: 'cmp-2', name: 'Comp2' });
    const rel = { id: 'rel-1', type: 'uses', sourceId: 'cmp-1', targetId: 'cmp-2', metadata: { t: 1 } };
    const r2 = await httpJson('POST', `${base}/api/relationships`, rel);
    expect(r2.success).toBe(true);

    const listC = await httpJson('GET', `${base}/api/components`);
    expect(listC.items.length).toBeGreaterThanOrEqual(1);
    const listR = await httpJson('GET', `${base}/api/relationships`);
    expect(Array.isArray(listR.items)).toBe(true);
  });
});
