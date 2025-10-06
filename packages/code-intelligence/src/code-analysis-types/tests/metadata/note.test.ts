/**
 * Tests for Note model
 */

import { NoteValidator, NoteUtils, CreateNoteParams } from '../../metadata/Note.js';

describe('NoteValidator', () => {
  describe('validate', () => {
    test('should validate valid note', () => {
      const note = {
        title: 'Test Note',
        content: 'This is a test note',
        note_type: 'note' as const
      };
      
      const result = NoteValidator.validate(note);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject note without title', () => {
      const note = {
        content: 'This is a test note',
        note_type: 'note' as const
      };
      
      const result = NoteValidator.validate(note);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    test('should reject note with empty title', () => {
      const note = {
        title: '   ',
        content: 'This is a test note',
        note_type: 'note' as const
      };
      
      const result = NoteValidator.validate(note);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    test('should reject note with title too long', () => {
      const note = {
        title: 'a'.repeat(201),
        content: 'This is a test note',
        note_type: 'note' as const
      };
      
      const result = NoteValidator.validate(note);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title exceeds maximum length (200 characters)');
    });

    test('should reject note without content', () => {
      const note = {
        title: 'Test Note',
        note_type: 'note' as const
      };
      
      const result = NoteValidator.validate(note);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Content is required');
    });

    test('should reject note with invalid note_type', () => {
      const note = {
        title: 'Test Note',
        content: 'Content',
        note_type: 'invalid' as any
      };
      
      const result = NoteValidator.validate(note);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid note type');
    });
  });
});

describe('NoteUtils', () => {
  describe('generateId', () => {
    test('should generate unique IDs', () => {
      const id1 = NoteUtils.generateId();
      const id2 = NoteUtils.generateId();
      
      expect(id1).toMatch(/^note_\d+_[a-z0-9]{9}$/);
      expect(id2).toMatch(/^note_\d+_[a-z0-9]{9}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('createFromParams', () => {
    test('should create note from parameters', () => {
      const params: CreateNoteParams = {
        title: 'Test Note',
        content: 'Test content',
        note_type: 'note'
      };
      
      const note = NoteUtils.createFromParams(params);
      
      expect(note.id).toMatch(/^note_\d+_[a-z0-9]{9}$/);
      expect(note.title).toBe('Test Note');
      expect(note.content).toBe('Test content');
      expect(note.note_type).toBe('note');
      expect(note.parent_id).toBeUndefined();
      expect(note.sort_order).toBe(0);
      expect(note.depth_level).toBe(0);
      expect(note.sort_order).toBe(0);
      expect(note.created_at).toBeInstanceOf(Date);
      expect(note.updated_at).toBeInstanceOf(Date);
    });

    test('should handle optional parameters', () => {
      const params: CreateNoteParams = {
        title: 'Test Note',
        content: 'Test content',
        note_type: 'warning',
        parent_id: 'parent-note-id',
        entity_links: [{
          entity_type: 'component',
          entity_id: 'comp-1',
          entity_name: 'TestComponent',
          link_strength: 'primary'
        }],
        stable_tags: ['important', 'review']
      };
      
      const note = NoteUtils.createFromParams(params);
      
      expect(note.note_type).toBe('warning');
      expect(note.parent_id).toBe('parent-note-id');
      expect(note.entity_links).toHaveLength(1);
      expect(note.entity_links![0].entity_type).toBe('component');
      expect(note.tags?.stable_tags).toEqual(['important', 'review']);
    });
  });

  describe('fromDbRow', () => {
    test('should create note from database row', () => {
      const row = {
        id: 'note_123_abc',
        title: 'Database Note',
        content: 'Database content',
        note_type: 'documentation',
        parent_id: null,
        sort_order: 1,
        depth_level: 0,
        active: 1,
        entity_links: JSON.stringify([{
          entity_type: 'component',
          entity_id: 'comp-1'
        }]),
        stable_tags: JSON.stringify(['tag1', 'tag2']),
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-02T00:00:00.000Z'
      };
      
      const note = NoteUtils.fromDbRow(row);
      
      expect(note.id).toBe('note_123_abc');
      expect(note.title).toBe('Database Note');
      expect(note.content).toBe('Database content');
      expect(note.note_type).toBe('documentation');
      expect(note.parent_id).toBeUndefined();
      expect(note.sort_order).toBe(1);
      expect(note.depth_level).toBe(0);
      expect(note.entity_links).toHaveLength(1);
      expect(note.tags?.stable_tags).toEqual(['tag1', 'tag2']);
      expect(note.created_at).toEqual(new Date('2023-01-01T00:00:00.000Z'));
      expect(note.updated_at).toEqual(new Date('2023-01-02T00:00:00.000Z'));
    });
  });

  describe('toDbRow', () => {
    test('should convert note to database row', () => {
      const note = NoteUtils.createFromParams({
        title: 'Test Note',
        content: 'Test content',
        note_type: 'note',
        entity_links: [{
          entity_type: 'component',
          entity_id: 'comp-1'
        }],
        stable_tags: ['tag1']
      });
      
      const row = NoteUtils.toDbRow(note);
      
      expect(row.id).toBe(note.id);
      expect(row.title).toBe('Test Note');
      expect(row.content).toBe('Test content');
      expect(row.note_type).toBe('note');
      expect(row.active).toBe(1);
      expect(row.entity_links).toBe(JSON.stringify([{
        entity_type: 'component',
        entity_id: 'comp-1'
      }]));
      expect(row.stable_tags).toBe(JSON.stringify(['tag1']));
      expect(row.created_at).toBe(note.created_at.toISOString());
      expect(row.updated_at).toBe(note.updated_at.toISOString());
    });
  });

  describe('buildHierarchy', () => {
    test('should build note hierarchy correctly', () => {
      const notes = [
        NoteUtils.createFromParams({ title: 'Root 1', content: 'Content 1', note_type: 'note' }),
        NoteUtils.createFromParams({ title: 'Root 2', content: 'Content 2', note_type: 'note' }),
      ];
      
      const child1 = NoteUtils.createFromParams({ 
        title: 'Child 1', 
        content: 'Child content 1', 
        note_type: 'note',
        parent_id: notes[0].id 
      });
      
      const child2 = NoteUtils.createFromParams({ 
        title: 'Child 2', 
        content: 'Child content 2', 
        note_type: 'note',
        parent_id: notes[0].id 
      });
      
      const allNotes = [...notes, child1, child2];
      const hierarchy = NoteUtils.buildHierarchy(allNotes);
      
      expect(hierarchy).toHaveLength(2); // Two root notes
      expect((hierarchy[0] as any).children).toHaveLength(2); // First root has 2 children
      expect((hierarchy[1] as any).children).toHaveLength(0); // Second root has no children
    });
  });
});