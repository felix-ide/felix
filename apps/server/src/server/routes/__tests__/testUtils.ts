import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import bodyParser from 'body-parser';
import { AddressInfo } from 'node:net';
import { DatabaseManager } from '../../../features/storage/DatabaseManager';
import { CodeIndexer } from '../../../features/indexing/api/CodeIndexer';

export function createTempProject(files: Record<string,string>) {
  const dir = mkdtempSync(join(tmpdir(), 'felix-e2e-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    const folder = full.substring(0, full.lastIndexOf('/'));
    if (folder) {
      try { require('node:fs').mkdirSync(folder, { recursive: true }); } catch {}
    }
    writeFileSync(full, content);
  }
  return dir;
}

export async function buildIndexer(projectPath: string) {
  const db = DatabaseManager.getInstance(projectPath);
  await db.initialize();
  const indexer = new CodeIndexer(db);
  await indexer.initialize();
  await indexer.indexDirectory(projectPath);
  return { db, indexer };
}

export function listen(app: express.Express) {
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  return { server, base: `http://127.0.0.1:${port}` };
}

export async function httpJson(method: string, url: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? Buffer.from(JSON.stringify(body)) : undefined;
    const req = require('node:http').request({
      method,
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': String(data.length) } : {}) }
    }, (res: any) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
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

export async function mountRouterWithProject(routerModulePath: string, indexer: any) {
  const mod = await import(routerModulePath);
  const router = mod.default as express.Router;
  // Replace any top-level middleware layer (resolveProject) to inject our indexer
  if (Array.isArray((router as any).stack)) {
    for (const layer of (router as any).stack) {
      if (!layer.route && typeof layer.handle === 'function') {
        layer.handle = (req: any, _res: any, next: any) => { req.projectIndexer = indexer; req.projectPath = indexer?.dbManager?.projectPath || ''; next(); };
      }
    }
  }
  const app = express();
  app.use(bodyParser.json());
  return { app, router };
}
