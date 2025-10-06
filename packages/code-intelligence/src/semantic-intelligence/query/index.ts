/**
 * Query processing module exports
 */

export { QueryExpander, createQueryExpander } from './QueryExpander.js';
export type { 
  QueryExpansionConfig, 
  SuggestedTerm, 
  QueryExpansionResult 
} from './QueryExpander.js';

export { DiscoveryEngine, createDiscoveryEngine } from './Discovery.js';
export type { 
  DiscoveryResult, 
  DiscoveryItem, 
  DiscoveryConfig 
} from './Discovery.js';