/**
 * Generic content processor for any content type
 */

import { BaseContentProcessor, type IReductionStrategy } from './interfaces.js';
import type { ContextItem } from '../interfaces.js';

/**
 * Simple content truncation strategy
 */
class SimpleTruncator implements IReductionStrategy {
  name = 'simpleTruncate';
  description = 'Basic truncation of content fields';
  
  canApply(item: ContextItem): boolean {
    return !!(item.content || item.code || item.metadata?.description);
  }
  
  apply(item: ContextItem, targetReduction: number): ContextItem {
    const reduced = { ...item };
    
    // Truncate main content fields
    ['content', 'code'].forEach(field => {
      if (reduced[field as keyof ContextItem]) {
        const content = reduced[field as keyof ContextItem] as string;
        const targetLength = Math.floor(content.length * (1 - targetReduction));
        (reduced as any)[field] = content.substring(0, targetLength) + '...';
      }
    });
    
    // Truncate metadata fields
    if (reduced.metadata) {
      reduced.metadata = { ...reduced.metadata };
      ['description', 'summary', 'notes'].forEach(field => {
        if (typeof reduced.metadata![field] === 'string') {
          const content = reduced.metadata![field] as string;
          const targetLength = Math.floor(content.length * (1 - targetReduction));
          reduced.metadata![field] = content.substring(0, targetLength) + '...';
        }
      });
    }
    
    return reduced;
  }
}

/**
 * Metadata reduction strategy
 */
class MetadataReducer implements IReductionStrategy {
  name = 'reduceMetadata';
  description = 'Remove non-essential metadata fields';
  
  canApply(item: ContextItem): boolean {
    return !!item.metadata && Object.keys(item.metadata).length > 3;
  }
  
  apply(item: ContextItem, targetReduction: number): ContextItem {
    if (!item.metadata) return item;
    
    const essential = ['relevanceScore', 'id', 'type', 'name', 'critical'];
    const reduced = { ...item, metadata: {} as any };
    
    // Keep only essential fields
    essential.forEach(field => {
      if (field in item.metadata!) {
        reduced.metadata![field] = item.metadata![field];
      }
    });
    
    // Keep a portion of other fields based on reduction target
    const otherFields = Object.keys(item.metadata).filter(k => !essential.includes(k));
    const keepCount = Math.floor(otherFields.length * (1 - targetReduction));
    
    otherFields.slice(0, keepCount).forEach(field => {
      reduced.metadata![field] = item.metadata![field];
    });
    
    return reduced;
  }
}

/**
 * Generic processor for any content type
 */
export class GenericContentProcessor extends BaseContentProcessor {
  name = 'GenericContentProcessor';
  description = 'Fallback processor for any content type';
  supportedTypes = ['*']; // Wildcard - handles everything
  priority = 10; // Lowest priority - used as fallback
  
  private strategies: IReductionStrategy[] = [
    new SimpleTruncator(),
    new MetadataReducer()
  ];
  
  /**
   * Apply generic reduction strategies
   */
  reduceContent(item: ContextItem, targetReduction: number): ContextItem {
    let reduced = { ...item };
    
    // Apply all applicable strategies
    for (const strategy of this.strategies) {
      if (strategy.canApply(reduced)) {
        reduced = strategy.apply(reduced, targetReduction);
      }
    }
    
    return reduced;
  }
  
  getReductionStrategies(): IReductionStrategy[] {
    return this.strategies;
  }
}