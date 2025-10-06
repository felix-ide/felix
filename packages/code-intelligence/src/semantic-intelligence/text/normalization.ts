/**
 * Text normalization utilities for consistent processing
 */

export interface NormalizationOptions {
  /** Convert to lowercase */
  lowercase?: boolean;
  /** Remove extra whitespace */
  trimWhitespace?: boolean;
  /** Remove punctuation */
  removePunctuation?: boolean;
  /** Remove numbers */
  removeNumbers?: boolean;
  /** Remove URLs */
  removeUrls?: boolean;
  /** Remove email addresses */
  removeEmails?: boolean;
  /** Remove HTML tags */
  removeHtml?: boolean;
  /** Remove code blocks (markdown style) */
  removeCodeBlocks?: boolean;
  /** Normalize unicode characters */
  normalizeUnicode?: boolean;
  /** Remove stop words (requires stopWords list) */
  removeStopWords?: boolean;
  /** List of stop words to remove */
  stopWords?: Set<string>;
  /** Custom replacements */
  customReplacements?: Array<{ pattern: RegExp; replacement: string }>;
}

/**
 * Normalize text according to specified options
 */
export function normalizeText(text: string, options: NormalizationOptions = {}): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  let result = text;

  // Remove URLs
  if (options.removeUrls !== false) {
    result = result.replace(/https?:\/\/[^\s]+/g, '');
  }

  // Remove email addresses
  if (options.removeEmails) {
    result = result.replace(/[\w.-]+@[\w.-]+\.\w+/g, '');
  }

  // Remove HTML tags
  if (options.removeHtml) {
    result = result.replace(/<[^>]*>/g, '');
  }

  // Remove code blocks
  if (options.removeCodeBlocks) {
    // Remove markdown code blocks
    result = result.replace(/```[\s\S]*?```/g, '');
    result = result.replace(/`[^`]+`/g, '');
  }

  // Normalize unicode
  if (options.normalizeUnicode !== false) {
    result = result.normalize('NFKD');
  }

  // Apply custom replacements
  if (options.customReplacements) {
    for (const { pattern, replacement } of options.customReplacements) {
      result = result.replace(pattern, replacement);
    }
  }

  // Convert to lowercase
  if (options.lowercase !== false) {
    result = result.toLowerCase();
  }

  // Remove punctuation
  if (options.removePunctuation) {
    result = result.replace(/[^\w\s]|_/g, ' ');
  }

  // Remove numbers
  if (options.removeNumbers) {
    result = result.replace(/\d+/g, ' ');
  }

  // Trim whitespace
  if (options.trimWhitespace !== false) {
    result = result.replace(/\s+/g, ' ').trim();
  }

  // Remove stop words
  if (options.removeStopWords && options.stopWords) {
    const words = result.split(/\s+/);
    result = words.filter(word => !options.stopWords!.has(word)).join(' ');
  }

  return result;
}

/**
 * Common English stop words
 */
export const ENGLISH_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'by', 'for', 'from',
  'has', 'had', 'have', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that',
  'the', 'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
  'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how', 'all', 'would',
  'there', 'their', 'or', 'if', 'out', 'so', 'up', 'could', 'just', 'than',
  'them', 'some', 'into', 'only', 'now', 'may', 'should', 'those', 'after',
  'before', 'being', 'because', 'through', 'can', 'any', 'other', 'each'
]);

/**
 * Extract clean text from HTML
 */
export function extractTextFromHtml(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Replace BR tags with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  
  // Replace P and DIV tags with double newlines
  text = text.replace(/<\/?(p|div)\s*\/?>/gi, '\n\n');
  
  // Remove all other tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  text = decodeHtmlEntities(text);
  
  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  
  return text;
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&ndash;': '–',
    '&mdash;': '—',
    '&hellip;': '…',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™'
  };

  return text.replace(/&[a-z]+;/gi, match => entities[match] || match);
}

/**
 * Normalize whitespace while preserving structure
 */
export function normalizeWhitespace(text: string, preserveNewlines: boolean = true): string {
  if (preserveNewlines) {
    // Normalize spaces within lines
    const lines = text.split('\n');
    return lines
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(line => line.length > 0 || preserveNewlines)
      .join('\n');
  } else {
    // Normalize all whitespace to single spaces
    return text.replace(/\s+/g, ' ').trim();
  }
}

/**
 * Remove redundant punctuation
 */
export function cleanPunctuation(text: string): string {
  // Remove multiple consecutive punctuation marks
  text = text.replace(/([.!?]){2,}/g, '$1');
  
  // Fix spacing around punctuation
  text = text.replace(/\s+([.!?,;:])/g, '$1');
  text = text.replace(/([.!?])\s*([a-z])/g, '$1 $2');
  
  // Remove trailing punctuation from lines
  text = text.replace(/[.!?,;:]+$/gm, '');
  
  return text;
}

/**
 * Expand common contractions
 */
export function expandContractions(text: string): string {
  const contractions: Record<string, string> = {
    "can't": "cannot",
    "won't": "will not",
    "n't": " not",
    "'re": " are",
    "'ve": " have",
    "'ll": " will",
    "'d": " would",
    "'m": " am",
    "it's": "it is",
    "let's": "let us",
    "that's": "that is",
    "there's": "there is",
    "here's": "here is",
    "what's": "what is",
    "where's": "where is",
    "who's": "who is",
    "how's": "how is"
  };

  let result = text;
  for (const [contraction, expansion] of Object.entries(contractions)) {
    const regex = new RegExp(contraction, 'gi');
    result = result.replace(regex, expansion);
  }

  return result;
}