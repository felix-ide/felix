/**
 * Service for calculating similarity between vectors
 * Follows Single Responsibility Principle - only handles similarity calculations
 */
export class SimilarityCalculator {
  /**
   * Calculates cosine similarity between two vectors
   * Returns a value between -1 and 1, where 1 means identical direction
   * 
   * @param a First vector
   * @param b Second vector
   * @returns Cosine similarity score
   * @throws Error if vectors have different lengths
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b) {
      throw new Error('Vectors cannot be null or undefined');
    }
    
    if (a.length !== b.length) {
      throw new Error(`Vectors must have same length. Got ${a.length} and ${b.length}`);
    }

    if (a.length === 0) {
      throw new Error('Vectors cannot be empty');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i]! * b[i]!;
      normA += a[i]! * a[i]!;
      normB += b[i]! * b[i]!;
    }

    // Handle zero vectors
    if (normA === 0 || normB === 0) {
      return 0;
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    
    // Clamp to [-1, 1] to handle floating point errors
    return Math.max(-1, Math.min(1, similarity));
  }

  /**
   * Calculates Euclidean distance between two vectors
   * Lower values mean more similar
   * 
   * @param a First vector
   * @param b Second vector
   * @returns Euclidean distance
   */
  static euclideanDistance(a: number[], b: number[]): number {
    if (!a || !b) {
      throw new Error('Vectors cannot be null or undefined');
    }
    
    if (a.length !== b.length) {
      throw new Error(`Vectors must have same length. Got ${a.length} and ${b.length}`);
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i]! - b[i]!;
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Normalizes a vector to unit length
   * 
   * @param vector Vector to normalize
   * @returns Normalized vector
   */
  static normalize(vector: number[]): number[] {
    if (!vector || vector.length === 0) {
      throw new Error('Vector cannot be null or empty');
    }

    let norm = 0;
    for (const val of vector) {
      norm += val * val;
    }

    if (norm === 0) {
      return vector; // Zero vector remains zero
    }

    const normSqrt = Math.sqrt(norm);
    return vector.map(val => val / normSqrt);
  }
}