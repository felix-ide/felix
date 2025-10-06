/**
 * Relevance Score Processor - Calculates item relevance and importance scores
 * 
 * This processor analyzes items and relationships to determine relevance
 * based on query matching, relationship importance, and contextual significance.
 */

import type {
  IRelevanceProcessor,
  ContextData,
  ContextQuery,
  ContextOptimizationOptions,
  ProcessorResult,
  ContextItem,
  ContextRelationship,
  RelevanceOptions
} from './interfaces.js';
import { ComponentType, DEFAULT_TYPE_WEIGHTS, DEFAULT_MATCH_MULTIPLIERS } from './types.js';

/**
 * Relevance score processor implementation
 */
export class RelevanceScoreProcessor implements IRelevanceProcessor {
  readonly name = 'RelevanceScoreProcessor';
  readonly description = 'Calculates item relevance and importance scores';
  readonly version = '1.0.0';
  readonly priority = 10; // Run early in the chain

  // Type weights for component importance
  private typeWeights: Record<string, number>;
  
  // Multipliers for different match types
  private matchMultipliers: typeof DEFAULT_MATCH_MULTIPLIERS;
  
  // Maximum keywords to extract
  private maxKeywords: number;

  constructor(options: RelevanceOptions = {}) {
    this.typeWeights = { ...DEFAULT_TYPE_WEIGHTS, ...options.typeWeights };
    this.matchMultipliers = { ...DEFAULT_MATCH_MULTIPLIERS, ...options.matchMultipliers };
    this.maxKeywords = options.maxKeywords || 10;
  }

  /**
   * Process context data to add priority information
   */
  async process(
    data: ContextData,
    query: ContextQuery,
    options: ContextOptimizationOptions
  ): Promise<ProcessorResult> {
    const startTime = Date.now();
    
    try {
      // Extract keywords from query
      const queryText = this.getQueryText(query);
      const keywords = this.extractKeywords(queryText);
      
      // Calculate relevance scores for all items
      const scoredItems = data.items.map(item => {
        const relevanceScore = this.calculateRelevance(item, query, {
          typeWeights: this.typeWeights,
          matchMultipliers: this.matchMultipliers,
          maxKeywords: this.maxKeywords
        });
        return {
          ...item,
          metadata: {
            ...item.metadata,
            relevanceScore
          }
        };
      });
      
      // Sort items by relevance (highest first)
      scoredItems.sort((a, b) => 
        (b.metadata?.relevanceScore || 0) - (a.metadata?.relevanceScore || 0)
      );
      
      // Calculate relationship relevance based on item scores
      const itemRelevanceMap = new Map(
        scoredItems.map(c => [c.id, c.metadata?.relevanceScore || 0])
      );
      
      const scoredRelationships = data.relationships.map(rel => {
        const relevanceScore = this.calculateRelationshipRelevance(rel, itemRelevanceMap);
        return {
          ...rel,
          metadata: {
            ...rel.metadata,
            relevanceScore
          }
        };
      });
      
      // Sort relationships by relevance
      scoredRelationships.sort((a, b) => 
        (b.metadata?.relevanceScore || 0) - (a.metadata?.relevanceScore || 0)
      );
      
      // Create updated context data
      const processedData: ContextData = {
        ...data,
        items: scoredItems,
        relationships: scoredRelationships,
        metadata: {
          ...data.metadata,
          totalKeywords: keywords.length,
          processingSteps: [...(data.metadata?.processingSteps || []), 'relevance-scoring']
        }
      };
      
      return {
        data: processedData,
        metadata: {
          processorName: this.name,
          processingTime: Date.now() - startTime,
          itemsProcessed: data.items.length + data.relationships.length,
          itemsFiltered: 0
        },
        warnings: []
      };
    } catch (error) {
      console.error('Error in RelevanceScoreProcessor:', error);
      throw error;
    }
  }

  /**
   * Calculate relevance score for a single item
   */
  calculateRelevance(
    item: ContextItem,
    query: ContextQuery,
    options: RelevanceOptions
  ): number {
    const queryText = this.getQueryText(query);
    const keywords = this.extractKeywords(queryText);
    
    return this.calculateItemRelevance(item, keywords, queryText);
  }

  /**
   * Score item importance based on relationships
   */
  scoreImportance(
    itemId: string,
    data: ContextData,
    options: RelevanceOptions
  ): number {
    const relationships = data.relationships.filter(
      r => r.sourceId === itemId || r.targetId === itemId
    );
    
    // Base importance on number of relationships
    const relationshipScore = Math.min(relationships.length / 10, 1.0);
    
    // Consider relationship types (some types indicate higher importance)
    const importantTypes = ['extends', 'implements', 'exports', 'imports'];
    const importantRelCount = relationships.filter(
      r => importantTypes.includes(r.type)
    ).length;
    
    const typeScore = Math.min(importantRelCount / 5, 1.0);
    
    return relationshipScore * 0.6 + typeScore * 0.4;
  }

  /**
   * Check if processor can handle the data
   */
  canProcess(data: ContextData, options: ContextOptimizationOptions): boolean {
    return data.items.length > 0;
  }

  /**
   * Get configuration schema
   */
  getConfigSchema(): Record<string, any> {
    return {
      typeWeights: {
        type: 'object',
        description: 'Weights for different component types'
      },
      matchMultipliers: {
        type: 'object',
        description: 'Multipliers for different match types'
      },
      maxKeywords: {
        type: 'number',
        default: 10,
        description: 'Maximum number of keywords to extract'
      }
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(config: any): true | string {
    if (typeof config !== 'object') {
      return 'Configuration must be an object';
    }
    return true;
  }

  // Private methods

  /**
   * Extract query text from context query
   */
  private getQueryText(query: ContextQuery): string {
    if (query.query) return query.query;
    
    // Build query text from query object fields
    const parts: string[] = [];
    if (query.componentName) parts.push(query.componentName);
    if (query.componentType) parts.push(query.componentType);
    if (query.language) parts.push(query.language);
    if (query.filePath) parts.push(query.filePath);
    
    return parts.join(' ');
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    if (!text || text.trim().length === 0) return [];
    
    // Split by common delimiters and filter
    const words = text.toLowerCase()
      .split(/[\s.,;:!?"'()\[\]{}/\\|<>+=\-*&^%$#@~`]+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'for', 'with', 'from', 'into'].includes(word));
    
    // Count occurrences
    const wordCounts = new Map<string, number>();
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
    
    // Sort by frequency and return top keywords
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.maxKeywords)
      .map(([word]) => word);
  }

  /**
   * Calculate item relevance score
   */
  private calculateItemRelevance(
    item: ContextItem,
    keywords: string[],
    originalQuery: string
  ): number {
    // Start with base type weight
    const typeWeight = this.typeWeights[item.type] || 5.0;
    let relevance: number = typeWeight;
    
    if (!keywords.length) return relevance;
    
    const itemName = item.name.toLowerCase();
    const queryLower = originalQuery.toLowerCase();
    
    // Check for exact match with query
    if (itemName === queryLower) {
      relevance *= this.matchMultipliers.exactMatch;
    }
    
    // Check for keyword matches in name
    keywords.forEach(keyword => {
      if (itemName.includes(keyword)) {
        relevance += this.matchMultipliers.nameMatch;
      }
    });
    
    // Check metadata for documentation
    const metadata = item.metadata || {};
    if (metadata.documentation) {
      const doc = String(metadata.documentation).toLowerCase();
      keywords.forEach(keyword => {
        if (doc.includes(keyword)) {
          relevance += this.matchMultipliers.docMatch;
        }
      });
    }
    
    // Check for code matches
    if (item.code) {
      const code = item.code.toLowerCase();
      keywords.forEach(keyword => {
        if (code.includes(keyword)) {
          relevance += this.matchMultipliers.codeMatch;
        }
      });
    }
    
    return relevance;
  }

  /**
   * Calculate relationship relevance based on connected items
   */
  private calculateRelationshipRelevance(
    relationship: ContextRelationship,
    itemRelevanceMap: Map<string, number>
  ): number {
    const sourceRelevance = itemRelevanceMap.get(relationship.sourceId) || 0;
    const targetRelevance = itemRelevanceMap.get(relationship.targetId) || 0;
    
    // Relationship relevance is the sum of connected item relevances
    return sourceRelevance + targetRelevance;
  }
}