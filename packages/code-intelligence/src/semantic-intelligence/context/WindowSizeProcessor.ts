/**
 * Window Size Processor - Manages context size and token limits
 * 
 * This processor ensures that generated context fits within specified token limits
 * by using various reduction strategies and token estimation techniques.
 */

import type {
  IWindowSizeProcessor,
  ContextData,
  ContextQuery,
  ContextOptimizationOptions,
  ProcessorResult,
  ContextItem,
  ContextRelationship,
  WindowSizeOptions
} from './interfaces.js';
import { ReductionStrategy } from './types.js';
import {
  ProcessorRegistry,
  CodeContentProcessor,
  DocumentContentProcessor,
  GenericContentProcessor,
  type IContentProcessor
} from './processors/index.js';

/**
 * Window size processor implementation
 */
export class WindowSizeProcessor implements IWindowSizeProcessor {
  readonly name = 'WindowSizeProcessor';
  readonly description = 'Manages context size and token limits';
  readonly version = '2.0.0';
  readonly priority = 90; // Run after compression but close to end

  private enableOptimization: boolean;
  private tokenEstimationMethod: 'char-count' | 'word-count' | 'gpt-tokenizer';
  private charsPerToken: number;
  private reductionStrategies: {
    removeLowPriority: boolean;
    truncateDescriptions: boolean;
    summarizeCodeBlocks: boolean;
    removeDuplicates: boolean;
  };
  private minimumThresholds: {
    minItems: number;
    minRelationships: number;
    minTokens: number;
  };
  private processorRegistry: ProcessorRegistry;

  constructor(options: WindowSizeOptions = {}) {
    this.enableOptimization = options.enableOptimization ?? true;
    this.tokenEstimationMethod = 'char-count';
    this.charsPerToken = 4;
    this.reductionStrategies = {
      removeLowPriority: true,
      truncateDescriptions: true,
      summarizeCodeBlocks: true,
      removeDuplicates: true,
      ...options.reductionStrategies
    };
    this.minimumThresholds = {
      minItems: 1,
      minRelationships: 0,
      minTokens: 100,
      ...options.minimumThresholds
    };
    
    // Initialize processor registry with default processors
    this.processorRegistry = new ProcessorRegistry();
    this.processorRegistry.register(new CodeContentProcessor());
    this.processorRegistry.register(new DocumentContentProcessor());
    // GenericContentProcessor is already registered as default
  }

  /**
   * Register a custom content processor
   */
  registerProcessor(processor: IContentProcessor): void {
    this.processorRegistry.register(processor);
  }

  /**
   * Process context data to fit within token limits
   */
  async process(
    data: ContextData,
    query: ContextQuery,
    options: ContextOptimizationOptions
  ): Promise<ProcessorResult> {
    const startTime = Date.now();
    
    if (!this.enableOptimization) {
      return {
        data,
        metadata: {
          processorName: this.name,
          processingTime: Date.now() - startTime,
          itemsProcessed: 0,
          itemsFiltered: 0
        },
        warnings: ['Token optimization disabled']
      };
    }

    const targetTokens = options.targetTokens || 25000;
    const currentTokens = this.estimateContextTokens(data);
    
    const itemCount = data.items.length;
    const relationshipCount = data.relationships.length;
    
    // console.error(`🔧 WindowSizeProcessor: target=${targetTokens}, current=${currentTokens}, items=${itemCount}, relationships=${relationshipCount}`);
    
    if (currentTokens <= targetTokens) {
      console.error(`✅ WindowSizeProcessor: Current tokens (${currentTokens}) <= target (${targetTokens}), no reduction needed`);
      return {
        data,
        metadata: {
          processorName: this.name,
          processingTime: Date.now() - startTime,
          itemsProcessed: itemCount + relationshipCount,
          itemsFiltered: 0
        },
        warnings: []
      };
    }

    // Context is too large, apply reduction strategies
    console.error(`⚠️  WindowSizeProcessor: Reducing from ${currentTokens} to ${targetTokens} tokens`);
    
    const reducedData = this.reduceToTokenLimit(data, targetTokens, options, query);
    const finalTokens = this.estimateContextTokens(reducedData);
    const itemsFiltered = (data.items.length - reducedData.items.length) +
                         (data.relationships.length - reducedData.relationships.length);
    
    // console.error(`🎯 WindowSizeProcessor: Reduced to ${finalTokens} tokens, filtered ${itemsFiltered} items`);

    return {
      data: reducedData,
      metadata: {
        processorName: this.name,
        processingTime: Date.now() - startTime,
        itemsProcessed: itemCount + relationshipCount,
        itemsFiltered
      },
      warnings: [
        `Context reduced from ${currentTokens} to ${finalTokens} tokens`,
        `Removed ${itemsFiltered} items to fit within ${targetTokens} token limit`
      ]
    };
  }

  /**
   * Estimate token count for content
   */
  estimateTokens(content: string, outputFormat?: string): number {
    if (!content || typeof content !== 'string') {
      return 0;
    }
    
    // Use format-specific token estimation
    if (outputFormat === 'json') {
      return Math.ceil(content.length / 3.5); // JSON has more overhead
    } else if (outputFormat === 'markdown' || outputFormat === 'index') {
      return Math.ceil(content.length / 4); // Markdown is more efficient
    } else if (outputFormat === 'text') {
      return Math.ceil(content.length / 4.5); // Text is most efficient
    }
    
    // Fallback to configured method
    switch (this.tokenEstimationMethod) {
      case 'word-count':
        return content.split(/\s+/).length;
      case 'gpt-tokenizer':
        // Would integrate with actual tokenizer library
        return Math.ceil(content.length / 3.5);
      case 'char-count':
      default:
        return Math.ceil(content.length / this.charsPerToken);
    }
  }

  /**
   * Estimate tokens for entire context data
   */
  estimateContextTokens(data: ContextData): number {
    let totalTokens = 0;
    
    // Estimate item tokens using appropriate processor
    for (const item of data.items) {
      const processor = this.processorRegistry.getProcessor(item.type) || 
                       this.processorRegistry.getDefaultProcessor();
      totalTokens += processor.estimateTokens(item);
    }
    
    // Estimate relationship tokens
    for (const relationship of data.relationships) {
      totalTokens += this.estimateRelationshipTokens(relationship);
    }
    
    // Add overhead for JSON formatting (reduced from 80% to 20%)
    totalTokens += Math.ceil(totalTokens * 0.2); // 20% formatting overhead for JSON
    
    return totalTokens;
  }

  /**
   * Reduce context to fit within token limits
   */
  reduceToTokenLimit(
    data: ContextData,
    targetTokens: number,
    options: ContextOptimizationOptions,
    query: ContextQuery
  ): ContextData {
    let workingData = { ...data };
    let currentTokens = this.estimateContextTokens(workingData);
    
    const strategies = this.getReductionStrategies();
    
    for (const strategy of strategies) {
      if (currentTokens <= targetTokens) {
        break;
      }
      
      workingData = this.applyReductionStrategy(workingData, strategy, targetTokens, options, query);
      currentTokens = this.estimateContextTokens(workingData);
    }
    
    // Final check - if still too large, remove items by priority
    if (currentTokens > targetTokens) {
      workingData = this.removeLowestPriorityItems(workingData, targetTokens, options, query);
    }
    
    return workingData;
  }

  /**
   * Check if processor can handle the data
   */
  canProcess(data: ContextData, options: ContextOptimizationOptions): boolean {
    return data.items.length > 0 && this.enableOptimization;
  }

  /**
   * Get configuration schema
   */
  getConfigSchema(): Record<string, any> {
    return {
      enableOptimization: { type: 'boolean', default: true },
      tokenEstimationMethod: { 
        type: 'string', 
        enum: ['char-count', 'word-count', 'gpt-tokenizer'],
        default: 'char-count'
      },
      charsPerToken: { type: 'number', default: 4, min: 1, max: 10 },
      reductionStrategies: {
        type: 'object',
        properties: {
          removeLowPriority: { type: 'boolean', default: true },
          truncateDescriptions: { type: 'boolean', default: true },
          summarizeCodeBlocks: { type: 'boolean', default: true },
          removeDuplicates: { type: 'boolean', default: true }
        }
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
    
    if (config.charsPerToken && (config.charsPerToken < 1 || config.charsPerToken > 10)) {
      return 'charsPerToken must be between 1 and 10';
    }
    
    return true;
  }

  // Private methods

  /**
   * Get available reduction strategies in order of application
   */
  private getReductionStrategies(): ReductionStrategy[] {
    const strategies: ReductionStrategy[] = [];
    
    if (this.reductionStrategies.removeDuplicates) {
      strategies.push('removeDuplicates');
    }
    
    if (this.reductionStrategies.truncateDescriptions) {
      strategies.push('truncateDescriptions');
    }
    
    if (this.reductionStrategies.summarizeCodeBlocks) {
      strategies.push('summarizeCodeBlocks');
    }
    
    if (this.reductionStrategies.removeLowPriority) {
      strategies.push('removeLowPriority');
    }
    
    return strategies;
  }

  /**
   * Apply a specific reduction strategy
   */
  private applyReductionStrategy(
    data: ContextData,
    strategy: ReductionStrategy,
    targetTokens: number,
    options: ContextOptimizationOptions,
    query: ContextQuery
  ): ContextData {
    switch (strategy) {
      case 'removeDuplicates':
        return this.removeDuplicateItems(data);
      case 'truncateDescriptions':
        return this.truncateDescriptions(data);
      case 'summarizeCodeBlocks':
        return this.summarizeCodeBlocks(data);
      case 'removeLowPriority':
        return this.removeLowPriorityItems(data, targetTokens, options, query);
      default:
        return data;
    }
  }

  /**
   * Estimate tokens for a single relationship
   */
  private estimateRelationshipTokens(relationship: ContextRelationship): number {
    let tokens = 0;
    
    // Basic relationship info (with null checks)
    const basicInfo = [relationship.type, relationship.sourceId, relationship.targetId]
      .filter(Boolean)
      .join('');
    tokens += this.estimateTokens(basicInfo);
    
    // Metadata
    if (relationship.metadata) {
      const metadataText = JSON.stringify(relationship.metadata);
      tokens += this.estimateTokens(metadataText);
    }
    
    return tokens;
  }

  /**
   * Remove duplicate items
   */
  private removeDuplicateItems(data: ContextData): ContextData {
    const seen = new Map<string, ContextItem>();
    const uniqueItems: ContextItem[] = [];
    
    for (const item of data.items) {
      const key = `${item.name}-${item.type}-${item.filePath || ''}`;
      const existing = seen.get(key);
      
      if (!existing) {
        seen.set(key, item);
        uniqueItems.push(item);
      } else {
        // Merge metadata and keep the one with more content
        const existingContent = (existing.code?.length || 0) + (existing.content?.length || 0);
        const newContent = (item.code?.length || 0) + (item.content?.length || 0);
        
        if (newContent > existingContent) {
          // Replace with more complete version
          const index = uniqueItems.indexOf(existing);
          uniqueItems[index] = {
            ...existing,
            ...item,
            metadata: { ...existing.metadata, ...item.metadata }
          };
          seen.set(key, uniqueItems[index]);
        }
      }
    }
    
    return {
      ...data,
      items: uniqueItems
    };
  }

  /**
   * Truncate long descriptions in metadata
   */
  private truncateDescriptions(data: ContextData): ContextData {
    const truncatedItems = data.items.map(item => {
      const processor = this.processorRegistry.getProcessor(item.type) || 
                       this.processorRegistry.getDefaultProcessor();
      
      if (processor.canReduce(item)) {
        // Use processor-specific reduction with light truncation
        return processor.reduceContent(item, 0.3); // 30% reduction
      }
      
      return item;
    });
    
    return {
      ...data,
      items: truncatedItems
    };
  }

  /**
   * Summarize or remove large code blocks
   */
  private summarizeCodeBlocks(data: ContextData): ContextData {
    const summarizedItems = data.items.map(item => {
      const processor = this.processorRegistry.getProcessor(item.type) || 
                       this.processorRegistry.getDefaultProcessor();
      
      if (processor.canReduce(item) && (item.code || item.content)) {
        // Use processor-specific reduction
        return processor.reduceContent(item, 0.5); // 50% reduction
      }
      
      return item;
    });
    
    return {
      ...data,
      items: summarizedItems
    };
  }

  /**
   * Remove low priority items
   */
  private removeLowPriorityItems(
    data: ContextData, 
    targetTokens: number,
    options: ContextOptimizationOptions,
    query: ContextQuery
  ): ContextData {
    // Calculate priorities using content processors
    const itemPriorities = data.items.map(item => {
      const processor = this.processorRegistry.getProcessor(item.type) || 
                       this.processorRegistry.getDefaultProcessor();
      const score = processor.calculatePriority(item, data);
      
      return { item, score };
    });
    
    // Sort by priority (higher score = higher priority)
    itemPriorities.sort((a, b) => b.score - a.score);
    
    // Identify protected items
    const protectedItems = new Set<string>();
    
    // Protect primary component
    if (query.componentId) {
      protectedItems.add(query.componentId);
    }
    
    // Don't protect ALL items with source code - that's too many!
    // Only protect the primary item's source code
    
    // Keep items until we reach token limit
    const keptItems: ContextItem[] = [];
    let estimatedTokens = 0;
    
    // First, add all protected items
    for (const { item } of itemPriorities) {
      if (protectedItems.has(item.id)) {
        const processor = this.processorRegistry.getProcessor(item.type) || 
                         this.processorRegistry.getDefaultProcessor();
        const itemTokens = processor.estimateTokens(item);
        keptItems.push(item);
        estimatedTokens += itemTokens;
      }
    }
    
    // Then add other items by priority until we reach the limit
    for (const { item } of itemPriorities) {
      if (!protectedItems.has(item.id)) {
        const processor = this.processorRegistry.getProcessor(item.type) || 
                         this.processorRegistry.getDefaultProcessor();
        const itemTokens = processor.estimateTokens(item);
        
        if (estimatedTokens + itemTokens <= targetTokens) {
          keptItems.push(item);
          estimatedTokens += itemTokens;
        } else if (keptItems.length < this.minimumThresholds.minItems) {
          // Ensure minimum items threshold
          keptItems.push(item);
          estimatedTokens += itemTokens;
        }
      }
    }
    
    // Filter relationships to only include those between kept items
    const keptItemIds = new Set(keptItems.map(c => c.id));
    const keptRelationships = data.relationships.filter(rel =>
      keptItemIds.has(rel.sourceId) && keptItemIds.has(rel.targetId)
    );
    
    return {
      ...data,
      items: keptItems,
      relationships: keptRelationships
    };
  }

  /**
   * Final reduction step - remove items by relevance score (lowest first)
   */
  private removeLowestPriorityItems(
    data: ContextData, 
    targetTokens: number, 
    options: ContextOptimizationOptions, 
    query: ContextQuery
  ): ContextData {
    const items = data.items.map(item => {
      const processor = this.processorRegistry.getProcessor(item.type) || 
                       this.processorRegistry.getDefaultProcessor();
      
      return {
        type: 'item' as const,
        item,
        tokens: processor.estimateTokens(item),
        relevanceScore: item.metadata?.relevanceScore || 0,
        isPrimary: query.componentId === item.id,
        hasSourceCode: !!item.code,
        priority: processor.calculatePriority(item, data)
      };
    });
    
    const relationships = data.relationships.map(rel => ({
      type: 'relationship' as const,
      item: rel,
      tokens: this.estimateRelationshipTokens(rel),
      relevanceScore: rel.metadata?.relevanceScore || 0,
      isPrimary: false,
      hasSourceCode: false,
      priority: 0
    }));
    
    const allItems = [...items, ...relationships];
    
    // Identify protected items
    const protectedIndices = new Set<number>();
    allItems.forEach((item, index) => {
      if (item.isPrimary) {
        protectedIndices.add(index);
      }
      // If includeSourceCode is explicitly true, prioritize items with code
      if (options.includeSourceCode === true && item.hasSourceCode) {
        // Boost priority for code items
        item.priority *= 2;
      }
    });
    
    // Sort by priority (keeping protected items first)
    allItems.sort((a, b) => {
      const aProtected = protectedIndices.has(allItems.indexOf(a));
      const bProtected = protectedIndices.has(allItems.indexOf(b));
      
      if (aProtected && !bProtected) return -1;
      if (!aProtected && bProtected) return 1;
      
      return b.priority - a.priority;
    });
    
    // Keep items until we reach token limit
    let currentTokens = 0;
    const keptIndices = new Set<number>();
    
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      
      if (item && (currentTokens + item.tokens <= targetTokens || 
          protectedIndices.has(i) ||
          keptIndices.size < this.minimumThresholds.minItems)) {
        keptIndices.add(i);
        currentTokens += item?.tokens || 0;
      }
    }
    
    // Separate back into items and relationships
    const keptItems = allItems
      .filter((_, i) => keptIndices.has(i) && allItems[i]?.type === 'item')
      .map(i => i.item as ContextItem);
      
    const keptRelationships = allItems
      .filter((_, i) => keptIndices.has(i) && allItems[i]?.type === 'relationship')
      .map(i => i.item as ContextRelationship);
    
    console.error(`🔧 WindowSizeProcessor: Protected ${protectedIndices.size} items, kept ${keptItems.length} items and ${keptRelationships.length} relationships (${currentTokens} tokens)`);
    
    return {
      ...data,
      items: keptItems,
      relationships: keptRelationships
    };
  }
}