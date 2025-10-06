/**
 * Text chunking utilities for processing large documents
 */

export interface ChunkOptions {
  /** Maximum size of each chunk */
  maxChunkSize: number;
  /** Overlap between chunks in characters */
  overlap?: number;
  /** Separator pattern for splitting (default: sentence boundaries) */
  separator?: RegExp | string;
  /** Whether to respect word boundaries */
  respectWordBoundaries?: boolean;
  /** Minimum chunk size (chunks smaller than this are merged) */
  minChunkSize?: number;
}

/**
 * Split text into chunks based on size constraints
 */
export function chunkText(text: string, options: ChunkOptions): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  const {
    maxChunkSize,
    overlap = 50,
    separator = /[.!?]+\s+/,
    respectWordBoundaries = true,
    minChunkSize = Math.floor(maxChunkSize * 0.25)
  } = options;

  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let segments: string[];

  // Split by separator if provided
  if (separator) {
    if (separator instanceof RegExp) {
      segments = text.split(separator).filter(s => s.length > 0);
    } else {
      segments = text.split(separator).filter(s => s.length > 0);
    }
  } else {
    // Fall back to character-based splitting
    segments = [text];
  }

  let currentChunk = '';

  for (const segment of segments) {
    // If adding this segment would exceed max size
    if (currentChunk.length + segment.length > maxChunkSize) {
      if (currentChunk.length >= minChunkSize) {
        chunks.push(currentChunk.trim());
        
        // Add overlap from the end of the current chunk
        if (overlap > 0 && currentChunk.length > overlap) {
          currentChunk = currentChunk.slice(-overlap) + ' ';
        } else {
          currentChunk = '';
        }
      }
      
      // If segment itself is too large, split it further
      if (segment.length > maxChunkSize) {
        const subChunks = chunkLargeSegment(segment, maxChunkSize, overlap, respectWordBoundaries);
        for (let i = 0; i < subChunks.length - 1; i++) {
          chunks.push(subChunks[i]!);
        }
        currentChunk = subChunks[subChunks.length - 1] || '';
      } else {
        currentChunk += segment;
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + segment;
    }
  }

  // Add the last chunk if it meets minimum size
  if (currentChunk.length >= minChunkSize) {
    chunks.push(currentChunk.trim());
  } else if (chunks.length > 0 && currentChunk.trim()) {
    // Merge with previous chunk if too small
    chunks[chunks.length - 1] += ' ' + currentChunk.trim();
  }

  return chunks;
}

/**
 * Chunk a large segment that doesn't have natural boundaries
 */
function chunkLargeSegment(
  segment: string,
  maxSize: number,
  overlap: number,
  respectWordBoundaries: boolean
): string[] {
  if (!segment || maxSize <= 0) {
    return segment ? [segment] : [];
  }
  
  const chunks: string[] = [];
  let start = 0;

  while (start < segment.length) {
    let end = Math.min(start + maxSize, segment.length);

    // Respect word boundaries
    if (respectWordBoundaries && end < segment.length) {
      // Find the last space before the limit
      const lastSpace = segment.lastIndexOf(' ', end);
      if (lastSpace > start + maxSize * 0.5) {
        end = lastSpace;
      }
    }

    // Ensure we have a valid slice
    const chunk = segment.slice(start, end);
    if (chunk) {
      chunks.push(chunk);
    }
    
    // Move start position, accounting for overlap
    // Ensure we make progress
    const nextStart = Math.max(start + 1, end - overlap);
    if (nextStart <= start && end >= segment.length) {
      break; // Prevent infinite loop
    }
    start = nextStart;
  }

  return chunks;
}

/**
 * Sliding window chunking for maximum context preservation
 */
export function slidingWindowChunk(
  text: string,
  windowSize: number,
  stepSize: number
): string[] {
  if (text.length <= windowSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + windowSize, text.length);
    chunks.push(text.slice(start, end));
    
    if (end >= text.length) break;
    start += stepSize;
  }

  return chunks;
}

/**
 * Chunk text by paragraphs with size constraints
 */
export function chunkByParagraphs(
  text: string,
  maxChunkSize: number,
  minParagraphSize: number = 50
): string[] {
  // Split by double newlines or common paragraph separators
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length >= minParagraphSize);
  
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // If paragraph itself is too large, use regular chunking
      if (paragraph.length > maxChunkSize) {
        const subChunks = chunkText(paragraph, {
          maxChunkSize,
          overlap: 50,
          respectWordBoundaries: true
        });
        chunks.push(...subChunks);
      } else {
        currentChunk = paragraph;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Semantic chunking based on topic boundaries (requires embeddings)
 */
export interface SemanticChunkOptions {
  maxChunkSize: number;
  similarityThreshold: number;
  embedder: (text: string) => Promise<number[]>;
  similarityFn?: (a: number[], b: number[]) => number;
}

export async function semanticChunk(
  text: string,
  options: SemanticChunkOptions
): Promise<string[]> {
  const { maxChunkSize, similarityThreshold, embedder, similarityFn = defaultCosineSimilarity } = options;
  
  // First, split into sentences
  const sentences = text.split(/[.!?]+\s+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return [];

  const chunks: string[] = [];
  let currentChunk = sentences[0] || '';
  
  // Get embedding for the first sentence
  let currentEmbedding = await embedder(currentChunk);

  for (let i = 1; i < sentences.length; i++) {
    const sentence = sentences[i]!;
    const sentenceEmbedding = await embedder(sentence);
    
    // Check similarity with current chunk
    const similarity = similarityFn(currentEmbedding, sentenceEmbedding);
    
    // If similar enough and within size limit, add to current chunk
    if (similarity >= similarityThreshold && 
        currentChunk.length + sentence.length + 1 <= maxChunkSize) {
      currentChunk += '. ' + sentence;
      // Update embedding to be the average (simplified)
      currentEmbedding = averageEmbeddings([currentEmbedding, sentenceEmbedding]);
    } else {
      // Start a new chunk
      chunks.push(currentChunk.trim() + '.');
      currentChunk = sentence;
      currentEmbedding = sentenceEmbedding;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim() + '.');
  }

  return chunks;
}

/**
 * Simple cosine similarity for semantic chunking
 */
function defaultCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += (a[i] || 0) * (b[i] || 0);
    normA += (a[i] || 0) * (a[i] || 0);
    normB += (b[i] || 0) * (b[i] || 0);
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Average multiple embeddings
 */
function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  
  const result = new Array(embeddings[0]!.length).fill(0);
  
  for (const embedding of embeddings) {
    for (let i = 0; i < embedding.length; i++) {
      result[i] += embedding[i] || 0;
    }
  }
  
  return result.map(val => val / embeddings.length);
}