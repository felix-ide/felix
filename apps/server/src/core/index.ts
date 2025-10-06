export { KnowledgeGraph } from './KnowledgeGraph.js';
export type { 
  GraphSearchOptions, 
  GraphPath, 
  GraphStats 
} from './KnowledgeGraph.js';
export { CodeIndexer } from '../features/indexing/api/CodeIndexer.js';
export type {
  IndexingOptions,
  IndexingResult
} from '../features/indexing/api/CodeIndexer.js';
export { SkeletonGenerator } from '@felix/code-intelligence';
export type {
  SkeletonMember,
  ClassSkeleton,
  FileSkeleton
} from '@felix/code-intelligence';
export { RelationshipInverter, filterRelationshipsByDirection, getRelationshipsWithInverses } from './RelationshipInverter.js';