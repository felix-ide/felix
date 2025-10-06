/**
 * TypeORM Repository for Notes
 * Replaces NotesManager with TypeORM implementation
 */

import { Repository, DataSource, Like, IsNull, Not, In } from 'typeorm';
import { Note } from '../entities/metadata/Note.entity.js';
import { v4 as uuidv4 } from 'uuid';
import type { INote, CreateNoteParams, UpdateNoteParams, NoteSearchCriteria } from '@felix/code-intelligence';
import type { StorageResult, SearchResult } from '../../../types/storage.js';
import { logger } from '../../../shared/logger.js';

export class NotesRepository {
  private repository: Repository<Note>;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.repository = this.dataSource.getRepository(Note);
  }

  /**
   * Get note count
   */
  async getNoteCount(): Promise<number> {
    return this.repository.count();
  }

  /**
   * Get embedding count for notes
   */
  async getEmbeddingCount(): Promise<number> {
    return this.repository
      .createQueryBuilder('note')
      .where('note.semantic_embedding IS NOT NULL')
      .getCount();
  }

  /**
   * 1. CREATE NOTE
   */
  async createNote(params: CreateNoteParams): Promise<StorageResult & { data?: INote }> {
    try {
      const note = this.repository.create({
        id: `note_${Date.now()}_${uuidv4().slice(0, 8)}`,
        parent_id: params.parent_id,
        title: params.title,
        content: params.content,
        note_type: params.note_type || 'note',
        entity_type: (params as any).entity_type,
        entity_id: (params as any).entity_id,
        entity_links: params.entity_links,
        stable_tags: params.stable_tags,
        sort_order: params.sort_order || 0,
        depth_level: (params as any).depth_level || 0
      });

      const savedNote = await this.repository.save(note);
      const iNote = this.convertToINote(savedNote);
      return { success: true, affected: 1, data: iNote };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * 2. GET NOTE BY ID
   */
  async getNote(id: string): Promise<INote | null> {
    try {
      const note = await this.repository.findOne({ where: { id } });
      if (!note) return null;

      return this.convertToINote(note);
    } catch (error) {
      return null;
    }
  }

  /**
   * 3. UPDATE NOTE
   */
  async updateNote(id: string, updates: UpdateNoteParams): Promise<StorageResult> {
    try {
      const updateData: Partial<Note> = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.note_type !== undefined) updateData.note_type = updates.note_type;
      if (updates.entity_links !== undefined) updateData.entity_links = updates.entity_links;
      if (updates.stable_tags !== undefined) updateData.stable_tags = updates.stable_tags;
      if (updates.parent_id !== undefined) updateData.parent_id = updates.parent_id;
      if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;

      await this.repository.update(id, updateData);
      return { success: true, affected: 1 };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * 4. DELETE NOTE
   */
  async deleteNote(id: string): Promise<StorageResult> {
    try {
      const result = await this.repository.delete(id);
      return { 
        success: true, 
        affected: result.affected || 0 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * 5-6. SEARCH NOTES
   */
  async searchNotes(criteria: NoteSearchCriteria): Promise<SearchResult<INote>> {
    try {
      logger.debug('NotesRepository.searchNotes called with criteria:', criteria);
      const query = this.repository.createQueryBuilder('note');
      const isPostgres = this.dataSource.options.type === 'postgres';
      
      // Build WHERE conditions
      if (criteria.note_type) {
        query.andWhere('note.note_type = :type', { type: criteria.note_type });
      }
      if ((criteria as any).parent_id) {
        query.andWhere('note.parent_id = :parentId', { parentId: (criteria as any).parent_id });
      }
      
      // Search inside entity_links JSON array for entity_type and entity_id
      if (criteria.entity_type && criteria.entity_id) {
        if (isPostgres) {
          query.andWhere(`note.entity_links @> :link::jsonb`, {
            link: JSON.stringify([{ entity_type: criteria.entity_type, entity_id: criteria.entity_id }])
          });
        } else {
          query.andWhere(`
            EXISTS (
              SELECT 1 FROM json_each(note.entity_links)
              WHERE json_extract(value, '$.entity_type') = :entityType
              AND json_extract(value, '$.entity_id') = :entityId
            )
          `, { entityType: criteria.entity_type, entityId: criteria.entity_id });
        }
      } else if (criteria.entity_type) {
        if (isPostgres) {
          query.andWhere(`
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(note.entity_links::jsonb) elem
              WHERE elem->>'entity_type' = :entityType
            )
          `, { entityType: criteria.entity_type });
        } else {
          query.andWhere(`
            EXISTS (
              SELECT 1 FROM json_each(note.entity_links)
              WHERE json_extract(value, '$.entity_type') = :entityType
            )
          `, { entityType: criteria.entity_type });
        }
      } else if (criteria.entity_id) {
        if (isPostgres) {
          query.andWhere(`
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(note.entity_links::jsonb) elem
              WHERE elem->>'entity_id' = :entityId
            )
          `, { entityId: criteria.entity_id });
        } else {
          query.andWhere(`
            EXISTS (
              SELECT 1 FROM json_each(note.entity_links)
              WHERE json_extract(value, '$.entity_id') = :entityId
            )
          `, { entityId: criteria.entity_id });
        }
      }
      
      // Handle query/search_text (check both)
      const searchText = criteria.query || (criteria as any).search_text;
      if (searchText) {
        query.andWhere('(note.title LIKE :search OR note.content LIKE :search)', 
          { search: `%${searchText}%` });
      }

      // Count total
      const total = await query.getCount();

      // Apply pagination
      const limit = criteria.limit || 20;
      const offset = criteria.offset || 0;
      query.limit(limit).offset(offset);

      // Apply sorting
      query.orderBy('note.created_at', 'DESC');

      // Get results
      const notes = await query.getMany();
      logger.debug(`NotesRepository.searchNotes: Found ${notes.length} notes, total: ${total}`);
      const items = notes.map(n => this.convertToINote(n));

      return {
        items,
        total,
        hasMore: total > offset + limit,
        offset,
        limit
      };
    } catch (error) {
      logger.error('NotesRepository.searchNotes error:', error);
      return {
        items: [],
        total: 0,
        hasMore: false,
        offset: 0,
        limit: criteria.limit || 20
      };
    }
  }

  /**
   * 7-8. FIND BY ENTITY LINK (JSON queries)
   */
  async findByEntityLink(entityType: string, entityId: string, limit = 20, offset = 0): Promise<SearchResult<INote>> {
    try {
      const isPostgres = this.dataSource.options.type === 'postgres';
      const query = this.repository.createQueryBuilder('note');

      if (isPostgres) {
        // PostgreSQL JSONB query
        query.where(`note.entity_links @> :link::jsonb`, {
          link: JSON.stringify([{ entity_type: entityType, entity_id: entityId }])
        });
      } else {
        // SQLite JSON query
        query.where(`
          EXISTS (
            SELECT 1 FROM json_each(note.entity_links)
            WHERE json_extract(value, '$.entity_type') = :entityType
            AND json_extract(value, '$.entity_id') = :entityId
          )
        `, { entityType, entityId });
      }

      // Count total
      const total = await query.getCount();

      // Apply pagination and sorting
      query
        .orderBy('note.created_at', 'DESC')
        .limit(limit)
        .offset(offset);

      const notes = await query.getMany();
      const items = notes.map(n => this.convertToINote(n));

      return {
        items,
        total,
        hasMore: total > offset + limit,
        offset,
        limit
      };
    } catch (error) {
      logger.error('Error finding notes by entity link:', error);
      return {
        items: [],
        total: 0,
        hasMore: false,
        offset,
        limit
      };
    }
  }

  /**
   * 9. GET ALL NOTES
   */
  async getAllNotes(includeContent: boolean = true): Promise<INote[]> {
    try {
      const notes = await this.repository.find({
        order: { created_at: 'DESC' }
      });
      logger.debug(`NotesRepository.getAllNotes: Found ${notes.length} notes`);
      if (notes.length > 0) {
        logger.debug('First note:', notes[0]);
      }
      return notes.map(n => this.convertToINote(n));
    } catch (error) {
      logger.error('NotesRepository.getAllNotes error:', error);
      return [];
    }
  }

  /**
   * 10. GET TREE HIERARCHY (Recursive CTE)
   */

  /**
   * 11-12. GET CHILDREN
   */
  async getNoteChildren(parentId: string): Promise<string[]> {
    try {
      const children = await this.repository.find({
        select: ['id'],
        where: { parent_id: parentId }
      });
      return children.map(c => c.id);
    } catch (error) {
      return [];
    }
  }

  /**
   * 13. UPDATE DEPTH LEVEL
   */
  async updateDepthLevel(id: string, depth: number): Promise<StorageResult> {
    try {
      await this.repository.update(id, { depth_level: depth });
      return { success: true, affected: 1 };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Convert Note entity to INote interface
   */
  private convertToINote(note: Note): INote {
    return {
      id: note.id,
      parent_id: note.parent_id,
      title: note.title || '',
      content: note.content,
      note_type: note.note_type as any,
      entity_links: note.entity_links as any || [],
      stable_tags: note.stable_tags || [],
      sort_order: note.sort_order,
      depth_level: note.depth_level,
      created_at: note.created_at,
      updated_at: note.updated_at
    } as INote;
  }

  /**
   * Search notes summary - Returns notes without content
   */
  async searchNotesSummary(criteria: NoteSearchCriteria): Promise<SearchResult<INote>> {
    try {
      const query = this.repository.createQueryBuilder('note')
        .select(['note.id', 'note.parent_id', 'note.title', 'note.note_type', 
                 'note.entity_links', 'note.stable_tags', 'note.depth_level', 
                 'note.sort_order', 'note.created_at', 'note.updated_at']);
      const isPostgres = this.dataSource.options.type === 'postgres';
      
      // Build WHERE conditions (same as searchNotes)
      if (criteria.note_type) {
        query.andWhere('note.note_type = :type', { type: criteria.note_type });
      }
      if ((criteria as any).parent_id) {
        query.andWhere('note.parent_id = :parentId', { parentId: (criteria as any).parent_id });
      }
      
      // Search inside entity_links JSON array for entity_type and entity_id
      if (criteria.entity_type && criteria.entity_id) {
        if (isPostgres) {
          query.andWhere(`note.entity_links @> :link::jsonb`, {
            link: JSON.stringify([{ entity_type: criteria.entity_type, entity_id: criteria.entity_id }])
          });
        } else {
          query.andWhere(`
            EXISTS (
              SELECT 1 FROM json_each(note.entity_links)
              WHERE json_extract(value, '$.entity_type') = :entityType
              AND json_extract(value, '$.entity_id') = :entityId
            )
          `, { entityType: criteria.entity_type, entityId: criteria.entity_id });
        }
      } else if (criteria.entity_type) {
        if (isPostgres) {
          query.andWhere(`
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(note.entity_links::jsonb) elem
              WHERE elem->>'entity_type' = :entityType
            )
          `, { entityType: criteria.entity_type });
        } else {
          query.andWhere(`
            EXISTS (
              SELECT 1 FROM json_each(note.entity_links)
              WHERE json_extract(value, '$.entity_type') = :entityType
            )
          `, { entityType: criteria.entity_type });
        }
      } else if (criteria.entity_id) {
        if (isPostgres) {
          query.andWhere(`
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(note.entity_links::jsonb) elem
              WHERE elem->>'entity_id' = :entityId
            )
          `, { entityId: criteria.entity_id });
        } else {
          query.andWhere(`
            EXISTS (
              SELECT 1 FROM json_each(note.entity_links)
              WHERE json_extract(value, '$.entity_id') = :entityId
            )
          `, { entityId: criteria.entity_id });
        }
      }
      
      // Handle query/search_text (check both)
      const searchText = criteria.query || (criteria as any).search_text;
      if (searchText) {
        query.andWhere('(note.title LIKE :search OR note.content LIKE :search)', 
          { search: `%${searchText}%` });
      }

      // Count total
      const total = await query.getCount();

      // Apply pagination
      const limit = criteria.limit || 20;
      const offset = criteria.offset || 0;
      query.limit(limit).offset(offset);

      // Apply sorting
      query.orderBy('note.created_at', 'DESC');

      // Get results
      const notes = await query.getMany();
      logger.debug(`NotesRepository.searchNotes: Found ${notes.length} notes, total: ${total}`);
      const items = notes.map(n => this.convertToINote(n));

      return {
        items,
        total,
        hasMore: total > offset + limit,
        offset,
        limit
      };
    } catch (error) {
      logger.error('NotesRepository.searchNotes error:', error);
      return {
        items: [],
        total: 0,
        hasMore: false,
        offset: 0,
        limit: criteria.limit || 20
      };
    }
  }

  /**
   * Get all notes summary - Returns notes without content
   */
  async getAllNotesSummary(): Promise<INote[]> {
    return this.getAllNotes(false);
  }

  /**
   * Get note hierarchy - Returns notes in tree structure
   */
  async getNoteHierarchy(rootId?: string): Promise<any> {
    return this.getNoteTree(rootId, false);
  }

  /**
   * Get note hierarchy summary - Returns notes in tree structure without content
   */
  async getNoteHierarchySummary(rootId?: string): Promise<any> {
    return this.getNoteTree(rootId, false);
  }

  /**
   * Get notes by entity
   */
  async getNotesByEntity(entityType: string, entityId: string): Promise<INote[]> {
    try {
      // Use findByEntityLink since we need to search inside JSON array
      const result = await this.findByEntityLink(entityType, entityId, 1000, 0);
      return result.items;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get notes by entity link
   */
  async getNotesByEntityLink(entityType: string): Promise<INote[]> {
    try {
      const isPostgres = this.dataSource.options.type === 'postgres';
      const query = this.repository.createQueryBuilder('note');

      if (isPostgres) {
        query.where(`
          EXISTS (
            SELECT 1 FROM jsonb_array_elements(note.entity_links::jsonb) elem
            WHERE elem->>'entity_type' = :entityType
          )
        `, { entityType });
      } else {
        query.where(`
          EXISTS (
            SELECT 1 FROM json_each(note.entity_links)
            WHERE json_extract(value, '$.entity_type') = :entityType
          )
        `, { entityType });
      }

      query.orderBy('note.created_at', 'DESC');
      const notes = await query.getMany();
      return notes.map(note => this.convertToINote(note));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get note tree - Returns notes in hierarchical structure
   */
  async getNoteTree(rootId?: string, includeAll?: boolean): Promise<INote[]> {
    try {
      const query = this.repository.createQueryBuilder('note');
      
      if (rootId) {
        query.where('note.parent_id = :rootId', { rootId });
      } else {
        query.where('note.parent_id IS NULL');
      }
      
      // Note: Note entity doesn't have active field, include all by default
      // Could filter by depth_level or other criteria if needed
      
      query.orderBy('note.created_at', 'DESC');
      
      const notes = await query.getMany();
      return notes.map(note => this.convertToINote(note));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get note tree summary - EXACT MATCH to NotesManager.getNoteTreeSummary
   * Returns hierarchical notes without content for performance
   */
  async getNoteTreeSummary(rootId?: string, includeAll = true): Promise<Partial<INote>[]> {
    try {
      const query = this.repository.createQueryBuilder('note')
        .select([
          'note.id', 'note.parent_id', 'note.title', 'note.note_type',
          'note.entity_links', 'note.stable_tags', 'note.depth_level',
          'note.sort_order', 'note.created_at', 'note.updated_at'
        ]);
      
      if (rootId) {
        query.where('note.parent_id = :rootId', { rootId });
      } else {
        query.where('note.parent_id IS NULL');
      }
      
      // Note: Note entity doesn't have active field, include all by default
      // Could filter by depth_level or other criteria if needed
      
      query.orderBy('note.created_at', 'ASC');
      
      const notes = await query.getMany();
      
      // Build hierarchical structure using NoteUtils if available
      // For now, return flat list that can be built into hierarchy by caller
      return notes.map(note => ({
        id: note.id,
        parent_id: note.parent_id,
        title: note.title,
        note_type: note.note_type as any,
        entity_links: note.entity_links as any,
        stable_tags: note.stable_tags,
        depth_level: note.depth_level,
        sort_order: note.sort_order,
        created_at: note.created_at,
        updated_at: note.updated_at
      }));
    } catch (error) {
      return [];
    }
  }
}
