/**
 * Registry for managing content processors
 */

import type { IContentProcessor, IProcessorRegistry } from './interfaces.js';
import { GenericContentProcessor } from './GenericContentProcessor.js';

/**
 * Registry implementation for content processors
 */
export class ProcessorRegistry implements IProcessorRegistry {
  private processors: Map<string, IContentProcessor> = new Map();
  private defaultProcessor: IContentProcessor;
  
  constructor() {
    // Always have a default generic processor
    this.defaultProcessor = new GenericContentProcessor();
    this.register(this.defaultProcessor);
  }
  
  /**
   * Register a content processor
   */
  register(processor: IContentProcessor): void {
    this.processors.set(processor.name, processor);
  }
  
  /**
   * Unregister a content processor
   */
  unregister(name: string): void {
    if (name === this.defaultProcessor.name) {
      throw new Error('Cannot unregister the default processor');
    }
    this.processors.delete(name);
  }
  
  /**
   * Get the best processor for an item type
   */
  getProcessor(itemType: string): IContentProcessor | null {
    let bestProcessor: IContentProcessor | null = null;
    let highestPriority = -1;
    
    // Find processor with highest priority that supports this type
    for (const processor of this.processors.values()) {
      if (processor.supportedTypes.includes(itemType) || 
          processor.supportedTypes.includes('*')) {
        if (processor.priority > highestPriority) {
          bestProcessor = processor;
          highestPriority = processor.priority;
        }
      }
    }
    
    return bestProcessor;
  }
  
  /**
   * Get all registered processors
   */
  getAllProcessors(): IContentProcessor[] {
    return Array.from(this.processors.values());
  }
  
  /**
   * Get the default processor
   */
  getDefaultProcessor(): IContentProcessor {
    return this.defaultProcessor;
  }
  
  /**
   * Set a custom default processor
   */
  setDefaultProcessor(processor: IContentProcessor): void {
    this.register(processor);
    this.defaultProcessor = processor;
  }
}