/**
 * Note model - Knowledge capture that survives refactoring
 */

/**
 * Note types for categorization
 */
export type NoteType = 'note' | 'warning' | 'documentation' | 'excalidraw';

/**
 * Entity types used throughout the system
 * This is the canonical definition - all packages should use this
 */
export type EntityType = 'component' | 'file' | 'project' | 'relationship' | 'directory' | 'task' | 'note' | 'rule' | string;

/**
 * Multi-layer linking for refactoring survival
 */
export interface NoteLinks {
  // Layer 1: Exact (breaks on re-index)
  fragile_links?: {
    component_id?: string;
    relationship_id?: string;
    file_path?: string;
  };
  
  // Layer 2: Signature (survives minor changes)
  stable_links?: {
    file_path?: string;
    function_name?: string;
    line_range?: [number, number];
    class_name?: string;
    signature_hash?: string;
  };
  
  // Layer 3: Semantic context for re-linking
  semantic_context?: string;
}

/**
 * Note tagging system
 */
export interface NoteTags {
  stable_tags?: string[]; // Manually added, permanent
  auto_tags?: string[]; // AI-generated, expire on changes
  contextual_tags?: string[]; // Location-based, auto-refresh
}

/**
 * Core Note interface
 */
export interface INote {
  id: string;
  title?: string | undefined;
  content: string;
  note_type: NoteType;
  
  // Hierarchical structure
  parent_id?: string | undefined;
  sort_order: number;
  depth_level: number;
  
  // Multi-entity linking
  entity_links?: Array<{
    entity_type: EntityType;
    entity_id: string;
    entity_name?: string;
    link_strength?: 'primary' | 'secondary' | 'reference';
  }>;
  
  // Multi-layer linking for survival
  links?: NoteLinks;
  
  // Tags system
  tags?: NoteTags;
  
  // Semantic embedding for finding similar content
  semantic_embedding?: Float32Array;

  // Metadata for KB and other extensions
  metadata?: any;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

/**
 * Note creation parameters
 */
export interface CreateNoteParams {
  title?: string;
  content: string;
  note_type?: NoteType;
  parent_id?: string;
  sort_order?: number;
  entity_links?: Array<{
    entity_type: EntityType;
    entity_id: string;
    entity_name?: string;
    link_strength?: 'primary' | 'secondary' | 'reference';
  }>;
  stable_tags?: string[];
  metadata?: any;
}

/**
 * Note update parameters
 */
export interface UpdateNoteParams {
  title?: string;
  content?: string;
  note_type?: NoteType;
  entity_links?: Array<{
    entity_type: EntityType;
    entity_id: string;
    entity_name?: string;
    link_strength?: 'primary' | 'secondary' | 'reference';
  }>;
  parent_id?: string;
  sort_order?: number;
  stable_tags?: string[];
  metadata?: any;
}

/**
 * Note search criteria
 */
export interface NoteSearchCriteria {
  query?: string;
  semantic?: boolean;
  tags?: string[];
  note_type?: NoteType;
  entity_type?: EntityType;  // For backward compatibility during transition
  entity_id?: string;       // For backward compatibility during transition
  limit?: number;
  offset?: number;
}

/**
 * Note validation utility
 */
export class NoteValidator {
  /**
   * Validate note data
   */
  static validate(note: Partial<INote>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!note.title || note.title.trim() === '') {
      errors.push('Title is required');
    } else if (note.title.length > 200) {
      errors.push('Title exceeds maximum length (200 characters)');
    }

    if (!note.content || note.content.trim().length === 0) {
      errors.push('Content is required');
    }

    if (note.content && note.content.length > 50000) {
      errors.push('Content exceeds maximum length (50,000 characters)');
    }

    if (note.note_type && !['note', 'warning', 'documentation', 'excalidraw'].includes(note.note_type)) {
      errors.push('Invalid note type');
    }

    if (note.entity_links && note.entity_links.some(link => !['component', 'file', 'project', 'relationship', 'directory'].includes(link.entity_type))) {
      errors.push('Invalid entity type in entity links');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate create parameters
   */
  static validateCreate(params: CreateNoteParams): { valid: boolean; errors: string[] } {
    return NoteValidator.validate(params);
  }

  /**
   * Validate update parameters
   */
  static validateUpdate(params: UpdateNoteParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (params.content !== undefined && params.content.trim().length === 0) {
      errors.push('Content cannot be empty');
    }

    if (params.content && params.content.length > 50000) {
      errors.push('Content exceeds maximum length (50,000 characters)');
    }

    if (params.note_type && !['note', 'warning', 'documentation', 'excalidraw'].includes(params.note_type)) {
      errors.push('Invalid note type');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Note utility functions
 */
export class NoteUtils {
  /**
   * Generate a unique note ID
   */
  static generateId(): string {
    return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a note from creation parameters
   */
  static createFromParams(params: CreateNoteParams): INote {
    const now = new Date();
    
    return {
      id: this.generateId(),
      title: params.title,
      content: params.content,
      note_type: params.note_type || 'note',
      parent_id: params.parent_id,
      sort_order: params.sort_order || 0,
      depth_level: 0, // Will be calculated when stored
      entity_links: params.entity_links,
      tags: params.stable_tags ? { stable_tags: params.stable_tags } : undefined,
      created_at: now,
      updated_at: now
    };
  }

  /**
   * Convert database row to Note summary object (for list/tree views)
   */
  static fromDbRowSummary(row: any): Partial<INote> {
    const note: Partial<INote> = {
      id: row.id,
      title: row.title,
      content: row.content,
      note_type: row.note_type || 'note',
      parent_id: row.parent_id,
      sort_order: row.sort_order || 0,
      depth_level: row.depth_level || 0,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };

    // Add entity_links if present
    if (row.entity_links) {
      try {
        note.entity_links = JSON.parse(row.entity_links);
      } catch (e) {
        console.warn('Failed to parse entity_links:', e);
      }
    }

    return note;
  }

  /**
   * Convert database row to Note object
   */
  static fromDbRow(row: any): INote {
    const note: INote = {
      id: row.id,
      content: row.content,
      note_type: row.note_type || 'note',
      sort_order: row.sort_order || 0,
      depth_level: row.depth_level || 0,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };

    // Add optional properties only if they exist
    if (row.title) note.title = row.title;
    if (row.parent_id) note.parent_id = row.parent_id;
    if (row.entity_links) {
      note.entity_links = JSON.parse(row.entity_links);
    }
    
    // Handle links
    const hasLinks = row.stable_links || row.fragile_links || row.semantic_context;
    if (hasLinks) {
      note.links = {};
      if (row.stable_links) note.links.stable_links = JSON.parse(row.stable_links);
      if (row.fragile_links) note.links.fragile_links = JSON.parse(row.fragile_links);
      if (row.semantic_context) note.links.semantic_context = row.semantic_context;
    }
    
    // Handle tags
    const hasTags = row.stable_tags || row.auto_tags || row.contextual_tags;
    if (hasTags) {
      note.tags = {};
      if (row.stable_tags) note.tags.stable_tags = JSON.parse(row.stable_tags);
      if (row.auto_tags) note.tags.auto_tags = JSON.parse(row.auto_tags);
      if (row.contextual_tags) note.tags.contextual_tags = JSON.parse(row.contextual_tags);
    }
    
    // Handle semantic embedding
    if (row.semantic_embedding) {
      note.semantic_embedding = new Float32Array(row.semantic_embedding);
    }

    return note;
  }

  /**
   * Convert Note object to database row
   */
  static toDbRow(note: INote): any {
    return {
      id: note.id,
      title: note.title || null,
      content: note.content,
      note_type: note.note_type,
      parent_id: note.parent_id || null,
      sort_order: note.sort_order,
      depth_level: note.depth_level,
      active: 1,
      entity_links: note.entity_links ? JSON.stringify(note.entity_links) : null,
      stable_links: note.links?.stable_links ? JSON.stringify(note.links.stable_links) : null,
      fragile_links: note.links?.fragile_links ? JSON.stringify(note.links.fragile_links) : null,
      semantic_context: note.links?.semantic_context || null,
      semantic_embedding: note.semantic_embedding ? note.semantic_embedding.buffer : null,
      stable_tags: note.tags?.stable_tags ? JSON.stringify(note.tags.stable_tags) : null,
      auto_tags: note.tags?.auto_tags ? JSON.stringify(note.tags.auto_tags) : null,
      contextual_tags: note.tags?.contextual_tags ? JSON.stringify(note.tags.contextual_tags) : null,
      created_at: note.created_at.toISOString(),
      updated_at: note.updated_at.toISOString()
    };
  }

  /**
   * Extract tags from note content
   */
  static extractAutoTags(content: string): string[] {
    const tags: string[] = [];
    
    // Extract #hashtags
    const hashtagMatches = content.match(/#(\w+)/g);
    if (hashtagMatches) {
      tags.push(...hashtagMatches.map(tag => tag.substring(1).toLowerCase()));
    }
    
    // Extract common programming terms
    const programmingTerms = [
      'bug', 'todo', 'fixme', 'hack', 'performance', 'security', 
      'refactor', 'optimize', 'test', 'documentation', 'api', 
      'database', 'frontend', 'backend', 'ui', 'ux'
    ];
    
    const contentLower = content.toLowerCase();
    for (const term of programmingTerms) {
      if (contentLower.includes(term)) {
        tags.push(term);
      }
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Check if note links are still valid
   */
  static validateLinks(note: INote): { valid: boolean; brokenLinks: string[] } {
    const brokenLinks: string[] = [];
    
    // This would need to be implemented with actual component/file checking
    // For now, just return structure
    
    return {
      valid: brokenLinks.length === 0,
      brokenLinks
    };
  }

  /**
   * Calculate depth level for a note based on its parent
   */
  static calculateDepthLevel(parentId: string | undefined, getNoteFunction: (id: string) => INote | null): number {
    if (!parentId) {
      return 0; // Root level note
    }
    
    const parent = getNoteFunction(parentId);
    if (!parent) {
      return 0; // Parent not found, treat as root
    }
    
    return parent.depth_level + 1;
  }

  /**
   * Build note hierarchy tree
   */
  static buildHierarchy(notes: INote[]): INote[] {
    const noteMap = new Map<string, INote & { children?: INote[] }>();
    const rootNotes: INote[] = [];

    // Create note map
    for (const note of notes) {
      noteMap.set(note.id, { ...note, children: [] });
    }

    // Build hierarchy
    for (const note of notes) {
      if (note.parent_id && noteMap.has(note.parent_id)) {
        const parent = noteMap.get(note.parent_id)!;
        parent.children!.push(noteMap.get(note.id)!);
      } else {
        rootNotes.push(noteMap.get(note.id)!);
      }
    }

    // Sort at each level by sort_order and creation date
    const sortNotes = (notes: any[]): void => {
      notes.sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      
      notes.forEach(note => {
        if (note.children) {
          sortNotes(note.children);
        }
      });
    };

    sortNotes(rootNotes);
    return rootNotes;
  }

  /**
   * Build note hierarchy tree with summary data only
   */
  static buildHierarchySummary(notes: Partial<INote>[]): Partial<INote>[] {
    const noteMap = new Map<string, Partial<INote> & { children?: Partial<INote>[] }>();
    const rootNotes: Partial<INote>[] = [];

    // Create note map
    for (const note of notes) {
      if (note.id) {
        noteMap.set(note.id, { ...note, children: [] });
      }
    }

    // Build hierarchy
    for (const note of notes) {
      if (!note.id) continue;
      if (note.parent_id && noteMap.has(note.parent_id)) {
        const parent = noteMap.get(note.parent_id)!;
        parent.children!.push(noteMap.get(note.id)!);
      } else {
        rootNotes.push(noteMap.get(note.id)!);
      }
    }

    // Sort at each level by sort_order and creation date
    const sortNotes = (notes: Partial<INote>[]): void => {
      notes.sort((a, b) => {
        if ((a.sort_order || 0) !== (b.sort_order || 0)) {
          return (a.sort_order || 0) - (b.sort_order || 0);
        }
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return aTime - bTime;
      });
      
      notes.forEach(note => {
        const noteWithChildren = note as Partial<INote> & { children?: Partial<INote>[] };
        if (noteWithChildren.children) {
          sortNotes(noteWithChildren.children);
        }
      });
    };

    sortNotes(rootNotes);
    return rootNotes;
  }

  /**
   * Merge notes with same entity
   */
  static mergeNotes(notes: INote[]): INote {
    if (notes.length === 0) {
      throw new Error('Cannot merge empty notes array');
    }
    
    if (notes.length === 1) {
      return notes[0]!;
    }
    
    const merged: INote = { ...notes[0]! };
    
    // Combine content
    merged.content = notes.map(note => note.content).join('\n\n---\n\n');
    
    // Merge tags
    const allStableTags = notes.flatMap(note => note.tags?.stable_tags || []);
    const allAutoTags = notes.flatMap(note => note.tags?.auto_tags || []);
    const allContextualTags = notes.flatMap(note => note.tags?.contextual_tags || []);
    
    // Only set tags if there are any
    const hasAnyTags = allStableTags.length > 0 || allAutoTags.length > 0 || allContextualTags.length > 0;
    if (hasAnyTags) {
      merged.tags = {};
      if (allStableTags.length > 0) merged.tags.stable_tags = [...new Set(allStableTags)];
      if (allAutoTags.length > 0) merged.tags.auto_tags = [...new Set(allAutoTags)];
      if (allContextualTags.length > 0) merged.tags.contextual_tags = [...new Set(allContextualTags)];
    }
    
    // Use latest updated_at
    merged.updated_at = new Date(Math.max(...notes.map(note => note.updated_at.getTime())));
    
    return merged;
  }
}

/**
 * Default export
 */
export { INote as Note };