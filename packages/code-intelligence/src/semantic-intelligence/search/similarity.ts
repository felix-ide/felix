/**
 * Similarity computation functions for semantic search
 */

/**
 * Compute cosine similarity between two vectors
 * @param a First vector
 * @param b Second vector
 * @returns Similarity score between 0 and 1
 */
export function cosineSimilarity(a: number[], b: number[]): number {
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
 * Compute Euclidean distance between two vectors
 * @param a First vector
 * @param b Second vector
 * @returns Distance (lower is more similar)
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Compute Manhattan distance between two vectors
 * @param a First vector
 * @param b Second vector
 * @returns Distance (lower is more similar)
 */
export function manhattanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs((a[i] || 0) - (b[i] || 0));
  }

  return sum;
}

/**
 * Find k nearest neighbors from a set of vectors
 * @param query Query vector
 * @param vectors Array of vectors to search
 * @param k Number of neighbors to return
 * @param similarityFn Similarity function to use (default: cosineSimilarity)
 * @returns Array of indices and similarities, sorted by similarity
 */
export function findKNearestNeighbors(
  query: number[],
  vectors: number[][],
  k: number,
  similarityFn: (a: number[], b: number[]) => number = cosineSimilarity
): Array<{ index: number; similarity: number }> {
  const similarities = vectors.map((vector, index) => ({
    index,
    similarity: similarityFn(query, vector)
  }));

  // Sort by similarity (descending for cosine similarity, ascending for distances)
  similarities.sort((a, b) => b.similarity - a.similarity);

  return similarities.slice(0, k);
}

/**
 * Comprehensive reranking system for search results
 * Supports multiple scoring factors, entity types, and scoring modes
 */

import type { EntityType } from '../../code-analysis-types/index.js';
export type { EntityType };

export interface RerankQuery {
  /** Text query string */
  text?: string;
  /** Query embedding vector */
  embedding?: number[];
  /** Query terms for exact matching */
  terms?: string[];
  /** Entity-specific context */
  entityContext?: {
    componentId?: string;
    taskId?: string;
    [key: string]: any;
  };
}

export interface RerankableItem {
  /** Unique identifier */
  id: string;
  /** Entity type for type-specific scoring */
  type?: EntityType;
  /** Existing similarity score (if any) */
  similarity?: number;
  /** Entity name/title (auto-extracted if not provided) */
  name?: string;
  /** Content/description text */
  content?: string;
  /** Embedding vector */
  embedding?: number[];
  /** Metadata for additional scoring */
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
    lastModified?: Date | string | number;
    createdAt?: Date | string | number;
    usageCount?: number;
    popularity?: number;
    [key: string]: any;
  };
  /** Relationships to other entities */
  relationships?: Array<{
    targetId: string;
    type: string;
    weight?: number;
  }>;
  /** Any additional fields */
  [key: string]: any;
}

export interface ScoringFactors {
  /** Semantic similarity scoring */
  semantic?: {
    enabled: boolean;
    weight: number;
    /** Whether to recompute or use existing similarity */
    useExisting?: boolean;
  };
  
  /** Name/title matching */
  nameMatch?: {
    enabled: boolean;
    exactBoost: number;
    partialBoost: number;
    fuzzyBoost: number;
    /** Entity-specific boosts */
    entityBoosts?: Partial<Record<EntityType, number>>;
  };
  
  /** Content/description matching */
  contentMatch?: {
    enabled: boolean;
    exactBoost: number;
    partialBoost: number;
    /** Boost for matches in different content fields */
    fieldBoosts?: {
      description?: number;
      content?: number;
      documentation?: number;
    };
  };
  
  /** Tag/metadata matching */
  tagMatch?: {
    enabled: boolean;
    boost: number;
    /** Weighted tag importance */
    tagWeights?: Record<string, number>;
  };
  
  /** Relationship-based scoring */
  relationship?: {
    enabled: boolean;
    boostPerRelation: number;
    maxBoost: number;
    /** Relationship type weights */
    typeWeights?: Record<string, number>;
  };
  
  /** Temporal scoring (recency) */
  temporal?: {
    enabled: boolean;
    recencyBoost: number;
    /** Age decay function: 'linear' | 'exponential' | 'logarithmic' */
    decayFunction: 'linear' | 'exponential' | 'logarithmic';
    /** Time window for full boost (in days) */
    timeWindow: number;
  };
  
  /** Popularity/usage scoring */
  popularity?: {
    enabled: boolean;
    usageWeight: number;
    popularityWeight: number;
    /** Normalization method */
    normalization?: 'linear' | 'log' | 'sqrt';
  };
  
  /** Custom scoring functions */
  custom?: Array<{
    name: string;
    scorer: (item: RerankableItem, query: RerankQuery) => number;
    weight: number;
  }>;
}

export interface RerankOptions {
  /** Scoring mode */
  mode?: 'additive' | 'weighted' | 'multiplicative';
  
  /** Base score to start with (for additive mode) */
  baseScore?: 'similarity' | 'zero' | number;
  
  /** Scoring factors configuration */
  factors: ScoringFactors;
  
  /** Entity name extraction function */
  nameExtractor?: (item: RerankableItem) => string;
  
  /** Debug mode - includes breakdown of scores */
  debug?: boolean;
}

export interface RerankResult<T extends RerankableItem> {
  /** Final computed score */
  finalScore: number;
  /** Original similarity (if any) */
  originalSimilarity?: number;
  /** Score breakdown (if debug enabled) */
  scoreBreakdown?: {
    base: number;
    semantic: number;
    nameMatch: number;
    contentMatch: number;
    tagMatch: number;
    relationship: number;
    temporal: number;
    popularity: number;
    custom: Record<string, number>;
  };
}

/**
 * Default name extractor - handles common entity types
 */
function defaultNameExtractor(item: RerankableItem): string {
  // Try explicit name first
  if (item.name) return item.name;
  
  // Try metadata title
  if (item.metadata?.title) return item.metadata.title;
  
  // Entity-specific field extraction
  const entityItem = item as any;
  switch (item.type) {
    case 'component':
      return entityItem.componentName || entityItem.name || '';
    case 'task':
      return entityItem.title || entityItem.taskName || '';
    case 'note':
      return entityItem.title || entityItem.noteName || '';
    case 'rule':
      return entityItem.name || entityItem.ruleName || '';
    case 'file':
      return entityItem.fileName || entityItem.path || '';
    default:
      return entityItem.title || entityItem.name || entityItem.id || '';
  }
}

/**
 * Calculate text similarity score
 */
function calculateTextSimilarity(text1: string, text2: string): {
  exact: boolean;
  partial: number;
  fuzzy: number;
} {
  const t1 = text1.toLowerCase().trim();
  const t2 = text2.toLowerCase().trim();
  
  // Exact match
  if (t1 === t2) {
    return { exact: true, partial: 1.0, fuzzy: 1.0 };
  }
  
  // Partial match (contains)
  const partial = t1.includes(t2) || t2.includes(t1) ? 0.8 : 0;
  
  // Fuzzy match (word overlap)
  const words1 = new Set(t1.split(/\s+/));
  const words2 = new Set(t2.split(/\s+/));
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  const fuzzy = union.size > 0 ? intersection.size / union.size : 0;
  
  return { exact: false, partial, fuzzy };
}

/**
 * Comprehensive reranking function
 */
export function rerankResults<T extends RerankableItem>(
  results: T[],
  query: RerankQuery,
  options: RerankOptions
): Array<T & RerankResult<T>> {
  const {
    mode = 'additive',
    baseScore = 'similarity',
    factors,
    nameExtractor = defaultNameExtractor,
    debug = false
  } = options;

  const queryText = query.text?.toLowerCase() || '';
  const queryTerms = query.terms || (queryText ? queryText.split(/\s+/) : []);

  return results.map(item => {
    let score = 0;
    const breakdown = debug ? {
      base: 0,
      semantic: 0,
      nameMatch: 0,
      contentMatch: 0,
      tagMatch: 0,
      relationship: 0,
      temporal: 0,
      popularity: 0,
      custom: {} as Record<string, number>
    } : undefined;

    // Base score
    if (typeof baseScore === 'number') {
      score = baseScore;
    } else if (baseScore === 'similarity' && item.similarity !== undefined) {
      score = item.similarity;
    } else if (baseScore === 'zero') {
      score = 0;
    }
    if (breakdown) breakdown.base = score;

    // Semantic similarity
    if (factors.semantic?.enabled && query.embedding && item.embedding) {
      let semanticScore = 0;
      if (factors.semantic.useExisting && item.similarity !== undefined) {
        semanticScore = item.similarity;
      } else {
        semanticScore = cosineSimilarity(query.embedding, item.embedding);
      }
      
      if (mode === 'weighted') {
        score += semanticScore * factors.semantic.weight;
      } else {
        score += semanticScore * factors.semantic.weight;
      }
      if (breakdown) breakdown.semantic = semanticScore * factors.semantic.weight;
    }

    // Name matching
    if (factors.nameMatch?.enabled && queryText) {
      const itemName = nameExtractor(item);
      if (itemName) {
        const similarity = calculateTextSimilarity(itemName, queryText);
        let nameScore = 0;
        
        if (similarity.exact) {
          nameScore = factors.nameMatch.exactBoost;
        } else if (similarity.partial > 0) {
          nameScore = factors.nameMatch.partialBoost * similarity.partial;
        } else if (similarity.fuzzy > 0.3) {
          nameScore = factors.nameMatch.fuzzyBoost * similarity.fuzzy;
        }
        
        // Entity-specific boost
        if (item.type && factors.nameMatch.entityBoosts?.[item.type]) {
          nameScore *= factors.nameMatch.entityBoosts[item.type]!;
        }
        
        score += nameScore;
        if (breakdown) breakdown.nameMatch = nameScore;
      }
    }

    // Content matching
    if (factors.contentMatch?.enabled && queryTerms.length > 0) {
      let contentScore = 0;
      
      // Check different content fields
      const contentFields = {
        content: item.content || '',
        description: item.metadata?.description || '',
        documentation: item.metadata?.documentation || ''
      };
      
      for (const [field, text] of Object.entries(contentFields)) {
        if (!text) continue;
        
        const matchCount = queryTerms.filter(term => 
          text.toLowerCase().includes(term)
        ).length;
        
        if (matchCount > 0) {
          const matchRatio = matchCount / queryTerms.length;
          const fieldBoost = factors.contentMatch.fieldBoosts?.[field as keyof typeof factors.contentMatch.fieldBoosts] || 1;
          contentScore += factors.contentMatch.exactBoost * matchRatio * fieldBoost;
        }
      }
      
      score += contentScore;
      if (breakdown) breakdown.contentMatch = contentScore;
    }

    // Tag matching
    if (factors.tagMatch?.enabled && item.metadata?.tags && queryTerms.length > 0) {
      let tagScore = 0;
      const tags = item.metadata.tags.map(tag => tag.toLowerCase());
      
      for (const term of queryTerms) {
        for (const tag of tags) {
          if (tag.includes(term)) {
            const tagWeight = factors.tagMatch.tagWeights?.[tag] || 1;
            tagScore += factors.tagMatch.boost * tagWeight;
          }
        }
      }
      
      score += tagScore;
      if (breakdown) breakdown.tagMatch = tagScore;
    }

    // Relationship scoring
    if (factors.relationship?.enabled && item.relationships) {
      let relationScore = 0;
      
      for (const rel of item.relationships) {
        const typeWeight = factors.relationship.typeWeights?.[rel.type] || 1;
        const relWeight = rel.weight || 1;
        relationScore += factors.relationship.boostPerRelation * typeWeight * relWeight;
      }
      
      // Apply max boost cap
      relationScore = Math.min(relationScore, factors.relationship.maxBoost);
      score += relationScore;
      if (breakdown) breakdown.relationship = relationScore;
    }

    // Temporal scoring
    if (factors.temporal?.enabled && item.metadata?.lastModified) {
      const lastModified = new Date(item.metadata.lastModified);
      const now = new Date();
      const daysSince = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
      
      let temporalScore = 0;
      if (daysSince <= factors.temporal.timeWindow) {
        const decay = daysSince / factors.temporal.timeWindow;
        switch (factors.temporal.decayFunction) {
          case 'linear':
            temporalScore = factors.temporal.recencyBoost * (1 - decay);
            break;
          case 'exponential':
            temporalScore = factors.temporal.recencyBoost * Math.exp(-decay * 2);
            break;
          case 'logarithmic':
            temporalScore = factors.temporal.recencyBoost * (1 - Math.log(1 + decay));
            break;
        }
      }
      
      score += temporalScore;
      if (breakdown) breakdown.temporal = temporalScore;
    }

    // Popularity scoring
    if (factors.popularity?.enabled) {
      let popularityScore = 0;
      
      if (item.metadata?.usageCount) {
        const usageScore = factors.popularity.usageWeight * item.metadata.usageCount;
        popularityScore += usageScore;
      }
      
      if (item.metadata?.popularity) {
        const popScore = factors.popularity.popularityWeight * item.metadata.popularity;
        popularityScore += popScore;
      }
      
      // Apply normalization
      if (factors.popularity.normalization === 'log') {
        popularityScore = Math.log(1 + popularityScore);
      } else if (factors.popularity.normalization === 'sqrt') {
        popularityScore = Math.sqrt(popularityScore);
      }
      
      score += popularityScore;
      if (breakdown) breakdown.popularity = popularityScore;
    }

    // Custom scoring
    if (factors.custom) {
      for (const customFactor of factors.custom) {
        const customScore = customFactor.scorer(item, query) * customFactor.weight;
        score += customScore;
        if (breakdown) breakdown.custom[customFactor.name] = customScore;
      }
    }

    const result: T & RerankResult<T> = {
      ...item,
      finalScore: score,
      originalSimilarity: item.similarity
    } as T & RerankResult<T>;

    if (breakdown) {
      result.scoreBreakdown = breakdown;
    }

    return result;
  }).sort((a, b) => b.finalScore - a.finalScore);
}
