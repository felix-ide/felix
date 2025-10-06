import { describe, it, expect } from '@jest/globals';
import { cosineSimilarity, euclideanDistance, manhattanDistance, findKNearestNeighbors } from '../../search/similarity.js';

describe('similarity edges', () => {
  it('handles mismatched lengths and zero vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0])).toBe(0);
    expect(euclideanDistance([1, 0, 0], [1, 0])).toBe(Infinity);
    expect(manhattanDistance([1, 0, 0], [1, 0])).toBe(Infinity);

    // zero vs non-zero -> cosine 0
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    // identical non-zero
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });

  it('findKNearestNeighbors sorts by similarity and respects k', () => {
    const q = [1, 0, 0];
    const vs = [
      [1, 0, 0], // sim 1
      [0, 1, 0], // sim 0
      [0.5, 0.5, 0], // sim ~0.707
    ];
    const res = findKNearestNeighbors(q, vs, 2);
    expect(res).toHaveLength(2);
    expect(res[0].index).toBe(0); // highest first
    expect(res[1].index).toBe(2);
    expect(res[0].similarity).toBeGreaterThan(res[1].similarity);
  });
});

