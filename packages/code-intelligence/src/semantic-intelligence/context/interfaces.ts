/**
 * Context processing interfaces for semantic search and RAG systems
 */

export interface ContextQuery {
  componentId?: string;
  componentName?: string;
  componentType?: string;
  language?: string;
  filePath?: string;
  query?: string;
}

export interface ContextItem {
  id: string;
  name: string;
  type: string;
  content?: string;
  code?: string;
  metadata?: {
    relevanceScore?: number;
    weightedRelevanceScore?: number;
    description?: string;
    documentation?: string;
    summary?: string;
    signature?: string;
    parameters?: Array<{ name: string; type: string }>;
    [key: string]: any;
  };
  location?: {
    startLine: number;
    endLine: number;
  };
  filePath?: string;
  language?: string;
}

export interface ContextRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  metadata?: {
    relevanceScore?: number;
    weightedRelevanceScore?: number;
    [key: string]: any;
  };
}

export interface ContextData {
  items: ContextItem[];
  relationships: ContextRelationship[];
  query?: string;
  metadata?: {
    totalItems?: number;
    totalRelationships?: number;
    processingSteps?: string[];
    generationTime?: number;
    warnings?: string[];
    [key: string]: any;
  };
}

export interface ProcessorResult {
  data: ContextData;
  metadata: {
    processorName: string;
    processingTime: number;
    itemsProcessed: number;
    itemsFiltered: number;
  };
  warnings: string[];
}

export interface ContextOptimizationOptions {
  /** Target token count for output */
  targetTokens: number;
  /** Include source code in output */
  includeSourceCode?: boolean;
  /** Include relationships in output */
  includeRelationships?: boolean;
  /** Output format for token estimation */
  outputFormat?: 'json' | 'markdown' | 'text' | 'index';
  /** Enable minification */
  minified?: boolean;
  /** Custom token estimation method */
  tokenEstimationMethod?: 'char-count' | 'word-count' | 'gpt-tokenizer';
  /** Characters per token for estimation */
  charsPerToken?: number;
}

export interface RelevanceOptions {
  /** Weights for different component types */
  typeWeights?: Record<string, number>;
  /** Multipliers for different match types */
  matchMultipliers?: {
    exactMatch: number;
    nameMatch: number;
    keywordRelevance: number;
    codeMatch: number;
    docMatch: number;
  };
  /** Maximum keywords to extract from query */
  maxKeywords?: number;
}

export interface FilterOptions {
  /** Minimum percentage of items to retain */
  minRetention?: number;
  /** Content type weights - higher means more likely to be kept */
  contentWeights?: {
    code: number;
    documentation: number;
    relationships: number;
    metadata: number;
    comments: number;
  };
  /** Minimum relevance score to keep item */
  relevanceThreshold?: number;
  /** Maximum length for truncating descriptions */
  maxDescriptionLength?: number;
}

export interface WindowSizeOptions {
  /** Enable token optimization */
  enableOptimization?: boolean;
  /** Reduction strategies to apply */
  reductionStrategies?: {
    removeLowPriority: boolean;
    truncateDescriptions: boolean;
    summarizeCodeBlocks: boolean;
    removeDuplicates: boolean;
  };
  /** Minimum thresholds to maintain */
  minimumThresholds?: {
    minItems: number;
    minRelationships: number;
    minTokens: number;
  };
}

/**
 * Base interface for context processors
 */
export interface IContextProcessor {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly priority: number;

  process(
    data: ContextData,
    query: ContextQuery,
    options: ContextOptimizationOptions
  ): Promise<ProcessorResult>;

  canProcess(data: ContextData, options: ContextOptimizationOptions): boolean;
  getConfigSchema(): Record<string, any>;
  validateConfig(config: any): true | string;
}

/**
 * Interface for processors that calculate relevance and priority
 */
export interface IRelevanceProcessor extends IContextProcessor {
  calculateRelevance(
    item: ContextItem,
    query: ContextQuery,
    options: RelevanceOptions
  ): number;
  
  scoreImportance(
    itemId: string,
    data: ContextData,
    options: RelevanceOptions
  ): number;
}

/**
 * Interface for processors that filter content
 */
export interface IFilterProcessor extends IContextProcessor {
  filter(
    data: ContextData,
    options: FilterOptions
  ): ContextData;

  compress(
    data: ContextData,
    options: { maxDescriptionLength: number }
  ): ContextData;

  removeDuplicates(data: ContextData): ContextData;
}

/**
 * Interface for processors that manage window size and token limits
 */
export interface IWindowSizeProcessor extends IContextProcessor {
  estimateTokens(content: string, outputFormat?: string): number;
  estimateContextTokens(data: ContextData): number;
  
  reduceToTokenLimit(
    data: ContextData,
    targetTokens: number,
    options: ContextOptimizationOptions,
    query: ContextQuery
  ): ContextData;
}