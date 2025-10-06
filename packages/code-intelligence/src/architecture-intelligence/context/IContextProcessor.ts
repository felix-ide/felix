/**
 * Context Processor Interface
 * 
 * Defines the interface for context processors that transform and optimize
 * context data during the generation process.
 */

import type {
  ContextData,
  ContextGenerationOptions,
  ContextQuery,
  ProcessorResult,
  ComponentPriority
} from './types.js';

/**
 * Base interface for all context processors
 */
export interface IContextProcessor {
  /** Processor name for identification */
  readonly name: string;
  
  /** Processor description */
  readonly description: string;
  
  /** Processor version */
  readonly version: string;
  
  /** Processing priority (lower numbers run first) */
  readonly priority: number;
  
  /**
   * Process context data according to processor logic
   * 
   * @param data - Context data to process
   * @param query - Original query that generated the context
   * @param options - Context generation options
   * @returns Processed result
   */
  process(
    data: ContextData, 
    query: ContextQuery, 
    options: ContextGenerationOptions
  ): Promise<ProcessorResult> | ProcessorResult;
  
  /**
   * Check if this processor can handle the given data
   * 
   * @param data - Context data to check
   * @param options - Context generation options
   * @returns True if processor can handle the data
   */
  canProcess(data: ContextData, options: ContextGenerationOptions): boolean;
  
  /**
   * Get configuration schema for this processor
   * 
   * @returns Configuration options that this processor accepts
   */
  getConfigSchema(): Record<string, any>;
  
  /**
   * Validate processor configuration
   * 
   * @param config - Configuration to validate
   * @returns True if configuration is valid, error message if not
   */
  validateConfig(config: any): true | string;
}

/**
 * Window size processor interface for token management
 */
export interface IWindowSizeProcessor extends IContextProcessor {
  /**
   * Estimate token count for content
   * 
   * @param content - Content to estimate
   * @returns Estimated token count
   */
  estimateTokens(content: string): number;
  
  /**
   * Reduce content to fit within token limits
   * 
   * @param data - Context data to reduce
   * @param targetTokens - Target token count
   * @param options - Generation options
   * @returns Reduced context data
   */
  reduceToTokenLimit(
    data: ContextData, 
    targetTokens: number, 
    options: ContextGenerationOptions,
    query: ContextQuery
  ): ContextData;
  
  /**
   * Get content reduction strategies
   * 
   * @returns Available reduction strategies
   */
  getReductionStrategies(): string[];
}

/**
 * Priority processor interface for relevance scoring
 */
export interface IPriorityProcessor extends IContextProcessor {
  /**
   * Calculate component priorities based on query and relationships
   * 
   * @param data - Context data containing components
   * @param query - Original query
   * @param options - Generation options
   * @returns Component priorities
   */
  calculatePriorities(
    data: ContextData,
    query: ContextQuery,
    options: ContextGenerationOptions
  ): ComponentPriority[];
  
  /**
   * Score component relevance to query
   * 
   * @param componentId - Component to score
   * @param query - Query to match against
   * @param data - Full context data
   * @returns Relevance score (0-1)
   */
  scoreRelevance(
    componentId: string,
    query: ContextQuery,
    data: ContextData
  ): number;
  
  /**
   * Score component importance based on relationships
   * 
   * @param componentId - Component to score
   * @param data - Full context data
   * @returns Importance score (0-1)
   */
  scoreImportance(componentId: string, data: ContextData): number;
}

/**
 * Compression processor interface for content optimization
 */
export interface ICompressionProcessor extends IContextProcessor {
  /**
   * Compress context data by removing redundancy
   * 
   * @param data - Context data to compress
   * @param options - Compression options
   * @returns Compressed context data
   */
  compress(data: ContextData, options: any): ContextData;
  
  /**
   * Remove duplicate components and relationships
   * 
   * @param data - Context data to deduplicate
   * @returns Deduplicated context data
   */
  removeDuplicates(data: ContextData): ContextData;
  
  /**
   * Summarize verbose content
   * 
   * @param content - Content to summarize
   * @param maxLength - Maximum summary length
   * @returns Summarized content
   */
  summarizeContent(content: string, maxLength: number): string;
}

/**
 * Language processor interface for multi-language support
 */
export interface ILanguageProcessor extends IContextProcessor {
  /**
   * Group components by programming language
   * 
   * @param data - Context data to group
   * @returns Data grouped by language
   */
  groupByLanguage(data: ContextData): Record<string, ContextData>;
  
  /**
   * Generate language-specific context insights
   * 
   * @param data - Context data for specific language
   * @param language - Programming language
   * @returns Language insights
   */
  generateLanguageInsights(data: ContextData, language: string): any;
  
  /**
   * Find cross-language relationships
   * 
   * @param data - Multi-language context data
   * @returns Cross-language relationships
   */
  findCrossLanguageRelationships(data: ContextData): any[];
}

/**
 * Formatting processor interface for output generation
 */
export interface IFormattingProcessor extends IContextProcessor {
  /**
   * Format context data as markdown
   * 
   * @param data - Context data to format
   * @param options - Formatting options
   * @returns Formatted markdown content
   */
  formatAsMarkdown(data: ContextData, options: any): string;
  
  /**
   * Format context data as JSON
   * 
   * @param data - Context data to format
   * @param options - Formatting options
   * @returns Formatted JSON content
   */
  formatAsJson(data: ContextData, options: any): string;
  
  /**
   * Format context data as plain text
   * 
   * @param data - Context data to format
   * @param options - Formatting options
   * @returns Formatted text content
   */
  formatAsText(data: ContextData, options: any): string;
  
  /**
   * Generate context sections
   * 
   * @param data - Context data to section
   * @param options - Sectioning options
   * @returns Context sections
   */
  generateSections(data: ContextData, options: any): any[];
}

/**
 * Processor chain manager interface
 */
export interface IProcessorChain {
  /**
   * Add processor to the chain
   * 
   * @param processor - Processor to add
   * @returns This chain for method chaining
   */
  addProcessor(processor: IContextProcessor): IProcessorChain;
  
  /**
   * Remove processor from the chain
   * 
   * @param processorName - Name of processor to remove
   * @returns True if processor was removed
   */
  removeProcessor(processorName: string): boolean;
  
  /**
   * Get processor by name
   * 
   * @param name - Processor name
   * @returns Processor instance or null
   */
  getProcessor(name: string): IContextProcessor | null;
  
  /**
   * Execute all processors in the chain
   * 
   * @param data - Initial context data
   * @param query - Original query
   * @param options - Generation options
   * @returns Final processed result
   */
  execute(
    data: ContextData,
    query: ContextQuery,
    options: ContextGenerationOptions
  ): Promise<ProcessorResult>;
  
  /**
   * Get ordered list of processors
   * 
   * @returns Processors ordered by priority
   */
  getProcessors(): IContextProcessor[];
  
  /**
   * Clear all processors from the chain
   */
  clear(): void;
}

/**
 * Processor factory interface for creating processors
 */
export interface IProcessorFactory {
  /**
   * Create a processor by name
   * 
   * @param name - Processor name
   * @param config - Processor configuration
   * @returns Processor instance
   */
  createProcessor(name: string, config?: any): IContextProcessor;
  
  /**
   * Register a processor type
   * 
   * @param name - Processor name
   * @param constructor - Processor constructor
   */
  registerProcessor(name: string, constructor: new (config?: any) => IContextProcessor): void;
  
  /**
   * Get available processor names
   * 
   * @returns List of registered processor names
   */
  getAvailableProcessors(): string[];
  
  /**
   * Check if processor is available
   * 
   * @param name - Processor name
   * @returns True if processor is available
   */
  hasProcessor(name: string): boolean;
}