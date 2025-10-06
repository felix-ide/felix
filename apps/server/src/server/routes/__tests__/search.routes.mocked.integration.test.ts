import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import express from 'express';
import bodyParser from 'body-parser';
import { AddressInfo } from 'node:net';
import http from 'node:http';

// Fake in-memory indexer for search endpoints
const fakeIndexer = {
  searchBySimilarity: async (query: string, limit: number) => {
    return [
      { similarity: 0.91, component: { id: 'c1', name: 'Foo', type: 'function', language: 'ts', filePath: '/a.ts', location: { startLine: 1, startColumn: 1 }, metadata: {} } },
      { similarity: 0.75, component: { id: 'c2', name: 'Bar', type: 'class', language: 'ts', filePath: '/b.ts', location: { startLine: 3, startColumn: 1 }, metadata: {} } }
    ].slice(0, limit);
  },
  searchComponents: async ({ name, limit }: any) => ({ items: [ { id: 'c3', name: name || 'X', type: 'file', language: 'ts', filePath: '/x.ts', location: { startLine: 1, startColumn: 1 }, metadata: {} } ].slice(0, limit) }),
  listRules: async () => ([ { id: 'r1', name: 'R', rule_type: 'constraint' } ]),
  listTasks: async () => ([ { id: 't1', title: 'Task A' } ]),
  listNotes: async () => ([ { id: 'n1', title: 'Note A', content: 'hello' } ]),
};

// We will inject the project indexer by rewriting router middleware stack; no module mocks required here.

let searchRouter: any;

function listen(app: express.Express) {
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  return { server, base: `http://127.0.0.1:${port}` };
}

async function httpJson(method: string, url: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? Buffer.from(JSON.stringify(body)) : undefined;
    const req = http.request({
      method,
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': String(data.length) } : {}), 'X-Project-Path': '/fake/project' }
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

describe.skip('searchRoutes (mocked project middleware)', () => {
  let server: http.Server; let base: string;

  beforeAll(async () => {
    const mod = await import('../searchRoutes');
    searchRouter = mod.default;
    // Strip/replace resolveProject with stub that injects our fake indexer
    if (Array.isArray((searchRouter as any).stack)) {
      for (const layer of (searchRouter as any).stack) {
        if (!layer.route && typeof layer.handle === 'function') {
          layer.handle = (req: any, _res: any, next: any) => { req.projectIndexer = fakeIndexer; req.projectPath = '/fake/project'; next(); };
        }
      }
    }
    const app = express();
    app.use(bodyParser.json());
    app.use('/api', searchRouter);
    const l = listen(app); server = l.server; base = l.base;
  });

  afterAll(() => server?.close());

  it('POST /search semantic returns items with similarity', async () => {
    const res = await httpJson('POST', `${base}/api/search`, { type: 'semantic', query: 'foo', limit: 2 });
    expect(Array.isArray(res.items)).toBe(true);
    expect(res.items[0].similarity).toBeGreaterThan(0);
    expect(res.total).toBeGreaterThan(0);
  });

  it('POST /search regular returns mixed entity results', async () => {
    const res = await httpJson('POST', `${base}/api/search`, { query: 'R', limit: 4, entity_types: ['component','rule','task','note'] });
    expect(Array.isArray(res.items)).toBe(true);
    const entities = new Set(res.items.map((x: any) => x.entity_type));
    expect(entities.has('component')).toBe(true);
  });
});
