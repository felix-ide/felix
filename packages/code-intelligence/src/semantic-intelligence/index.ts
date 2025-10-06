/**
 * @felix/semantic-search - Main entry point
 */

// Core exports
export * from './types.js';
export * from './EmbeddingService.js';

// Search exports
export { BooleanQueryParser } from './search/BooleanQueryParser.js';
export type { QueryNode, QueryModifier, ParsedQuery } from './search/BooleanQueryParser.js';
export {
  cosineSimilarity,
  euclideanDistance,
  manhattanDistance,
  findKNearestNeighbors,
  rerankResults
} from './search/similarity.js';
export type { 
  RerankOptions,
  EntityType,
  RerankQuery,
  RerankableItem,
  ScoringFactors,
  RerankResult
} from './search/similarity.js';

// Storage exports
export {
  createStorage,
  registerStorageAdapter,
  StorageFactory,
  BaseAdapter,
  MemoryAdapter
} from './storage/index.js';
export type {
  IEmbeddingStorage,
  IStorageFactory,
  MemoryStorageOptions,
  SQLiteStorageOptions
} from './storage/index.js';

// Text processing exports
export {
  // Chunking
  chunkText,
  slidingWindowChunk,
  chunkByParagraphs,
  semanticChunk,
  // Normalization
  normalizeText,
  normalizeWhitespace,
  extractTextFromHtml,
  cleanPunctuation,
  expandContractions,
  ENGLISH_STOP_WORDS,
  // Tokenization
  tokenize,
  createNGrams,
  createCharNGrams,
  subwordTokenize,
  getTokenFrequencies,
  getTopTokens,
  estimateTokenCount,
  // Processing
  extractWordsFromIdentifier,
  extractWordsFromText,
  extractConceptsFromPath,
  isCommonWord,
  extractKeyTerms,
  generateNGrams,
  TextSimilarity,
  COMMON_WORDS
} from './text/index.js';
export type {
  ChunkOptions,
  SemanticChunkOptions,
  NormalizationOptions,
  TokenizationOptions,
  TextProcessingConfig
} from './text/index.js';

// Context optimization and RAG exports
export {
  // Core types and interfaces
  ComponentType,
  RelationshipType,
  DEFAULT_CONTENT_WEIGHTS,
  DEFAULT_TYPE_WEIGHTS,
  DEFAULT_MATCH_MULTIPLIERS,
  // Individual processors
  RelevanceScoreProcessor,
  RelevanceFilterProcessor,
  WindowSizeProcessor,
  // Unified optimizer
  ContentOptimizer,
  // Convenience functions
  optimizeContent,
  estimateTokens,
  calculateRelevance
} from './context/index.js';
export type {
  // Core interfaces
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
  IWindowSizeProcessor,
  // Configuration and results
  ContextOptimizationConfig,
  ComponentPriority,
  ReductionStrategy,
  OptimizationResult,
  ContentOptimizerOptions
} from './context/index.js';

// Query processing exports
export {
  QueryExpander,
  createQueryExpander,
  DiscoveryEngine,
  createDiscoveryEngine
} from './query/index.js';
export type {
  QueryExpansionConfig,
  SuggestedTerm,
  QueryExpansionResult,
  DiscoveryResult,
  DiscoveryItem,
  DiscoveryConfig
} from './query/index.js';

// Cache exports
export {
  SearchCache,
  QueryResultCache
} from './cache/index.js';
export type {
  CacheOptions
} from './cache/index.js';
