import { API_BASE, FILES_BASE, JSON_HEADERS, buildUrl, fetchJson, fetchVoid } from './http';

export const getFileComponents = () =>
  fetchJson<{ files: any[] }>(`${API_BASE}/components/files`, undefined, 'Failed to get file components');

export const getFileComponentDetails = (fileId: string) =>
  fetchJson<{ file: any; components: any[] }>(
    `${API_BASE}/components/files/${encodeURIComponent(fileId)}/components`,
    undefined,
    'Failed to get file component details'
  );

export const getAllComponents = () =>
  fetchJson<{ components: any[] }>(`${API_BASE}/components/all`, undefined, 'Failed to get all components');

export const getAllRelationships = () =>
  fetchJson<{ relationships: any[] }>(`${API_BASE}/relationships/all`, undefined, 'Failed to get all relationships');

export const readFile = (path: string, project?: string) => {
  const url = buildUrl(FILES_BASE, 'content', { path, project });
  return fetchJson<{ content: string; encoding: string }>(url, undefined, 'Failed to read file');
};

export const writeFile = (path: string, content: string, project?: string) => {
  const url = buildUrl(FILES_BASE, 'content', { path, project });
  return fetchVoid(
    url,
    { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ content }) },
    'Failed to write file'
  );
};

export const deleteFile = (path: string, project?: string) => {
  const url = buildUrl(FILES_BASE, 'content', { path, project });
  return fetchVoid(url, { method: 'DELETE' }, 'Failed to delete file');
};

export const listDirectory = (path = '', project?: string) => {
  const url = buildUrl(FILES_BASE, 'list', { path, project });
  return fetchJson<any>(url, undefined, 'Failed to list directory');
};

export const getFileTree = (path = '', maxDepth = 3, project?: string) => {
  const url = buildUrl(FILES_BASE, 'tree', { path, maxDepth, project });
  return fetchJson<any>(url, undefined, 'Failed to get file tree');
};

export const searchFiles = (
  pattern: string,
  options: { wholeWord?: boolean; caseSensitive?: boolean; regex?: boolean; filePattern?: string; maxResults?: number } = {},
  project?: string
) => {
  const url = buildUrl(FILES_BASE, 'search', project ? { project } : undefined);
  return fetchJson<any>(
    url,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ pattern, ...options }) },
    'Failed to search files'
  );
};

export const getFileStats = (path: string, project?: string) => {
  const url = buildUrl(FILES_BASE, 'stats', { path, project });
  return fetchJson<any>(url, undefined, 'Failed to get file stats');
};

export const moveFile = (oldPath: string, newPath: string, project?: string) => {
  const url = buildUrl(FILES_BASE, 'move', project ? { project } : undefined);
  return fetchVoid(
    url,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ oldPath, newPath }) },
    'Failed to move file'
  );
};

export const createDirectory = (path: string, project?: string) => {
  const url = buildUrl(FILES_BASE, 'mkdir', project ? { project } : undefined);
  return fetchVoid(
    url,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ path }) },
    'Failed to create directory'
  );
};
