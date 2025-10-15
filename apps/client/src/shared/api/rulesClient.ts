import { API_BASE, JSON_HEADERS, buildUrl, fetchJson } from './http';
import type { RuleData } from '@/types/api';

export const addRule = (rule: {
  name: string;
  description?: string;
  ruleType: string;
  guidanceText: string;
  priority?: number;
  autoApply?: boolean;
  parentId?: string;
  entity_links?: Array<{ entity_type: string; entity_id: string; entity_name?: string; link_strength?: 'primary' | 'secondary' | 'reference' }>;
  stableTags?: string[];
}) =>
  fetchJson<{ rule: unknown }>(
    `${API_BASE}/rules`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        name: rule.name,
        description: rule.description,
        rule_type: rule.ruleType,
        guidance_text: rule.guidanceText,
        priority: rule.priority || 5,
        auto_apply: rule.autoApply || false,
        parent_id: rule.parentId,
        entity_links: rule.entity_links,
        stable_tags: rule.stableTags
      })
    },
    'Failed to add rule'
  );

export interface ListRulesResponse {
  rules: RuleData[];
}

export const listRules = async (options: { includeAutomation?: boolean } = {}): Promise<ListRulesResponse> => {
  const url = buildUrl(API_BASE, 'rules', {
    include_automation: options.includeAutomation
  });
  try {
    return await fetchJson<ListRulesResponse>(url, undefined, 'Failed to list rules');
  } catch {
    return { rules: [] };
  }
};

export const getRule = async (ruleId: string) => {
  const response = await fetch(`${API_BASE}/rules/${encodeURIComponent(ruleId)}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as any).error || 'Failed to get rule');
  }
  const data = await response.json();
  return data.rule;
};

export const updateRule = (ruleId: string, updates: Record<string, unknown>) =>
  fetchJson<{ rule: unknown }>(
    `${API_BASE}/rules/${encodeURIComponent(ruleId)}`,
    { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined))) },
    'Failed to update rule'
  );

export const deleteRule = (ruleId: string) =>
  fetchJson<{ success: boolean }>(
    `${API_BASE}/rules/${encodeURIComponent(ruleId)}`,
    { method: 'DELETE' },
    'Failed to delete rule'
  );
