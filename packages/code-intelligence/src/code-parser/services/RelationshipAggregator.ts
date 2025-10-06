/**
 * RelationshipAggregator - Service for merging relationships by precedence and deduplicating
 *
 * This service handles:
 * - Merging relationships from different sources (semantic > structural > basic)
 * - Deduplicating relationships by (sourceId, targetId, type)
 * - Preserving highest confidence and most detailed metadata
 * - Maintaining relationship precedence rules
 * - Providing aggregation statistics and quality metrics
 */

export interface BaseRelationship {
  sourceId: string;
  targetId: string;
  type: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface AggregatedRelationship extends BaseRelationship {
  sources: RelationshipSource[];
  finalConfidence: number;
  precedenceLevel: 'semantic' | 'structural' | 'basic' | 'initial';
  aggregationMetadata: {
    mergedFromCount: number;
    highestOriginalConfidence: number;
    lowestOriginalConfidence: number;
    consensusScore: number;
    lastUpdated: number;
  };
}

export interface RelationshipSource {
  source: 'semantic' | 'structural' | 'basic' | 'initial';
  confidence: number;
  metadata?: Record<string, any>;
  timestamp: number;
  parser?: string;
  method?: string;
}

export interface AggregationResult {
  relationships: AggregatedRelationship[];
  metadata: {
    totalInputRelationships: number;
    deduplicationSavings: number;
    precedenceUpgrades: number;
    averageConfidence: number;
    confidenceDistribution: Record<string, number>;
    sourceDistribution: Record<string, number>;
    processingTimeMs: number;
  };
}

export interface AggregationOptions {
  confidenceThreshold?: number;
  enablePrecedenceUpgrade?: boolean;
  maxSourcesPerRelationship?: number;
  consensusWeight?: number;
  timeDecayFactor?: number;
}

export class RelationshipAggregator {
  private static instance: RelationshipAggregator | null = null;
  private relationshipStore = new Map<string, AggregatedRelationship>();

  // Precedence levels (higher number = higher precedence)
  private static readonly PRECEDENCE_ORDER = {
    'semantic': 4,
    'structural': 3,
    'basic': 2,
    'initial': 1
  };

  // Default confidence boosts for different precedence levels
  private static readonly CONFIDENCE_BOOSTS = {
    'semantic': 0.1,
    'structural': 0.05,
    'basic': 0.02,
    'initial': 0.0
  };

  /**
   * Get singleton instance
   */
  static getInstance(): RelationshipAggregator {
    if (!this.instance) {
      this.instance = new RelationshipAggregator();
    }
    return this.instance;
  }

  /**
   * Add relationships from a specific source
   */
  addRelationships(
    relationships: BaseRelationship[],
    source: RelationshipSource['source'],
    options: Partial<RelationshipSource> = {}
  ): void {
    const timestamp = Date.now();

    for (const rel of relationships) {
      const key = this.getRelationshipKey(rel);
      const existing = this.relationshipStore.get(key);

      const newSource: RelationshipSource = {
        source,
        confidence: rel.confidence,
        metadata: rel.metadata || {},
        timestamp,
        ...options
      };

      if (existing) {
        this.mergeRelationship(existing, rel, newSource);
      } else {
        this.createNewRelationship(rel, newSource);
      }
    }
  }

  /**
   * Get all aggregated relationships
   */
  getAllRelationships(options: AggregationOptions = {}): AggregationResult {
    const startTime = Date.now();
    const allRelationships = Array.from(this.relationshipStore.values());

    // Apply filters and thresholds
    const filteredRelationships = this.applyFilters(allRelationships, options);

    // Calculate statistics
    const metadata = this.calculateMetadata(filteredRelationships, startTime);

    return {
      relationships: filteredRelationships,
      metadata
    };
  }

  /**
   * Get relationships for a specific source or target
   */
  getRelationshipsFor(entityId: string, direction: 'source' | 'target' | 'both' = 'both'): AggregatedRelationship[] {
    const results: AggregatedRelationship[] = [];

    for (const rel of this.relationshipStore.values()) {
      if (direction === 'source' && rel.sourceId === entityId) {
        results.push(rel);
      } else if (direction === 'target' && rel.targetId === entityId) {
        results.push(rel);
      } else if (direction === 'both' && (rel.sourceId === entityId || rel.targetId === entityId)) {
        results.push(rel);
      }
    }

    return results;
  }

  /**
   * Clear all relationships (useful for testing or reprocessing)
   */
  clear(): void {
    this.relationshipStore.clear();
  }

  /**
   * Get aggregation statistics
   */
  getStatistics(): {
    totalRelationships: number;
    byPrecedenceLevel: Record<string, number>;
    byConfidenceRange: Record<string, number>;
    bySourceType: Record<string, number>;
    averageSourcesPerRelationship: number;
  } {
    const relationships = Array.from(this.relationshipStore.values());

    const byPrecedenceLevel: Record<string, number> = {
      semantic: 0,
      structural: 0,
      basic: 0,
      initial: 0
    };

    const byConfidenceRange: Record<string, number> = {
      '0.9-1.0': 0,
      '0.8-0.9': 0,
      '0.7-0.8': 0,
      '0.6-0.7': 0,
      '0.5-0.6': 0,
      '0.0-0.5': 0
    };

    const sourceTypeCounts = new Map<string, number>();
    let totalSources = 0;

    for (const rel of relationships) {
      byPrecedenceLevel[rel.precedenceLevel]++;

      const confidence = rel.finalConfidence;
      if (confidence >= 0.9) byConfidenceRange['0.9-1.0']++;
      else if (confidence >= 0.8) byConfidenceRange['0.8-0.9']++;
      else if (confidence >= 0.7) byConfidenceRange['0.7-0.8']++;
      else if (confidence >= 0.6) byConfidenceRange['0.6-0.7']++;
      else if (confidence >= 0.5) byConfidenceRange['0.5-0.6']++;
      else byConfidenceRange['0.0-0.5']++;

      totalSources += rel.sources.length;

      for (const source of rel.sources) {
        sourceTypeCounts.set(source.source, (sourceTypeCounts.get(source.source) || 0) + 1);
      }
    }

    const bySourceType = Object.fromEntries(sourceTypeCounts);

    return {
      totalRelationships: relationships.length,
      byPrecedenceLevel,
      byConfidenceRange,
      bySourceType,
      averageSourcesPerRelationship: relationships.length > 0 ? totalSources / relationships.length : 0
    };
  }

  /**
   * Generate a unique key for a relationship
   */
  private getRelationshipKey(rel: BaseRelationship): string {
    return `${rel.sourceId}:${rel.targetId}:${rel.type}`;
  }

  /**
   * Merge a new relationship with an existing one
   */
  private mergeRelationship(
    existing: AggregatedRelationship,
    incoming: BaseRelationship,
    newSource: RelationshipSource
  ): void {
    // Add the new source
    existing.sources.push(newSource);

    // Update precedence level if higher
    const incomingPrecedence = RelationshipAggregator.PRECEDENCE_ORDER[newSource.source];
    const currentPrecedence = RelationshipAggregator.PRECEDENCE_ORDER[existing.precedenceLevel];

    if (incomingPrecedence > currentPrecedence) {
      existing.precedenceLevel = newSource.source;
    }

    // Recalculate confidence
    existing.finalConfidence = this.calculateFinalConfidence(existing.sources, existing.precedenceLevel);

    // Update metadata
    this.updateAggregationMetadata(existing, incoming);

    // Merge custom metadata
    if (incoming.metadata) {
      existing.metadata = { ...existing.metadata, ...incoming.metadata };
    }
  }

  /**
   * Create a new aggregated relationship
   */
  private createNewRelationship(rel: BaseRelationship, source: RelationshipSource): void {
    const key = this.getRelationshipKey(rel);

    const aggregated: AggregatedRelationship = {
      sourceId: rel.sourceId,
      targetId: rel.targetId,
      type: rel.type,
      confidence: rel.confidence,
      metadata: { ...rel.metadata },
      sources: [source],
      finalConfidence: this.calculateFinalConfidence([source], source.source),
      precedenceLevel: source.source,
      aggregationMetadata: {
        mergedFromCount: 1,
        highestOriginalConfidence: rel.confidence,
        lowestOriginalConfidence: rel.confidence,
        consensusScore: 1.0,
        lastUpdated: source.timestamp
      }
    };

    this.relationshipStore.set(key, aggregated);
  }

  /**
   * Calculate final confidence based on sources and precedence
   */
  private calculateFinalConfidence(
    sources: RelationshipSource[],
    precedenceLevel: AggregatedRelationship['precedenceLevel']
  ): number {
    if (sources.length === 0) return 0;

    // Base confidence from highest precedence source
    const highestPrecedenceSources = sources.filter(s => s.source === precedenceLevel);
    const baseConfidence = Math.max(...highestPrecedenceSources.map(s => s.confidence));

    // Consensus boost if multiple sources agree
    const consensusBoost = sources.length > 1 ? Math.min(0.1, (sources.length - 1) * 0.02) : 0;

    // Precedence boost
    const precedenceBoost = RelationshipAggregator.CONFIDENCE_BOOSTS[precedenceLevel];

    // Time decay for old relationships
    const now = Date.now();
    const avgAge = sources.reduce((sum, s) => sum + (now - s.timestamp), 0) / sources.length;
    const daysSinceUpdate = avgAge / (1000 * 60 * 60 * 24);
    const timeDecay = Math.max(0, 1 - (daysSinceUpdate * 0.01)); // 1% decay per day

    const finalConfidence = Math.min(1.0, (baseConfidence + consensusBoost + precedenceBoost) * timeDecay);

    return Math.round(finalConfidence * 1000) / 1000; // Round to 3 decimal places
  }

  /**
   * Update aggregation metadata
   */
  private updateAggregationMetadata(
    existing: AggregatedRelationship,
    incoming: BaseRelationship
  ): void {
    const meta = existing.aggregationMetadata;

    meta.mergedFromCount++;
    meta.highestOriginalConfidence = Math.max(meta.highestOriginalConfidence, incoming.confidence);
    meta.lowestOriginalConfidence = Math.min(meta.lowestOriginalConfidence, incoming.confidence);
    meta.lastUpdated = Date.now();

    // Calculate consensus score (how much sources agree)
    const confidences = existing.sources.map(s => s.confidence);
    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    const variance = confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) / confidences.length;
    meta.consensusScore = Math.max(0, 1 - variance); // Lower variance = higher consensus
  }

  /**
   * Apply filters to relationships
   */
  private applyFilters(
    relationships: AggregatedRelationship[],
    options: AggregationOptions
  ): AggregatedRelationship[] {
    let filtered = relationships;

    // Apply confidence threshold
    if (options.confidenceThreshold !== undefined) {
      filtered = filtered.filter(rel => rel.finalConfidence >= options.confidenceThreshold!);
    }

    // Limit sources per relationship if specified
    if (options.maxSourcesPerRelationship) {
      filtered = filtered.map(rel => ({
        ...rel,
        sources: rel.sources
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, options.maxSourcesPerRelationship!)
      }));
    }

    return filtered;
  }

  /**
   * Calculate aggregation metadata
   */
  private calculateMetadata(
    relationships: AggregatedRelationship[],
    startTime: number
  ): AggregationResult['metadata'] {
    const totalInputRelationships = relationships.reduce((sum, rel) => sum + rel.sources.length, 0);
    const deduplicationSavings = totalInputRelationships - relationships.length;

    let precedenceUpgrades = 0;
    let totalConfidence = 0;

    const confidenceDistribution: Record<string, number> = {
      '0.9-1.0': 0,
      '0.8-0.9': 0,
      '0.7-0.8': 0,
      '0.6-0.7': 0,
      '0.5-0.6': 0,
      '0.0-0.5': 0
    };

    const sourceDistribution: Record<string, number> = {
      semantic: 0,
      structural: 0,
      basic: 0,
      initial: 0
    };

    for (const rel of relationships) {
      totalConfidence += rel.finalConfidence;

      // Count precedence upgrades
      const sourcePrecedences = rel.sources.map(s => RelationshipAggregator.PRECEDENCE_ORDER[s.source]);
      const minPrecedence = Math.min(...sourcePrecedences);
      const maxPrecedence = Math.max(...sourcePrecedences);
      if (maxPrecedence > minPrecedence) {
        precedenceUpgrades++;
      }

      // Confidence distribution
      const confidence = rel.finalConfidence;
      if (confidence >= 0.9) confidenceDistribution['0.9-1.0']++;
      else if (confidence >= 0.8) confidenceDistribution['0.8-0.9']++;
      else if (confidence >= 0.7) confidenceDistribution['0.7-0.8']++;
      else if (confidence >= 0.6) confidenceDistribution['0.6-0.7']++;
      else if (confidence >= 0.5) confidenceDistribution['0.5-0.6']++;
      else confidenceDistribution['0.0-0.5']++;

      // Source distribution
      sourceDistribution[rel.precedenceLevel]++;
    }

    const averageConfidence = relationships.length > 0 ? totalConfidence / relationships.length : 0;
    const processingTimeMs = Date.now() - startTime;

    return {
      totalInputRelationships,
      deduplicationSavings,
      precedenceUpgrades,
      averageConfidence,
      confidenceDistribution,
      sourceDistribution,
      processingTimeMs
    };
  }
}

// Export default instance for convenience
export const relationshipAggregator = RelationshipAggregator.getInstance();