import { useState, useEffect } from 'react';
import { useNotesStore } from '@client/features/notes/state/notesStore';
import { useAppStore } from '@client/features/app-shell/state/appStore';
import { NoteHierarchy } from '@client/features/notes/components/NoteHierarchy';
import { NoteEditor } from '@client/features/notes/components/NoteEditor';
import { Alert, AlertDescription } from '@client/shared/ui/Alert';
import type { NoteData } from '@/types/api';

export function NotesSection() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteData | undefined>();
  const [parentNoteId, setParentNoteId] = useState<string | undefined>();

  const {
    notes,
    error,
    selectedNoteId,
    loadNotes,
    addNote,
    updateNote,
    deleteNote,
    selectNote,
    clearError,
    startPolling,
    stopPolling,
  } = useNotesStore();

  const { autoRefresh, refreshInterval } = useAppStore();

  // Load notes on mount and handle polling
  useEffect(() => {
    loadNotes();
    
    if (autoRefresh) {
      startPolling(refreshInterval);
    }

    // Listen for project restoration
    const handleProjectRestored = () => {
      console.log('Project restored, reloading notes...');
      loadNotes();
    };
    
    window.addEventListener('project-restored', handleProjectRestored);

    return () => {
      stopPolling();
      window.removeEventListener('project-restored', handleProjectRestored);
    };
  }, [loadNotes, autoRefresh, refreshInterval, startPolling, stopPolling]);

  const handleCreateNew = (parentId?: string) => {
    setEditingNote(undefined);
    setParentNoteId(parentId);
    setIsEditorOpen(true);
  };

  const handleEditNote = (note: NoteData) => {
    setEditingNote(note);
    setParentNoteId(undefined);
    setIsEditorOpen(true);
  };

  const handleSaveNote = async (noteData: Omit<NoteData, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingNote) {
        // Update existing note
        await updateNote(editingNote.id, noteData);
      } else {
        // Create new note
        await addNote(noteData);
      }
      setIsEditorOpen(false);
      setEditingNote(undefined);
      setParentNoteId(undefined);
    } catch (error) {
      console.error('Failed to save note:', error);
      // Error is handled by the store
    }
  };

  const handleCancelEdit = () => {
    setIsEditorOpen(false);
    setEditingNote(undefined);
    setParentNoteId(undefined);
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
    } catch (error) {
      console.error('Failed to delete note:', error);
      // Error is handled by the store
    }
  };

  const handleReorder = async (noteId: string, newParentId: string | null, newSortOrder: number) => {
    try {
      // Update the note with new parent and sort order
      await updateNote(noteId, {
        parent_id: newParentId || undefined,
        sort_order: newSortOrder
      });
    } catch (error) {
      console.error('Failed to reorder note:', error);
    }
  };

  const handleAddSubNote = (parentId: string) => {
    setEditingNote(undefined);
    setParentNoteId(parentId);
    setIsEditorOpen(true);
  };

  // const handleTypeChange = async (noteId: string, type: NoteData['note_type']) => {
  //   try {
  //     await updateNote(noteId, { note_type: type });
  //   } catch (error) {
  //     console.error('Failed to update note type:', error);
  //   }
  // };

  return (
    <div className="h-full flex flex-col">
      {/* Error Display */}
      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={clearError}
                className="text-sm underline hover:no-underline"
              >
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Notes Hierarchy */}
      <div className="flex-1 min-h-0">
        <NoteHierarchy
          notes={notes}
          selectedNoteId={selectedNoteId}
          onNoteSelect={selectNote}
          onNoteEdit={handleEditNote}
          onNoteUpdate={updateNote}
          onNoteDelete={handleDeleteNote}
          onCreateNew={handleCreateNew}
          // onTypeChange={handleTypeChange}
          onReorder={handleReorder}
          onAddSubNote={handleAddSubNote}
        />
      </div>

      {/* Note Editor Modal */}
      <NoteEditor
        note={editingNote}
        parentId={parentNoteId}
        isOpen={isEditorOpen}
        onSave={handleSaveNote}
        onCancel={handleCancelEdit}
      />
    </div>
  );
}
export default NotesSection;
