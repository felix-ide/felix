const DEFAULT_API_BASE = 'http://localhost:9000/api';

const resolveApiBase = (): string => {
  if (typeof window !== 'undefined' && (window as any).__FELIX_API_URL) {
    return (window as any).__FELIX_API_URL as string;
  }
  return DEFAULT_API_BASE;
};

export const API_BASE = resolveApiBase();
export const FILES_BASE = `${API_BASE}/files`;
export const JSON_HEADERS: HeadersInit = { 'Content-Type': 'application/json' };

/**
 * Get current project path from store
 * This is used to include project in all API requests
 */
const getCurrentProjectPath = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;

  // Access zustand store directly - it's stored in localStorage as 'project-store'
  try {
    const stored = localStorage.getItem('project-store');
    if (!stored) return undefined;
    const data = JSON.parse(stored);
    return data?.state?.path;
  } catch {
    return undefined;
  }
};

const extractErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const data = await response.json();
    if (data && typeof data === 'object' && 'error' in data) {
      return (data as any).error || fallback;
    }
  } catch {
    try {
      const text = await response.text();
      if (text) return text;
    } catch {
      /* ignore */
    }
  }
  return fallback;
};

export const buildUrl = (
  base: string,
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>
): string => {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const url = new URL(path, normalizedBase);

  // ALWAYS include current project path in query params (stateless API)
  const projectPath = getCurrentProjectPath();
  if (projectPath) {
    url.searchParams.set('project', projectPath);
  }

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
};

/**
 * Add project header to request init if project is set
 */
const addProjectHeader = (init: RequestInit = {}): RequestInit => {
  const projectPath = getCurrentProjectPath();
  if (!projectPath) return init;

  return {
    ...init,
    headers: {
      ...init.headers,
      'X-Project-Path': projectPath
    }
  };
};

export const fetchJson = async <T>(url: string, init: RequestInit = {}, fallbackError: string): Promise<T> => {
  const response = await fetch(url, addProjectHeader(init));
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, fallbackError));
  }
  if (response.status === 204) {
    return undefined as unknown as T;
  }
  return response.json();
};

export const fetchText = async (url: string, init: RequestInit = {}, fallbackError: string): Promise<string> => {
  const response = await fetch(url, addProjectHeader(init));
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, fallbackError));
  }
  return response.text();
};

export const fetchVoid = async (url: string, init: RequestInit = {}, fallbackError: string): Promise<void> => {
  const response = await fetch(url, addProjectHeader(init));
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, fallbackError));
  }
};
