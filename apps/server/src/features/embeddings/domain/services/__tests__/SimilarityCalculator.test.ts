import { SimilarityCalculator } from '../SimilarityCalculator';

describe('SimilarityCalculator', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vector = [0.5, 0.3, 0.8];
      const result = SimilarityCalculator.cosineSimilarity(vector, vector);
      expect(result).toBeCloseTo(1, 10);
    });

    it('should return -1 for opposite vectors', () => {
      const a = [1, 0, 0];
      const b = [-1, 0, 0];
      const result = SimilarityCalculator.cosineSimilarity(a, b);
      expect(result).toBeCloseTo(-1, 10);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      const result = SimilarityCalculator.cosineSimilarity(a, b);
      expect(result).toBeCloseTo(0, 10);
    });

    it('should handle vectors with negative values', () => {
      const a = [1, -1, 2];
      const b = [2, -2, 4];
      const result = SimilarityCalculator.cosineSimilarity(a, b);
      expect(result).toBeCloseTo(1, 10); // Parallel vectors
    });

    it('should return 0 for zero vectors', () => {
      const a = [0, 0, 0];
      const b = [1, 2, 3];
      const result = SimilarityCalculator.cosineSimilarity(a, b);
      expect(result).toBe(0);
    });

    it('should handle very small values without underflow', () => {
      const a = [1e-10, 1e-10, 1e-10];
      const b = [1e-10, 1e-10, 1e-10];
      const result = SimilarityCalculator.cosineSimilarity(a, b);
      expect(result).toBeCloseTo(1, 10);
    });

    it('should handle very large values without overflow', () => {
      const a = [1e10, 1e10, 1e10];
      const b = [1e10, 1e10, 1e10];
      const result = SimilarityCalculator.cosineSimilarity(a, b);
      expect(result).toBeCloseTo(1, 10);
    });

    it('should throw error for vectors of different lengths', () => {
      const a = [1, 2, 3];
      const b = [1, 2];
      expect(() => SimilarityCalculator.cosineSimilarity(a, b))
        .toThrow('Vectors must have same length');
    });

    it('should throw error for null vectors', () => {
      expect(() => SimilarityCalculator.cosineSimilarity(null as any, [1, 2]))
        .toThrow('Vectors cannot be null or undefined');
    });

    it('should throw error for empty vectors', () => {
      expect(() => SimilarityCalculator.cosineSimilarity([], []))
        .toThrow('Vectors cannot be empty');
    });

    it('should clamp results to [-1, 1] range', () => {
      // This can happen due to floating point errors
      const a = [1, 0];
      const b = [1, 1e-15]; // Very small value that might cause issues
      const result = SimilarityCalculator.cosineSimilarity(a, b);
      expect(result).toBeGreaterThanOrEqual(-1);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('euclideanDistance', () => {
    it('should return 0 for identical vectors', () => {
      const vector = [1, 2, 3];
      const result = SimilarityCalculator.euclideanDistance(vector, vector);
      expect(result).toBe(0);
    });

    it('should calculate correct distance for 2D vectors', () => {
      const a = [0, 0];
      const b = [3, 4];
      const result = SimilarityCalculator.euclideanDistance(a, b);
      expect(result).toBe(5); // 3-4-5 triangle
    });

    it('should calculate correct distance for 3D vectors', () => {
      const a = [1, 2, 3];
      const b = [4, 6, 8];
      const result = SimilarityCalculator.euclideanDistance(a, b);
      expect(result).toBeCloseTo(Math.sqrt(50), 10);
    });

    it('should handle negative values', () => {
      const a = [-1, -2, -3];
      const b = [1, 2, 3];
      const result = SimilarityCalculator.euclideanDistance(a, b);
      expect(result).toBeCloseTo(Math.sqrt(56), 10);
    });

    it('should throw error for vectors of different lengths', () => {
      const a = [1, 2, 3];
      const b = [1, 2];
      expect(() => SimilarityCalculator.euclideanDistance(a, b))
        .toThrow('Vectors must have same length');
    });

    it('should throw error for null vectors', () => {
      expect(() => SimilarityCalculator.euclideanDistance(null as any, [1, 2]))
        .toThrow('Vectors cannot be null or undefined');
    });
  });

  describe('normalize', () => {
    it('should normalize vector to unit length', () => {
      const vector = [3, 4];
      const result = SimilarityCalculator.normalize(vector);
      expect(result[0]).toBeCloseTo(0.6, 10);
      expect(result[1]).toBeCloseTo(0.8, 10);
      
      // Check that the length is 1
      const length = Math.sqrt(result[0]! * result[0]! + result[1]! * result[1]!);
      expect(length).toBeCloseTo(1, 10);
    });

    it('should handle negative values', () => {
      const vector = [-3, 4];
      const result = SimilarityCalculator.normalize(vector);
      expect(result[0]).toBeCloseTo(-0.6, 10);
      expect(result[1]).toBeCloseTo(0.8, 10);
    });

    it('should return zero vector unchanged', () => {
      const vector = [0, 0, 0];
      const result = SimilarityCalculator.normalize(vector);
      expect(result).toEqual([0, 0, 0]);
    });

    it('should normalize already normalized vectors to themselves', () => {
      const vector = [0.6, 0.8];
      const result = SimilarityCalculator.normalize(vector);
      expect(result[0]).toBeCloseTo(0.6, 10);
      expect(result[1]).toBeCloseTo(0.8, 10);
    });

    it('should throw error for null vector', () => {
      expect(() => SimilarityCalculator.normalize(null as any))
        .toThrow('Vector cannot be null or empty');
    });

    it('should throw error for empty vector', () => {
      expect(() => SimilarityCalculator.normalize([]))
        .toThrow('Vector cannot be null or empty');
    });
  });
});