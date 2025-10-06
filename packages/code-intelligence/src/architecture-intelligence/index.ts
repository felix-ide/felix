/**
 * @felix/architectural-intelligence
 * 
 * Architectural analysis and code intelligence library for extracting systems, 
 * patterns, and insights from code.
 */

// Core analysis components
export { 
  ArchitecturalAnalyzer,
  ArchitecturalAnalysisConfig,
  DetectedSystem,
  DetectedPipeline,
  DetectedPattern
} from './core/ArchitecturalAnalyzer.js';

export {
  SkeletonGenerator,
  SkeletonMember,
  ClassSkeleton,
  FileSkeleton
} from './core/SkeletonGenerator.js';

// Services
export {
  RuleMatchingService,
  IRuleStorage,
  RuleMatchingConfig,
  RuleMatchingOptions,
  RuleMatchResult,
  MatchingContext
} from './services/RuleMatchingService.js';

export {
  TopicContextManager,
  IEmbeddingService,
  TopicManagerConfig,
  TopicContext,
  TopicDriftResult,
  TopicDefinition,
  TopicLock,
  SearchContext,
  TopicSession
} from './services/TopicContextManager.js';

// Context generation - export everything from context module
export * from './context/index.js';

// Interfaces
export {
  IKnowledgeGraph,
  KnowledgeGraphSearchOptions,
  KnowledgeGraphPath,
  KnowledgeGraphStats
} from './interfaces/IKnowledgeGraph.js';

// Note: Core types like IComponent, IRelationship, ComponentType, etc. 
// are provided by code-analysis-types which is exported at the package root


// Version
export const VERSION = '0.2.0';
