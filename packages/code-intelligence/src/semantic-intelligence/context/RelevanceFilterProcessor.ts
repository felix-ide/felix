/**
 * Relevance Filter Processor - Filters items based on relevance scores and user options
 * 
 * This processor filters context by removing low-relevance items based on
 * user-specified options and calculated relevance scores from RelevanceScoreProcessor.
 */

import type {
  IFilterProcessor,
  ContextData,
  ContextQuery,
  ContextOptimizationOptions,
  ProcessorResult,
  ContextItem,
  ContextRelationship,
  FilterOptions
} from './interfaces.js';
import { DEFAULT_CONTENT_WEIGHTS } from './types.js';

export class RelevanceFilterProcessor implements IFilterProcessor {
  readonly name = 'RelevanceFilterProcessor';
  readonly description = 'Filters items based on relevance scores and user options';
  readonly version = '1.0.0';
  readonly priority = 80; // Run after relevance scoring but before window sizing

  // Filtering settings
  private minItemRetention: number;
  private maxCodeLineLength: number;
  private maxDocParagraphLength: number;
  private relevanceThreshold: number;
  
  // Content type weights - higher means more likely to be kept
  private contentWeights: typeof DEFAULT_CONTENT_WEIGHTS;

  constructor(options: FilterOptions = {}) {
    this.minItemRetention = options.minRetention || 0.1; // Keep at least 10% of items
    this.maxCodeLineLength = 120;
    this.maxDocParagraphLength = options.maxDescriptionLength || 500;
    this.relevanceThreshold = options.relevanceThreshold || 3.0; // Minimum relevance score to keep
    this.contentWeights = { ...DEFAULT_CONTENT_WEIGHTS, ...options.contentWeights };
  }

  async process(
    data: ContextData,
    query: ContextQuery,
    options: ContextOptimizationOptions
  ): Promise<ProcessorResult> {
    const startTime = Date.now();
    
    try {
      // Deep clone to avoid modifying original
      let processedData: ContextData = JSON.parse(JSON.stringify(data));
      
      // First, remove duplicates
      processedData = this.removeDuplicates(processedData);
      
      // Apply compression if we have items
      if (processedData.items.length > 0) {
        processedData = this.compress(processedData, {
          maxDescriptionLength: this.maxDocParagraphLength
        });
        
        // Apply content weights to relevance scores
        processedData.items.forEach(item => {
          const weightedScore = this.applyContentWeights(item);
          if (item.metadata) {
            item.metadata.weightedRelevanceScore = weightedScore;
          }
        });

        // Filter items using the filter method
        processedData = this.filter(processedData, {
          relevanceThreshold: this.relevanceThreshold,
          minRetention: this.minItemRetention,
          contentWeights: this.contentWeights
        });
      }
      
      // Calculate filtering metrics
      const itemsRemoved = data.items.length - processedData.items.length;
      const relationshipsRemoved = data.relationships.length - processedData.relationships.length;
      
      return {
        data: processedData,
        metadata: {
          processorName: this.name,
          processingTime: Date.now() - startTime,
          itemsProcessed: data.items.length + data.relationships.length,
          itemsFiltered: itemsRemoved + relationshipsRemoved
        },
        warnings: itemsRemoved > 0 ? 
          [`Removed ${itemsRemoved} items and ${relationshipsRemoved} relationships`] : []
      };
    } catch (error) {
      console.error('Error in RelevanceFilterProcessor:', error);
      throw error;
    }
  }

  /**
   * Filter items based on relevance scores and options
   */
  filter(data: ContextData, options: FilterOptions): ContextData {
    const threshold = options.relevanceThreshold || this.relevanceThreshold;
    const minRetention = options.minRetention || this.minItemRetention;
    
    // Remove low-relevance items using weighted scores
    const filteredItems = data.items.filter(item => {
      const relevance = item.metadata?.weightedRelevanceScore || item.metadata?.relevanceScore || 0;
      return relevance >= threshold;
    });
    
    // Ensure minimum retention
    const minCount = Math.ceil(data.items.length * minRetention);
    let finalItems: ContextItem[];
    
    if (filteredItems.length < minCount) {
      // Keep the highest relevance items up to minCount
      const sortedItems = [...data.items]
        .sort((a, b) => {
          const aScore = a.metadata?.relevanceScore || 0;
          const bScore = b.metadata?.relevanceScore || 0;
          return bScore - aScore;
        });
      finalItems = sortedItems.slice(0, Math.max(minCount, filteredItems.length));
    } else {
      finalItems = filteredItems;
    }
    
    // Apply weights to relationships
    data.relationships.forEach(relationship => {
      const weightedScore = this.applyRelationshipWeights(relationship);
      if (relationship.metadata) {
        relationship.metadata.weightedRelevanceScore = weightedScore;
      }
    });

    // Filter relationships to only include those between kept items
    const keptItemIds = new Set(finalItems.map(c => c.id));
    const filteredRelationships = data.relationships.filter(rel =>
      keptItemIds.has(rel.sourceId) && keptItemIds.has(rel.targetId)
    );
    
    return {
      ...data,
      items: finalItems,
      relationships: filteredRelationships
    };
  }

  /**
   * Compress data by truncating long descriptions
   */
  compress(data: ContextData, options: { maxDescriptionLength: number }): ContextData {
    const maxLength = options.maxDescriptionLength || 300;
    
    const compressedItems = data.items.map(item => {
      if (!item.metadata) return item;
      
      const compressedMetadata = { ...item.metadata };
      
      // Summarize long text fields
      ['documentation', 'description', 'comment'].forEach(field => {
        if (typeof compressedMetadata[field] === 'string') {
          compressedMetadata[field] = this.summarizeContent(compressedMetadata[field], maxLength);
        }
      });
      
      return { ...item, metadata: compressedMetadata };
    });
    
    return { ...data, items: compressedItems };
  }

  /**
   * Remove duplicate items and relationships
   */
  removeDuplicates(data: ContextData): ContextData {
    // Remove duplicate items
    const itemMap = new Map<string, ContextItem>();
    data.items.forEach(item => {
      const key = `${item.name}-${item.type}-${item.filePath}`;
      if (!itemMap.has(key)) {
        itemMap.set(key, item);
      }
    });
    
    // Remove duplicate relationships
    const relationshipMap = new Map<string, ContextRelationship>();
    data.relationships.forEach(relationship => {
      const key = `${relationship.sourceId}-${relationship.type}-${relationship.targetId}`;
      if (!relationshipMap.has(key)) {
        relationshipMap.set(key, relationship);
      }
    });
    
    return {
      ...data,
      items: Array.from(itemMap.values()),
      relationships: Array.from(relationshipMap.values())
    };
  }

  canProcess(data: ContextData, options: ContextOptimizationOptions): boolean {
    return data.items.length > 0;
  }

  getConfigSchema(): Record<string, any> {
    return {
      minRetention: {
        type: 'number',
        default: 0.1,
        min: 0.1,
        max: 1.0,
        description: 'Minimum percentage of items to retain'
      },
      relevanceThreshold: {
        type: 'number',
        default: 3.0,
        min: 0,
        description: 'Minimum relevance score to keep item'
      },
      maxDescriptionLength: {
        type: 'number',
        default: 500,
        description: 'Maximum paragraph length for documentation'
      },
      contentWeights: {
        type: 'object',
        description: 'Weights for different content types',
        properties: {
          code: { type: 'number', default: 1.5, description: 'Weight for source code content' },
          documentation: { type: 'number', default: 1.2, description: 'Weight for documentation' },
          relationships: { type: 'number', default: 1.0, description: 'Weight for relationships' },
          metadata: { type: 'number', default: 0.8, description: 'Weight for metadata' },
          comments: { type: 'number', default: 0.6, description: 'Weight for comments' }
        }
      }
    };
  }

  validateConfig(config: any): true | string {
    if (typeof config !== 'object' || config === null) {
      return 'Configuration must be an object';
    }
    
    if (config.minRetention !== undefined) {
      if (typeof config.minRetention !== 'number' || config.minRetention < 0 || config.minRetention > 1) {
        return 'minRetention must be between 0 and 1';
      }
    }
    
    if (config.relevanceThreshold !== undefined) {
      if (typeof config.relevanceThreshold !== 'number' || config.relevanceThreshold < 0) {
        return 'relevanceThreshold must be between 0 and 1';
      }
    }
    
    return true;
  }

  /**
   * Summarize content to fit within length limit
   */
  private summarizeContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    
    // Try to break at sentence boundaries
    const sentences = content.split(/[.!?]+/);
    let summary = '';
    
    for (const sentence of sentences) {
      if (summary.length + sentence.length + 1 <= maxLength - 3) {
        summary += sentence + '.';
      } else {
        break;
      }
    }
    
    if (summary.length === 0) {
      // Fallback to character truncation
      summary = content.substring(0, maxLength - 3);
    }
    
    return summary + '...';
  }

  /**
   * Apply content type weights to item relevance score
   */
  private applyContentWeights(item: ContextItem): number {
    const baseScore = item.metadata?.relevanceScore || 0;
    let totalWeight = 0;
    let weightedScore = 0;

    // Check what types of content this item has and apply weights
    if (item.code && item.code.trim().length > 0) {
      weightedScore += baseScore * this.contentWeights.code;
      totalWeight += this.contentWeights.code;
    }

    if (item.metadata?.documentation || item.metadata?.description) {
      weightedScore += baseScore * this.contentWeights.documentation;
      totalWeight += this.contentWeights.documentation;
    }

    if (item.metadata?.comment) {
      weightedScore += baseScore * this.contentWeights.comments;
      totalWeight += this.contentWeights.comments;
    }

    // Always include metadata weight as fallback
    if (totalWeight === 0) {
      return baseScore * this.contentWeights.metadata;
    }

    // Return weighted average
    return weightedScore / totalWeight;
  }

  /**
   * Apply content weights to relationship relevance scores
   */
  private applyRelationshipWeights(relationship: ContextRelationship): number {
    const baseScore = relationship.metadata?.relevanceScore || 0;
    return baseScore * this.contentWeights.relationships;
  }
}