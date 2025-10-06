import type { SearchResult } from '../../types/storage.js';
import { projectManager } from '../project-manager.js';
import {
  ensureArray,
  ensureIdTitle,
  normalizeLimit,
  normalizeOffset,
  resolveFieldSet,
  toListResponse,
  type TasksListItem,
  type TasksListRequest,
  type TasksListResult
} from '../types/contracts.js';

export async function handleTasksList(request: TasksListRequest) {
  const { project, include_children, parent_id, task_status, task_type } = request;
  const limit = normalizeLimit(request.limit);
  const offset = normalizeOffset(request.offset);

  const projectInfo = await projectManager.getProject(project);
  if (!projectInfo) {
    throw new Error(`Project not found: ${project}`);
  }

  let result = await projectInfo.codeIndexer.searchTasksSummary({
    parent_id,
    task_status,
    task_type,
    include_children: include_children ?? false,
    limit,
    offset
  }) as unknown as SearchResult<Partial<TasksListItem>>;

  const needsIdTitle = !result.items?.length || result.items.some(task => !task?.id || !task?.title);
  if (needsIdTitle) {
    const full = await projectInfo.codeIndexer.searchTasks({
      parent_id,
      task_status,
      task_type,
      limit,
      offset
    } as any) as unknown as SearchResult<Partial<TasksListItem>>;
    result = { ...full, items: full.items };
  }

  const total = result.total ?? result.items.length;
  const defaultFields = ['id', 'title', 'task_status', 'task_type', 'parent_id'];
  const fieldSet = resolveFieldSet(request.view, ensureArray<string>(request.fields), defaultFields);

  const items: TasksListItem[] = await Promise.all(result.items.map(async sourceTask => {
    const source = sourceTask ?? {};
    if (!fieldSet) {
      const base = { ...source } as TasksListItem;
      const ensured = ensureIdTitle(base);
      ensured.task_status = ensured.task_status ?? (source as any).task_status;
      ensured.task_type = ensured.task_type ?? (source as any).task_type;
      ensured.parent_id = ensured.parent_id ?? (source as any).parent_id;
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
    return ensureIdTitle(row) as TasksListItem;
  }));

  const list: TasksListResult = {
    total,
    offset,
    limit,
    items
  };

  return toListResponse(list, request.output_format, payload => {
    const header = `total=${payload.total} offset=${payload.offset} limit=${payload.limit}`;
    const lines = payload.items.map(item => {
      const status = item.task_status ? ` [${item.task_status}]` : '';
      const type = item.task_type ? ` (${item.task_type})` : '';
      const parent = item.parent_id ? ` parent:${item.parent_id}` : '';
      return `${item.id}\t${item.title}${status}${type}${parent}`;
    });
    return `${header}\n${lines.join('\n')}`;
  });
}
