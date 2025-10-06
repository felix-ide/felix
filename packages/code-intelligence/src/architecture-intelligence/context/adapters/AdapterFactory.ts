/**
 * Adapter Factory - Creates and manages format adapters
 */

import type { IFormatAdapter } from './IFormatAdapter.js';
import { JsonAdapter, JsonCompressedAdapter } from './JsonAdapter.js';
import { MarkdownAdapter, MarkdownCompressedAdapter } from './MarkdownAdapter.js';
import { TextAdapter } from './TextAdapter.js';
import { AICCLMarkdownAdapter } from './AICCLMarkdownAdapter.js';
import { AICCLDecompressionAdapter } from './AICCLDecompressionAdapter.js';

/**
 * Factory class for creating format adapters
 */
export class AdapterFactory {
  private static adapters: Map<string, () => IFormatAdapter> = new Map([
    ['json', () => new JsonAdapter()],
    ['json-compressed', () => new JsonCompressedAdapter()],
    ['markdown', () => new MarkdownAdapter()],
    ['markdown-compressed', () => new MarkdownCompressedAdapter()],
    ['text', () => new TextAdapter()],
    ['index', () => new MarkdownAdapter()], // Alias for markdown
    ['aiccl', () => new AICCLMarkdownAdapter()],
    ['aiccl-markdown', () => new AICCLMarkdownAdapter()],
    ['aiccl-expand', () => new AICCLDecompressionAdapter()],
    ['aiccl-decompression', () => new AICCLDecompressionAdapter()]
  ]);

  /**
   * Get an adapter for the specified format
   */
  static getAdapter(format: string): IFormatAdapter {
    const adapterFactory = this.adapters.get(format);
    if (!adapterFactory) {
      throw new Error(`Unknown format: ${format}. Available formats: ${Array.from(this.adapters.keys()).join(', ')}`);
    }
    return adapterFactory();
  }

  /**
   * Get all available format names
   */
  static getAvailableFormats(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if a format is supported
   */
  static isFormatSupported(format: string): boolean {
    return this.adapters.has(format);
  }

  /**
   * Register a custom adapter
   */
  static registerAdapter(format: string, adapterFactory: () => IFormatAdapter): void {
    this.adapters.set(format, adapterFactory);
  }

  /**
   * Get the appropriate adapter based on options
   * This handles automatic compression selection based on token limits
   */
  static getAdapterForOptions(format: string, targetTokenSize?: number): IFormatAdapter {
    // Auto-select compressed variants for small token budgets
    if (targetTokenSize && targetTokenSize < 4000) {
      if (format === 'json') {
        return this.getAdapter('json-compressed');
      }
      if (format === 'markdown') {
        return this.getAdapter('markdown-compressed');
      }
    }

    return this.getAdapter(format);
  }
}