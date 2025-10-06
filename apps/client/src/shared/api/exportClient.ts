import { API_BASE, JSON_HEADERS, fetchJson } from './http';

export const exportTasks = (options: {
  rootTaskId?: string;
  taskIds?: string[];
  includeSubtasks?: boolean;
  includeCompleted?: boolean;
  includeLinkedNotes?: boolean;
  includeLinkedComponents?: boolean;
} = {}) =>
  fetchJson<any>(
    `${API_BASE}/tasks/export`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(options) },
    'Failed to export tasks'
  );

export const importTasks = (
  data: unknown,
  options: { parentTaskId?: string; preserveIds?: boolean; mergeStrategy?: 'skip' | 'overwrite' | 'duplicate' } = {}
) =>
  fetchJson<any>(
    `${API_BASE}/tasks/import`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ data, options }) },
    'Failed to import tasks'
  );

export const exportNotes = (options: {
  rootNoteId?: string;
  noteIds?: string[];
  noteTypes?: string[];
  includeChildren?: boolean;
} = {}) =>
  fetchJson<any>(
    `${API_BASE}/notes/export`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(options) },
    'Failed to export notes'
  );

export const importNotes = (
  data: unknown,
  options: { parentNoteId?: string; preserveIds?: boolean; mergeStrategy?: 'skip' | 'overwrite' | 'duplicate' } = {}
) =>
  fetchJson<any>(
    `${API_BASE}/notes/import`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ data, options }) },
    'Failed to import notes'
  );

export const exportRules = (
  options: {
    ruleIds?: string[];
    includeInactive?: boolean;
    includeChildren?: boolean;
    rootRuleId?: string;
    ruleTypes?: string[];
  } = {}
) =>
  fetchJson<any>(
    `${API_BASE}/rules/export`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(options) },
    'Failed to export rules'
  );

export const importRules = (
  data: unknown,
  options: {
    mergeStrategy?: 'skip' | 'overwrite' | 'duplicate';
    preserveIds?: boolean;
    activateOnImport?: boolean;
    parentRuleId?: string;
    skipExisting?: boolean;
  } = {}
) =>
  fetchJson<any>(
    `${API_BASE}/rules/import`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ data, options }) },
    'Failed to import rules'
  );
