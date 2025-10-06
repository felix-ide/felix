import { API_BASE, buildUrl, fetchJson } from './http';

export const getContext = (
  entityId: string,
  options: {
    depth?: number;
    includeSource?: boolean;
    includeRelationships?: boolean;
    includeDocumentation?: boolean;
    includeMetadata?: boolean;
    includeNotes?: boolean;
    includeRules?: boolean;
    includeTasks?: boolean;
    targetTokens?: number;
    format?: 'markdown' | 'json' | 'text' | 'json-compressed' | 'markdown-compressed' | 'aiccl' | 'aiccl-expand';
  } = {}
) => {
  const url = buildUrl(API_BASE, 'context', {
    entity_id: entityId,
    depth: options.depth ?? 3,
    include_source: options.includeSource ?? true,
    include_relationships: options.includeRelationships ?? true,
    include_documentation: options.includeDocumentation ?? true,
    include_metadata: options.includeMetadata ?? true,
    include_notes: options.includeNotes ?? true,
    include_rules: options.includeRules ?? true,
    include_tasks: options.includeTasks ?? false,
    target_tokens: options.targetTokens ?? 1_000_000,
    output_format: options.format || 'markdown'
  });

  return fetchJson<{ 
    content: string; 
    component?: any; 
    component_detail?: any;
    components?: any[]; 
    relationships?: any[]; 
    metadata?: any; 
    stats: any; 
    tokenCount: number; 
    warnings: string[] 
  }>(
    url,
    undefined,
    'Get context failed'
  );
};
