/**
 * The OrAIcle - Unified exports
 * 
 * All types are deduplicated - code-analysis-types is the canonical source for shared types
 */

// Export everything from each module
// Since we've removed duplicates, these should no longer conflict
export * from './code-analysis-types/index.js';  // Export this first as it has the base types
export * from './code-parser/index.js';

// Export semantic intelligence with renamed conflicting types
export * from './semantic-intelligence/index.js';

// Export architecture-intelligence but exclude the conflicting types that are already exported from semantic-intelligence
export {
  // Core analysis components
  ArchitecturalAnalyzer,
  ArchitecturalAnalysisConfig,
  DetectedSystem,
  DetectedPipeline,
  DetectedPattern,
  
  // Skeleton generation
  SkeletonGenerator,
  SkeletonMember,
  ClassSkeleton,
  FileSkeleton,
  
  // Services
  RuleMatchingService,
  IRuleStorage,
  RuleMatchingConfig,
  RuleMatchingOptions,
  RuleMatchResult,
  MatchingContext,
  
  TopicContextManager,
  IEmbeddingService,
  TopicManagerConfig,
  TopicContext,
  TopicDriftResult,
  TopicDefinition,
  TopicLock,
  SearchContext,
  TopicSession,
  
  // Context generation - renamed to avoid conflicts
  ContextGenerationAPI,
  ContextGenerationOptions,
  type ContextQuery as AIContextQuery,
  type ContextData as AIContextData,
  type ProcessorResult as AIProcessorResult,
  type IContextProcessor as AIContextProcessor,
  type IWindowSizeProcessor as AIWindowSizeProcessor,
  type ComponentPriority as AIComponentPriority,
  type ContextOptimizationConfig as AIContextOptimizationConfig,
  
  // Format adapters
  AdapterFactory,
  AICCLMarkdownAdapter,
  AICCLDecompressionAdapter,
  MarkdownAdapter,
  JsonAdapter,
  TextAdapter,
  
  // Interfaces
  IKnowledgeGraph,
  KnowledgeGraphSearchOptions,
  KnowledgeGraphPath,
  KnowledgeGraphStats,
  
  // Version
  VERSION as AI_VERSION
} from './architecture-intelligence/index.js';

export * from './knowledge-graph/index.js';

// Export language capability registry for shared planning/analysis layers
export * from './language-registry/index.js';
