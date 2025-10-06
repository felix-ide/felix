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
    fragile_links?: {
        component_id?: string;
        relationship_id?: string;
        file_path?: string;
    };
    stable_links?: {
        file_path?: string;
        function_name?: string;
        line_range?: [number, number];
        class_name?: string;
        signature_hash?: string;
    };
    semantic_context?: string;
}
/**
 * Note tagging system
 */
export interface NoteTags {
    stable_tags?: string[];
    auto_tags?: string[];
    contextual_tags?: string[];
}
/**
 * Core Note interface
 */
export interface INote {
    id: string;
    title?: string | undefined;
    content: string;
    note_type: NoteType;
    parent_id?: string | undefined;
    sort_order: number;
    depth_level: number;
    entity_links?: Array<{
        entity_type: EntityType;
        entity_id: string;
        entity_name?: string;
        link_strength?: 'primary' | 'secondary' | 'reference';
    }>;
    links?: NoteLinks;
    tags?: NoteTags;
    semantic_embedding?: Float32Array;
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
}
/**
 * Note search criteria
 */
export interface NoteSearchCriteria {
    query?: string;
    semantic?: boolean;
    tags?: string[];
    note_type?: NoteType;
    entity_type?: EntityType;
    entity_id?: string;
    limit?: number;
    offset?: number;
}
/**
 * Note validation utility
 */
export declare class NoteValidator {
    /**
     * Validate note data
     */
    static validate(note: Partial<INote>): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Validate create parameters
     */
    static validateCreate(params: CreateNoteParams): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Validate update parameters
     */
    static validateUpdate(params: UpdateNoteParams): {
        valid: boolean;
        errors: string[];
    };
}
/**
 * Note utility functions
 */
export declare class NoteUtils {
    /**
     * Generate a unique note ID
     */
    static generateId(): string;
    /**
     * Create a note from creation parameters
     */
    static createFromParams(params: CreateNoteParams): INote;
    /**
     * Convert database row to Note summary object (for list/tree views)
     */
    static fromDbRowSummary(row: any): Partial<INote>;
    /**
     * Convert database row to Note object
     */
    static fromDbRow(row: any): INote;
    /**
     * Convert Note object to database row
     */
    static toDbRow(note: INote): any;
    /**
     * Extract tags from note content
     */
    static extractAutoTags(content: string): string[];
    /**
     * Check if note links are still valid
     */
    static validateLinks(note: INote): {
        valid: boolean;
        brokenLinks: string[];
    };
    /**
     * Calculate depth level for a note based on its parent
     */
    static calculateDepthLevel(parentId: string | undefined, getNoteFunction: (id: string) => INote | null): number;
    /**
     * Build note hierarchy tree
     */
    static buildHierarchy(notes: INote[]): INote[];
    /**
     * Build note hierarchy tree with summary data only
     */
    static buildHierarchySummary(notes: Partial<INote>[]): Partial<INote>[];
    /**
     * Merge notes with same entity
     */
    static mergeNotes(notes: INote[]): INote;
}
/**
 * Default export
 */
export { INote as Note };
//# sourceMappingURL=Note.d.ts.map