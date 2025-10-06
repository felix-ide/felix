/**
 * Text processing utilities module
 */

// Chunking exports
export {
  chunkText,
  slidingWindowChunk,
  chunkByParagraphs,
  semanticChunk
} from './chunking.js';
export type {
  ChunkOptions,
  SemanticChunkOptions
} from './chunking.js';

// Normalization exports
export {
  normalizeText,
  normalizeWhitespace,
  extractTextFromHtml,
  cleanPunctuation,
  expandContractions,
  ENGLISH_STOP_WORDS
} from './normalization.js';
export type {
  NormalizationOptions
} from './normalization.js';

// Tokenization exports
export {
  tokenize,
  createNGrams,
  createCharNGrams,
  subwordTokenize,
  getTokenFrequencies,
  getTopTokens,
  estimateTokenCount
} from './tokenization.js';
export type {
  TokenizationOptions
} from './tokenization.js';

// Processing exports
export {
  extractWordsFromIdentifier,
  extractWordsFromText,
  extractConceptsFromPath,
  isCommonWord,
  extractKeyTerms,
  generateNGrams,
  TextSimilarity,
  COMMON_WORDS
} from './processing.js';
export type {
  TextProcessingConfig
} from './processing.js';