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
    const data = await fetchJson<{ map?: Record<string, string>; flow_map?: Record<string, string> }>(
      `${API_BASE}/workflows/mapping`,
      undefined,
      'Failed to get workflow mapping'
    );
    return {
      workflowMap: data.map || {},
      flowMap: data.flow_map || {}
    };
  } catch {
    return { workflowMap: {}, flowMap: {} };
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

export const setStatusFlowMapping = (task_type: string, flow_id: string | null) =>
  fetchJson<{ ok: boolean }>(
    `${API_BASE}/workflows/mapping`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ task_type, flow_id })
    },
    'Failed to set status flow mapping'
  );

export const setStatusFlowMappingBulk = (flow_map: Record<string, string | null | undefined>) =>
  fetchJson<{ ok: boolean }>(
    `${API_BASE}/workflows/mapping`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ flow_map })
    },
    'Failed to set status flow mapping'
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

export const exportWorkflowSnapshot = (filePath?: string) =>
  fetchJson<{ filePath: string; workflowCount: number; exportedAt: string }>(
    `${API_BASE}/workflows/export`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(filePath ? { file_path: filePath } : {})
    },
    'Failed to export workflow snapshot'
  );

export const importWorkflowSnapshot = (options: { filePath?: string; overwrite?: boolean } = {}) =>
  fetchJson<{ filePath: string; workflowCount: number; created: number; updated: number }>(
    `${API_BASE}/workflows/import`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        file_path: options.filePath,
        overwrite: options.overwrite !== false
      })
    },
    'Failed to import workflow snapshot'
  );

export interface TaskStatusRecord {
  id: string;
  name: string;
  display_label?: string;
  emoji?: string;
  color?: string;
  description?: string;
}

export interface TaskStatusFlowRecord {
  id: string;
  name: string;
  display_label?: string;
  description?: string;
  status_ids: string[];
  metadata?: Record<string, unknown>;
}

export const getWorkflowStatuses = () =>
  fetchJson<{ statuses: TaskStatusRecord[] }>(
    `${API_BASE}/workflows/statuses`,
    undefined,
    'Failed to load workflow statuses'
  );

export const saveWorkflowStatus = (status: Partial<TaskStatusRecord> & { name: string }) =>
  fetchJson<{ status: TaskStatusRecord }>(
    `${API_BASE}/workflows/statuses`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(status)
    },
    'Failed to save workflow status'
  );

export const deleteWorkflowStatus = (id: string) =>
  fetchJson<{ ok: boolean }>(
    `${API_BASE}/workflows/statuses/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    'Failed to delete workflow status'
  );

export const getWorkflowStatusFlows = () =>
  fetchJson<{ flows: TaskStatusFlowRecord[]; presets: Array<{ id: string; label: string; states: string[] }> }>(
    `${API_BASE}/workflows/status-flows`,
    undefined,
    'Failed to load workflow status flows'
  );

export const saveWorkflowStatusFlow = (flow: Partial<TaskStatusFlowRecord> & { name: string; status_ids: string[] }) =>
  fetchJson<{ flow: TaskStatusFlowRecord }>(
    `${API_BASE}/workflows/status-flows`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(flow)
    },
    'Failed to save workflow status flow'
  );

export const deleteWorkflowStatusFlow = (id: string) =>
  fetchJson<{ ok: boolean }>(
    `${API_BASE}/workflows/status-flows/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    'Failed to delete workflow status flow'
  );

/**
 * Generic workflow action caller for MCP-style actions
 */
export const callWorkflowAction = <T = any>(action: string, params: Record<string, unknown> = {}): Promise<T> =>
  fetchJson<T>(
    `${API_BASE}/workflows/action`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ action, ...params })
    },
    `Failed to execute workflow action: ${action}`
  );
