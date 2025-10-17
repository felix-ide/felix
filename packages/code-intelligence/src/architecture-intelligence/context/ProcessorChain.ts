/**
 * Processor Chain - Manages and executes context processors in sequence
 * 
 * This class provides a chain-of-responsibility pattern for context processors,
 * allowing multiple processors to transform context data in a controlled sequence.
 */

import type {
  IContextProcessor,
  IProcessorChain
} from './IContextProcessor.js';
import type {
  ContextData,
  ContextQuery,
  ContextGenerationOptions,
  ProcessorResult
} from './types.js';

/**
 * Implementation of processor chain for context generation
 */
export class ProcessorChain implements IProcessorChain {
  private processors: Map<string, IContextProcessor> = new Map();

  /**
   * Add processor to the chain
   */
  addProcessor(processor: IContextProcessor): IProcessorChain {
    this.processors.set(processor.name, processor);
    return this;
  }

  /**
   * Remove processor from the chain
   */
  removeProcessor(processorName: string): boolean {
    return this.processors.delete(processorName);
  }

  /**
   * Get processor by name
   */
  getProcessor(name: string): IContextProcessor | null {
    return this.processors.get(name) || null;
  }

  /**
   * Execute all processors in priority order
   */
  async execute(
    data: ContextData,
    query: ContextQuery,
    options: ContextGenerationOptions
  ): Promise<ProcessorResult> {
    const startTime = Date.now();
    let currentData = data;
    const processingSteps: string[] = [];
    const warnings: string[] = [];
    let totalItemsProcessed = 0;
    let totalItemsFiltered = 0;

    // Get processors in explicit execution order
    const orderedProcessors = this.getProcessors();

    for (const processor of orderedProcessors) {
      try {
        // Check if processor can handle current data
        if (!processor.canProcess(currentData, options)) {
          processingSteps.push(`Skipped ${processor.name} (cannot process)`);
          continue;
        }

        // Execute processor
        const processorStartTime = Date.now();
        const result = await Promise.resolve(processor.process(currentData, query, options));
        
        // Update current data with processor result
        currentData = result.data;
        console.error(`📊 ProcessorChain: After ${processor.name} - components: ${currentData.components?.length || 0}, relationships: ${currentData.relationships?.length || 0}`);
        
        // Track processing metadata
        processingSteps.push(`${processor.name} (${Date.now() - processorStartTime}ms)`);
        warnings.push(...result.warnings);
        totalItemsProcessed += result.metadata.itemsProcessed;
        totalItemsFiltered += result.metadata.itemsFiltered;

      } catch (error) {
        const errorMessage = `Processor ${processor.name} failed: ${error}`;
        warnings.push(errorMessage);
        processingSteps.push(`Failed ${processor.name}`);
        
        // Continue with next processor instead of failing entirely
        console.warn(errorMessage);
      }
    }

    // Update metadata
    if (currentData.metadata) {
      currentData.metadata.processingSteps.push(...processingSteps);
      currentData.metadata.warnings.push(...warnings);
      currentData.metadata.generationTime = Date.now() - startTime;
    }

    return {
      data: currentData,
      metadata: {
        processorName: 'ProcessorChain',
        processingTime: Date.now() - startTime,
        itemsProcessed: totalItemsProcessed,
        itemsFiltered: totalItemsFiltered
      },
      warnings
    };
  }

  /**
   * Get processors in explicit execution order
   */
  getProcessors(): IContextProcessor[] {
    const executionOrder = [
      'LanguageProcessor',
      'RelevanceScoreProcessor', 
      'RelevanceFilterProcessor',
      'WindowSizeProcessor'
    ];
    
    const orderedProcessors: IContextProcessor[] = [];
    
    for (const processorName of executionOrder) {
      const processor = this.processors.get(processorName);
      if (processor) {
        orderedProcessors.push(processor);
      }
    }
    
    return orderedProcessors;
  }

  /**
   * Clear all processors from the chain
   */
  clear(): void {
    this.processors.clear();
  }

  /**
   * Get processor names
   */
  getProcessorNames(): string[] {
    return Array.from(this.processors.keys());
  }

  /**
   * Check if processor exists in chain
   */
  hasProcessor(name: string): boolean {
    return this.processors.has(name);
  }

  /**
   * Get chain statistics
   */
  getChainStats(): {
    processorCount: number;
    processorNames: string[];
  } {
    const processors = this.getProcessors();
    return {
      processorCount: processors.length,
      processorNames: processors.map(p => p.name)
    };
  }

  /**
   * Validate processor chain configuration
   */
  validateChain(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const processors = this.getProcessors();

    // Check for required processors
    const hasWindowSizeProcessor = processors.some(p => p.name === 'WindowSizeProcessor');
    if (!hasWindowSizeProcessor) {
      errors.push('WindowSizeProcessor is required but not found');
    }

    // Validate each processor configuration
    for (const processor of processors) {
      try {
        const config = {}; // Default empty config
        const validationResult = processor.validateConfig(config);
        if (validationResult !== true) {
          errors.push(`Processor ${processor.name} configuration invalid: ${validationResult}`);
        }
      } catch (error) {
        errors.push(`Processor ${processor.name} validation failed: ${error}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Clone the processor chain
   */
  clone(): ProcessorChain {
    const newChain = new ProcessorChain();
    for (const processor of this.processors.values()) {
      newChain.addProcessor(processor);
    }
    return newChain;
  }

  /**
   * Create processor chain from configuration
   */
  static fromConfig(config: {
    processors: Array<{
      name: string;
      type: string;
      priority?: number;
      config?: any;
    }>;
  }): ProcessorChain {
    const chain = new ProcessorChain();
    
    // This would be implemented with a processor factory
    // For now, we'll create a basic chain
    
    return chain;
  }

  /**
   * Export chain configuration
   */
  exportConfig(): any {
    const processors = this.getProcessors();
    return {
      processors: processors.map(processor => ({
        name: processor.name,
        description: processor.description,
        version: processor.version,
        priority: processor.priority,
        configSchema: processor.getConfigSchema()
      }))
    };
  }
}