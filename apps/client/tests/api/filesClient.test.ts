import { describe, it, expect, vi } from 'vitest';
import * as files from '../../src/shared/api/filesClient';

const g: any = globalThis as any;

describe('filesClient', () => {
  it('listDirectory returns entries', async () => {
    g.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ entries: [] }) });
    const res = await files.listDirectory('/tmp');
    expect(res).toHaveProperty('entries');
  });
});
