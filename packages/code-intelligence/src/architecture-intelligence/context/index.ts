/**
 * Context Generation Module Exports
 */

// Main API
export { ContextGenerationAPI } from './ContextGenerationAPI.js';
export type { ContextQuery, ContextResult } from './ContextGenerationAPI.js';

// Types and interfaces
export type {
  ContextData,
  ContextGenerationOptions,
  ContextGenerationEvents,
  ComponentPriority,
  ContextSection,
  MultiLanguageContextConfig,
  ContextOptimizationConfig,
  ProcessorResult,
  ContextTemplate,
  ContextQuery as TypesContextQuery
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
// ProcessorAdapter is disabled - depends on @felix/semantic-intelligence (internal)

// Format adapters
export { AdapterFactory } from './adapters/AdapterFactory.js';
export { AICCLMarkdownAdapter } from './adapters/AICCLMarkdownAdapter.js';
export { AICCLDecompressionAdapter } from './adapters/AICCLDecompressionAdapter.js';
export { MarkdownAdapter } from './adapters/MarkdownAdapter.js';
export { JsonAdapter } from './adapters/JsonAdapter.js';
export { TextAdapter } from './adapters/TextAdapter.js';
export type { IFormatAdapter } from './adapters/IFormatAdapter.js';
