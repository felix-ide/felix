import type { SearchResult } from '../../types/storage.js';
import { projectManager } from '../project-manager.js';
import {
  ensureArray,
  ensureIdTitle,
  normalizeLimit,
  normalizeOffset,
  resolveFieldSet,
  toListResponse,
  type RulesListItem,
  type RulesListRequest,
  type RulesListResult
} from '../types/contracts.js';

export async function handleRulesList(request: RulesListRequest) {
  const { project, rule_type, active } = request;
  const limit = normalizeLimit(request.limit);
  const offset = normalizeOffset(request.offset);

  const projectInfo = await projectManager.getProject(project);
  if (!projectInfo) throw new Error(`Project not found: ${project}`);

  const search = await projectInfo.codeIndexer.searchRules({
    rule_type,
    active,
    limit,
    offset
  } as any) as unknown as SearchResult<Partial<RulesListItem>>;

  const defaultFields = ['id', 'name', 'rule_type', 'active'];
  const fieldSet = resolveFieldSet(request.view, ensureArray<string>(request.fields), defaultFields);

  const items: RulesListItem[] = await Promise.all(search.items.map(async sourceRule => {
    const source = sourceRule ?? {};
    if (!fieldSet) {
      const ensured = ensureIdTitle({ ...source, title: (source as any).name ?? (source as any).title } as Record<string, unknown>);
      const normalized: RulesListItem = {
        ...ensured,
        name: (ensured as any).title,
        rule_type: (source as any).rule_type,
        active: (source as any).active
      } as RulesListItem;
      return normalized;
    }

    const row: Record<string, unknown> = {};
    for (const field of fieldSet) {
      if (field === 'title' || field === 'name') {
        const name = (source as any).name ?? (source as any).title;
        row.name = name;
        row.title = name;
      } else {
        row[field] = (source as any)[field];
      }
    }
    const ensured = ensureIdTitle(row);
    const normalized: RulesListItem = {
      ...ensured,
      name: (ensured as any).title,
      rule_type: (row as any).rule_type ?? (source as any).rule_type,
      active: (row as any).active ?? (source as any).active
    };
    return normalized;
  }));

  const list: RulesListResult = {
    total: search.total ?? items.length,
    offset,
    limit,
    items
  };

  return toListResponse(list, request.output_format, payload => {
    const header = `total=${payload.total} offset=${payload.offset} limit=${payload.limit}`;
    const lines = payload.items.map(item => {
      const type = item.rule_type ? ` (${item.rule_type})` : '';
      const status = item.active === false ? ' [inactive]' : '';
      const title = (item as any).title ?? item.name;
      return `${item.id}\t${title}${type}${status}`;
    });
    return `${header}\n${lines.join('\n')}`;
  });
}
