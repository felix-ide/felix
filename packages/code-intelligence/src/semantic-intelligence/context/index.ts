/**
 * Context optimization and RAG functionality for semantic search
 * 
 * This module provides comprehensive content optimization for Retrieval Augmented Generation (RAG)
 * applications, including relevance scoring, content filtering, and token budget management.
 */

// Core interfaces and types
export type {
  ContextQuery,
  ContextItem,
  ContextRelationship,
  ContextData,
  ProcessorResult,
  ContextOptimizationOptions,
  RelevanceOptions,
  FilterOptions,
  WindowSizeOptions,
  IContextProcessor,
  IRelevanceProcessor,
  IFilterProcessor,
  IWindowSizeProcessor
} from './interfaces.js';

export {
  ComponentType,
  RelationshipType,
  DEFAULT_CONTENT_WEIGHTS,
  DEFAULT_TYPE_WEIGHTS,
  DEFAULT_MATCH_MULTIPLIERS,
  type ContextOptimizationConfig,
  type ComponentPriority,
  type ReductionStrategy,
  type OptimizationResult
} from './types.js';

// Individual processors
export { RelevanceScoreProcessor } from './RelevanceScoreProcessor.js';
export { RelevanceFilterProcessor } from './RelevanceFilterProcessor.js';
export { WindowSizeProcessor } from './WindowSizeProcessor.js';

// Unified optimizer
export { ContentOptimizer, type ContentOptimizerOptions } from './ContentOptimizer.js';

// Export processor types and implementations
export type {
  IContentProcessor,
  IReductionStrategy,
  IProcessorRegistry
} from './processors/index.js';

export {
  BaseContentProcessor,
  CodeContentProcessor,
  DocumentContentProcessor,
  GenericContentProcessor,
  ProcessorRegistry
} from './processors/index.js';

// Convenience function for quick optimization
import { ContentOptimizer } from './ContentOptimizer.js';
import { WindowSizeProcessor } from './WindowSizeProcessor.js';
import { RelevanceScoreProcessor } from './RelevanceScoreProcessor.js';
import type { ContextData, ContextQuery, ContextItem, RelevanceOptions } from './interfaces.js';
import type { ContentOptimizerOptions } from './ContentOptimizer.js';

export async function optimizeContent(
  data: ContextData,
  query: ContextQuery,
  options: ContentOptimizerOptions
) {
  const optimizer = new ContentOptimizer(options);
  return optimizer.optimize(data, query);
}

// Convenience function for token estimation
export function estimateTokens(content: string, outputFormat?: string): number {
  const processor = new WindowSizeProcessor();
  return processor.estimateTokens(content, outputFormat);
}

// Convenience function for relevance calculation
export async function calculateRelevance(
  item: ContextItem,
  query: ContextQuery,
  options?: RelevanceOptions
): Promise<number> {
  const processor = new RelevanceScoreProcessor(options);
  return processor.calculateRelevance(item, query, options || {});
}