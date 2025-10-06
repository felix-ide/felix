/**
 * Context Generation Types and Interfaces
 * 
 * Defines the types and interfaces for the context generation system,
 * including context processors, generation options, and output formats.
 */

import type { IComponent, IRelationship } from '@felix/code-intelligence';

/**
 * Context generation options
 */
export interface ContextGenerationOptions {
  /** Target token size for the generated context (default: 8000) */
  targetTokenSize?: number;
  
  /** Maximum depth for relationship traversal (default: 3) */
  maxDepth?: number;
  
  /** Include source code in the context */
  includeSourceCode?: boolean;
  
  /** Include documentation and comments */
  includeDocumentation?: boolean;
  
  /** Include relationships in the context */
  includeRelationships?: boolean;
  
  /** Priority components to include first */
  priorityComponents?: string[];
  
  /** Language filter for multi-language contexts */
  languageFilter?: string[];
  
  /** Include languages (alias for languageFilter) */
  includeLanguages?: string[];
  
  /** Output format for the context */
  outputFormat?: 'markdown' | 'json' | 'text' | 'index';
  
  /** Enable minified output for smaller token usage */
  minified?: boolean;
  
  /** Query or search terms to prioritize relevant content */
  query?: string;
  
  /** Include component metadata */
  includeMetadata?: boolean;
  
  /** Include applicable rules in context (default: true) */
  includeRules?: boolean;
  
  /** Filter rules by type */
  ruleTypes?: string[];
  
  /** User intent for context-aware rule matching */
  userIntent?: string;
  
  /** Current task ID for rule context */
  currentTaskId?: string;
  
  /** Minimum rule confidence threshold */
  ruleConfidenceThreshold?: number;
  
  /** Maximum number of rules to include */
  maxRules?: number;
  
  /** Custom context processor options */
  processorOptions?: Record<string, any>;
}

/**
 * Context generation query for targeting specific content
 */
export interface ContextQuery {
  /** Target component ID or pattern */
  componentId?: string;
  
  /** Component name pattern */
  componentName?: string;
  
  /** Component type filter */
  componentType?: string;
  
  /** Language filter */
  language?: string;
  
  /** Include languages (array) */
  includeLanguages?: string[];
  
  /** File path pattern */
  filePath?: string;
  
  /** Search terms for content relevance */
  searchTerms?: string[];
  
  /** Relationship types to include */
  relationshipTypes?: string[];
  
  /** Custom query parameters */
  customParams?: Record<string, any>;
  
  /** Maximum depth for traversal */
  maxDepth?: number;
}

/**
 * Context data structure containing components and relationships
 */
export interface ContextData {
  /** Primary components to include in context */
  components: IComponent[];
  
  /** Relationships between components */
  relationships: IRelationship[];
  
  /** Applicable rules for the context */
  applicableRules?: Array<{
    rule_id: string;
    rule_type: string;
    guidance_text: string;
    confidence: number;
    why_applicable: string;
    suggested_action?: string;
    auto_executable?: boolean;
  }>;
  
  /** Query that generated this context */
  query?: ContextQuery;
  
  /** Generation timestamp */
  timestamp: number;
  
  /** Source information */
  source: {
    indexPath?: string;
    totalComponents: number;
    totalRelationships: number;
  };
  
  /** Metadata about the context */
  metadata: {
    generationTime: number;
    processingSteps: string[];
    warnings: string[];
    componentPriorities?: Map<string, number>;
    [key: string]: any;
  };
}

/**
 * Generated context result
 */
export interface ContextResult {
  /** Generated context content */
  content: string;
  
  /** Format of the generated content */
  format: 'markdown' | 'json' | 'text' | 'index';
  
  /** Token count estimate */
  tokenCount: number;
  
  /** Components included in the context */
  includedComponents: string[];
  
  /** Relationships included in the context */
  includedRelationships: string[];
  
  /** Generation statistics */
  stats: {
    totalComponents: number;
    totalRelationships: number;
    processingTime: number;
    reductionRatio: number;
  };
  
  /** Warnings or notices about the generation */
  warnings: string[];
  
  /** Applicable rules for the context */
  applicableRules?: Array<{
    rule_id: string;
    rule_type: string;
    guidance_text: string;
    confidence: number;
    why_applicable: string;
    suggested_action?: string;
    auto_executable?: boolean;
  }>;
  
  /** Component count (for backward compatibility) */
  componentCount?: number;
  
  /** Relationship count (for backward compatibility) */
  relationshipCount?: number;
  
  /** Generation time in ms (for backward compatibility) */
  generationTime?: number;
}

/**
 * Context processor result
 */
export interface ProcessorResult {
  /** Processed data */
  data: any;
  
  /** Processing metadata */
  metadata: {
    processorName: string;
    processingTime: number;
    itemsProcessed: number;
    itemsFiltered: number;
  };
  
  /** Processing warnings */
  warnings: string[];
}

/**
 * Component priority scoring for context inclusion
 */
export interface ComponentPriority {
  /** Component ID */
  componentId: string;
  
  /** Priority score (higher = more important) */
  score: number;
  
  /** Reasons for the priority score */
  reasons: string[];
  
  /** Relationship relevance score */
  relationshipScore: number;
  
  /** Query relevance score */
  queryScore: number;
  
  /** Base importance score */
  baseScore: number;
}

/**
 * Context section for organizing generated content
 */
export interface ContextSection {
  /** Section title */
  title: string;
  
  /** Section content */
  content: string;
  
  /** Section type */
  type: 'component' | 'relationship' | 'summary' | 'code' | 'metadata';
  
  /** Priority order for section */
  priority: number;
  
  /** Estimated token count for section */
  tokenCount: number;
  
  /** Related component IDs */
  componentIds: string[];
}

/**
 * Context generation events for progress tracking
 */
export interface ContextGenerationEvents {
  /** Called when context generation starts */
  onStart?: (options: ContextGenerationOptions) => void;
  
  /** Called when data collection begins */
  onDataCollection?: (query: ContextQuery) => void;
  
  /** Called when processing a component */
  onComponentProcessed?: (componentId: string, included: boolean) => void;
  
  /** Called when applying a processor */
  onProcessorApplied?: (processorName: string, result: ProcessorResult) => void;
  
  /** Called when generating output format */
  onFormatting?: (format: string, sectionCount: number) => void;
  
  /** Called when context generation completes */
  onComplete?: (result: ContextResult) => void;
  
  /** Called when an error occurs */
  onError?: (error: Error, context?: string) => void;
  
  /** Called for progress updates */
  onProgress?: (step: string, progress: number, total: number) => void;
}

/**
 * Context template for consistent formatting
 */
export interface ContextTemplate {
  /** Template name */
  name: string;
  
  /** Template description */
  description: string;
  
  /** Template format */
  format: 'markdown' | 'json' | 'text' | 'index';
  
  /** Default options for this template */
  defaultOptions: Partial<ContextGenerationOptions>;
  
  /** Section order for this template */
  sectionOrder: string[];
  
  /** Template-specific formatters */
  formatters: Record<string, (data: any) => string>;
}

/**
 * Multi-language context configuration
 */
export interface MultiLanguageContextConfig {
  /** Include language-specific summaries */
  includeLangSummaries: boolean;
  
  /** Group components by language */
  groupByLanguage: boolean;
  
  /** Show cross-language relationships */
  showCrossLanguageRels: boolean;
  
  /** Language priority order */
  languagePriority: string[];
  
  /** Include language statistics */
  includeLanguageStats: boolean;
}

/**
 * Context optimization settings
 */
export interface ContextOptimizationConfig {
  /** Enable token counting and reduction */
  enableTokenOptimization: boolean;
  
  /** Token estimation method */
  tokenEstimationMethod: 'char-count' | 'word-count' | 'gpt-tokenizer';
  
  /** Characters per token ratio (for char-count method) */
  charsPerToken: number;
  
  /** Content reduction strategies */
  reductionStrategies: {
    /** Remove low-priority components */
    removeLowPriority: boolean;
    
    /** Truncate long descriptions */
    truncateDescriptions: boolean;
    
    /** Summarize large code blocks */
    summarizeCodeBlocks: boolean;
    
    /** Remove duplicate information */
    removeDuplicates: boolean;
  };
  
  /** Minimum content thresholds */
  minimumThresholds: {
    /** Minimum components to include */
    minComponents: number;
    
    /** Minimum relationships to include */
    minRelationships: number;
    
    /** Minimum token count */
    minTokens: number;
  };
}