import { API_BASE, JSON_HEADERS, fetchJson, buildUrl } from './http';

export interface KBConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
  placeholder?: string;
  options?: string[];
  defaultValue?: any;
  required?: boolean;
}

export interface KBTemplate {
  name: string;
  display_name: string;
  description: string;
  version: string;
  sections: string[];
  config_schema?: KBConfigField[];
}

export interface KBNode {
  id: string;
  title: string;
  content: string;
  metadata?: any;
  children: KBNode[];
}

export interface KBListItem {
  id: string;
  title: string;
  kb_type: string;
  template_name: string;
  template_version: string;
  created_at: string;
  is_project_kb?: boolean;
}

export const getKBTemplates = () =>
  fetchJson<{ success: boolean; templates: KBTemplate[] }>(
    buildUrl(API_BASE, 'kb/templates'),
    undefined,
    'Failed to get KB templates'
  );

export const createKBFromTemplate = (
  templateName: string,
  customName: string,
  kbConfig?: Record<string, any>,
  parentId?: string
) =>
  fetchJson<{
    success: boolean;
    root_id: string;
    created_nodes: number;
    message: string;
  }>(
    buildUrl(API_BASE, 'kb/create-from-template'),
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        template_name: templateName,
        custom_name: customName,
        kb_config: kbConfig,
        parent_id: parentId
      })
    },
    'Failed to create KB from template'
  );

export const getKBStructure = (kbId: string) =>
  fetchJson<{ success: boolean; structure: KBNode }>(
    buildUrl(API_BASE, 'kb/structure', { kb_id: kbId }),
    undefined,
    'Failed to get KB structure'
  );

export const listKnowledgeBases = (kbType?: string) =>
  fetchJson<{ success: boolean; knowledge_bases: KBListItem[] }>(
    buildUrl(API_BASE, 'kb/list', kbType ? { kb_type: kbType } : undefined),
    undefined,
    'Failed to list knowledge bases'
  );

export const updateKBNode = (nodeId: string, updates: { title?: string; content?: string }) =>
  fetchJson<{ success: boolean; message: string }>(
    buildUrl(API_BASE, `kb/node/${nodeId}`),
    {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(updates)
    },
    'Failed to update KB node'
  );

export const createKBNode = (parentId: string, title: string, content?: string) =>
  fetchJson<{ success: boolean; node_id: string; message: string }>(
    buildUrl(API_BASE, 'kb/node'),
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        parent_id: parentId,
        title,
        content: content || ''
      })
    },
    'Failed to create KB node'
  );

export const updateKBConfig = (kbId: string, config: Record<string, any>) =>
  fetchJson<{ success: boolean; updated_rules: number; message: string }>(
    buildUrl(API_BASE, `kb/${kbId}/config`),
    {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ config })
    },
    'Failed to update KB configuration'
  );
