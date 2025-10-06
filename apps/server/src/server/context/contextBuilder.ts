import path from 'path';
import { ContextGenerationAPI } from '@felix/code-intelligence';
import { logger } from '../../shared/logger.js';

export interface ContextRequestOptions {
  depth?: number;
  includeSource?: boolean;
  includeRelationships?: boolean;
  includeDocumentation?: boolean;
  includeMetadata?: boolean;
  includeNotes?: boolean;
  includeRules?: boolean;
  includeTasks?: boolean;
  targetTokens?: number;
  outputFormat?: string;
  priorityComponents?: string[];
  languageFilter?: string[];
  query?: string;
  lens?: string;
  relationshipTypes?: string[];
}

export interface ContextBuildResult {
  content: string;
  component: any;
  component_detail: any;
  components: any[];
  relationships: any[];
  metadata: Record<string, unknown>;
  tokenCount: number;
  stats: Record<string, unknown>;
  warnings: string[];
}

const DEFAULT_TARGET_TOKENS = 1_000_000;
const DEFAULT_DEPTH = 3;

export async function buildContextResponse(
  indexer: any,
  componentId: string,
  options: ContextRequestOptions = {}
): Promise<ContextBuildResult | null> {
  if (!componentId) return null;

  // ALWAYS use functional relationship-based context (not hierarchical tree walking)
  const { buildFunctionalContext } = await import('./FunctionalContextBuilder.js');
  return buildFunctionalContext(indexer, componentId, {
    ...options,
    lens: options.lens || 'default'
  });
}

