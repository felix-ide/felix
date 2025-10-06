/**
 * Text processing utilities for search and analysis
 */

/**
 * Common words that should be filtered out in most search contexts
 */
export const COMMON_WORDS = new Set([
  // Articles, conjunctions, prepositions
  'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'around',
  
  // Pronouns and determiners
  'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'cannot',
  'this', 'that', 'these', 'those', 'their', 'them', 'they', 'it', 'its', 'his', 'her', 'hers', 'our', 'ours', 'your', 'yours',
  
  // Common verbs
  'get', 'set', 'make', 'take', 'use', 'find', 'give', 'tell', 'call', 'try', 'ask', 'need', 'feel', 'become', 'leave', 'put', 'mean', 'keep', 'let', 'begin', 'seem', 'help', 'show', 'hear', 'play', 'run', 'move', 'live', 'believe', 'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'learn', 'change', 'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'spend', 'grow', 'open', 'walk', 'win', 'teach', 'offer', 'remember', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build', 'stay', 'fall', 'cut', 'reach', 'kill', 'raise',
  
  // Common technical terms (can be customized)
  'src', 'lib', 'dist', 'node', 'modules', 'test', 'spec', 'tests', 'specs', 'index', 'main', 'app', 'file', 'files', 'path', 'paths', 'name', 'names',
  'type', 'types', 'data', 'info', 'item', 'items', 'list', 'lists', 'array', 'arrays', 'object', 'objects', 'string', 'strings', 'number', 'numbers', 'boolean', 'booleans', 'null', 'undefined',
  'var', 'let', 'const', 'function', 'class', 'interface', 'enum', 'namespace', 'module', 'import', 'export', 'default', 'extends', 'implements', 'public', 'private', 'protected', 'static', 'async', 'await', 'return', 'if', 'else', 'switch', 'case', 'while', 'for', 'do', 'break', 'continue', 'throw', 'try', 'catch', 'finally'
]);

/**
 * Configuration for text processing
 */
export interface TextProcessingConfig {
  /** Additional stop words to filter */
  additionalStopWords?: string[];
  /** Minimum word length to keep */
  minWordLength?: number;
  /** Whether to filter common words */
  filterCommonWords?: boolean;
  /** Custom word filter function */
  customFilter?: (word: string) => boolean;
}

/**
 * Extract words from identifier (camelCase, snake_case, kebab-case, etc.)
 * @param identifier The identifier to extract words from
 * @returns Array of lowercase words
 */
export function extractWordsFromIdentifier(identifier: string): string[] {
  if (!identifier) return [];
  
  return identifier
    // Insert space before uppercase letters in camelCase
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Insert space around numbers
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    // Replace separators with spaces
    .replace(/[_\-\.]/g, ' ')
    // Split on spaces and filter
    .split(/\s+/)
    .map(word => word.toLowerCase())
    .filter(word => word.length > 0);
}

/**
 * Extract words from plain text
 * @param text The text to extract words from
 * @param config Processing configuration
 * @returns Array of lowercase words
 */
export function extractWordsFromText(
  text: string,
  config: TextProcessingConfig = {}
): string[] {
  if (!text) return [];
  
  const {
    minWordLength = 0,
    filterCommonWords = false,
    additionalStopWords = [],
    customFilter
  } = config;
  
  const words = text
    .toLowerCase()
    // Keep alphanumeric and spaces
    .replace(/[^\w\s]/g, ' ')
    // Split on whitespace
    .split(/\s+/)
    .filter(word => word.length > minWordLength);
  
  // Apply filters
  let filtered = words;
  
  if (filterCommonWords) {
    const stopWords = new Set([...COMMON_WORDS, ...additionalStopWords]);
    filtered = filtered.filter(word => !stopWords.has(word));
  }
  
  if (customFilter) {
    filtered = filtered.filter(customFilter);
  }
  
  return filtered;
}

/**
 * Extract concepts from file path
 * @param filePath The file path to extract concepts from
 * @param config Processing configuration
 * @returns Array of concept words
 */
export function extractConceptsFromPath(
  filePath: string,
  config: TextProcessingConfig = {}
): string[] {
  if (!filePath) return [];
  
  const concepts: string[] = [];
  const pathParts = filePath.split(/[\/\\]/); // Handle both Unix and Windows paths
  
  for (const part of pathParts) {
    if (!part) continue;
    
    if (part.includes('.')) {
      // Remove file extension
      const nameWithoutExt = part.replace(/\.[^.]*$/, '');
      concepts.push(...extractWordsFromIdentifier(nameWithoutExt));
    } else {
      concepts.push(...extractWordsFromIdentifier(part));
    }
  }
  
  // Apply filtering
  const {
    minWordLength = 3,
    filterCommonWords = true,
    additionalStopWords = [],
    customFilter
  } = config;
  
  let filtered = concepts.filter(word => word.length >= minWordLength);
  
  if (filterCommonWords) {
    const stopWords = new Set([...COMMON_WORDS, ...additionalStopWords]);
    filtered = filtered.filter(word => !stopWords.has(word));
  }
  
  if (customFilter) {
    filtered = filtered.filter(customFilter);
  }
  
  // Remove duplicates while preserving order
  return [...new Set(filtered)];
}

/**
 * Check if a word is too common to be useful for search
 * @param word The word to check
 * @param config Processing configuration
 * @returns True if the word is common
 */
export function isCommonWord(
  word: string,
  config: TextProcessingConfig = {}
): boolean {
  const {
    minWordLength = 3,
    additionalStopWords = []
  } = config;
  
  const lowerWord = word.toLowerCase();
  
  // Check length
  if (lowerWord.length < minWordLength) return true;
  
  // Check against common words
  if (COMMON_WORDS.has(lowerWord)) return true;
  
  // Check against additional stop words
  if (additionalStopWords.includes(lowerWord)) return true;
  
  return false;
}

/**
 * Extract key terms from text for search indexing
 * @param text The text to process
 * @param config Processing configuration
 * @returns Object with terms and their frequencies
 */
export function extractKeyTerms(
  text: string,
  config: TextProcessingConfig = {}
): Map<string, number> {
  const words = extractWordsFromText(text, {
    ...config,
    filterCommonWords: true,
    minWordLength: 3
  });
  
  const termFrequency = new Map<string, number>();
  
  for (const word of words) {
    termFrequency.set(word, (termFrequency.get(word) || 0) + 1);
  }
  
  return termFrequency;
}

/**
 * Generate n-grams from text for fuzzy matching
 * @param text The text to process
 * @param n The size of n-grams
 * @returns Array of n-grams
 */
export function generateNGrams(text: string, n: number = 3): string[] {
  if (!text || n < 1) return [];
  
  const cleanText = text.toLowerCase().replace(/\s+/g, '');
  if (cleanText.length < n) return [cleanText];
  
  const ngrams: string[] = [];
  for (let i = 0; i <= cleanText.length - n; i++) {
    ngrams.push(cleanText.slice(i, i + n));
  }
  
  return ngrams;
}

/**
 * Calculate text similarity using various methods
 */
export class TextSimilarity {
  /**
   * Calculate Jaccard similarity between two sets of words
   */
  static jaccard(words1: string[], words2: string[]): number {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    if (set1.size === 0 && set2.size === 0) return 1;
    if (set1.size === 0 || set2.size === 0) return 0;
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
  
  /**
   * Calculate n-gram similarity
   */
  static ngramSimilarity(text1: string, text2: string, n: number = 3): number {
    const ngrams1 = generateNGrams(text1, n);
    const ngrams2 = generateNGrams(text2, n);
    
    return this.jaccard(ngrams1, ngrams2);
  }
  
  /**
   * Calculate word-based similarity
   */
  static wordSimilarity(text1: string, text2: string, config?: TextProcessingConfig): number {
    const words1 = extractWordsFromText(text1, config);
    const words2 = extractWordsFromText(text2, config);
    
    return this.jaccard(words1, words2);
  }
}