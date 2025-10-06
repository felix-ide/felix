import { describe, it, expect, vi, afterEach } from 'vitest';
import { useNotesStore } from '../../src/features/notes/state/notesStore';

vi.mock('../../src/services/felixService', () => ({
  felixService: {
    listNotes: vi.fn().mockResolvedValue({ notes: [{ id: 'n1', content: 'A', note_type: 'note', sort_order: 0, depth_level: 0, entity_type: 'note', created_at: '', updated_at: '' }] }),
    addNote: vi.fn().mockResolvedValue({ note: { id: 'n2', title: 'T', content: 'C', note_type: 'note', sort_order: 0, depth_level: 0, entity_type: 'note', created_at: '', updated_at: '' } }),
    updateNote: vi.fn().mockResolvedValue({ note: { id: 'n2' } }),
    deleteNote: vi.fn().mockResolvedValue({ success: true }),
  }
}));

describe('notesStore', () => {
  afterEach(() => {
    // reset
    useNotesStore.setState({ notes: [], loading: false, error: null, searchQuery: '', selectedNoteId: undefined, selectedNoteIds: new Set(), pollInterval: null });
    vi.restoreAllMocks();
  });

  it('loads notes and selects a new note on add', async () => {
    const s = useNotesStore.getState();
    await s.loadNotes({ limit: 10 });
    expect(useNotesStore.getState().notes.length).toBeGreaterThan(0);
    const newNote = await s.addNote({ content: 'C', note_type: 'note', sort_order: 0, depth_level: 0, entity_type: 'note', created_at: '', updated_at: '' } as any);
    expect(newNote.id).toBe('n2');
    expect(useNotesStore.getState().selectedNoteId).toBe('n2');
  });
});
