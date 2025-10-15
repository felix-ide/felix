import type { NoteData } from '@/types/api';
import { API_BASE, JSON_HEADERS, buildUrl, fetchJson } from './http';

export const addNote = (note: {
  title?: string;
  content: string;
  noteType?: 'note' | 'warning' | 'documentation' | 'excalidraw';
  entity_links?: Array<{
    entity_type: string;
    entity_id: string;
    entity_name?: string;
    link_strength?: 'primary' | 'secondary' | 'reference';
  }>;
  stableTags?: string[];
  parent_id?: string;
}) =>
  fetchJson<{ note: NoteData }>(
    `${API_BASE}/notes`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        title: note.title,
        content: note.content,
        note_type: note.noteType || 'note',
        entity_links: note.entity_links || [],
        stable_tags: note.stableTags || [],
        parent_id: note.parent_id
      })
    },
    'Failed to add note'
  );

export const getNote = async (noteId: string): Promise<NoteData | null> => {
  const response = await fetch(`${API_BASE}/notes/${encodeURIComponent(noteId)}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as any).error || 'Failed to get note');
  }
  const data = await response.json();
  return data.note;
};

export const listNotes = (options: {
  entityType?: string;
  entityId?: string;
  noteType?: string;
  linkedToTask?: string;
  limit?: number;
  offset?: number;
  excludeKB?: boolean;
} = {}) => {
  const url = buildUrl(API_BASE, 'notes', {
    entity_type: options.entityType,
    entity_id: options.entityId,
    note_type: options.noteType,
    linkedToTask: options.linkedToTask,
    limit: options.limit,
    offset: options.offset,
    exclude_kb: options.excludeKB ? 'true' : undefined
  });
  return fetchJson<{ notes: NoteData[]; total: number }>(url, undefined, 'Failed to list notes');
};

export const updateNote = (
  noteId: string,
  updates: {
    title?: string;
    content?: string;
    note_type?: string;
    entity_links?: Array<{
      entity_type: string;
      entity_id: string;
      entity_name?: string;
      link_strength?: 'primary' | 'secondary' | 'reference';
    }>;
    stable_tags?: string[];
    parent_id?: string | null;
    sort_order?: number;
  }
) => {
  const body = Object.fromEntries(
    Object.entries({
      title: updates.title,
      content: updates.content,
      note_type: updates.note_type,
      entity_links: updates.entity_links,
      stable_tags: updates.stable_tags,
      parent_id: updates.parent_id,
      sort_order: updates.sort_order
    }).filter(([, value]) => value !== undefined)
  );

  return fetchJson<{ note: NoteData }>(
    `${API_BASE}/notes/${encodeURIComponent(noteId)}`,
    { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(body) },
    'Failed to update note'
  );
};

export const deleteNote = (noteId: string) =>
  fetchJson<{ success: boolean }>(
    `${API_BASE}/notes/${encodeURIComponent(noteId)}`,
    { method: 'DELETE' },
    'Failed to delete note'
  );
