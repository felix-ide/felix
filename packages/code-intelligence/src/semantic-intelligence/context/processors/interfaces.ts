/**
 * Plugin architecture for content-specific processing
 */

import type { ContextItem, ContextData, ContextRelationship } from '../interfaces.js';

/**
 * Content reduction strategy
 */
export interface IReductionStrategy {
  name: string;
  description: string;
  canApply(item: ContextItem): boolean;
  apply(item: ContextItem, targetReduction: number): ContextItem;
}

/**
 * Interface for domain-specific content processors
 */
export interface IContentProcessor {
  /** Unique processor name */
  name: string;
  
  /** Human-readable description */
  description: string;
  
  /** Content types this processor handles */
  supportedTypes: string[];
  
  /** Priority for processor selection (higher = preferred) */
  priority: number;
  
  /**
   * Estimate token count for an item
   */
  estimateTokens(item: ContextItem): number;
  
  /**
   * Calculate priority score for an item
   * Higher score = higher priority to keep
   */
  calculatePriority(item: ContextItem, context: ContextData): number;
  
  /**
   * Check if item can be reduced/modified
   */
  canReduce(item: ContextItem): boolean;
  
  /**
   * Reduce content to save tokens
   * @param targetReduction - Percentage of tokens to remove (0-1)
   */
  reduceContent(item: ContextItem, targetReduction: number): ContextItem;
  
  /**
   * Get available reduction strategies for this processor
   */
  getReductionStrategies(): IReductionStrategy[];
  
  /**
   * Check if this processor can handle the given item
   */
  canProcess(item: ContextItem): boolean;
}

/**
 * Base implementation for content processors
 */
export abstract class BaseContentProcessor implements IContentProcessor {
  abstract name: string;
  abstract description: string;
  abstract supportedTypes: string[];
  abstract priority: number;
  
  /**
   * Default token estimation (4 chars per token)
   */
  estimateTokens(item: ContextItem): number {
    let tokens = 0;
    
    // Basic fields
    if (item.name) tokens += Math.ceil(item.name.length / 4);
    if (item.type) tokens += Math.ceil(item.type.length / 4);
    if (item.filePath) tokens += Math.ceil(item.filePath.length / 4);
    
    // Content fields
    if (item.code) tokens += Math.ceil(item.code.length / 4);
    if (item.content) tokens += Math.ceil(item.content.length / 4);
    
    // Metadata (rough estimate)
    if (item.metadata) {
      const metadataStr = JSON.stringify(item.metadata);
      tokens += Math.ceil(metadataStr.length / 4);
    }
    
    return tokens;
  }
  
  /**
   * Default priority calculation
   */
  calculatePriority(item: ContextItem, context: ContextData): number {
    let score = 1.0;
    
    // Boost if has relationships
    const relationshipCount = context.relationships.filter(rel =>
      rel.sourceId === item.id || rel.targetId === item.id
    ).length;
    score += relationshipCount * 0.1;
    
    // Use relevance score if available
    if (item.metadata?.relevanceScore) {
      score *= item.metadata.relevanceScore;
    }
    
    return score;
  }
  
  /**
   * Default: all items can be reduced
   */
  canReduce(item: ContextItem): boolean {
    return true;
  }
  
  /**
   * Default: basic truncation
   */
  reduceContent(item: ContextItem, targetReduction: number): ContextItem {
    const reduced = { ...item };
    
    // Simple content truncation
    if (reduced.content) {
      const targetLength = Math.floor(reduced.content.length * (1 - targetReduction));
      reduced.content = reduced.content.substring(0, targetLength) + '...';
    }
    
    if (reduced.code) {
      const targetLength = Math.floor(reduced.code.length * (1 - targetReduction));
      reduced.code = reduced.code.substring(0, targetLength) + '\n// ... truncated ...';
    }
    
    return reduced;
  }
  
  /**
   * Default: no strategies
   */
  getReductionStrategies(): IReductionStrategy[] {
    return [];
  }
  
  /**
   * Check if processor can handle item type
   */
  canProcess(item: ContextItem): boolean {
    return this.supportedTypes.includes(item.type) || 
           this.supportedTypes.includes('*');
  }
}

/**
 * Registry for content processors
 */
export interface IProcessorRegistry {
  register(processor: IContentProcessor): void;
  unregister(name: string): void;
  getProcessor(itemType: string): IContentProcessor | null;
  getAllProcessors(): IContentProcessor[];
  getDefaultProcessor(): IContentProcessor;
}