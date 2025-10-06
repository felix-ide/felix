/**
 * Similarity Search Tests
 */

import {
  cosineSimilarity,
  euclideanDistance,
  manhattanDistance,
  findKNearestNeighbors,
  rerankResults
} from '../../search/similarity';

describe('Similarity Functions', () => {
  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const a = [1, 0, 0];
      const b = [1, 0, 0];
      expect(cosineSimilarity(a, b)).toBe(1); // Identical vectors
      
      const c = [1, 0, 0];
      const d = [0, 1, 0];
      expect(cosineSimilarity(c, d)).toBe(0); // Orthogonal vectors
      
      const e = [1, 0, 0];
      const f = [-1, 0, 0];
      expect(cosineSimilarity(e, f)).toBe(-1); // Opposite vectors
    });

    it('should handle different magnitudes', () => {
      const a = [3, 4, 0];
      const b = [6, 8, 0];
      // Same direction, different magnitude
      expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
    });

    it('should handle zero vectors', () => {
      const a = [0, 0, 0];
      const b = [1, 2, 3];
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('should be symmetric', () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];
      expect(cosineSimilarity(a, b)).toBe(cosineSimilarity(b, a));
    });
  });

  describe('euclideanDistance', () => {
    it('should calculate euclidean distance correctly', () => {
      const a = [0, 0];
      const b = [3, 4];
      expect(euclideanDistance(a, b)).toBe(5); // 3-4-5 triangle
      
      const c = [1, 1, 1];
      const d = [1, 1, 1];
      expect(euclideanDistance(c, d)).toBe(0); // Same point
    });

    it('should handle negative coordinates', () => {
      const a = [-1, -1];
      const b = [1, 1];
      expect(euclideanDistance(a, b)).toBeCloseTo(2.828, 3);
    });

    it('should be symmetric', () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];
      expect(euclideanDistance(a, b)).toBe(euclideanDistance(b, a));
    });
  });

  describe('manhattanDistance', () => {
    it('should calculate manhattan distance correctly', () => {
      const a = [0, 0];
      const b = [3, 4];
      expect(manhattanDistance(a, b)).toBe(7); // |3-0| + |4-0|
      
      const c = [1, 1, 1];
      const d = [1, 1, 1];
      expect(manhattanDistance(c, d)).toBe(0); // Same point
    });

    it('should handle negative coordinates', () => {
      const a = [-1, -1];
      const b = [1, 1];
      expect(manhattanDistance(a, b)).toBe(4); // |1-(-1)| + |1-(-1)|
    });
  });

  describe('findKNearestNeighbors', () => {
    const vectors = [
      [1, 0, 0],     // Index 0 - 'A'
      [0, 1, 0],     // Index 1 - 'B'
      [0, 0, 1],     // Index 2 - 'C'
      [0.9, 0.1, 0], // Index 3 - 'D'
      [0.1, 0.9, 0]  // Index 4 - 'E'
    ];

    it('should find k nearest neighbors', () => {
      const query = [1, 0, 0];
      const neighbors = findKNearestNeighbors(query, vectors, 3);
      
      expect(neighbors).toHaveLength(3);
      expect(neighbors[0].index).toBe(0); // Exact match to vector A
      expect(neighbors[1].index).toBe(3); // Close to query (vector D)
      expect(neighbors[0].similarity).toBe(1);
    });

    it('should use custom similarity function', () => {
      const query = [1, 0, 0];
      const neighbors = findKNearestNeighbors(
        query, 
        vectors, 
        3,
        (a, b) => -euclideanDistance(a, b) // Negative distance as similarity
      );
      
      expect(neighbors).toHaveLength(3);
      expect(neighbors[0].index).toBe(0); // Closest (vector A)
    });

    it('should handle k larger than vector count', () => {
      const query = [1, 0, 0];
      const neighbors = findKNearestNeighbors(query, vectors, 10);
      
      expect(neighbors).toHaveLength(5); // Only 5 vectors available
    });

    it('should handle empty vectors', () => {
      const query = [1, 0, 0];
      const neighbors = findKNearestNeighbors(query, [], 3);
      
      expect(neighbors).toHaveLength(0);
    });

    it('should handle k = 0', () => {
      const query = [1, 0, 0];
      const neighbors = findKNearestNeighbors(query, vectors, 0);
      
      expect(neighbors).toHaveLength(0);
    });
  });

  describe('rerankResults', () => {
    const results = [
      {
        id: 'A',
        similarity: 0.9,
        metadata: {
          title: 'User Authentication Service',
          description: 'Handles user login and authentication',
          tags: ['auth', 'security']
        }
      },
      {
        id: 'B',
        similarity: 0.8,
        metadata: {
          title: 'Database Connection',
          description: 'Manages database connections',
          tags: ['database', 'connection']
        }
      },
      {
        id: 'C',
        similarity: 0.85,
        metadata: {
          title: 'Auth Token Manager',
          description: 'JWT token generation and validation',
          tags: ['auth', 'jwt', 'security']
        }
      }
    ];

    it('should rerank based on query relevance', () => {
      const reranked = rerankResults(results, { text: 'authentication token' }, {
        factors: {
          nameMatch: {
            enabled: true,
            exactBoost: 2.0,
            partialBoost: 1.5,
            fuzzyBoost: 1.0
          },
          contentMatch: {
            enabled: true,
            exactBoost: 1.5,
            partialBoost: 1.0,
            fieldBoosts: {
              description: 1.2
            }
          },
          tagMatch: {
            enabled: true,
            boost: 1.2
          }
        }
      });
      
      // Both A and C should get content match boosts, with final scores > similarity
      expect(reranked[0].finalScore).toBeGreaterThan(reranked[0].similarity || 0);
      expect(reranked[1].finalScore).toBeGreaterThan(reranked[1].similarity || 0);
      // Auth Token Manager (C) should get a boost but A still wins due to higher base similarity
      expect(reranked[0].id).toBe('A');
      expect(reranked[1].id).toBe('C');
    });

    it('should preserve order when no metadata boost', () => {
      const reranked = rerankResults(results, { text: 'test' }, {
        factors: {}
      });
      
      expect(reranked[0].id).toBe('A'); // Original highest similarity
      expect(reranked[1].id).toBe('C');
      expect(reranked[2].id).toBe('B');
    });

    it('should handle results without metadata', () => {
      const simpleResults = [
        { id: 'A', similarity: 0.9 },
        { id: 'B', similarity: 0.8 }
      ];
      
      const reranked = rerankResults(simpleResults, { text: 'test' }, {
        factors: {
          nameMatch: {
            enabled: true,
            exactBoost: 1.0,
            partialBoost: 0.5,
            fuzzyBoost: 0.2
          }
        }
      });
      
      expect(reranked[0].id).toBe('A');
      expect(reranked[0].finalScore).toBe(0.9);
    });

    it('should apply custom reranking function', () => {
      const reranked = rerankResults(results, { text: 'database' }, {
        factors: {
          custom: [{
            name: 'titleBoost',
            scorer: (result, query) => {
              // Boost if title contains query
              if (result.metadata?.title?.toLowerCase().includes(query.text?.toLowerCase() || '')) {
                return 1.0;
              }
              return 0;
            },
            weight: 1.0
          }]
        }
      });
      
      expect(reranked[0].id).toBe('B'); // Database Connection boosted
    });

    it('should handle empty query', () => {
      const reranked = rerankResults(results, { text: '' }, {
        factors: {
          nameMatch: {
            enabled: true,
            exactBoost: 1.0,
            partialBoost: 0.5,
            fuzzyBoost: 0.2
          }
        }
      });
      
      // Should maintain original similarity order: A(0.9), C(0.85), B(0.8)
      expect(reranked[0].id).toBe('A');
      expect(reranked[1].id).toBe('C');
      expect(reranked[2].id).toBe('B');
    });

    it('should handle empty results', () => {
      const reranked = rerankResults([], { text: 'test' }, { factors: {} });
      expect(reranked).toHaveLength(0);
    });

    it('should apply decay factor for lower similarities', () => {
      const lowSimilarityResults = [
        { id: 'A', similarity: 0.3 },
        { id: 'B', similarity: 0.2 },
        { id: 'C', similarity: 0.1 }
      ];
      
      const reranked = rerankResults(lowSimilarityResults, { text: 'test' }, {
        factors: {
          custom: [{
            name: 'threshold',
            scorer: (result) => {
              // Penalize results below threshold
              if ((result.similarity || 0) < 0.25) {
                return -0.5;
              }
              return 0;
            },
            weight: 1.0
          }]
        }
      });
      
      // Results below threshold should be penalized
      expect(reranked[2].finalScore).toBeLessThan(0.1);
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle very high dimensional vectors', () => {
      const dim = 1000;
      const a = new Array(dim).fill(0).map(() => Math.random());
      const b = new Array(dim).fill(0).map(() => Math.random());
      
      expect(() => cosineSimilarity(a, b)).not.toThrow();
      expect(cosineSimilarity(a, b)).toBeGreaterThan(-1);
      expect(cosineSimilarity(a, b)).toBeLessThan(1);
    });

    it('should handle vectors with different lengths gracefully', () => {
      const a = [1, 2, 3];
      const b = [1, 2];
      
      // The functions return 0 or Infinity rather than throwing
      expect(cosineSimilarity(a, b)).toBe(0);
      expect(euclideanDistance(a, b)).toBe(Infinity);
    });

    it('should handle NaN values', () => {
      const a = [1, NaN, 3];
      const b = [1, 2, 3];
      
      // The function handles NaN as 0, so result is not NaN
      expect(cosineSimilarity(a, b)).not.toBeNaN();
    });

    it('should handle Infinity values', () => {
      const a = [1, Infinity, 3];
      const b = [1, 2, 3];
      
      expect(euclideanDistance(a, b)).toBe(Infinity);
    });
  });
});