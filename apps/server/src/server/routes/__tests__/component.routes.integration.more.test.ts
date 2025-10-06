import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import { AddressInfo } from 'node:net';
import request from 'node:http';

// Mock project-manager to supply a fake indexer
const fakeProject = '/tmp/project';
const components = [
  { id: 'f1', name: 'file-a', type: 'file', language: 'ts', filePath: '/a.ts', location: { startLine: 1, endLine: 1, startColumn: 0, endColumn: 0 } },
  { id: 'c1', name: 'AuthService', type: 'class', language: 'ts', filePath: '/a.ts', location: { startLine: 2, endLine: 10, startColumn: 0, endColumn: 0 } },
  { id: 'c2', name: 'UserController', type: 'class', language: 'ts', filePath: '/b.ts', location: { startLine: 1, endLine: 5, startColumn: 0, endColumn: 0 } },
];

vi.mock('../../mcp/project-manager.js', () => ({
  getCurrentProject: () => fakeProject,
  getProjectIndexer: async () => ({
    searchComponents: async ({ name, type, limit = 100, offset = 0 }: any) => {
      let items = components;
      if (type) items = items.filter(c => c.type === type);
      if (name) items = items.filter(c => c.name.toLowerCase().includes(String(name).toLowerCase()));
      return { items: items.slice(offset, offset + limit), total: items.length, limit, offset };
    },
    getComponentsInFile: async (filePath: string) => components.filter(c => c.filePath === filePath),
    getAllComponents: async () => components,
    getComponent: async (id: string) => components.find(c => c.id === id) || null,
    findSimilarComponents: async (_id: string, _limit: number) => [{ id: 'c2', similarity: 0.9 }],
  }),
}));

import componentRouter from '../componentRoutes';

function listen(app: express.Express) {
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  return { server, base: `http://127.0.0.1:${port}` };
}

async function httpJson(method: string, url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = request.request({ method, hostname: u.hostname, port: u.port, path: u.pathname + u.search }, res => {
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')));
    });
    req.on('error', reject); req.end();
  });
}

describe('componentRoutes (router) integration', () => {
  let server: any; let base: string;
  beforeAll(() => {
    const app = express();
    app.use('/api/components', componentRouter);
    const l = listen(app); server = l.server; base = l.base;
  });
  afterAll(() => server?.close());

  it('lists, searches and fetches components', async () => {
    const list = await httpJson('GET', `${base}/api/components?limit=2`);
    expect(Array.isArray(list.items)).toBe(true);
    expect(Array.isArray(list.components)).toBe(true); // backward compatibility field

    const search = await httpJson('GET', `${base}/api/components/search?name=auth`);
    expect(search.items.find((c: any) => c.id === 'c1')).toBeTruthy();

    const byFile = await httpJson('GET', `${base}/api/components/by-file?file_path=${encodeURIComponent('/a.ts')}`);
    expect(byFile.find((c: any) => c.id === 'c1')).toBeTruthy();

    const files = await httpJson('GET', `${base}/api/components/files`);
    expect(Array.isArray(files.files)).toBe(true);

    const fileChildren = await httpJson('GET', `${base}/api/components/files/f1/components`);
    expect(fileChildren.file.id).toBe('f1');
    expect(fileChildren.components.find((c: any) => c.id === 'c1')).toBeTruthy();

    const byId = await httpJson('GET', `${base}/api/components/c1`);
    expect(byId.id).toBe('c1');

    const similar = await httpJson('GET', `${base}/api/components/c1/similar?limit=1`);
    expect(Array.isArray(similar.similar)).toBe(true);
  });
});

