/**
 * Shared types for context optimization and RAG functionality
 */

import type { ContextData, ContextQuery, ContextItem, ContextRelationship } from './interfaces.js';
import { ComponentType, RelationshipType, DEFAULT_TYPE_WEIGHTS } from '../../code-analysis-types/index.js';

// Re-export from code-analysis-types to avoid duplication
export { ComponentType, RelationshipType, DEFAULT_TYPE_WEIGHTS } from '../../code-analysis-types/index.js';

/**
 * Configuration for context optimization
 */
export interface ContextOptimizationConfig {
  enableTokenOptimization: boolean;
  tokenEstimationMethod: 'char-count' | 'word-count' | 'gpt-tokenizer';
  charsPerToken: number;
  reductionStrategies: {
    removeLowPriority: boolean;
    truncateDescriptions: boolean;
    summarizeCodeBlocks: boolean;
    removeDuplicates: boolean;
  };
  minimumThresholds: {
    minItems: number;
    minRelationships: number;
    minTokens: number;
  };
}

/**
 * Component priority information
 */
export interface ComponentPriority {
  itemId: string;
  score: number;
  reasons: string[];
  relationshipScore: number;
  queryScore: number;
  baseScore: number;
}

/**
 * Default content type weights
 */
export const DEFAULT_CONTENT_WEIGHTS = {
  code: 1.5,
  documentation: 1.2,
  relationships: 1.0,
  metadata: 0.8,
  comments: 0.6
};

// DEFAULT_TYPE_WEIGHTS is now imported from code-analysis-types above

/**
 * Default match multipliers for relevance scoring
 */
export const DEFAULT_MATCH_MULTIPLIERS = {
  exactMatch: 5.0,
  nameMatch: 2.0,
  keywordRelevance: 1.5,
  codeMatch: 0.1,
  docMatch: 1.0
};

/**
 * Optimization strategy types
 */
export type ReductionStrategy = 
  | 'removeDuplicates'
  | 'truncateDescriptions' 
  | 'summarizeCodeBlocks'
  | 'removeLowPriority';

/**
 * Result of content optimization
 */
export interface OptimizationResult {
  optimizedData: ContextData;
  originalTokens: number;
  finalTokens: number;
  itemsRemoved: number;
  relationshipsRemoved: number;
  processingTime: number;
  strategiesApplied: ReductionStrategy[];
  warnings: string[];
}