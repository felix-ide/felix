import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'node:http';
import { AddressInfo } from 'node:net';
import express from 'express';
import bodyParser from 'body-parser';
import { DatabaseManager } from '../../../features/storage/DatabaseManager';

function createApp(db: DatabaseManager) {
  const app = express();
  app.use(bodyParser.json());
  const notes = db.getNotesRepository() as any;

  app.post('/api/notes', async (req, res) => res.json(await notes.createNote(req.body)));
  app.get('/api/notes', async (req, res) => res.json(await notes.searchNotes({ limit: 100 })));
  app.get('/api/notes/:id', async (req, res) => res.json(await notes.getNote(req.params.id)));
  app.put('/api/notes/:id', async (req, res) => res.json(await notes.updateNote(req.params.id, req.body)));
  app.delete('/api/notes/:id', async (req, res) => res.json(await notes.deleteNote(req.params.id)));

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

describe('Notes routes CRUD (smoke)', () => {
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

  it('creates, updates, lists, fetches and deletes a note', async () => {
    const n = { title: 'Hello', content: '# Intro', note_type: 'doc' } as any;
    const create = await httpJson('POST', `${base}/api/notes`, n);
    expect(create.success).toBe(true);

    const createdId = create?.data?.id || create?.id; // repository returns data
    expect(typeof createdId).toBe('string');
    const get = await httpJson('GET', `${base}/api/notes/${createdId}`);
    expect(get?.id).toBe(createdId);

    const upd = await httpJson('PUT', `${base}/api/notes/${n.id}`, { title: 'Hello World' });
    expect(upd.success).toBe(true);

    const list = await httpJson('GET', `${base}/api/notes`);
    expect(Array.isArray(list.items)).toBe(true);
    expect(list.items.some((x: any) => x.id === createdId)).toBe(true);

    const del = await httpJson('DELETE', `${base}/api/notes/${createdId}`);
    expect(del.success).toBe(true);
  });
});
