import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DatabaseManager } from '../../features/storage/DatabaseManager';
import { NoteManagementService } from '../../features/metadata/services/NoteManagementService';

class FakeEmbeddingService {
  async generateNoteEmbedding(_note: any) {
    return { embedding: [0.1, 0.2, 0.3], version: 1 };
  }
}

describe('NoteManagementService Integration', () => {
  let db: DatabaseManager;
  let tmp: string;
  let svc: NoteManagementService;

  beforeEach(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nms-int-'));
    db = new DatabaseManager(tmp);
    await db.initialize();
    svc = new NoteManagementService(db, new FakeEmbeddingService() as any);
  });

  afterEach(async () => {
    await db.disconnect();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('adds a valid note (mermaid ok), regenerates embedding on update, and supports linking/unlinking', async () => {
    const md = [
      '# Title',
      '```mermaid',
      'flowchart LR',
      '  A-->B',
      '```',
      ''
    ].join('\n');

    const created = await svc.addNote({ title: 'Diagram', content: md, note_type: 'doc' } as any);
    expect(created.id).toBeTruthy();

    // Wait a tick for async embedding write
    await new Promise(r => setTimeout(r, 20));
    const embedRepo: any = db.getEmbeddingRepository();
    const stored = await embedRepo.getEmbedding(created.id, 'note');
    expect(stored?.embedding?.length).toBeGreaterThan(0);

    // Update triggers new embedding generation
    await svc.updateNote(created.id, { title: 'Diagram v2' } as any);
    await new Promise(r => setTimeout(r, 20));
    const stored2 = await embedRepo.getEmbedding(created.id, 'note');
    expect(stored2?.embedding?.length).toBeGreaterThan(0);

    // Link and unlink via fallback path
    await svc.linkNoteToEntity(created.id, 'component', 'cmp-1', 'primary');
    let fetched = await svc.getNote(created.id);
    expect((fetched as any)?.entity_links?.length || (fetched as any)?.metadata?.entity_links?.length).toBeGreaterThan(0);

    await svc.unlinkNoteFromEntity(created.id, 'component', 'cmp-1');
    fetched = await svc.getNote(created.id);
    const links = ((fetched as any)?.entity_links || (fetched as any)?.metadata?.entity_links) || [];
    expect(links.length).toBe(0);
  });

  it('rejects invalid mermaid content with clear validation error', async () => {
    const invalid = '```mermaid\nflowchart LR\nA-->B'; // missing closing fence
    await expect(svc.addNote({ title: 'Bad', content: invalid, note_type: 'doc' } as any))
      .rejects.toThrow(/validation failed/i);
  });

  it('searchNotesSummary and tree fall back when repo lacks specialized methods', async () => {
    const n1 = await svc.addNote({ title: 'Root', content: 'R', note_type: 'note' } as any);
    const n2 = await svc.addNote({ title: 'Child', content: 'C', note_type: 'note', parent_id: n1.id } as any);
    const summary = await svc.searchNotesSummary({ limit: 10 });
    expect(Array.isArray(summary.items)).toBe(true);
    const tree = await svc.getNoteTree();
    expect(Array.isArray(tree)).toBe(true);
    const treeSummary = await svc.getNoteTreeSummary();
    expect(Array.isArray(treeSummary)).toBe(true);
  });
});

