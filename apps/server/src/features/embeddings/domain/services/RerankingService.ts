/**
 * Service for reranking search results based on multiple factors
 * Follows Single Responsibility Principle - only handles reranking logic
 */

import { SimilarityCalculator } from './SimilarityCalculator.js';

/**
 * Item that can be reranked
 */
export interface RerankableItem {
  id: string;
  name?: string;
  content?: string;
  type?: string;
  similarity: number;
  metadata?: Record<string, any>;
}

/**
 * Scoring factors for reranking
 */
export interface ScoringFactors {
  similarity: number;      // Base (or normalized) similarity
  nameMatch: number;       // Name matching boost
  typeBoost: number;       // Type-specific boost
  recency: number;         // Recency boost
  relationships: number;   // Relationship count boost
  contextOverlap?: number; // Overlap with system context
  analytics?: number;      // Rules analytics composite
}

/**
 * Configuration for reranking
 */
export interface RerankConfig {
  weights: {
    similarity?: number;
    nameMatch?: number;
    typeBoost?: number;
    recency?: number;
    relationships?: number;
    contextOverlap?: number;
    analytics?: number;
  };
  boosts: {
    exactNameMatch?: number;
    partialNameMatch?: number;
    preferredTypes?: string[];
    typeBoostAmount?: number;
    // New: bias by entity kind (component|task|note|rule)
    entityTypeWeights?: Record<string, number>;
    // New: demote items from noisy paths (e.g., coverage, lcov-report)
    pathDemotePatterns?: RegExp[];
    pathDemoteAmount?: number; // per-match demotion
    // Dual-channel extras
    contextText?: string;           // raw context string for token overlap
    perTypeZScore?: boolean;        // normalize similarity per entity type
    perTypeWeights?: Record<string, Partial<RerankConfig['weights']>>; // overrides
  };
}

/**
 * Default reranking configuration
 */
export const DEFAULT_RERANK_CONFIG: RerankConfig = {
  weights: {
    similarity: 0.6,
    nameMatch: 0.2,
    typeBoost: 0.1,
    recency: 0.05,
    relationships: 0.05,
    contextOverlap: 0.0,
    analytics: 0.0
  },
  boosts: {
    exactNameMatch: 1.0,  // Strong boost for exact matches
    partialNameMatch: 0.3,
    preferredTypes: ['function', 'class', 'interface'],
    typeBoostAmount: 0.15
  }
};

/**
 * Service for reranking search results
 */
export class RerankingService {
  private config: RerankConfig;

  /**
   * TEST METHOD FOR STALENESS DETECTION
   * Added at: ${new Date().toISOString()}
   */
  public testStalenessDetection(): string {
    return 'STALENESS_TEST_METHOD_ADDED';
  }

  constructor(config: Partial<RerankConfig> = {}) {
    this.config = {
      weights: { ...DEFAULT_RERANK_CONFIG.weights, ...config.weights },
      boosts: { ...DEFAULT_RERANK_CONFIG.boosts, ...config.boosts }
    };
  }

  /**
   * Rerank items based on query and configuration
   */
  rerank<T extends RerankableItem>(
    items: T[],
    query: string,
    customConfig?: Partial<RerankConfig>
  ): T[] {
    const config = customConfig ? {
      weights: { ...this.config.weights, ...customConfig.weights },
      boosts: { ...this.config.boosts, ...customConfig.boosts }
    } : this.config;

    // Per-type z-score normalization if enabled
    if (config.boosts.perTypeZScore) {
      const groups: Record<string, number[]> = {};
      for (const it of items) {
        const et = (it as any).metadata?.entityType || it.type || 'unknown';
        if (!groups[et]) groups[et] = [];
        groups[et].push(it.similarity || 0);
      }
      const stats: Record<string, { mean: number; std: number }> = {};
      for (const [et, arr] of Object.entries(groups)) {
        const mean = arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
        const variance = arr.length > 1 ? arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (arr.length - 1) : 0;
        const std = Math.sqrt(variance) || 0;
        stats[et] = { mean, std };
      }
      const squash = (z: number) => 0.5 + 0.5 * Math.tanh(z / 2);
      for (const it of items) {
        const et = (it as any).metadata?.entityType || it.type || 'unknown';
        const st = stats[et] || { mean: 0, std: 1 };
        const z = st.std > 0 ? ((it.similarity || 0) - st.mean) / st.std : 0;
        (it as any).normalizedSimilarity = squash(z);
      }
    }

    // Prepare context tokens once
    const contextText = config.boosts.contextText || '';
    const contextTokens = this.extractWords(contextText.toLowerCase());

    // Prepare query for matching
    const queryLower = query.toLowerCase();
    const queryWords = this.extractWords(queryLower);

    // Score each item
    const scoredItems = items.map(item => {
      const factors = this.calculateScoringFactors(item, queryLower, queryWords, contextTokens, config);
      const finalScore = this.calculateFinalScore(factors, item, config);
      
      return {
        ...item,
        scoringFactors: factors,
        finalScore
      };
    });

    // Sort by final score (descending)
    scoredItems.sort((a, b) => b.finalScore - a.finalScore);

    return scoredItems as T[];
  }

  /**
   * Calculate all scoring factors for an item
   */
  private calculateScoringFactors(
    item: RerankableItem,
    queryLower: string,
    queryWords: string[],
    contextTokens: string[],
    config: RerankConfig
  ): ScoringFactors {
    const sim = (item as any).normalizedSimilarity ?? (item.similarity || 0);
    const factors: ScoringFactors = {
      similarity: sim,
      nameMatch: this.calculateNameMatch(item, queryLower, queryWords, config),
      typeBoost: this.calculateTypeBoost(item, config),
      recency: this.calculateRecencyBoost(item),
      relationships: this.calculateRelationshipBoost(item),
      contextOverlap: this.calculateContextOverlap(item, contextTokens),
      analytics: this.calculateAnalytics(item)
    };
    return factors;
  }

  /**
   * Calculate name matching score
   */
  private calculateNameMatch(
    item: RerankableItem,
    queryLower: string,
    queryWords: string[],
    config: RerankConfig
  ): number {
    if (!item.name) return 0;

    const nameLower = item.name.toLowerCase();

    // Separator-insensitive, case-insensitive exact match
    // Example: "PHP Parser" ≡ "PHPParser" ≡ "php-parser"
    const normalizedQuery = queryLower.replace(/[^a-z0-9]/g, '');
    const normalizedName = nameLower.replace(/[^a-z0-9]/g, '');
    if (normalizedQuery && normalizedName && normalizedQuery === normalizedName) {
      const base = config.boosts.exactNameMatch || 0.3;
      const t = String((item as any).type || '').toLowerCase();
      // Prefer real code constructs over namespaces for exact matches, without demoting namespaces
      const mult = t === 'class' ? 1.3 : t === 'interface' ? 1.2 : (t === 'function' || t === 'method') ? 1.1 : 1.0;
      return base * mult;
    }

    // Exact match
    if (nameLower === queryLower) {
      const base = config.boosts.exactNameMatch || 0.3;
      const t = String((item as any).type || '').toLowerCase();
      const mult = t === 'class' ? 1.3 : t === 'interface' ? 1.2 : (t === 'function' || t === 'method') ? 1.1 : 1.0;
      return base * mult;
    }

    // Contains full query
    if (nameLower.includes(queryLower)) {
      return config.boosts.partialNameMatch || 0.1;
    }

    // Word matching
    const nameWords = this.extractWords(nameLower);
    const matchingWords = queryWords.filter(qWord => 
      nameWords.some(nWord => nWord.includes(qWord) || qWord.includes(nWord))
    );

    if (matchingWords.length > 0) {
      return (matchingWords.length / queryWords.length) * (config.boosts.partialNameMatch || 0.1);
    }

    return 0;
  }

  /**
   * Calculate type-specific boost
   */
  private calculateTypeBoost(item: RerankableItem, config: RerankConfig): number {
    if (!item.type) return 0;

    const preferredTypes = config.boosts.preferredTypes || [];
    if (preferredTypes.includes(item.type)) {
      return config.boosts.typeBoostAmount || 0.15;
    }

    // No demotion for namespaces; class preference comes from nameMatch multiplier above

    return 0;
  }

  /**
   * Calculate recency boost based on metadata
   */
  private calculateRecencyBoost(item: RerankableItem): number {
    if (!item.metadata?.updatedAt) return 0;

    const now = Date.now();
    const updated = new Date(item.metadata.updatedAt).getTime();
    const daysSinceUpdate = (now - updated) / (1000 * 60 * 60 * 24);

    // Boost newer items
    if (daysSinceUpdate < 7) return 0.1;
    if (daysSinceUpdate < 30) return 0.05;
    if (daysSinceUpdate < 90) return 0.02;
    
    return 0;
  }

  /**
   * Calculate relationship boost
   */
  private calculateRelationshipBoost(item: RerankableItem): number {
    const relationshipCount = 
      (item.metadata?.relationships?.length || 0) +
      (item.metadata?.inverseRelationships?.length || 0);

    if (relationshipCount === 0) return 0;
    
    // Logarithmic scale to prevent huge items from dominating
    return Math.min(0.2, Math.log10(relationshipCount + 1) * 0.1);
  }

  /**
   * Calculate final score from factors
   */
  private calculateFinalScore(
    factors: ScoringFactors,
    item: RerankableItem,
    config: RerankConfig
  ): number {
    const entityType = (item as any).metadata?.entityType as string | undefined;
    const perType = config.boosts.perTypeWeights || {};
    const weights = { ...config.weights, ...(entityType && perType[entityType] ? perType[entityType]! : {}) } as Required<RerankConfig['weights']>;
    // Base weighted score
    let score = (
      factors.similarity * (weights.similarity || 0.6) +
      factors.nameMatch * (weights.nameMatch || 0.2) +
      factors.typeBoost * (weights.typeBoost || 0.1) +
      factors.recency * (weights.recency || 0.05) +
      factors.relationships * (weights.relationships || 0.05) +
      (factors.contextOverlap || 0) * (weights.contextOverlap || 0) +
      (factors.analytics || 0) * (weights.analytics || 0)
    );

    // Apply entity-type weighting if provided
    const entityWeights = config.boosts.entityTypeWeights || {};
    if (entityType && typeof entityWeights[entityType] === 'number') {
      score *= Math.max(0, entityWeights[entityType]!);
    }

    // Apply path demotion when filePath matches noisy patterns
    const filePath = (item as any).metadata?.filePath as string | undefined;
    if (filePath && config.boosts.pathDemotePatterns && config.boosts.pathDemotePatterns.length) {
      const demotePerHit = config.boosts.pathDemoteAmount ?? 0.2;
      const hits = config.boosts.pathDemotePatterns.reduce((acc, rx) => acc + (rx.test(filePath) ? 1 : 0), 0);
      if (hits > 0) score = Math.max(0, score - demotePerHit * hits);
    }

    return score;
  }

  /**
   * Extract words from text for matching
   */
  private extractWords(text: string): string[] {
    // Split on non-alphanumeric characters and camelCase
    return text
      .replace(/([a-z])([A-Z])/g, '$1 $2')  // Split camelCase
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')  // Split PascalCase
      .split(/[^a-zA-Z0-9]+/)
      .map(w => w.toLowerCase())
      .filter(w => w.length > 1);  // Filter out single characters
  }

  private calculateContextOverlap(item: RerankableItem, contextTokens: string[]): number {
    if (!contextTokens.length) return 0;
    const text = `${item.name || ''} ${item.content || ''}`.toLowerCase();
    const itemTokens = this.extractWords(text);
    if (!itemTokens.length) return 0;
    const A = new Set(contextTokens);
    const B = new Set(itemTokens);
    let inter = 0; for (const t of A) if (B.has(t)) inter++;
    const uni = A.size + B.size - inter;
    return uni > 0 ? inter / uni : 0;
  }

  private calculateAnalytics(item: RerankableItem): number {
    const meta = (item as any).metadata || {};
    const et = meta.entityType || (item as any).type;
    if (et !== 'rule') return 0;
    const acc = Math.max(0, Math.min(1, meta.acceptance_rate ?? 0));
    const eff = Math.max(0, Math.min(1, meta.effectiveness_score ?? 0));
    const usageNorm = Math.max(0, Math.min(1, (meta.usage_count ?? 0) / 50));
    const last = meta.last_used ? new Date(meta.last_used).getTime() : NaN;
    let recency = 0;
    if (!Number.isNaN(last)) {
      const days = (Date.now() - last) / (1000 * 60 * 60 * 24);
      recency = days < 7 ? 1 : days < 30 ? 0.6 : days < 90 ? 0.3 : 0.1;
    }
    return Math.min(1, (acc + eff + usageNorm + recency) / 4);
  }

  /** Dual-channel preset with per-type profiles */
  static forUniversalDualChannel(config?: Partial<RerankConfig>): RerankingService {
    return new RerankingService({
      weights: {
        similarity: 0.6,
        nameMatch: 0.15,
        typeBoost: 0.0,
        recency: 0.05,
        relationships: 0.05,
        contextOverlap: 0.15,
        analytics: 0.15,
        ...config?.weights
      },
      boosts: {
        exactNameMatch: 0.25,
        partialNameMatch: 0.1,
        preferredTypes: [],
        typeBoostAmount: 0.0,
        entityTypeWeights: { component: 1.0, task: 0.7, note: 0.6, rule: 0.8 },
        perTypeZScore: true,
        perTypeWeights: {
          component: { similarity: 0.6, nameMatch: 0.2, contextOverlap: 0.2, analytics: 0.0 },
          rule: { similarity: 0.4, analytics: 0.3, contextOverlap: 0.3, nameMatch: 0.0 }
        },
        pathDemotePatterns: [/coverage\//i, /coverage-integration\//i, /lcov-report\//i, /node_modules\//i],
        pathDemoteAmount: 0.2,
        ...config?.boosts
      }
    });
  }

  /**
   * Create a specialized reranker for components
   */
  static forComponents(config?: Partial<RerankConfig>): RerankingService {
    return new RerankingService({
      weights: {
        similarity: 0.45,
        nameMatch: 0.3,
        typeBoost: 0.2,
        recency: 0.05,
        relationships: 0.05,
        ...config?.weights
      },
      boosts: {
        exactNameMatch: 0.8,
        partialNameMatch: 0.2,
        preferredTypes: ['function', 'class', 'interface', 'method'],
        typeBoostAmount: 0.3,
        entityTypeWeights: { component: 1.0, task: 0.4, note: 0.3, rule: 0.3 },
        pathDemotePatterns: [/coverage\//i, /coverage-integration\//i, /lcov-report\//i, /node_modules\//i, /vendor\//i],
        pathDemoteAmount: 0.25,
        ...config?.boosts
      }
    });
  }

  /**
   * Create a specialized reranker for universal search
   */
  static forUniversalSearch(config?: Partial<RerankConfig>): RerankingService {
    return new RerankingService({
      weights: {
        similarity: 0.65,
        nameMatch: 0.25,
        typeBoost: 0.1,
        recency: 0.05,
        relationships: 0.05,
        ...config?.weights
      },
      boosts: {
        exactNameMatch: 0.6,
        partialNameMatch: 0.1,
        preferredTypes: ['class','interface','function','method'],
        typeBoostAmount: 0.2,
        entityTypeWeights: { component: 1.0, task: 0.6, note: 0.5, rule: 0.5 },
        pathDemotePatterns: [/coverage\//i, /coverage-integration\//i, /lcov-report\//i, /node_modules\//i, /vendor\//i],
        pathDemoteAmount: 0.2,
        ...config?.boosts
      }
    });
  }
}
