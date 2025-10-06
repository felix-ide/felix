/**
 * Discovery and suggestion functionality for semantic search
 */

import type { EmbeddingService } from '../EmbeddingService.js';
import { QueryExpander } from './QueryExpander.js';
import { extractWordsFromIdentifier, extractWordsFromText, extractConceptsFromPath, isCommonWord } from '../text/processing.js';

/**
 * Discovery result from search
 */
export interface DiscoveryResult {
  /** Original query */
  query: string;
  /** Suggested search terms with metadata */
  suggestedTerms: Array<{
    term: string;
    type: string;
    relevance: string;
    count?: number;
    score?: number;
  }>;
  /** Related concepts found */
  relatedConcepts: string[];
  /** Cross-references between entities */
  crossReferences: Array<{
    from: string;
    to: string;
    relationship: string;
  }>;
  /** Total items analyzed */
  totalAnalyzed: number;
}

/**
 * Item to analyze for discovery
 */
export interface DiscoveryItem {
  id: string;
  name: string;
  type?: string;
  content?: string;
  metadata?: {
    description?: string;
    documentation?: string;
    tags?: string[];
  };
  filePath?: string;
  similarity?: number;
  relationships?: Array<{
    targetId: string;
    targetName?: string;
    type: string;
  }>;
}

/**
 * Configuration for discovery
 */
export interface DiscoveryConfig {
  /** Maximum suggested terms to return */
  maxSuggestedTerms?: number;
  /** Maximum related concepts */
  maxRelatedConcepts?: number;
  /** Maximum cross-references */
  maxCrossReferences?: number;
  /** Minimum item similarity to consider */
  minSimilarity?: number;
  /** Include query expansion */
  expandQuery?: boolean;
}

/**
 * Discovery engine for finding related terms and concepts
 */
export class DiscoveryEngine {
  private queryExpander: QueryExpander;

  constructor(embeddingService?: EmbeddingService) {
    this.queryExpander = new QueryExpander(embeddingService);
  }

  /**
   * Discover related terms and concepts from search results
   */
  async discover(
    query: string,
    items: DiscoveryItem[],
    config: DiscoveryConfig = {}
  ): Promise<DiscoveryResult> {
    const {
      maxSuggestedTerms = 10,
      maxRelatedConcepts = 15,
      maxCrossReferences = 10,
      minSimilarity = 0.3,
      expandQuery = true
    } = config;

    // Filter items by similarity if provided
    const relevantItems = items.filter(item => 
      !item.similarity || item.similarity >= minSimilarity
    );

    // Extract suggested terms
    const suggestedTerms = this.extractSuggestedTerms(
      relevantItems,
      query,
      maxSuggestedTerms
    );

    // Generate related concepts
    const relatedConcepts = this.generateRelatedConcepts(
      relevantItems,
      query,
      maxRelatedConcepts
    );

    // Generate cross-references
    const crossReferences = this.generateCrossReferences(
      relevantItems,
      maxCrossReferences
    );

    // Expand query if requested
    if (expandQuery) {
      const expansion = await this.queryExpander.expand(query, {
        maxTerms: 5,
        includeRelatedConcepts: true
      });
      
      // Merge expanded terms into related concepts
      const existingConcepts = new Set(relatedConcepts);
      for (const term of expansion.expandedTerms) {
        if (!existingConcepts.has(term)) {
          relatedConcepts.push(term);
        }
      }
    }

    return {
      query,
      suggestedTerms,
      relatedConcepts: relatedConcepts.slice(0, maxRelatedConcepts),
      crossReferences,
      totalAnalyzed: relevantItems.length
    };
  }

  /**
   * Extract suggested terms from items
   */
  private extractSuggestedTerms(
    items: DiscoveryItem[],
    query: string,
    maxTerms: number
  ): DiscoveryResult['suggestedTerms'] {
    const termMap = new Map<string, {
      type: Set<string>;
      count: number;
      relevance: string[];
      avgSimilarity: number;
    }>();

    // Collect terms from items
    for (const item of items) {
      const key = item.name.toLowerCase();
      
      if (!termMap.has(key)) {
        termMap.set(key, {
          type: new Set(),
          count: 0,
          relevance: [],
          avgSimilarity: 0
        });
      }

      const entry = termMap.get(key)!;
      entry.type.add(item.type || 'unknown');
      entry.count++;
      entry.avgSimilarity += item.similarity || 0;
      
      // Generate relevance description
      const relevance = this.generateRelevanceDescription(item, query);
      if (relevance && !entry.relevance.includes(relevance)) {
        entry.relevance.push(relevance);
      }
    }

    // Convert to array and sort
    const suggestedTerms = Array.from(termMap.entries())
      .map(([term, data]) => ({
        term,
        type: Array.from(data.type).join(', '),
        relevance: data.relevance.join('; ') || 'Related to query',
        count: data.count,
        score: data.avgSimilarity / data.count
      }))
      .filter(t => t.term.toLowerCase() !== query.toLowerCase())
      .sort((a, b) => {
        // Sort by count first, then by score
        if (a.count !== b.count) return b.count - a.count;
        return (b.score || 0) - (a.score || 0);
      })
      .slice(0, maxTerms);

    return suggestedTerms;
  }

  /**
   * Generate related concepts from items
   */
  private generateRelatedConcepts(
    items: DiscoveryItem[],
    query: string,
    maxConcepts: number
  ): string[] {
    const concepts = new Map<string, number>();
    const queryWords = new Set(extractWordsFromText(query.toLowerCase()));

    for (const item of items) {
      // Extract from name
      const nameWords = extractWordsFromIdentifier(item.name);
      for (const word of nameWords) {
        if (!queryWords.has(word) && !isCommonWord(word)) {
          concepts.set(word, (concepts.get(word) || 0) + 1);
        }
      }

      // Extract from content
      if (item.content) {
        const contentWords = extractWordsFromText(item.content).slice(0, 50);
        for (const word of contentWords) {
          if (!queryWords.has(word) && !isCommonWord(word, { minWordLength: 4 })) {
            concepts.set(word, (concepts.get(word) || 0) + 0.5);
          }
        }
      }

      // Extract from metadata
      if (item.metadata?.tags) {
        for (const tag of item.metadata.tags) {
          const tagWords = extractWordsFromText(tag);
          for (const word of tagWords) {
            if (!queryWords.has(word)) {
              concepts.set(word, (concepts.get(word) || 0) + 2);
            }
          }
        }
      }

      // Extract from file path
      if (item.filePath) {
        const pathConcepts = extractConceptsFromPath(item.filePath);
        for (const concept of pathConcepts) {
          if (!queryWords.has(concept)) {
            concepts.set(concept, (concepts.get(concept) || 0) + 0.5);
          }
        }
      }
    }

    // Sort by frequency and return top concepts
    return Array.from(concepts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([concept]) => concept)
      .slice(0, maxConcepts);
  }

  /**
   * Generate cross-references from relationships
   */
  private generateCrossReferences(
    items: DiscoveryItem[],
    maxReferences: number
  ): DiscoveryResult['crossReferences'] {
    const references: DiscoveryResult['crossReferences'] = [];
    const seen = new Set<string>();

    for (const item of items) {
      if (!item.relationships) continue;

      for (const rel of item.relationships) {
        const key = `${item.name}->${rel.targetName || rel.targetId}:${rel.type}`;
        
        if (!seen.has(key)) {
          seen.add(key);
          references.push({
            from: item.name,
            to: rel.targetName || rel.targetId,
            relationship: rel.type
          });

          if (references.length >= maxReferences) {
            return references;
          }
        }
      }
    }

    return references;
  }

  /**
   * Generate relevance description for an item
   */
  private generateRelevanceDescription(item: DiscoveryItem, query: string): string {
    const descriptions: string[] = [];

    // Check metadata
    if (item.metadata?.documentation) {
      descriptions.push('Has documentation');
    }

    // Check type
    if (item.type) {
      const typeDescriptions: Record<string, string> = {
        'function': 'Function implementation',
        'class': 'Class definition',
        'interface': 'Interface definition',
        'component': 'Component',
        'module': 'Module',
        'type': 'Type definition',
        'variable': 'Variable declaration',
        'constant': 'Constant value'
      };
      
      const typeDesc = typeDescriptions[item.type];
      if (typeDesc) descriptions.push(typeDesc);
    }

    // Check name match
    const queryLower = query.toLowerCase();
    const nameLower = item.name.toLowerCase();
    
    if (nameLower === queryLower) {
      descriptions.push('Exact name match');
    } else if (nameLower.includes(queryLower)) {
      descriptions.push('Name contains query');
    } else if (queryLower.includes(nameLower)) {
      descriptions.push('Query contains name');
    }

    // Check relationships
    if (item.relationships && item.relationships.length > 0) {
      descriptions.push(`Has ${item.relationships.length} relationships`);
    }

    return descriptions.join(', ');
  }
}

/**
 * Create a discovery engine instance
 */
export function createDiscoveryEngine(embeddingService?: EmbeddingService): DiscoveryEngine {
  return new DiscoveryEngine(embeddingService);
}