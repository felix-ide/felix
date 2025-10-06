/**
 * Context Generation API - Main interface for generating code context
 * 
 * This class provides the primary API for generating context from indexed code components,
 * with support for multi-language projects, relationship analysis, and token optimization.
 */

import type { IComponent, IRelationship } from '../../code-analysis-types/index.js';
import { ComponentType, RelationshipType } from '../../code-analysis-types/index.js';
import type { IKnowledgeGraph } from '../interfaces/IKnowledgeGraph.js';
import { AdapterFactory } from './adapters/AdapterFactory.js';
import type { ContextData, ContextGenerationOptions, ContextQuery as TypesContextQuery } from './types.js';

/**
 * Context query parameters - extends the base from types
 */
export interface ContextQuery extends TypesContextQuery {
  query?: string;
  componentId?: string;
  filePaths?: string[];
  languages?: string[];
  types?: ComponentType[];
  relationshipTypes?: RelationshipType[];
}

/**
 * Generated context result
 */
export interface ContextResult {
  components: IComponent[];
  relationships: IRelationship[];
  metadata: {
    totalComponents: number;
    totalRelationships: number;
    relevanceScore: number;
    tokenCount: number;
    truncated: boolean;
  };
  formattedOutput: string;
}

/**
 * Processor interface for context processing pipeline
 */
export interface ContextProcessor {
  name: string;
  process(components: IComponent[], relationships: IRelationship[], options: ContextGenerationOptions): Promise<{
    components: IComponent[];
    relationships: IRelationship[];
  }>;
}

/**
 * Main context generation API class
 */
export class ContextGenerationAPI {
  private knowledgeGraph: IKnowledgeGraph;
  private processors: ContextProcessor[];
  private defaultOptions: ContextGenerationOptions;

  constructor(
    knowledgeGraph: IKnowledgeGraph,
    processors: ContextProcessor[] = [],
    options: Partial<ContextGenerationOptions> = {}
  ) {
    this.knowledgeGraph = knowledgeGraph;
    this.processors = processors;
    
    // Set default options
    this.defaultOptions = {
      maxTokens: 4000,
      includeRelationships: true,
      includeMetadata: true,
      outputFormat: 'markdown',
      maxDepth: 3,
      includeCode: true,
      compressOutput: false,
      ...options
    };
  }

  /**
   * Generate context based on a query
   */
  async generateContext(
    query: ContextQuery,
    options: Partial<ContextGenerationOptions> = {}
  ): Promise<ContextResult> {
    // Normalize common aliases from callers
    const optCopy: any = { ...options };
    if (optCopy.targetTokenSize !== undefined && optCopy.maxTokens === undefined) {
      optCopy.maxTokens = optCopy.targetTokenSize;
    }
    if (optCopy.includeSourceCode !== undefined && optCopy.includeCode === undefined) {
      optCopy.includeCode = optCopy.includeSourceCode;
    }
    const finalOptions = { ...this.defaultOptions, ...optCopy };
    
    // Find initial components based on query
    let components: IComponent[] = [];
    let relationships: IRelationship[] = [];

    if (query.componentId) {
      // Start from a specific component
      const component = await this.knowledgeGraph.getComponent(query.componentId);
      if (component) {
        components = [component];
        // Get ALL relationships for this component, no filtering
        relationships = await this.knowledgeGraph.getRelationshipsForComponent(
          query.componentId,
          { direction: 'both' }
        );

      }
    } else {
      // Search for components matching the query
      const searchResult = await this.knowledgeGraph.search(query.query || '', {
        maxDepth: finalOptions.maxDepth,
        includeComponents: true,
        includeRelationships: finalOptions.includeRelationships
      });
      components = searchResult.components;
      relationships = searchResult.relationships;
    }

    // Apply filters based on query parameters
    if (query.types && query.types.length > 0) {
      components = components.filter(c => query.types!.includes(c.type));
    }

    if (query.languages && query.languages.length > 0) {
      components = components.filter(c => query.languages!.includes(c.language));
    }

    if (query.filePaths && query.filePaths.length > 0) {
      components = components.filter(c => 
        query.filePaths!.some(path => c.filePath.includes(path))
      );
    }

    if (finalOptions.excludeTypes && finalOptions.excludeTypes.length > 0) {
      components = components.filter(c => !finalOptions.excludeTypes!.includes(c.type));
    }

    // Expand context by traversing relationships
    if (finalOptions.maxDepth && finalOptions.maxDepth > 1) {
      const expandedContext = await this.expandContext(
        components,
        relationships,
        finalOptions.maxDepth
      );
      components = expandedContext.components;
      relationships = expandedContext.relationships;
    }

    // Process through the pipeline
    for (const processor of this.processors) {
      const result = await processor.process(components, relationships, finalOptions);
      components = result.components;
      relationships = result.relationships;
    }

    // Apply token limits and prioritization
    const optimizedContext = this.optimizeForTokens(components, relationships, finalOptions);
    components = optimizedContext.components;
    relationships = optimizedContext.relationships;

    // Generate formatted output
    const formattedOutput = this.formatOutput(components, relationships, finalOptions);
    
    // Calculate metadata
    const relevanceScore = this.calculateRelevanceScore(components, query);
    const tokenCount = this.estimateTokenCount(formattedOutput);

    return {
      components,
      relationships,
      metadata: {
        totalComponents: components.length,
        totalRelationships: relationships.length,
        relevanceScore,
        tokenCount,
        truncated: tokenCount > (finalOptions.maxTokens || 4000)
      },
      formattedOutput
    };
  }

  /**
   * Expand context by traversing relationships
   */
  private async expandContext(
    initialComponents: IComponent[],
    initialRelationships: IRelationship[],
    maxDepth: number
  ): Promise<{ components: IComponent[]; relationships: IRelationship[] }> {
    const visited = new Set<string>();
    const allComponents = new Map<string, IComponent>();
    const allRelationships = new Map<string, IRelationship>();

    // Add initial components
    initialComponents.forEach(c => {
      allComponents.set(c.id, c);
      visited.add(c.id);
    });

    initialRelationships.forEach(r => {
      allRelationships.set(r.id, r);
    });

    // BFS traversal to expand context
    const queue: Array<{ componentId: string; depth: number }> = 
      initialComponents.map(c => ({ componentId: c.id, depth: 0 }));

    while (queue.length > 0) {
      const { componentId, depth } = queue.shift()!;
      
      if (depth >= maxDepth) continue;

      // Get ALL relationships for this component (not filtered)
      const componentRelationships = await this.knowledgeGraph.getRelationshipsForComponent(
        componentId,
        { direction: 'both' }
      );
      
      // Add ALL relationships to our map
      componentRelationships.forEach((r: IRelationship) => {
        allRelationships.set(r.id, r);
      });
      
      const neighborIds = new Set<string>();
      componentRelationships.forEach((r: IRelationship) => {
        if (r.sourceId !== componentId) neighborIds.add(r.sourceId);
        if (r.targetId !== componentId) neighborIds.add(r.targetId);
      });
      
      const neighbors: IComponent[] = [];
      for (const neighborId of neighborIds) {
        const neighbor = await this.knowledgeGraph.getComponent(neighborId);
        if (neighbor) neighbors.push(neighbor);
      }

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          allComponents.set(neighbor.id, neighbor);
          queue.push({ componentId: neighbor.id, depth: depth + 1 });
        }
      }
    }

    return {
      components: Array.from(allComponents.values()),
      relationships: Array.from(allRelationships.values())
    };
  }

  /**
   * Optimize context for token limits
   */
  private optimizeForTokens(
    components: IComponent[],
    relationships: IRelationship[],
    options: ContextGenerationOptions
  ): { components: IComponent[]; relationships: IRelationship[] } {
    if (!options.maxTokens) {
      return { components, relationships };
    }

    // Sort components by priority/relevance
    const sortedComponents = [...components].sort((a, b) => {
      // Prioritize components in priorityComponents list
      if (options.priorityComponents) {
        const aInPriority = options.priorityComponents.includes(a.id);
        const bInPriority = options.priorityComponents.includes(b.id);
        if (aInPriority && !bInPriority) return -1;
        if (!aInPriority && bInPriority) return 1;
      }

      // Prioritize by component type
      const typePriority: Record<string, number> = {
        'class': 1,
        'function': 2,
        'method': 3,
        'interface': 4,
        'variable': 5,
        'property': 6
      };
      
      const aPriority = typePriority[a.type] || 10;
      const bPriority = typePriority[b.type] || 10;
      
      return aPriority - bPriority;
    });

    // Include components until token limit is reached
    const selectedComponents: IComponent[] = [];
    let estimatedTokens = 0;

    for (const component of sortedComponents) {
      const componentTokens = this.estimateComponentTokens(component, options);
      if (estimatedTokens + componentTokens <= options.maxTokens) {
        selectedComponents.push(component);
        estimatedTokens += componentTokens;
      }
    }

    // Include relationships where at least one end is in selected components
    // This ensures we don't lose extends/extended-by relationships
    const selectedComponentIds = new Set(selectedComponents.map(c => c.id));
    const selectedRelationships = relationships.filter(r =>
      selectedComponentIds.has(r.sourceId) || selectedComponentIds.has(r.targetId)
    );

    return {
      components: selectedComponents,
      relationships: selectedRelationships
    };
  }

  /**
   * Format output according to specified format
   */
  private formatOutput(
    components: IComponent[],
    relationships: IRelationship[],
    options: ContextGenerationOptions
  ): string {
    // Create context data object
    const contextData: ContextData = {
      components,
      relationships,
      timestamp: Date.now(),
      source: {
        totalComponents: components.length,
        totalRelationships: relationships.length
      },
      metadata: {
        totalComponents: components.length,
        totalRelationships: relationships.length,
        generatedAt: new Date().toISOString(),
        generationTime: Date.now(),
        processingSteps: [],
        warnings: []
      }
    };

    // Use adapter factory to get the appropriate formatter
    const formatName = options.outputFormat || 'markdown';
    const adapter = AdapterFactory.getAdapter(formatName);
    
    // Map our options to the adapter's expected format
    const adapterOptions = {
      ...options,
      targetTokenSize: options.maxTokens,
      includeSourceCode: options.includeCode,
      includeRelationships: options.includeRelationships,
      includeMetadata: options.includeMetadata
    };
    
    return adapter.format(contextData, adapterOptions as any);
  }


  /**
   * Calculate relevance score for components
   */
  private calculateRelevanceScore(components: IComponent[], query: ContextQuery): number {
    if (components.length === 0 || !query.query) return 0;

    let totalScore = 0;
    const queryTerms = query.query.toLowerCase().split(/\s+/);

    components.forEach(c => {
      let score = 0;
      const componentText = `${c.name} ${c.code || ''}`.toLowerCase();
      
      queryTerms.forEach((term: string) => {
        if (term && componentText.includes(term)) {
          score += 1;
        }
      });
      
      totalScore += score / queryTerms.length;
    });

    return totalScore / components.length;
  }

  /**
   * Estimate token count for formatted output
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: 4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate token count for a component
   */
  private estimateComponentTokens(component: IComponent, options: ContextGenerationOptions): number {
    let tokens = 0;
    
    // Name and type
    tokens += Math.ceil(component.name.length / 4);
    tokens += 5; // for type and formatting
    
    // Code if included
    if (options.includeCode && component.code) {
      tokens += Math.ceil(component.code.length / 4);
    }
    
    // Metadata if included
    if (options.includeMetadata && component.metadata) {
      tokens += Math.ceil(JSON.stringify(component.metadata).length / 4);
    }
    
    return tokens;
  }

  /**
   * Add a processor to the pipeline
   */
  addProcessor(processor: ContextProcessor): void {
    this.processors.push(processor);
  }

  /**
   * Remove a processor from the pipeline
   */
  removeProcessor(processorName: string): void {
    this.processors = this.processors.filter(p => p.name !== processorName);
  }

  /**
   * Get current processors
   */
  getProcessors(): ContextProcessor[] {
    return [...this.processors];
  }
}

// ContextProcessor interface is already exported above

/**
 * Simple processor chain implementation
 */
export class ProcessorChain {
  private processors: ContextProcessor[] = [];

  addProcessor(processor: ContextProcessor): void {
    this.processors.push(processor);
  }

  async process(
    components: IComponent[],
    relationships: IRelationship[],
    options: ContextGenerationOptions
  ): Promise<{ components: IComponent[]; relationships: IRelationship[] }> {
    let result = { components, relationships };
    
    for (const processor of this.processors) {
      result = await processor.process(result.components, result.relationships, options);
    }
    
    return result;
  }
}
