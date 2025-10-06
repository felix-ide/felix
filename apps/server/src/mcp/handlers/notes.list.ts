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

export async function handleNotesList(request: NotesListRequest) {
  const { project, note_type, tags } = request;
  const limit = normalizeLimit(request.limit);
  const offset = normalizeOffset(request.offset);

  const projectInfo = await projectManager.getProject(project);
  if (!projectInfo) throw new Error(`Project not found: ${project}`);

  const result = await projectInfo.codeIndexer.searchNotes({
    note_type,
    tags,
    limit,
    offset
  } as any) as unknown as SearchResult<Partial<NotesListItem>>;

  const total = result.total ?? result.items.length;
  const defaultFields = ['id', 'title', 'note_type'];
  const fieldSet = resolveFieldSet(request.view, ensureArray<string>(request.fields), defaultFields);

  const items: NotesListItem[] = await Promise.all(result.items.map(async sourceNote => {
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
