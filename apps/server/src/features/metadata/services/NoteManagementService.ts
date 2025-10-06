/**
 * NoteManagementService - Handles all note operations
 * Single responsibility: Note CRUD, hierarchy, and content management
 */

import { DatabaseManager } from '../../storage/DatabaseManager.js';
import { EmbeddingService } from '../../../nlp/EmbeddingServiceAdapter.js';
import type { 
  INote, 
  CreateNoteParams, 
  UpdateNoteParams, 
  NoteSearchCriteria 
} from '@felix/code-intelligence';
import { NoteUtils } from '@felix/code-intelligence';
import type { SearchResult } from '../../../types/storage.js';
import { logger } from '../../../shared/logger.js';

import type { EntityType, NoteTags } from '@felix/code-intelligence';

export interface NoteLink {
  entity_type: EntityType | 'task';
  entity_id: string;
  entity_name?: string;
  link_strength?: 'primary' | 'secondary' | 'reference';
}

export interface NoteWithMetadata extends Omit<INote, 'tags'> {
  metadata?: Record<string, any>;
  tags?: NoteTags | string[];
  type?: string; // Alias for note_type
}

export class NoteManagementService {
  private dbManager: DatabaseManager;
  private embeddingService: EmbeddingService;

  constructor(
    dbManager: DatabaseManager,
    embeddingService: EmbeddingService
  ) {
    this.dbManager = dbManager;
    this.embeddingService = embeddingService;
  }

  /**
   * Add a new note
   */
  async addNote(params: CreateNoteParams): Promise<INote> {
    // Validate markdown (mermaid/excalidraw) before saving
    if (typeof params.content === 'string' && params.content.length > 0) {
      const validation = this.validateMarkdownContent(params.content);
      if (!validation.valid) {
        throw new Error(`Note validation failed: ${validation.errors.join(' | ')}`);
      }
    }
    const result = await this.dbManager.getNotesRepository().createNote(params);
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to add note');
    }
    
    const note = result.data;
    
    // Generate embedding for the note asynchronously
    this.generateNoteEmbedding(note).catch(async error => {      logger.warn(`Failed to generate embedding for note ${note.id}:`, error);
    });
    
    return note;
  }

  /**
   * Get a note by ID
   */
  async getNote(id: string): Promise<INote | null> {
    return await this.dbManager.getNotesRepository().getNote(id);
  }

  /**
   * Update a note
   */
  async updateNote(id: string, updates: UpdateNoteParams): Promise<INote> {
    // Validate markdown (mermaid/excalidraw) before updating when content provided
    if (typeof updates.content === 'string' && updates.content.length > 0) {
      const validation = this.validateMarkdownContent(updates.content);
      if (!validation.valid) {
        throw new Error(`Note validation failed: ${validation.errors.join(' | ')}`);
      }
    }
    const result = await this.dbManager.getNotesRepository().updateNote(id, updates);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update note');
    }
    
    const updatedNote = await this.getNote(id);
    if (!updatedNote) {
      throw new Error('Note not found after update');
    }
    
    // Regenerate embedding if content changed
    if (updates.content || updates.title) {
      this.generateNoteEmbedding(updatedNote).catch(async error => {        logger.warn(`Failed to regenerate embedding for note ${id}:`, error);
      });
    }
    
    return updatedNote;
  }

  /**
   * Delete a note
   */
  async deleteNote(id: string): Promise<void> {
    const result = await this.dbManager.getNotesRepository().deleteNote(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete note');
    }
  }

  /**
   * List notes with optional criteria
   */
  async listNotes(criteria: NoteSearchCriteria = {}): Promise<INote[]> {
    const result = await this.dbManager.getNotesRepository().searchNotes(criteria);
    return result.items;
  }

  /**
   * Search notes with pagination
   */
  async searchNotes(criteria: NoteSearchCriteria = {}): Promise<SearchResult<INote>> {
    return await this.dbManager.getNotesRepository().searchNotes(criteria);
  }

  /**
   * Search notes with summary data only (for list views)
   */
  async searchNotesSummary(criteria: NoteSearchCriteria = {}): Promise<SearchResult<Partial<INote>>> {
    const notesRepo = this.dbManager.getNotesRepository() as any;
    if (notesRepo.searchNotesSummary) {
      return await notesRepo.searchNotesSummary(criteria);
    }
    // Fallback to regular search
    const result = await this.searchNotes(criteria);
    return {
      ...result,
      items: result.items.map(note => ({
        id: note.id,
        title: note.title,
        note_type: note.note_type,
        tags: (note as any).tags,
        created_at: note.created_at,
        updated_at: note.updated_at
      }))
    };
  }

  /**
   * Get note hierarchy tree
   */
  async getNoteTree(rootId?: string, includeAll = true): Promise<INote[]> {
    return await this.dbManager.getNotesRepository().getNoteTree(rootId, includeAll);
  }

  /**
   * Get note hierarchy tree with summary data only (for tree views)
   */
  async getNoteTreeSummary(rootId?: string, includeAll = true): Promise<Partial<INote>[]> {
    const notesRepo = this.dbManager.getNotesRepository() as any;
    if (notesRepo.getNoteTreeSummary) {
      return await notesRepo.getNoteTreeSummary(rootId, includeAll);
    }
    // Fallback to regular tree
    const notes = await this.getNoteTree(rootId, includeAll);
    return notes.map(note => ({
      id: note.id,
      title: note.title,
      note_type: note.note_type,
      parent_id: note.parent_id,
      tags: (note as any).tags
    }));
  }

  /**
   * Get note count
   */
  async getNoteCount(): Promise<number> {
    return await this.dbManager.getNotesRepository().getNoteCount();
  }

  /**
   * Get all notes
   */
  async getAllNotes(): Promise<INote[]> {
    const notesRepo = this.dbManager.getNotesRepository() as any;
    if (notesRepo.getAllNotes) {
      return await notesRepo.getAllNotes();
    }
    // Fallback to search with no criteria
    const result = await this.searchNotes({ limit: 1000 });
    return result.items;
  }

  /**
   * Get notes by tags
   */
  async getNotesByTags(tags: string[]): Promise<INote[]> {
    const result = await this.searchNotes({ tags } as any);
    return result.items;
  }

  /**
   * Get notes by type
   */
  async getNotesByType(type: string): Promise<INote[]> {
    const result = await this.searchNotes({ note_type: type as any });
    return result.items;
  }

  /**
   * Link a note to an entity
   */
  async linkNoteToEntity(noteId: string, entityType: string, entityId: string, linkStrength?: string): Promise<void> {
    const notesRepo = this.dbManager.getNotesRepository() as any;
    if (notesRepo.linkNoteToEntity) {
      await notesRepo.linkNoteToEntity(noteId, entityType, entityId, linkStrength);
    } else {
      // Fallback: update note with entity links in metadata
      const note = await this.getNote(noteId);
      if (!note) {
        throw new Error('Note not found');
      }
      
      const entityLinks = ((note as any).metadata?.entity_links || note.entity_links || []) as NoteLink[];
      entityLinks.push({
        entity_type: entityType as any,
        entity_id: entityId,
        link_strength: linkStrength as any
      });
      
      await this.updateNote(noteId, {
        entity_links: entityLinks
      } as any);
    }
  }

  /**
   * Unlink a note from an entity
   */
  async unlinkNoteFromEntity(noteId: string, entityType: string, entityId: string): Promise<void> {
    const notesRepo = this.dbManager.getNotesRepository() as any;
    if (notesRepo.unlinkNoteFromEntity) {
      await notesRepo.unlinkNoteFromEntity(noteId, entityType, entityId);
    } else {
      // Fallback: update note to remove entity link from metadata
      const note = await this.getNote(noteId);
      if (!note) {
        throw new Error('Note not found');
      }
      
      const entityLinks = (((note as any).metadata?.entity_links || note.entity_links || []) as NoteLink[])
        .filter(link => !(link.entity_type === entityType && link.entity_id === entityId));
      
      await this.updateNote(noteId, {
        entity_links: entityLinks
      } as any);
    }
  }

  /**
   * Get notes linked to an entity
   */
  async getNotesForEntity(entityType: string, entityId: string): Promise<INote[]> {
    const notesRepo = this.dbManager.getNotesRepository() as any;
    if (notesRepo.getNotesForEntity) {
      return await notesRepo.getNotesForEntity(entityType, entityId);
    }
    
    // Fallback: search all notes and filter by entity links
    const allNotes = await this.getAllNotes();
    return allNotes.filter(note => {
      const entityLinks = ((note as any).metadata?.entity_links || note.entity_links || []) as NoteLink[];
      return entityLinks.some(link => 
        link.entity_type === entityType && link.entity_id === entityId
      );
    });
  }

  /**
   * Generate embedding for a single note and store it
   */
  private async generateNoteEmbedding(note: INote): Promise<void> {
    try {
      const embeddingResult = await this.embeddingService.generateNoteEmbedding(note);
      const embeddingRepo = this.dbManager.getEmbeddingRepository();
      await embeddingRepo.storeEmbedding(
        note.id,
        embeddingResult.embedding,
        String(embeddingResult.version),
        'note'
      );
    } catch (error) {      logger.warn(`Failed to generate embedding for note ${note.id}:`, error);
    }
  }

  /**
   * Generate embeddings for notes in batch
   */
  async generateNoteEmbeddingsBatch(notes: INote[]): Promise<void> {
    try {      logger.info(`Generating embeddings for ${notes.length} notes...`);
      const startTime = Date.now();
      
      // Process notes in smaller batches to avoid memory issues
      const BATCH_SIZE = 10;
      const results = { success: 0, failed: 0 };
      
      for (let i = 0; i < notes.length; i += BATCH_SIZE) {
        const batch = notes.slice(i, i + BATCH_SIZE);
        
        // Generate embeddings for this batch
        const embeddingPromises = batch.map(async (note) => {
          try {
            const embeddingResult = await this.embeddingService.generateNoteEmbedding(note);
            const embeddingRepo = this.dbManager.getEmbeddingRepository();
            await embeddingRepo.storeEmbedding(
              note.id,
              embeddingResult.embedding,
              String(embeddingResult.version),
              'note'
            );
            return { success: true, noteId: note.id };
          } catch (error) {            logger.warn(`Failed to generate embedding for note ${note.id}:`, error);
            return { success: false, noteId: note.id, error };
          }
        });
        
        const batchResults = await Promise.all(embeddingPromises);
        
        // Count successes and failures
        batchResults.forEach(result => {
          if (result.success) {
            results.success++;
          } else {
            results.failed++;
          }
        });
      }
      
      const endTime = Date.now();
      logger.info(`Generated embeddings for ${results.success} notes (${results.failed} failed) in ${endTime - startTime}ms`);
    } catch (error) {      logger.error('Failed to generate note embeddings in batch:', error);
    }
  }

  /**
   * Search notes by content using similarity search
   */
  async searchNotesBySimilarity(query: string, limit = 10): Promise<Array<{ note: INote; similarity: number }>> {
    try {
      // Create a temporary note for the query
      const queryNote: INote = {
        id: 'query',
        title: 'Query',
        content: query,
        note_type: 'note',
        sort_order: 0,
        depth_level: 0,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const queryEmbeddingResult = await this.embeddingService.generateNoteEmbedding(queryNote);
      
      if (!queryEmbeddingResult) {        logger.warn('Failed to generate query embedding');
        return [];
      }
      
      const queryEmbedding = queryEmbeddingResult.embedding;
      
      // Get all notes
      const notes = await this.getAllNotes();
      const results: Array<{ note: INote; similarity: number }> = [];
      
      for (const note of notes) {
        // Get note embedding (assuming it exists in metadata or separate field)
        const noteEmbedding = await this.getNoteEmbedding(note);
        
        if (noteEmbedding) {
          const similarity = this.calculateSimilarity(queryEmbedding, noteEmbedding);
          if (similarity > 0.5) { // Threshold for relevance
            results.push({ note, similarity });
          }
        }
      }
      
      // Sort by similarity and limit
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      logger.error('Similarity search failed:', error);
      return [];
    }
  }

  /**
   * Get embedding for a note
   */
  private async getNoteEmbedding(note: INote): Promise<number[] | null> {
    // Try to get from metadata first
    if ((note as any).embedding) {
      return (note as any).embedding;
    }
    
    // Try to get from embedding repository
    const embeddingRepo = this.dbManager.getEmbeddingRepository() as any;
    if (embeddingRepo.getEmbedding) {
      const result = await embeddingRepo.getEmbedding(note.id, 'note');
      if (result) {
        return result.embedding;
      }
    }
    
    return null;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i]! * embedding2[i]!;
      norm1 += embedding1[i]! * embedding1[i]!;
      norm2 += embedding2[i]! * embedding2[i]!;
    }
    
    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Validate markdown content (check for valid mermaid, excalidraw, etc.)
   */
  validateMarkdownContent(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines: string[] = content.split(/\r?\n/);

    // Global fence sanity: odd number of triple backticks indicates an unclosed block somewhere
    const fenceCount = (content.match(/```/g) || []).length;
    if (fenceCount % 2 !== 0) {
      errors.push('Unclosed code block detected (``` fence count is odd)');
    }

    // Helper to scan fenced blocks by tag
    const scanFencedBlocks = (tag: string) => {
      const blocks: { startLine: number; text: string }[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (new RegExp('^```\\s*' + tag + '\\s*$', 'i').test(line)) {
          const startLine = i + 2; // first content line reported as 1-based
          const buf: string[] = [];
          let j = i + 1;
          let closed = false;
          for (; j < lines.length; j++) {
            const lj = lines[j] ?? '';
            if (/^```\s*$/.test(lj)) { closed = true; break; }
            buf.push(lj);
          }
          if (!closed) {
            errors.push(`${tag} block starting at L${i + 1} not closed with \`\`\``);
            // treat rest as a block to surface more issues
            blocks.push({ startLine, text: buf.join('\n') });
            break;
          } else {
            blocks.push({ startLine, text: buf.join('\n') });
            i = j; // jump to end fence
          }
        }
      }
      return blocks;
    };

    // Validate Mermaid blocks
    const mermaidBlocks = scanFencedBlocks('mermaid');
    const diagramHeader = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|gitGraph|pie)\b/i;
    for (const b of mermaidBlocks) {
      const blines = b.text.split(/\r?\n/);
      // find first non-empty header line
      let header = '';
      let headerOffset = 0;
      for (let k = 0; k < blines.length; k++) {
        const t = (blines[k] ?? '').trim();
        if (t.length > 0) { header = t; headerOffset = k; break; }
      }
      if (!diagramHeader.test(header)) {
        errors.push(`Mermaid block L${b.startLine + headerOffset}: missing or unknown diagram type`);
      }
      const isER = /^erDiagram\b/i.test(header);

      for (let k = 0; k < blines.length; k++) {
        const l = blines[k] ?? '';
        const ln = b.startLine + k; // 1-based
        // Non-ASCII characters (e.g., unicode arrows) often break parsing
        if (/[^\x00-\x7F]/.test(l)) {
          errors.push(`L${ln}: Non-ASCII character in Mermaid (use ASCII arrows like --> or -.->)`);
        }
        // Disallow // comments except in URLs (http:// or https://)
        const withoutUrls = l.replace(/https?:\/\/\S+/g, '');
        if (withoutUrls.includes('//')) {
          errors.push(`L${ln}: Use Mermaid %% comments instead of //`);
        }
        if (isER) {
          if (/\b[A-Za-z_]\w*\s*\[\s*\]/.test(l) || /\bstring\s*\[\s*\]/i.test(l)) {
            errors.push(`L${ln}: erDiagram does not support array syntax like string[]`);
          }
        }
      }
    }

    // Validate Excalidraw blocks (JSON inside fence)
    const excaBlocks = scanFencedBlocks('excalidraw');
    for (const b of excaBlocks) {
      const json = (b.text ?? '').trim();
      if (json) {
        try { JSON.parse(json); }
        catch { errors.push(`Excalidraw block L${b.startLine}: invalid JSON`); }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
