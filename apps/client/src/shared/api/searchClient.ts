import { API_BASE, buildUrl, fetchJson } from './http';
import { MIN_SIMILARITY, PATH_DEMOTE_PATTERNS } from '@/config/searchGuardrails';

export type GuardrailInfo = {
  removedCount: number;
  similarityFiltered: number;
  pathFiltered: number;
};

export type SearchResponse<T = any> = {
  results: T[];
  totalResults: number;
  guardrailInfo?: GuardrailInfo;
};

const applyGuardrails = (results: any[]): { filtered: any[]; info?: GuardrailInfo } => {
  if (!Array.isArray(results) || results.length === 0) {
    return { filtered: results };
  }

  let similarityFiltered = 0;
  let pathFiltered = 0;

  const filtered = results.filter((result: any) => {
    const isComponentLike = result.entityType === 'component' || result.entityType === 'file';

    if (isComponentLike) {
      const similarity = typeof result.similarity === 'number' ? result.similarity : undefined;
      if (similarity !== undefined && similarity < MIN_SIMILARITY) {
        similarityFiltered += 1;
        return false;
      }

      const entity = result.entity || {};
      const filePath: string | undefined =
        entity.filePath || entity.metadata?.filePath || entity.location?.filePath || entity.path;

      if (filePath && PATH_DEMOTE_PATTERNS.some((pattern) => pattern.test(filePath))) {
        pathFiltered += 1;
        return false;
      }
    }

    return true;
  });

  const removedCount = similarityFiltered + pathFiltered;
  const info = removedCount
    ? { removedCount, similarityFiltered, pathFiltered }
    : undefined;

  return { filtered, info };
};

export const search = async (
  query: string,
  maxResults = 20,
  entityTypes?: string[],
  componentTypes?: string[]
): Promise<SearchResponse> => {
  const url = buildUrl(API_BASE, 'search', {
    query,
    max_results: maxResults,
    entity_type: entityTypes && entityTypes.length ? entityTypes.join(',') : undefined,
    component_types: componentTypes && componentTypes.length ? componentTypes.join(',') : undefined
  });

  const raw = await fetchJson<{ results: any[] }>(url, undefined, 'Search failed');
  const { filtered, info } = applyGuardrails(raw.results || []);

  return {
    results: filtered,
    totalResults: raw.results?.length ?? filtered.length,
    guardrailInfo: info
  };
};

export const searchTasks = async (query: string, maxResults = 20) => {
  const { results } = await search(query, maxResults, ['task']);
  return results;
};

export const searchNotes = async (query: string, maxResults = 20) => {
  const { results } = await search(query, maxResults, ['note']);
  return results;
};

export const searchRules = async (query: string, maxResults = 20) => {
  const { results } = await search(query, maxResults, ['rule']);
  return results;
};
