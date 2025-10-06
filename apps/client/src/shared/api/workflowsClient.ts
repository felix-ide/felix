import { API_BASE, JSON_HEADERS, fetchJson } from './http';

type WorkflowSummary = { name: string; display_name: string; description?: string };

export const listWorkflows = () =>
  fetchJson<{ items: WorkflowSummary[]; default?: string }>(
    `${API_BASE}/workflows`,
    undefined,
    'Failed to list workflows'
  );

export const getDefaultWorkflow = async (): Promise<string> => {
  try {
    const data = await fetchJson<{ default?: string }>(`${API_BASE}/workflows/default`, undefined, 'Failed to get default workflow');
    return data.default || 'feature_development';
  } catch {
    return 'feature_development';
  }
};

export const setDefaultWorkflow = (name: string) =>
  fetchJson<{ ok: boolean }>(
    `${API_BASE}/workflows/default`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ name }) },
    'Failed to set default workflow'
  );

export const getWorkflowConfig = () =>
  fetchJson<{ config: Record<string, unknown>; mapping: Record<string, string> }>(
    `${API_BASE}/workflows/config`,
    undefined,
    'Failed to get workflow config'
  );

export const setWorkflowConfig = (updates: Record<string, unknown>) =>
  fetchJson<{ ok: boolean }>(
    `${API_BASE}/workflows/config`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ updates }) },
    'Failed to update workflow config'
  );

export const getWorkflowMapping = async () => {
  try {
    const data = await fetchJson<{ map?: Record<string, string> }>(`${API_BASE}/workflows/mapping`, undefined, 'Failed to get workflow mapping');
    return data.map || {};
  } catch {
    return {};
  }
};

export const setWorkflowMapping = (task_type: string, workflow_name: string) =>
  fetchJson<{ ok: boolean }>(
    `${API_BASE}/workflows/mapping`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ task_type, workflow_name }) },
    'Failed to set workflow mapping'
  );

export const setWorkflowMappingBulk = (map: Record<string, string>) =>
  fetchJson<{ ok: boolean }>(
    `${API_BASE}/workflows/mapping`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ map }) },
    'Failed to set workflow mapping'
  );

export const reseedBuiltInWorkflows = (force = false) =>
  fetchJson<{ ok: boolean }>(
    `${API_BASE}/workflows/registry/seed`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ force }) },
    'Failed to reseed built-in workflows'
  );

export const getWorkflow = async (name: string) => {
  const response = await fetch(`${API_BASE}/workflows/${encodeURIComponent(name)}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error('Failed to get workflow');
  }
  return response.json();
};

export const upsertWorkflow = (def: unknown) =>
  fetchJson<{ ok: boolean }>(
    `${API_BASE}/workflows`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ def, upsert: true }) },
    'Failed to save workflow'
  );

export const deleteWorkflow = (name: string) =>
  fetchJson<{ ok: boolean }>(
    `${API_BASE}/workflows/${encodeURIComponent(name)}`,
    { method: 'DELETE' },
    'Failed to delete workflow'
  );

export const validateWorkflow = (task: unknown, workflow?: string) =>
  fetchJson<any>(
    `${API_BASE}/workflows/validate`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ task, workflow }) },
    'Validation failed'
  );

export const scaffoldWorkflow = (
  name: string,
  taskId: string,
  options: { dry_run?: boolean; sections?: string[]; stubs?: unknown[] } = {}
) => {
  const payload: Record<string, unknown> = { task_id: taskId };
  if (options.dry_run !== undefined) payload.dry_run = options.dry_run;
  if (options.sections) payload.sections = options.sections;
  if (options.stubs) payload.stubs = options.stubs;

  return fetchJson<any>(
    `${API_BASE}/workflows/${encodeURIComponent(name)}/scaffold`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) },
    'Scaffold failed'
  );
};
