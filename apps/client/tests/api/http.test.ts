import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildUrl, fetchJson, fetchText, fetchVoid, API_BASE } from '../../src/shared/api/http';

const g: any = globalThis as any;

describe('api/http helpers', () => {
  beforeEach(() => {
    g.fetch = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('buildUrl normalizes slashes and applies params', () => {
    const url = buildUrl(`${API_BASE}`, 'notes', { limit: 10, q: 'hi', off: undefined });
    expect(url).toMatch(/notes\?limit=10&q=hi$/);
  });

  it('fetchJson returns json and throws friendly error', async () => {
    g.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ a: 1 }) });
    await expect(fetchJson<any>('http://x', {}, 'fallback')).resolves.toEqual({ a: 1 });

    g.fetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'nope' }) });
    await expect(fetchJson<any>('http://x', {}, 'fallback')).rejects.toThrow(/nope/);
  });

  it('fetchText returns text and handles errors', async () => {
    g.fetch.mockResolvedValueOnce({ ok: true, text: async () => 'hi' });
    await expect(fetchText('http://x', {}, 'fallback')).resolves.toBe('hi');

    g.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'boom' }) });
    await expect(fetchText('http://x', {}, 'fallback')).rejects.toThrow(/boom/);
  });

  it('fetchVoid resolves on 204 and errors on !ok', async () => {
    g.fetch.mockResolvedValueOnce({ ok: true });
    await expect(fetchVoid('http://x', {}, 'fallback')).resolves.toBeUndefined();
    g.fetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ error: 'missing' }) });
    await expect(fetchVoid('http://x', {}, 'fallback')).rejects.toThrow(/missing/);
  });
});

