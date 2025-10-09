import type { TaskData, TaskDependency } from '@/types/api';
import { API_BASE, JSON_HEADERS, addProjectHeader, buildUrl, fetchJson } from './http';

export class TaskUpdateError extends Error {
  gate?: any;

  constructor(message: string, gate?: any) {
    super(message);
    this.name = 'TaskUpdateError';
    this.gate = gate;
  }
}

export const addTask = (task: {
  title: string;
  description?: string;
  parentId?: string;
  taskType?: string;
  taskPriority?: string;
  estimatedEffort?: string;
  dueDate?: string;
  entity_links?: Array<{ entity_type: string; entity_id: string; entity_name?: string; link_strength?: 'primary' | 'secondary' | 'reference' }>;
  stableTags?: string[];
  checklists?: any[];
  workflow?: string;
  skip_validation?: boolean;
}) =>
  fetchJson<{ task: TaskData }>(
    `${API_BASE}/tasks`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        parent_id: task.parentId,
        task_type: task.taskType || 'task',
        task_priority: task.taskPriority || 'medium',
        estimated_effort: task.estimatedEffort,
        due_date: task.dueDate,
        entity_links: task.entity_links,
        stable_tags: task.stableTags || [],
        checklists: task.checklists || [],
        workflow: task.workflow,
        skip_validation: task.skip_validation
      })
    },
    'Failed to add task'
  );

type TaskListApiResponse = {
  tasks?: TaskData[];
  items?: TaskData[];
  total?: number;
  hasMore?: boolean;
  offset?: number;
  limit?: number;
};

export const listTasks = async (options: Record<string, unknown> = {}) => {
  const url = buildUrl(API_BASE, 'tasks', options as Record<string, string | number | boolean>);
  try {
    const response = await fetchJson<TaskListApiResponse>(url, undefined, 'Failed to list tasks');
    const tasks = response.tasks ?? response.items ?? [];
    const total = response.total ?? tasks.length;
    return {
      tasks,
      total,
      hasMore: response.hasMore ?? false,
      offset: response.offset ?? 0,
      limit: response.limit ?? (typeof options.limit === 'number' ? options.limit : undefined)
    };
  } catch {
    return {
      tasks: [],
      total: 0,
      hasMore: false,
      offset: 0,
      limit: typeof options.limit === 'number' ? options.limit : undefined
    };
  }
};

export const getTask = async (taskId: string): Promise<TaskData | null> => {
  const response = await fetch(`${API_BASE}/tasks/${encodeURIComponent(taskId)}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as any).error || 'Failed to get task');
  }
  const data = await response.json();
  return data.task as TaskData;
};

export const setTaskSpecState = (taskId: string, next: 'draft' | 'spec_in_progress' | 'spec_ready') =>
  fetchJson<{ task: TaskData }>(
    `${API_BASE}/tasks/${encodeURIComponent(taskId)}/spec-state`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ next }) },
    'Failed to set spec state'
  );

export const getTaskSpecBundle = (taskId: string, compact = true) =>
  fetchJson<{ bundle: any; compact: boolean }>(
    `${API_BASE}/tasks/${encodeURIComponent(taskId)}/spec-bundle?compact=${compact ? '1' : '0'}`,
    undefined,
    'Failed to get spec bundle'
  );

export const updateTask = (
  taskId: string,
  updates: {
    title?: string;
    description?: string;
    taskStatus?: string;
    taskPriority?: string;
    taskType?: string;
    assignedTo?: string;
    estimatedEffort?: string;
    actualEffort?: string;
    dueDate?: string;
    stableTags?: string[];
    entity_links?: Array<{ entity_type: string; entity_id: string; entity_name?: string; link_strength?: 'primary' | 'secondary' | 'reference' }>;
    parentId?: string;
    sortOrder?: number;
    checklists?: any[];
    spec_state?: 'draft' | 'spec_in_progress' | 'spec_ready';
    skip_validation?: boolean;
    transitionGateToken?: string;
    transitionGateResponse?: string;
  }
) => {
  const body = Object.fromEntries(
    Object.entries({
      title: updates.title,
      description: updates.description,
      task_status: updates.taskStatus,
      task_priority: updates.taskPriority,
      task_type: updates.taskType,
      assigned_to: updates.assignedTo,
      estimated_effort: updates.estimatedEffort,
      actual_effort: updates.actualEffort,
      due_date: updates.dueDate,
      stable_tags: updates.stableTags,
      entity_links: updates.entity_links,
      parent_id: updates.parentId,
      sort_order: updates.sortOrder,
      checklists: updates.checklists,
      spec_state: updates.spec_state,
      skip_validation: updates.skip_validation,
      transition_gate_token: updates.transitionGateToken,
      transition_gate_response: updates.transitionGateResponse
    }).filter(([, value]) => value !== undefined)
  );

  const url = buildUrl(API_BASE, `tasks/${encodeURIComponent(taskId)}`);

  return fetch(url, addProjectHeader({
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(body)
  })).then(async response => {
    if (response.status === 409) {
      let gate: any = null;
      let message = 'Task update blocked by workflow gate';
      try {
        const data = await response.json();
        gate = data?.gate;
        if (data?.error) message = data.error;
      } catch {
        /* ignore parse errors */
      }
      throw new TaskUpdateError(message, gate);
    }

    if (!response.ok) {
      let message = 'Failed to update task';
      try {
        const data = await response.json();
        if (data?.error) message = data.error;
      } catch {
        try {
          const text = await response.text();
          if (text) message = text;
        } catch {
          /* ignore */
        }
      }
      throw new Error(message);
    }

    return response.json() as Promise<{ task: TaskData }>;
  });
};

export const deleteTask = (taskId: string) =>
  fetchJson<{ success: boolean }>(
    `${API_BASE}/tasks/${encodeURIComponent(taskId)}`,
    { method: 'DELETE' },
    'Failed to delete task'
  );

export const getTaskDependencies = (taskId: string) =>
  fetchJson<{ incoming: TaskDependency[]; outgoing: TaskDependency[] }>(
    `${API_BASE}/tasks/${encodeURIComponent(taskId)}/dependencies`,
    undefined,
    'Failed to get dependencies'
  );

export const addTaskChecklist = (taskId: string, name: string, items: string[]) =>
  fetchJson<{ success: boolean }>(
    `${API_BASE}/tasks/${encodeURIComponent(taskId)}/checklists`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ name, items }) },
    'Failed to add checklist'
  );

export const addTaskDependency = (
  taskId: string,
  dependency: {
    dependency_task_id: string;
    dependency_type?: string;
    required?: boolean;
  }
) =>
  fetchJson<{ success: boolean }>(
    `${API_BASE}/tasks/${encodeURIComponent(taskId)}/dependencies`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(dependency) },
    'Failed to add dependency'
  );

export const removeTaskDependency = (taskId: string, dependencyId: string) =>
  fetchJson<{ success: boolean }>(
    `${API_BASE}/tasks/${encodeURIComponent(taskId)}/dependencies/${encodeURIComponent(dependencyId)}`,
    { method: 'DELETE' },
    'Failed to remove dependency'
  );

export const listTaskDependencies = () =>
  fetchJson<{ dependencies: TaskDependency[] }>(`${API_BASE}/tasks/dependencies`, undefined, 'Failed to list dependencies');
