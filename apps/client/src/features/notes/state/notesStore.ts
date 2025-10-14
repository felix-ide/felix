import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { NoteData } from '@/types/api';
import { felixService } from '@/services/felixService';

interface NotesStore {
  notes: NoteData[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedNoteId?: string;
  selectedNoteIds: Set<string>;
  pollInterval: number | null;
  
  // Actions
  loadNotes: (options?: { entityType?: string; entityId?: string; limit?: number }) => Promise<void>;
  searchNotes: (query: string) => Promise<void>;
  addNote: (note: Omit<NoteData, 'id' | 'created_at' | 'updated_at'>) => Promise<NoteData>;
  updateNote: (noteId: string, updates: Partial<NoteData>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  selectNote: (noteId?: string) => void;
  toggleNoteSelection: (noteId: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
  startPolling: (interval?: number) => void;
  stopPolling: () => void;
}

export const useNotesStore = create<NotesStore>()(
  devtools(
    (set, get) => ({
      notes: [],
      loading: false,
      error: null,
      searchQuery: '',
      selectedNoteId: undefined,
      selectedNoteIds: new Set<string>(),
      pollInterval: null,

      loadNotes: async (options = {}) => {
        set({ loading: true, error: null });
        
        try {
          const result = await felixService.listNotes({
            entityType: options.entityType,
            entityId: options.entityId,
            limit: options.limit || 50,
          });

          set({
            notes: result.notes,
            loading: false,
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load notes',
            loading: false,
          });
        }
      },

      searchNotes: async (query: string) => {
        set({ loading: true, error: null, searchQuery: query });
        
        try {
          if (!query.trim()) {
            // If empty query, load all notes
            await get().loadNotes();
            return;
          }

          const result = await felixService.listNotes({
            limit: 50,
          });
          
          set({ 
            notes: result.notes,
            loading: false,
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to search notes',
            loading: false,
          });
        }
      },

      addNote: async (noteData) => {
        set({ loading: true, error: null });
        
        try {
          const result = await felixService.addNote({
            title: noteData.title,
            content: noteData.content,
            noteType: noteData.note_type as any,
            entity_links: noteData.entity_links,
            stableTags: noteData.stable_tags,
          });
          
          const newNote = result.note;
          
          set((state) => ({
            notes: [newNote, ...state.notes],
            selectedNoteId: newNote.id,
            loading: false,
          }));
          
          return newNote;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to add note';
          set({ 
            error: errorMessage,
            loading: false,
          });
          throw new Error(errorMessage);
        }
      },

      updateNote: async (noteId: string, updates: Partial<NoteData>) => {
        set({ loading: true, error: null });
        
        try {
          // Map field names from NoteData format to service format
          const serviceUpdates: any = {};
          if (updates.title !== undefined) serviceUpdates.title = updates.title;
          if (updates.content !== undefined) serviceUpdates.content = updates.content;
          if (updates.note_type !== undefined) serviceUpdates.note_type = updates.note_type;
          if (updates.entity_links !== undefined) serviceUpdates.entity_links = updates.entity_links;
          if (updates.stable_tags !== undefined) serviceUpdates.stable_tags = updates.stable_tags;
          if (updates.parent_id !== undefined) serviceUpdates.parent_id = updates.parent_id;
          if (updates.sort_order !== undefined) serviceUpdates.sort_order = updates.sort_order;
          
          const result = await felixService.updateNote(noteId, serviceUpdates);
          const updatedNote = result.note;
          
          // If parent_id or sort_order changed, reload all notes to get correct hierarchy
          if (updates.parent_id !== undefined || updates.sort_order !== undefined) {
            await get().loadNotes();
          } else {
            set((state) => ({
              notes: state.notes.map(note =>
                note.id === noteId ? updatedNote : note
              ),
              loading: false,
            }));
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update note',
            loading: false,
          });
          throw error;
        }
      },

      deleteNote: async (noteId: string) => {
        set({ loading: true, error: null });
        
        try {
          await felixService.deleteNote(noteId);
          
          set((state) => ({
            notes: state.notes.filter(note => note.id !== noteId),
            selectedNoteId: state.selectedNoteId === noteId ? undefined : state.selectedNoteId,
            loading: false,
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete note',
            loading: false,
          });
          throw error;
        }
      },

      selectNote: (noteId?: string) => {
        set({ selectedNoteId: noteId });
      },

      toggleNoteSelection: (noteId: string) => {
        set((state) => {
          const newSelectedIds = new Set(state.selectedNoteIds);
          if (newSelectedIds.has(noteId)) {
            newSelectedIds.delete(noteId);
          } else {
            newSelectedIds.add(noteId);
          }
          return { selectedNoteIds: newSelectedIds };
        });
      },

      clearSelection: () => {
        set({ selectedNoteIds: new Set<string>() });
      },

      selectAll: () => {
        set((state) => ({
          selectedNoteIds: new Set(state.notes.map(n => n.id))
        }));
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      clearError: () => {
        set({ error: null });
      },

      startPolling: (interval = 5000) => {
        const { pollInterval, loadNotes } = get();
        
        // Clear any existing interval
        if (pollInterval) {
          clearInterval(pollInterval);
        }

        // Start new polling interval
        const newInterval = setInterval(() => {
          // Only reload if not currently loading
          if (!get().loading) {
            loadNotes();
          }
        }, interval) as unknown as number;

        set({ pollInterval: newInterval });
      },

      stopPolling: () => {
        const { pollInterval } = get();
        
        if (pollInterval) {
          clearInterval(pollInterval);
          set({ pollInterval: null });
        }
      },
    }),
    { name: 'notes-store' }
  )
);