import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { AddressInfo } from 'node:net';
import request from 'node:http';
import searchRouter from '../searchRoutes';

function listen(app: express.Express) {
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  return { server, base: `http://127.0.0.1:${port}` };
}

async function httpJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = request.request({ method: 'GET', hostname: u.hostname, port: u.port, path: u.pathname + u.search }, res => {
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')));
    });
    req.on('error', reject); req.end();
  });
}

describe('searchRoutes /files/browse', () => {
  let server: any; let base: string;
  beforeAll(() => {
    const app = express();
    app.use('/api', searchRouter);
    const l = listen(app); server = l.server; base = l.base;
  });
  afterAll(() => server?.close());

  it('browses a real directory and returns entries', async () => {
    const dir = process.cwd();
    const res = await httpJson(`${base}/api/files/browse?path=${encodeURIComponent(dir)}`);
    expect(res.path).toBeDefined();
    expect(Array.isArray(res.entries)).toBe(true);
  });
});

