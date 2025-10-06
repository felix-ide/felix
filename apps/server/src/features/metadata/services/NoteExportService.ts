/**
 * Note Export/Import Service
 * Handles exporting and importing notes with hierarchy
 */

import { INote } from '@felix/code-intelligence';
import { CodeIndexer } from '../../indexing/api/CodeIndexer.js';
import { promises as fs } from 'fs';

export interface NoteExportData {
  version: string;
  exportDate: string;
  projectName?: string;
  notes: INote[];
}

export interface NoteExportOptions {
  includeChildren?: boolean;
  noteIds?: string[];
  rootNoteId?: string;
  noteTypes?: string[];
}

export interface NoteImportOptions {
  preserveIds?: boolean;
  parentNoteId?: string;
  skipExisting?: boolean;
  mergeStrategy?: 'overwrite' | 'skip' | 'duplicate';
}

export class NoteExportService {
  constructor(private codeIndexer: CodeIndexer) {}

  /**
   * Export notes
   */
  async exportNotes(options: NoteExportOptions = {}): Promise<NoteExportData> {
    const {
      includeChildren = true,
      noteIds,
      rootNoteId,
      noteTypes
    } = options;

    let notes: INote[] = [];
    const noteIdSet = new Set<string>();

    if (noteIds && noteIds.length > 0) {
      // Export specific notes
      for (const noteId of noteIds) {
        const note = await this.codeIndexer.getNote(noteId);
        if (note) {
          notes.push(note);
          noteIdSet.add(note.id);
        }
      }
    } else if (rootNoteId) {
      // Export note tree from root
      const noteTree = await this.codeIndexer.getNoteTree(rootNoteId, true);
      notes = this.flattenNoteTree(noteTree);
      notes.forEach(n => noteIdSet.add(n.id));
    } else {
      // Export all notes (optionally filtered by type)
      const allNotes = await this.codeIndexer.getNoteTree(undefined, true);
      notes = this.flattenNoteTree(allNotes);
      
      // Filter by type if specified
      if (noteTypes && noteTypes.length > 0) {
        notes = notes.filter(n => noteTypes.includes(n.note_type));
      }
      
      notes.forEach(n => noteIdSet.add(n.id));
    }

    // Get children if requested
    if (includeChildren && (noteIds || rootNoteId)) {
      const children = await this.getChildNotes(notes);
      children.forEach(n => {
        if (!noteIdSet.has(n.id)) {
          notes.push(n);
          noteIdSet.add(n.id);
        }
      });
    }

    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      projectName: (this.codeIndexer as any).options?.sourceDirectory,
      notes
    };
  }

  /**
   * Export notes to file
   */
  async exportToFile(filePath: string, options: NoteExportOptions = {}): Promise<void> {
    const exportData = await this.exportNotes(options);
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
  }

  /**
   * Import notes from export data
   */
  async importNotes(data: NoteExportData, options: NoteImportOptions = {}): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const {
      preserveIds = false,
      parentNoteId,
      skipExisting = true,
      mergeStrategy = 'skip'
    } = options;

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const idMapping = new Map<string, string>(); // old ID -> new ID

    // Sort notes by depth to ensure parents are imported before children
    const sortedNotes = [...data.notes].sort((a, b) => a.depth_level - b.depth_level);

    // Import notes
    for (const note of sortedNotes) {
      try {
        const oldId = note.id;
        let newNote = { ...note };

        // Handle ID preservation/generation
        if (!preserveIds) {
          delete (newNote as any).id;
        }

        // Update parent ID if needed
        if (newNote.parent_id) {
          if (idMapping.has(newNote.parent_id)) {
            newNote.parent_id = idMapping.get(newNote.parent_id);
          } else if (!preserveIds) {
            // Parent hasn't been imported yet or doesn't exist
            newNote.parent_id = parentNoteId || undefined;
          }
        } else if (parentNoteId) {
          newNote.parent_id = parentNoteId;
        }

        // Check if note exists (by title and parent)
        if (skipExisting || mergeStrategy === 'skip') {
          const existing = await this.findExistingNote(newNote.title || '', newNote.parent_id);
          if (existing) {
            if (mergeStrategy === 'skip') {
              idMapping.set(oldId, existing.id);
              skipped++;
              continue;
            } else if (mergeStrategy === 'overwrite') {
              // Update existing note
              await this.codeIndexer.updateNote(existing.id, {
                content: newNote.content,
                note_type: newNote.note_type,
                entity_links: newNote.entity_links,
                stable_tags: newNote.tags?.stable_tags
              });
              idMapping.set(oldId, existing.id);
              imported++;
              continue;
            }
          }
        }

        // Create the note
        const createdNote = await this.codeIndexer.addNote({
          title: newNote.title,
          content: newNote.content,
          parent_id: newNote.parent_id,
          note_type: newNote.note_type,
          entity_links: newNote.entity_links,
          stable_tags: newNote.tags?.stable_tags
        });

        idMapping.set(oldId, createdNote.id);
        imported++;

      } catch (error) {
        errors.push(`Failed to import note "${note.title}": ${(error as Error).message}`);
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Import notes from file
   */
  async importFromFile(filePath: string, options: NoteImportOptions = {}): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as NoteExportData;
    return this.importNotes(data, options);
  }

  /**
   * Helper: Flatten note tree
   */
  private flattenNoteTree(notes: INote[]): INote[] {
    const result: INote[] = [];
    const processNote = (note: INote) => {
      result.push(note);
      // If note has children in a children property (from tree structure)
      if ((note as any).children) {
        for (const child of (note as any).children) {
          processNote(child);
        }
      }
    };
    notes.forEach(processNote);
    return result;
  }

  /**
   * Helper: Get all child notes
   */
  private async getChildNotes(parentNotes: INote[]): Promise<INote[]> {
    const children: INote[] = [];
    const processed = new Set<string>();

    for (const note of parentNotes) {
      if (!processed.has(note.id)) {
        const noteChildren = await this.codeIndexer.getNoteTree(note.id, true);
        const flattened = this.flattenNoteTree(noteChildren);
        flattened.forEach(n => {
          if (n.id !== note.id && !processed.has(n.id)) {
            children.push(n);
            processed.add(n.id);
          }
        });
      }
    }

    return children;
  }

  /**
   * Helper: Find existing note by title and parent
   */
  private async findExistingNote(title: string, parentId?: string): Promise<INote | null> {
    const notes = await this.codeIndexer.searchNotes({
      query: title,
      limit: 100
    });

    return notes.items.find(n => n.title === title && n.parent_id === parentId) || null;
  }
}