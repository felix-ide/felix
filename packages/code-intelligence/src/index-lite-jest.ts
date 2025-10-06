// Unit-test-safe export surface (Jest): avoid importing parser modules.
export * from './code-analysis-types/index.js';
export * from './semantic-intelligence/index.js';

// Export a safe subset from architecture-intelligence to avoid type collisions
export {
  ArchitecturalAnalyzer,
  ArchitecturalAnalysisConfig,
  DetectedSystem,
  DetectedPipeline,
  DetectedPattern,
  SkeletonGenerator,
  SkeletonMember,
  ClassSkeleton,
  FileSkeleton,
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
  ContextGenerationAPI,
  ContextGenerationOptions,
  AdapterFactory,
  AICCLMarkdownAdapter,
  AICCLDecompressionAdapter,
  MarkdownAdapter,
  JsonAdapter,
  TextAdapter,
  IKnowledgeGraph,
  KnowledgeGraphSearchOptions,
  KnowledgeGraphPath,
  KnowledgeGraphStats,
} from './architecture-intelligence/index.js';
export * from './knowledge-graph/index.js';
