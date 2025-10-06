/**
 * Tokenization utilities for text processing
 */

export interface TokenizationOptions {
  /** Method to use for tokenization */
  method?: 'whitespace' | 'word' | 'sentence' | 'custom';
  /** Custom tokenizer function */
  customTokenizer?: (text: string) => string[];
  /** Minimum token length */
  minTokenLength?: number;
  /** Maximum token length */
  maxTokenLength?: number;
  /** Convert tokens to lowercase */
  lowercase?: boolean;
  /** Remove punctuation from tokens */
  removePunctuation?: boolean;
  /** Keep hyphenated words together */
  keepHyphenated?: boolean;
}

/**
 * Tokenize text into individual tokens
 */
export function tokenize(text: string, options: TokenizationOptions = {}): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  const {
    method = 'word',
    customTokenizer,
    minTokenLength = 1,
    maxTokenLength = Infinity,
    lowercase = false,
    removePunctuation = false,
    keepHyphenated = true
  } = options;

  let tokens: string[];

  // Apply tokenization method
  switch (method) {
    case 'whitespace':
      tokens = text.split(/\s+/);
      break;
    
    case 'sentence':
      tokens = tokenizeSentences(text);
      break;
    
    case 'custom':
      if (!customTokenizer) {
        throw new Error('customTokenizer must be provided when using custom method');
      }
      tokens = customTokenizer(text);
      break;
    
    case 'word':
    default:
      tokens = tokenizeWords(text, keepHyphenated);
      break;
  }

  // Apply filters
  tokens = tokens.filter(token => token.length > 0);

  if (lowercase) {
    tokens = tokens.map(token => token.toLowerCase());
  }

  if (removePunctuation) {
    tokens = tokens.map(token => token.replace(/[^\w-]/g, '')).filter(t => t.length > 0);
  }

  // Apply length filters
  tokens = tokens.filter(token => 
    token.length >= minTokenLength && token.length <= maxTokenLength
  );

  return tokens;
}

/**
 * Tokenize text into words
 */
function tokenizeWords(text: string, keepHyphenated: boolean): string[] {
  if (keepHyphenated) {
    // Keep hyphenated words together
    return text.match(/[\w]+(?:-[\w]+)*/g) || [];
  } else {
    // Split on word boundaries
    return text.match(/\b\w+\b/g) || [];
  }
}

/**
 * Tokenize text into sentences
 */
function tokenizeSentences(text: string): string[] {
  // Handle common abbreviations
  const abbrevs = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Sr.', 'Jr.'];
  let processedText = text;
  
  // Temporarily replace abbreviations
  abbrevs.forEach((abbrev, index) => {
    processedText = processedText.replace(new RegExp(abbrev.replace('.', '\\.'), 'g'), `__ABBREV${index}__`);
  });

  // Split on sentence boundaries
  const sentences = processedText.split(/(?<=[.!?])\s+(?=[A-Z])/);
  
  // Restore abbreviations
  return sentences.map(sentence => {
    abbrevs.forEach((abbrev, index) => {
      sentence = sentence.replace(new RegExp(`__ABBREV${index}__`, 'g'), abbrev);
    });
    return sentence.trim();
  }).filter(s => s.length > 0);
}

/**
 * N-gram tokenization
 */
export function createNGrams(tokens: string[], n: number): string[] {
  if (n < 1) throw new Error('n must be at least 1');
  if (tokens.length < n) return [];

  const ngrams: string[] = [];
  
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }

  return ngrams;
}

/**
 * Character-level n-grams
 */
export function createCharNGrams(text: string, n: number): string[] {
  if (n < 1) throw new Error('n must be at least 1');
  if (text.length < n) return [];

  const ngrams: string[] = [];
  
  for (let i = 0; i <= text.length - n; i++) {
    ngrams.push(text.slice(i, i + n));
  }

  return ngrams;
}

/**
 * Subword tokenization (simple BPE-like approach)
 */
export function subwordTokenize(text: string, vocabulary: Set<string>, maxSubwordLength: number = 20): string[] {
  const tokens: string[] = [];
  const words = text.split(/\s+/);

  for (const word of words) {
    if (vocabulary.has(word)) {
      tokens.push(word);
      continue;
    }

    // Try to break down unknown words
    let remaining = word;
    const subwords: string[] = [];

    while (remaining.length > 0) {
      let found = false;
      
      // Try longest possible subword first
      for (let length = Math.min(remaining.length, maxSubwordLength); length > 0; length--) {
        const candidate = remaining.slice(0, length);
        
        if (vocabulary.has(candidate)) {
          subwords.push(candidate);
          remaining = remaining.slice(length);
          found = true;
          break;
        }
      }

      // If no subword found, take single character
      if (!found) {
        subwords.push(remaining[0]!);
        remaining = remaining.slice(1);
      }
    }

    tokens.push(...subwords);
  }

  return tokens;
}

/**
 * Token frequency analysis
 */
export function getTokenFrequencies(tokens: string[]): Map<string, number> {
  const frequencies = new Map<string, number>();
  
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) || 0) + 1);
  }

  return frequencies;
}

/**
 * Get top N most frequent tokens
 */
export function getTopTokens(tokens: string[], n: number): Array<[string, number]> {
  const frequencies = getTokenFrequencies(tokens);
  
  return Array.from(frequencies.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

/**
 * Estimate token count for different models
 */
export function estimateTokenCount(text: string, model: 'gpt' | 'bert' | 'char' = 'gpt'): number {
  switch (model) {
    case 'gpt':
      // GPT models use ~4 characters per token on average
      return Math.ceil(text.length / 4);
    
    case 'bert':
      // BERT uses WordPiece tokenization, roughly 1.3 tokens per word
      const wordCount = text.split(/\s+/).length;
      return Math.ceil(wordCount * 1.3);
    
    case 'char':
      // Character-level tokenization
      return text.length;
    
    default:
      return Math.ceil(text.length / 4);
  }
}