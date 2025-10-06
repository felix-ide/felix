/**
 * Format Adapter Interface - Handles different output formats for context generation
 * 
 * This interface ensures that all format adapters handle the same data consistently
 * but present it in different formats (JSON, Markdown, etc.)
 */

import type { ContextData, ContextGenerationOptions } from '../types.js';

/**
 * Format adapter interface
 */
export interface IFormatAdapter {
  /**
   * Format the context data into the target format
   * @param data The processed context data
   * @param options Context generation options
   * @returns Formatted string content
   */
  format(data: ContextData, options: ContextGenerationOptions): string;

  /**
   * Get the format name (e.g., 'json', 'markdown')
   */
  getFormatName(): string;

  /**
   * Estimate token count for the formatted output
   * @param content The formatted content
   * @returns Estimated token count
   */
  estimateTokens(content: string): number;

  /**
   * Validate that the adapter can handle the given options
   * @param options Context generation options
   * @returns true if valid, error message if invalid
   */
  validateOptions(options: ContextGenerationOptions): true | string;
}

/**
 * Base adapter class with common functionality
 */
export abstract class BaseFormatAdapter implements IFormatAdapter {
  abstract format(data: ContextData, options: ContextGenerationOptions): string;
  abstract getFormatName(): string;

  /**
   * Default token estimation (4 characters per token)
   */
  estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }

  /**
   * Default validation (always valid)
   */
  validateOptions(options: ContextGenerationOptions): true | string {
    return true;
  }

  /**
   * Helper: Extract query text for display
   */
  protected extractQueryText(query: any): string {
    if (!query) return '';
    if (query.componentId) return `Component: ${query.componentId}`;
    if (query.filePath) return `File: ${query.filePath}`;
    if (query.semantic) return `Semantic: ${query.semantic}`;
    return 'Multi-language context';
  }

  /**
   * Helper: Truncate text to specified length
   */
  protected truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Helper: Sort components by relevance
   */
  protected sortComponentsByRelevance(components: any[]): any[] {
    return [...components].sort((a, b) => {
      const aScore = a.metadata?.relevanceScore || 0;
      const bScore = b.metadata?.relevanceScore || 0;
      return bScore - aScore;
    });
  }

  /**
   * Helper: Check if minified mode should be used
   */
  protected shouldUseMinified(options: ContextGenerationOptions): boolean {
    return Boolean(options.minified) || 
           Boolean(options.targetTokenSize && options.targetTokenSize < 4000);
  }
}