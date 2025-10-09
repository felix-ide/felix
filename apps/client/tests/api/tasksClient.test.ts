import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as tasks from '../../src/shared/api/tasksClient';

const g: any = globalThis as any;

describe('tasksClient', () => {
  beforeEach(() => { g.fetch = vi.fn(); });
  afterEach(() => vi.restoreAllMocks());

  it('listTasks builds URL with params and normalizes response shape', async () => {
    const payload = { items: [{ id: 't1' }], total: 1, hasMore: true, offset: 0, limit: 5 };
    g.fetch.mockResolvedValueOnce({ ok: true, json: async () => payload });
    const res = await tasks.listTasks({ status: 'open', limit: 5 } as any);
    expect(res.total).toBe(1);
    expect(res.tasks).toHaveLength(1);
    expect(res.hasMore).toBe(true);
    expect(g.fetch.mock.calls[0][0]).toMatch(/\/tasks\?/);
  });

  it('getTaskSpecBundle hits compact=true by default', async () => {
    g.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ bundle: {}, compact: true }) });
    const res = await tasks.getTaskSpecBundle('t1');
    expect(res.compact).toBe(true);
  });
});
