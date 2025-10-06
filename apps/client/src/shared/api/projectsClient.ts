import type { ProjectStats } from '@/types/api';
import { API_BASE, JSON_HEADERS, fetchJson } from './http';

export const setProject = (path: string) =>
  fetchJson<{ success: boolean; message: string }>(
    `${API_BASE}/project/set`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ path }) },
    'Failed to set project'
  );

export const getCurrentProject = () =>
  fetchJson<{ current_project?: string; name?: string }>(
    `${API_BASE}/project/current`,
    undefined,
    'Failed to get current project'
  );

export const getStats = () =>
  fetchJson<ProjectStats>(`${API_BASE}/project/stats`, undefined, 'Failed to get stats');

export const indexCodebase = (path: string, force = false) =>
  fetchJson<{ success: boolean; message: string }>(
    `${API_BASE}/project/index`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ path, force }) },
    'Indexing failed'
  );
