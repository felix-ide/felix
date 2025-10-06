/**
 * Embeddings feature module
 * Provides text processing and similarity calculation for semantic search
 */

// Domain services
export { SimilarityCalculator } from './domain/services/SimilarityCalculator.js';
export { TextConverters } from './domain/converters/TextConverters.js';
export type { TextConverter } from './domain/converters/TextConverters.js';

// Re-export types for convenience
export type { IComponent, ITask, INote, IRule } from '@felix/code-intelligence';