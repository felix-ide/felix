/**
 * ContentOptimizer - Unified interface for intelligent context optimization
 * 
 * This class combines relevance scoring, filtering, and window size management
 * to provide comprehensive RAG (Retrieval Augmented Generation) optimization.
 */

import type {
  ContextData,
  ContextQuery,
  ContextOptimizationOptions,
  RelevanceOptions,
  FilterOptions,
  WindowSizeOptions,
  ContextItem
} from './interfaces.js';
import type { OptimizationResult } from './types.js';

import { RelevanceScoreProcessor } from './RelevanceScoreProcessor.js';
import { RelevanceFilterProcessor } from './RelevanceFilterProcessor.js';
import { WindowSizeProcessor } from './WindowSizeProcessor.js';

export interface ContentOptimizerOptions {
  /** Target token count for final output */
  targetTokens: number;
  
  /** Relevance scoring options */
  relevance?: RelevanceOptions;
  
  /** Content filtering options */
  filtering?: FilterOptions;
  
  /** Window size management options */
  windowSize?: WindowSizeOptions;
  
  /** Include source code in output */
  includeSourceCode?: boolean;
  
  /** Include relationships in output */
  includeRelationships?: boolean;
  
  /** Output format for token estimation */
  outputFormat?: 'json' | 'markdown' | 'text' | 'index';
  
  /** Enable minification */
  minified?: boolean;
}

/**
 * Main content optimization class
 */
export class ContentOptimizer {
  private relevanceProcessor: RelevanceScoreProcessor;
  private filterProcessor: RelevanceFilterProcessor;
  private windowProcessor: WindowSizeProcessor;
  
  constructor(private options: ContentOptimizerOptions) {
    this.relevanceProcessor = new RelevanceScoreProcessor(options.relevance);
    this.filterProcessor = new RelevanceFilterProcessor(options.filtering);
    this.windowProcessor = new WindowSizeProcessor(options.windowSize);
  }

  /**
   * Optimize content for RAG applications
   * 
   * This method applies the full optimization pipeline:
   * 1. Score relevance based on query
   * 2. Filter by relevance threshold and content weights
   * 3. Reduce to fit token budget while preserving important content
   */
  async optimize(
    data: ContextData,
    query: ContextQuery
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const originalTokens = this.windowProcessor.estimateContextTokens(data);
    
    // Build optimization options
    const contextOptions: ContextOptimizationOptions = {
      targetTokens: this.options.targetTokens,
      includeSourceCode: this.options.includeSourceCode,
      includeRelationships: this.options.includeRelationships,
      outputFormat: this.options.outputFormat,
      minified: this.options.minified
    };

    let workingData = data;
    const warnings: string[] = [];
    const strategiesApplied: string[] = [];

    try {
      // Step 1: Score relevance
      if (this.relevanceProcessor.canProcess(workingData, contextOptions)) {
        const relevanceResult = await this.relevanceProcessor.process(
          workingData, 
          query, 
          contextOptions
        );
        workingData = relevanceResult.data;
        warnings.push(...relevanceResult.warnings);
        strategiesApplied.push('relevance-scoring');
      }

      // Step 2: Filter content
      if (this.filterProcessor.canProcess(workingData, contextOptions)) {
        const filterResult = await this.filterProcessor.process(
          workingData,
          query,
          contextOptions
        );
        workingData = filterResult.data;
        warnings.push(...filterResult.warnings);
        strategiesApplied.push('content-filtering');
      }

      // Step 3: Manage window size
      if (this.windowProcessor.canProcess(workingData, contextOptions)) {
        const windowResult = await this.windowProcessor.process(
          workingData,
          query,
          contextOptions
        );
        workingData = windowResult.data;
        warnings.push(...windowResult.warnings);
        strategiesApplied.push('window-sizing');
      }

      const finalTokens = this.windowProcessor.estimateContextTokens(workingData);
      const itemsRemoved = data.items.length - workingData.items.length;
      const relationshipsRemoved = data.relationships.length - workingData.relationships.length;

      return {
        optimizedData: workingData,
        originalTokens,
        finalTokens,
        itemsRemoved,
        relationshipsRemoved,
        processingTime: Date.now() - startTime,
        strategiesApplied: strategiesApplied as any,
        warnings
      };

    } catch (error) {
      console.error('Error in ContentOptimizer:', error);
      throw error;
    }
  }

  /**
   * Estimate tokens for content using the window processor
   */
  estimateTokens(content: string, outputFormat?: string): number {
    return this.windowProcessor.estimateTokens(content, outputFormat);
  }

  /**
   * Estimate tokens for entire context data
   */
  estimateContextTokens(data: ContextData): number {
    return this.windowProcessor.estimateContextTokens(data);
  }

  /**
   * Calculate relevance score for a single item
   */
  async calculateRelevance(
    item: ContextItem,
    query: ContextQuery
  ): Promise<number> {
    return this.relevanceProcessor.calculateRelevance(
      item, 
      query, 
      this.options.relevance || {}
    );
  }

  /**
   * Filter content without window size optimization
   */
  async filterContent(
    data: ContextData,
    query: ContextQuery
  ): Promise<ContextData> {
    const contextOptions: ContextOptimizationOptions = {
      targetTokens: Infinity, // No token limit for filtering only
      includeSourceCode: this.options.includeSourceCode,
      includeRelationships: this.options.includeRelationships,
      outputFormat: this.options.outputFormat
    };

    let workingData = data;

    // Apply relevance scoring
    if (this.relevanceProcessor.canProcess(workingData, contextOptions)) {
      const relevanceResult = await this.relevanceProcessor.process(
        workingData,
        query,
        contextOptions
      );
      workingData = relevanceResult.data;
    }

    // Apply filtering
    if (this.filterProcessor.canProcess(workingData, contextOptions)) {
      const filterResult = await this.filterProcessor.process(
        workingData,
        query,
        contextOptions
      );
      workingData = filterResult.data;
    }

    return workingData;
  }

  /**
   * Get configuration for all processors
   */
  getConfiguration() {
    return {
      relevance: this.relevanceProcessor.getConfigSchema(),
      filtering: this.filterProcessor.getConfigSchema(),
      windowSize: this.windowProcessor.getConfigSchema()
    };
  }

  /**
   * Update configuration for specific processor
   */
  updateConfiguration(
    processor: 'relevance' | 'filtering' | 'windowSize',
    config: any
  ): void {
    switch (processor) {
      case 'relevance':
        this.relevanceProcessor = new RelevanceScoreProcessor(config);
        break;
      case 'filtering':
        this.filterProcessor = new RelevanceFilterProcessor(config);
        break;
      case 'windowSize':
        this.windowProcessor = new WindowSizeProcessor(config);
        break;
    }
  }
}