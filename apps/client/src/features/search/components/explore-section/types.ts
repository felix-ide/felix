import type { GuardrailInfo } from '@client/shared/api/searchClient';

export interface SearchResult {
  id: string;
  name: string;
  type: string;
  score?: number;
  filePath?: string;
  snippet?: string;
  metadata?: Record<string, unknown>;
}

export interface ExploreSearchFilters {
  entityTypes: string[];
  componentTypes: string[];
  includeCode: boolean;
  expandTerms: boolean;
}

export interface ContextData {
  content: string;
  stats: any;
  tokenCount: number;
  warnings: string[];
  notes?: any[];
  rules?: any[];
  tasks?: any[];
  metadata?: {
    notes?: any[];
    rules?: any[];
    tasks?: any[];
    [key: string]: any;
  };
}

export interface ContextOptions {
  depth: number;
  targetTokens: number;
  includeSource: boolean;
  includeRelationships: boolean;
  includeDocumentation: boolean;
  includeMetadata: boolean;
  includeNotes: boolean;
  includeRules: boolean;
  includeTasks: boolean;
  outputFormat: 'ui' | 'json' | 'json-compressed' | 'markdown' | 'markdown-compressed' | 'text' | 'aiccl' | 'aiccl-expand';
}

export interface ExploreSectionDerivedState {
  totalResults: number;
  searchGuardrails: GuardrailInfo | null;
}
