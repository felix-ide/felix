import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'node:http';
import { AddressInfo } from 'node:net';
import express from 'express';
import bodyParser from 'body-parser';
import { DatabaseManager } from '../../../features/storage/DatabaseManager';

function createApp(db: DatabaseManager) {
  const app = express();
  app.use(bodyParser.json());
  const tasks = db.getTasksRepository() as any;

  app.post('/api/tasks', async (req, res) => res.json(await tasks.storeTask(req.body)));
  app.get('/api/tasks', async (req, res) => {
    const { status } = req.query as any;
    const r = await tasks.searchTasks({ task_status: status } as any);
    res.json(r);
  });
  app.get('/api/tasks/:id', async (req, res) => res.json(await tasks.getTask(req.params.id)));
  app.put('/api/tasks/:id', async (req, res) => res.json(await tasks.updateTask(req.params.id, req.body)));
  app.delete('/api/tasks/:id', async (req, res) => res.json(await tasks.deleteTask(req.params.id)));

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

describe('Tasks routes CRUD (smoke)', () => {
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

  it('creates, updates, lists, fetches and deletes a task', async () => {
    const t = { id: 'task-crud-1', title: 'Do thing', task_status: 'todo', task_priority: 'p2' } as any;
    const create = await httpJson('POST', `${base}/api/tasks`, t);
    expect(create.success).toBe(true);

    const get = await httpJson('GET', `${base}/api/tasks/${t.id}`);
    expect(get?.id).toBe('task-crud-1');

    const upd = await httpJson('PUT', `${base}/api/tasks/${t.id}`, { task_status: 'in_progress' });
    expect(upd.success).toBe(true);

    const list = await httpJson('GET', `${base}/api/tasks?status=in_progress`);
    expect(Array.isArray(list.items)).toBe(true);
    expect(list.items.some((x: any) => x.id === t.id)).toBe(true);

    const del = await httpJson('DELETE', `${base}/api/tasks/${t.id}`);
    expect(del.success).toBe(true);
  });
});

