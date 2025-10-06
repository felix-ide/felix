/**
 * Search module exports
 */

export { BooleanQueryParser } from './BooleanQueryParser.js';
export type { QueryNode, QueryModifier, ParsedQuery } from './BooleanQueryParser.js';

export {
  cosineSimilarity,
  euclideanDistance,
  manhattanDistance,
  findKNearestNeighbors,
  rerankResults
} from './similarity.js';
export type { 
  RerankOptions,
  EntityType,
  RerankQuery,
  RerankableItem,
  ScoringFactors,
  RerankResult
} from './similarity.js';