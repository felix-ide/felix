import type { SearchResult } from '../../types/storage.js';
import { projectManager } from '../project-manager.js';
import {
  ensureArray,
  ensureIdTitle,
  normalizeLimit,
  normalizeOffset,
  resolveFieldSet,
  toListResponse,
  type NotesListItem,
  type NotesListRequest,
  type NotesListResult
} from '../types/contracts.js';

/**
 * Recursively get all descendant note IDs from a parent
 */
async function getAllDescendants(notesRepo: any, parentId: string, visited = new Set<string>()): Promise<Set<string>> {
  if (visited.has(parentId)) return visited; // Prevent infinite loops
  visited.add(parentId);

  const childIds = await notesRepo.getNoteChildren(parentId);
  for (const childId of childIds) {
    await getAllDescendants(notesRepo, childId, visited);
  }

  return visited;
}

export async function handleNotesList(request: NotesListRequest & { kb_ids?: string[] }) {
  const { project, note_type, tags, kb_ids } = request;
  const limit = normalizeLimit(request.limit);
  const offset = normalizeOffset(request.offset);

  const projectInfo = await projectManager.getProject(project);
  if (!projectInfo) throw new Error(`Project not found: ${project}`);

  // Get all allowed note IDs if filtering by KB
  let allowedNoteIds: Set<string> | null = null;
  if (kb_ids && kb_ids.length > 0) {
    const { DatabaseManager } = await import('../../features/storage/DatabaseManager.js');
    const { KnowledgeBase } = await import('../../features/storage/entities/metadata/KnowledgeBase.entity.js');

    const dbManager = DatabaseManager.getInstance(project);
    await dbManager.initialize();
    const kbRepo = dbManager.getMetadataDataSource().getRepository(KnowledgeBase);
    const notesRepo = dbManager.getNotesRepository();

    allowedNoteIds = new Set<string>();
    for (const kbId of kb_ids) {
      const kb = await kbRepo.findOne({ where: { id: kbId } });
      if (kb) {
        // Get all descendants of this KB's root note
        const descendants = await getAllDescendants(notesRepo, kb.root_note_id);
        descendants.forEach(id => allowedNoteIds!.add(id));
      }
    }
  }

  const result = await projectInfo.codeIndexer.searchNotes({
    note_type,
    tags,
    limit: allowedNoteIds ? 1000 : limit, // Get more if filtering
    offset: allowedNoteIds ? 0 : offset
  } as any) as unknown as SearchResult<Partial<NotesListItem>>;

  // Filter by KB if specified
  let filteredItems = result.items;
  if (allowedNoteIds) {
    filteredItems = result.items.filter(item => allowedNoteIds!.has((item as any).id));
  }

  const total = filteredItems.length;
  const defaultFields = ['id', 'title', 'note_type'];
  const fieldSet = resolveFieldSet(request.view, ensureArray<string>(request.fields), defaultFields);

  // Apply pagination after filtering
  const paginatedItems = filteredItems.slice(offset, offset + limit);

  const items: NotesListItem[] = await Promise.all(paginatedItems.map(async sourceNote => {
    const source = sourceNote ?? {};
    if (!fieldSet) {
      const ensured = ensureIdTitle({ ...source }) as NotesListItem;
      ensured.note_type = ensured.note_type ?? (source as any).note_type;
      return ensured;
    }

    const row: Record<string, unknown> = {};
    for (const field of fieldSet) {
      if (field === 'title' || field === 'name') {
        row.title = (source as any).title ?? (source as any).name;
      } else {
        row[field] = (source as any)[field];
      }
    }
    return ensureIdTitle(row) as NotesListItem;
  }));

  const list: NotesListResult = {
    total,
    offset,
    limit,
    items
  };

  return toListResponse(list, request.output_format, payload => {
    const header = `total=${payload.total} offset=${payload.offset} limit=${payload.limit}`;
    const lines = payload.items.map(item => `${item.id}\t${item.title}${item.note_type ? ` (${item.note_type})` : ''}`);
    return `${header}\n${lines.join('\n')}`;
  });
}
