import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as notes from '../../src/shared/api/notesClient';

const g: any = globalThis as any;

describe('notesClient', () => {
  beforeEach(() => {
    g.fetch = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('addNote posts payload and returns note', async () => {
    const mock = { note: { id: 'n1', title: 'T', content: 'C', note_type: 'note' } };
    g.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => mock });
    const res = await notes.addNote({ content: 'C' });
    expect(res.note.id).toBe('n1');
  });

  it('getNote returns null on 404 and throws on error', async () => {
    g.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(notes.getNote('missing')).resolves.toBeNull();
    g.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'boom' }) });
    await expect(notes.getNote('err')).rejects.toThrow(/boom/);
  });
});

