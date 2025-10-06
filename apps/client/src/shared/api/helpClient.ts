import { API_BASE, fetchJson } from './http';

export const getHelp = (section: 'tasks' | 'workflows' | 'notes' | 'checklists' | 'spec') =>
  fetchJson<{ section: string; version: string; human_md: string; ai_guide: unknown }>(
    `${API_BASE}/help/${encodeURIComponent(section)}`,
    undefined,
    'Failed to load help'
  );
