import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import express from 'express';
import bodyParser from 'body-parser';
import { AddressInfo } from 'node:net';
import http from 'node:http';

// Minimal in-memory rules indexer
function createFakeIndexer() {
  const rules = new Map<string, any>();
  let counter = 1;
  const makeId = () => `rule_${counter++}`;
  return {
    listRules: async () => Array.from(rules.values()),
    addRule: async (r: any) => { const id = makeId(); const rule = { id, active: true, ...r }; rules.set(id, rule); return { rule, success: true }; },
    getRule: async (id: string) => rules.get(id) || null,
    updateRule: async (id: string, patch: any) => { const cur = rules.get(id); if (!cur) return null; const next = { ...cur, ...patch }; rules.set(id, next); return next; },
    deleteRule: async (id: string) => { rules.delete(id); return { success: true }; },
    getRuleTree: async () => ({ id: 'root', children: Array.from(rules.values()) }),
    getRulesByIds: async (ids: string[]) => ids.map(id => rules.get(id)).filter(Boolean),
    getApplicableRules: async () => Array.from(rules.values()),
    trackRuleApplication: async () => ({ success: true }),
    getRuleAnalytics: async () => ({ items: [] }),
    exportRules: async () => ({ export_version: 1, rules: Array.from(rules.values()) }),
    importRules: async (data: any) => ({ success: true, count: (data?.rules?.length) || 0 }),
  };
}

// Mock project middleware so resolveProject attaches our fake indexer directly
const fakeIndexer = createFakeIndexer();
vi.mock('../middleware/projectMiddleware.js', () => {
  return {
    resolveProject: vi.fn(async (req: any, _res: any, next: any) => {
      req.projectPath = '/fake/project';
      req.projectIndexer = fakeIndexer;
      next();
    }),
    requireProjectIndexer: (req: any) => req.projectIndexer,
  };
});

// Also mock project-manager to prevent DB initialization if any route calls it directly
vi.mock('../../mcp/project-manager.js', () => ({
  getProjectIndexer: vi.fn(async () => fakeIndexer),
  getCurrentProject: vi.fn(() => '/fake/project'),
}));

// Import router AFTER mocks
let rulesRouter: any;

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
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': String(data.length) } : {}) , 'X-Project-Path': '/fake/project' }
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

describe.skip('rulesRoutes (mocked project middleware)', () => {
  let server: http.Server; let base: string;

  beforeAll(async () => {
    // Dynamic import AFTER mocks to ensure the mock is used
    const mod = await import('../rulesRoutes');
    rulesRouter = mod.default;
    // Replace any middleware on the router (e.g., resolveProject) with a stub that injects our fake indexer
    if (Array.isArray((rulesRouter as any).stack)) {
      for (const layer of (rulesRouter as any).stack) {
        if (!layer.route && typeof layer.handle === 'function') {
          layer.handle = (req: any, _res: any, next: any) => { req.projectIndexer = fakeIndexer; req.projectPath = '/fake/project'; next(); };
        }
      }
    }
    const app = express();
    app.use(bodyParser.json());
    app.use('/api', rulesRouter);
    const l = listen(app); server = l.server; base = l.base;
  });

  afterAll(() => server?.close());

  it('creates, lists, fetches, updates, deletes a rule', async () => {
    // create
    const created = await httpJson('POST', `${base}/api/rules?project=${encodeURIComponent(process.cwd())}`, { name: 'My Rule', rule_type: 'constraint' });
    if (!created?.rule?.id) {
      // aid debugging in CI
      // eslint-disable-next-line no-console
      console.error('DEBUG created response:', created);
    }
    const id = created?.rule?.id; expect(typeof id).toBe('string');
    // list
    const listed = await httpJson('GET', `${base}/api/rules?project=${encodeURIComponent(process.cwd())}`);
    expect(Array.isArray(listed.applicable_rules)).toBe(true);
    // fetch by id
    const got = await httpJson('GET', `${base}/api/rules/${id}?project=${encodeURIComponent(process.cwd())}`);
    expect(got?.rule?.id).toBe(id);
    // update
    const upd = await httpJson('PUT', `${base}/api/rules/${id}?project=${encodeURIComponent(process.cwd())}`, { description: 'Updated' });
    expect(upd?.rule?.description).toBe('Updated');
    // tree
    const tree = await httpJson('GET', `${base}/api/rules/tree?project=${encodeURIComponent(process.cwd())}`);
    expect(tree?.rule_tree?.children?.length).toBeGreaterThan(0);
    // delete
    const del = await httpJson('DELETE', `${base}/api/rules/${id}?project=${encodeURIComponent(process.cwd())}`);
    expect(del?.success).toBe(true);
  });
});
