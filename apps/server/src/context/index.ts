/**
 * Context Generation Module - Exports for context generation system
 * 
 * This module provides comprehensive context generation capabilities
 * for code analysis and documentation generation.
 */

// Core API
export { ContextGenerationAPI } from '@felix/code-intelligence';

// Format adapters - re-export from architectural-intelligence
export {
  AdapterFactory,
  AICCLMarkdownAdapter,
  AICCLDecompressionAdapter,
  MarkdownAdapter,
  JsonAdapter,
  TextAdapter
} from '@felix/code-intelligence';

// Types and interfaces
export type {
  ContextGenerationOptions,
  ContextQuery,
  ContextData,
  ContextResult,
  ContextGenerationEvents,
  ComponentPriority,
  ContextSection,
  MultiLanguageContextConfig,
  ContextOptimizationConfig,
  ProcessorResult,
  ContextTemplate
} from './types.js';

// Processor interfaces
export type {
  IContextProcessor,
  IWindowSizeProcessor,
  IPriorityProcessor,
  ICompressionProcessor,
  ILanguageProcessor,
  IFormattingProcessor,
  IProcessorChain,
  IProcessorFactory
} from './IContextProcessor.js';

// Processor implementations
export { ProcessorChain } from './ProcessorChain.js';
export { LanguageProcessor } from './LanguageProcessor.js';

// Note: WindowSizeProcessor, RelevanceScoreProcessor, and RelevanceFilterProcessor
// are now imported from @felix/code-intelligence/semantic-intelligence

import type { ContextGenerationOptions, ContextQuery } from './types.js';
import { ContextGenerationAPI } from '@felix/code-intelligence';

// Default context generation setup
export function createDefaultContextGenerator(
  knowledgeGraph: any,
  options: Partial<ContextGenerationOptions> = {}
): ContextGenerationAPI {
  // Map options to architectural-intelligence format
  const archOptions = {
    ...options,
    outputFormat: options.outputFormat === 'index' ? 'json' : options.outputFormat
  } as any;
  
  // The architectural-intelligence API takes processors as second param
  return new ContextGenerationAPI(knowledgeGraph, [], archOptions);
}

// Utility functions
export function createContextQuery(
  componentId?: string,
  options: Partial<ContextQuery> = {}
): ContextQuery {
  return {
    componentId,
    ...options
  } as ContextQuery;
}

export function createDefaultOptions(
  overrides: Partial<ContextGenerationOptions> = {}
): ContextGenerationOptions {
  return {
    targetTokenSize: 8000,
    maxDepth: 3,
    includeSourceCode: true,
    includeDocumentation: true,
    includeRelationships: true,
    includeMetadata: false,
    outputFormat: 'markdown',
    ...overrides
  } as ContextGenerationOptions;
}
