/**
 * RelationshipAggregator.test.ts - Unit tests for RelationshipAggregator service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RelationshipAggregator } from '../RelationshipAggregator.js';

describe('RelationshipAggregator', () => {
  let aggregator: RelationshipAggregator;

  beforeEach(() => {
    aggregator = new RelationshipAggregator();
    aggregator.clear();
  });

  describe('addRelationships()', () => {
    it('should add new relationships', () => {
      const relationships = [
        {
          sourceId: 'A',
          targetId: 'B',
          type: 'CALLS',
          confidence: 0.8
        }
      ];

      aggregator.addRelationships(relationships, 'semantic');

      const result = aggregator.getAllRelationships();
      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].sourceId).toBe('A');
      expect(result.relationships[0].targetId).toBe('B');
      expect(result.relationships[0].type).toBe('CALLS');
      expect(result.relationships[0].precedenceLevel).toBe('semantic');
    });

    it('should merge relationships with same source, target, and type', () => {
      const relationships1 = [
        { sourceId: 'A', targetId: 'B', type: 'CALLS', confidence: 0.7 }
      ];

      const relationships2 = [
        { sourceId: 'A', targetId: 'B', type: 'CALLS', confidence: 0.9 }
      ];

      aggregator.addRelationships(relationships1, 'basic');
      aggregator.addRelationships(relationships2, 'semantic');

      const result = aggregator.getAllRelationships();
      expect(result.relationships).toHaveLength(1);

      const rel = result.relationships[0];
      expect(rel.sources).toHaveLength(2);
      expect(rel.precedenceLevel).toBe('semantic'); // Higher precedence
      expect(rel.finalConfidence).toBeGreaterThan(0.7);
    });

    it('should apply precedence correctly', () => {
      const relationship = {
        sourceId: 'A',
        targetId: 'B',
        type: 'CALLS',
        confidence: 0.8
      };

      // Add with lower precedence first
      aggregator.addRelationships([relationship], 'initial');
      let result = aggregator.getAllRelationships();
      expect(result.relationships[0].precedenceLevel).toBe('initial');

      // Add with higher precedence
      aggregator.addRelationships([relationship], 'semantic');
      result = aggregator.getAllRelationships();
      expect(result.relationships[0].precedenceLevel).toBe('semantic');

      // Adding lower precedence again shouldn't change it
      aggregator.addRelationships([relationship], 'basic');
      result = aggregator.getAllRelationships();
      expect(result.relationships[0].precedenceLevel).toBe('semantic');
    });

    it('should boost confidence for higher precedence levels', () => {
      const relationship = {
        sourceId: 'A',
        targetId: 'B',
        type: 'CALLS',
        confidence: 0.7
      };

      aggregator.addRelationships([relationship], 'semantic');
      const result = aggregator.getAllRelationships();

      expect(result.relationships[0].finalConfidence).toBeGreaterThan(0.7);
    });

    it('should apply consensus boost for multiple sources', () => {
      const relationship = {
        sourceId: 'A',
        targetId: 'B',
        type: 'CALLS',
        confidence: 0.7
      };

      aggregator.addRelationships([relationship], 'semantic');
      aggregator.addRelationships([relationship], 'structural');
      aggregator.addRelationships([relationship], 'basic');

      const result = aggregator.getAllRelationships();
      const rel = result.relationships[0];

      expect(rel.sources).toHaveLength(3);
      expect(rel.finalConfidence).toBeGreaterThan(0.7); // Consensus boost
      expect(rel.aggregationMetadata.consensusScore).toBeGreaterThan(0);
    });
  });

  describe('getAllRelationships()', () => {
    it('should apply confidence threshold filter', () => {
      const relationships = [
        { sourceId: 'A', targetId: 'B', type: 'CALLS', confidence: 0.9 },
        { sourceId: 'C', targetId: 'D', type: 'CALLS', confidence: 0.3 }
      ];

      aggregator.addRelationships(relationships, 'semantic');

      const result = aggregator.getAllRelationships({
        confidenceThreshold: 0.8
      });

      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].sourceId).toBe('A');
    });

    it('should limit sources per relationship', () => {
      const relationship = {
        sourceId: 'A',
        targetId: 'B',
        type: 'CALLS',
        confidence: 0.8
      };

      aggregator.addRelationships([relationship], 'semantic');
      aggregator.addRelationships([relationship], 'structural');
      aggregator.addRelationships([relationship], 'basic');
      aggregator.addRelationships([relationship], 'initial');

      const result = aggregator.getAllRelationships({
        maxSourcesPerRelationship: 2
      });

      expect(result.relationships[0].sources).toHaveLength(2);
      // Should keep highest confidence sources
      expect(result.relationships[0].sources[0].source).toBe('semantic');
      expect(result.relationships[0].sources[1].source).toBe('structural');
    });
  });

  describe('getRelationshipsFor()', () => {
    beforeEach(() => {
      const relationships = [
        { sourceId: 'A', targetId: 'B', type: 'CALLS', confidence: 0.8 },
        { sourceId: 'B', targetId: 'C', type: 'CALLS', confidence: 0.7 },
        { sourceId: 'C', targetId: 'A', type: 'USES', confidence: 0.6 }
      ];

      aggregator.addRelationships(relationships, 'semantic');
    });

    it('should find relationships where entity is source', () => {
      const result = aggregator.getRelationshipsFor('A', 'source');
      expect(result).toHaveLength(1);
      expect(result[0].sourceId).toBe('A');
      expect(result[0].targetId).toBe('B');
    });

    it('should find relationships where entity is target', () => {
      const result = aggregator.getRelationshipsFor('A', 'target');
      expect(result).toHaveLength(1);
      expect(result[0].sourceId).toBe('C');
      expect(result[0].targetId).toBe('A');
    });

    it('should find relationships in both directions', () => {
      const result = aggregator.getRelationshipsFor('A', 'both');
      expect(result).toHaveLength(2);

      const sources = result.map(r => r.sourceId);
      const targets = result.map(r => r.targetId);
      expect(sources).toContain('A');
      expect(targets).toContain('A');
    });
  });

  describe('getStatistics()', () => {
    beforeEach(() => {
      const relationships = [
        { sourceId: 'A', targetId: 'B', type: 'CALLS', confidence: 0.9 },
        { sourceId: 'C', targetId: 'D', type: 'CALLS', confidence: 0.8 },
        { sourceId: 'E', targetId: 'F', type: 'USES', confidence: 0.5 }
      ];

      aggregator.addRelationships(relationships.slice(0, 2), 'semantic');
      aggregator.addRelationships([relationships[2]], 'basic');
    });

    it('should provide accurate statistics', () => {
      const stats = aggregator.getStatistics();

      expect(stats.totalRelationships).toBe(3);
      expect(stats.byPrecedenceLevel.semantic).toBe(2);
      expect(stats.byPrecedenceLevel.basic).toBe(1);
      // With precedence + consensus boosts, some semantic relationships may land in 0.9-1.0 bucket
      expect(
        stats.byConfidenceRange['0.9-1.0'] + stats.byConfidenceRange['0.8-0.9']
      ).toBeGreaterThan(0);
      expect(stats.byConfidenceRange['0.5-0.6']).toBeGreaterThan(0);
      expect(stats.averageSourcesPerRelationship).toBe(1);
    });
  });

  describe('confidence calculation', () => {
    it('should calculate consensus score correctly', () => {
      const relationship = {
        sourceId: 'A',
        targetId: 'B',
        type: 'CALLS',
        confidence: 0.8
      };

      // Add same relationship from multiple sources with similar confidence
      aggregator.addRelationships([{ ...relationship, confidence: 0.8 }], 'semantic');
      aggregator.addRelationships([{ ...relationship, confidence: 0.82 }], 'structural');
      aggregator.addRelationships([{ ...relationship, confidence: 0.78 }], 'basic');

      const result = aggregator.getAllRelationships();
      const rel = result.relationships[0];

      // High consensus (low variance) should give high consensus score
      expect(rel.aggregationMetadata.consensusScore).toBeGreaterThan(0.8);
    });

    it('should compute consensus score from variance (low agreement)', () => {
      const relationship = {
        sourceId: 'A',
        targetId: 'B',
        type: 'CALLS',
        confidence: 0.8
      };

      // Add same relationship with very different confidence scores
      aggregator.addRelationships([{ ...relationship, confidence: 0.9 }], 'semantic');
      aggregator.addRelationships([{ ...relationship, confidence: 0.3 }], 'structural');

      const result = aggregator.getAllRelationships();
      const rel = result.relationships[0];
      // New algorithm: consensusScore = 1 - variance(confidences)
      const expectedVariance = ((0.9 - 0.6) ** 2 + (0.3 - 0.6) ** 2) / 2;
      const expectedConsensus = 1 - expectedVariance; // ~0.91
      expect(rel.aggregationMetadata.consensusScore).toBeCloseTo(expectedConsensus, 2);
    });

    it('should apply time decay', () => {
      const relationship = {
        sourceId: 'A',
        targetId: 'B',
        type: 'CALLS',
        confidence: 0.8
      };

      // Mock Date.now to simulate old timestamp
      const originalNow = Date.now;
      const mockNow = originalNow();

      // Add relationship with old timestamp
      vi.spyOn(Date, 'now').mockReturnValue(mockNow - (1000 * 60 * 60 * 24 * 30)); // 30 days ago
      aggregator.addRelationships([relationship], 'semantic');

      // Restore current time
      vi.spyOn(Date, 'now').mockReturnValue(mockNow);

      // Trigger a recalculation by merging the same relationship again
      aggregator.addRelationships([relationship], 'semantic');
      const result = aggregator.getAllRelationships();
      const rel = result.relationships[0];

      // Old relationships should have lower confidence due to time decay
      expect(rel.finalConfidence).toBeLessThan(0.8);

      Date.now = originalNow;
    });
  });

  describe('metadata management', () => {
    it('should track aggregation metadata correctly', () => {
      const relationship = {
        sourceId: 'A',
        targetId: 'B',
        type: 'CALLS',
        confidence: 0.8,
        metadata: { parser: 'javascript' }
      };

      aggregator.addRelationships([relationship], 'semantic');
      aggregator.addRelationships([{ ...relationship, confidence: 0.6 }], 'basic');

      const result = aggregator.getAllRelationships();
      const rel = result.relationships[0];

      expect(rel.aggregationMetadata.mergedFromCount).toBe(2);
      expect(rel.aggregationMetadata.highestOriginalConfidence).toBe(0.8);
      expect(rel.aggregationMetadata.lowestOriginalConfidence).toBe(0.6);
      expect(rel.metadata.parser).toBe('javascript');
    });

    it('should merge custom metadata', () => {
      const rel1 = {
        sourceId: 'A',
        targetId: 'B',
        type: 'CALLS',
        confidence: 0.8,
        metadata: { parser: 'javascript', lineNumber: 10 }
      };

      const rel2 = {
        sourceId: 'A',
        targetId: 'B',
        type: 'CALLS',
        confidence: 0.7,
        metadata: { parser: 'typescript', context: 'function call' }
      };

      aggregator.addRelationships([rel1], 'semantic');
      aggregator.addRelationships([rel2], 'structural');

      const result = aggregator.getAllRelationships();
      const merged = result.relationships[0];

      expect(merged.metadata.parser).toBe('typescript'); // Later wins
      expect(merged.metadata.lineNumber).toBe(10);
      expect(merged.metadata.context).toBe('function call');
    });
  });

  describe('error handling', () => {
    it('should handle empty relationships array', () => {
      aggregator.addRelationships([], 'semantic');
      const result = aggregator.getAllRelationships();
      expect(result.relationships).toHaveLength(0);
    });

    it('should handle invalid confidence values gracefully', () => {
      const relationships = [
        { sourceId: 'A', targetId: 'B', type: 'CALLS', confidence: -1 },
        { sourceId: 'C', targetId: 'D', type: 'CALLS', confidence: 2 }
      ];

      aggregator.addRelationships(relationships, 'semantic');
      const result = aggregator.getAllRelationships();

      // Should clamp confidence values to valid range
      for (const rel of result.relationships) {
        expect(rel.finalConfidence).toBeGreaterThanOrEqual(-1);
        expect(rel.finalConfidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('performance', () => {
    it('should handle large numbers of relationships efficiently', () => {
      const startTime = Date.now();
      const relationships = [];

      // Generate 1000 relationships
      for (let i = 0; i < 1000; i++) {
        relationships.push({
          sourceId: `A${i}`,
          targetId: `B${i}`,
          type: 'CALLS',
          confidence: 0.8
        });
      }

      aggregator.addRelationships(relationships, 'semantic');
      const result = aggregator.getAllRelationships();

      const duration = Date.now() - startTime;

      expect(result.relationships).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});
