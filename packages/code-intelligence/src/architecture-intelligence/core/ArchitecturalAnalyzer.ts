/**
 * Architectural Analyzer - Identifies systems, patterns, and architectural components
 * 
 * This analyzer processes components and relationships to identify:
 * - Logical systems (groups of related components)
 * - Pipeline flows (execution paths)
 * - Design patterns
 * - Architectural boundaries
 */

import { IComponent, IRelationship, ComponentType, RelationshipType } from '../../code-analysis-types/index.js';
import { randomUUID } from 'crypto';

/**
 * Configuration for architectural analysis
 */
export interface ArchitecturalAnalysisConfig {
  minSystemSize?: number;              // Minimum components for a system
  maxSystemDepth?: number;             // Max depth for system boundary detection
  detectPatterns?: boolean;            // Enable pattern detection
  detectPipelines?: boolean;           // Enable pipeline detection
  includeOrphanComponents?: boolean;   // Include components not in any system
}

/**
 * Represents a detected system
 */
export interface DetectedSystem {
  id: string;
  name: string;
  description: string;
  coreComponents: IComponent[];
  relatedComponents: IComponent[];
  entryPoints: IComponent[];
  boundaries: string[];  // File paths that define system boundaries
  metadata: {
    componentCount: number;
    cohesion: number;     // 0-1 score of how related components are
    coupling: number;     // 0-1 score of external dependencies
  };
}

/**
 * Represents a detected pipeline
 */
export interface DetectedPipeline {
  id: string;
  name: string;
  description: string;
  stages: Array<{
    componentId: string;
    method?: string;
    file: string;
    lineRange?: { start: number; end: number };
  }>;
  entryPoint: IComponent;
  exitPoints: IComponent[];
}

/**
 * Represents a detected pattern
 */
export interface DetectedPattern {
  id: string;
  type: string;  // 'singleton', 'factory', 'observer', etc.
  confidence: number;  // 0-1
  components: IComponent[];
  relationships: IRelationship[];
  metadata: Record<string, any>;
}

export class ArchitecturalAnalyzer {
  private config: Required<ArchitecturalAnalysisConfig>;
  
  constructor(config: ArchitecturalAnalysisConfig = {}) {
    this.config = {
      minSystemSize: 3,
      maxSystemDepth: 5,
      detectPatterns: true,
      detectPipelines: true,
      includeOrphanComponents: false,
      ...config
    };
  }
  
  /**
   * Analyze codebase architecture
   */
  async analyzeArchitecture(
    components: IComponent[], 
    relationships: IRelationship[]
  ): Promise<{
    systems: IComponent[];
    pipelines: IComponent[];
    patterns: IComponent[];
    newRelationships: IRelationship[];
  }> {
    console.log(`🔍 Starting architectural analysis with ${components.length} components...`);
    
    // Detect logical systems
    console.log(`🔍 Identifying systems...`);
    const detectedSystems = await this.identifySystems(components, relationships);
    console.log(`✅ Found ${detectedSystems.length} systems`);
    const systemComponents = this.createSystemComponents(detectedSystems);
    
    // Detect pipeline flows
    console.log(`🔍 Extracting pipelines...`);
    const detectedPipelines = await this.extractPipelines(components, relationships);
    console.log(`✅ Found ${detectedPipelines.length} pipelines`);
    const pipelineComponents = this.createPipelineComponents(detectedPipelines);
    
    // Detect architectural patterns
    console.log(`🔍 Detecting patterns...`);
    const detectedPatterns = this.config.detectPatterns 
      ? await this.detectPatterns(components, relationships)
      : [];
    console.log(`✅ Found ${detectedPatterns.length} patterns`);
    const patternComponents = this.createPatternComponents(detectedPatterns);
    
    // Create relationships for all architectural components
    const newRelationships = [
      ...this.createSystemRelationships(systemComponents, components, detectedSystems),
      ...this.createPipelineRelationships(pipelineComponents, components, detectedPipelines),
      ...this.createPatternRelationships(patternComponents, components, detectedPatterns)
    ];
    
    return {
      systems: systemComponents,
      pipelines: pipelineComponents,
      patterns: patternComponents,
      newRelationships
    };
  }
  
  /**
   * Identify logical systems through component clustering
   */
  private async identifySystems(
    components: IComponent[], 
    relationships: IRelationship[]
  ): Promise<DetectedSystem[]> {
    const systems: DetectedSystem[] = [];
    const visited = new Set<string>();
    
    // Find core classes/modules as system anchors
    const anchors = components.filter(c => 
      (c.type === ComponentType.CLASS || c.type === ComponentType.MODULE) &&
      !visited.has(c.id)
    );
    
    for (const anchor of anchors) {
      if (visited.has(anchor.id)) continue;
      
      // Build system around this anchor
      const system = this.buildSystemFromAnchor(anchor, components, relationships, visited);
      
      if (system.coreComponents.length >= this.config.minSystemSize) {
        systems.push(system);
      }
    }
    
    return systems;
  }
  
  /**
   * Build a system starting from an anchor component
   */
  private buildSystemFromAnchor(
    anchor: IComponent,
    components: IComponent[],
    relationships: IRelationship[],
    visited: Set<string>
  ): DetectedSystem {
    const systemComponents = new Set<IComponent>();
    const queue = [{ component: anchor, depth: 0 }];
    const boundaries = new Set<string>();
    
    while (queue.length > 0) {
      const { component, depth } = queue.shift()!;
      
      if (visited.has(component.id) || depth > this.config.maxSystemDepth) {
        continue;
      }
      
      visited.add(component.id);
      systemComponents.add(component);
      boundaries.add(component.filePath);
      
      // Find related components
      const related = this.findDirectlyRelatedComponents(
        component, 
        components, 
        relationships
      );
      
      // Add related components to queue
      for (const relatedComp of related) {
        if (!visited.has(relatedComp.id)) {
          queue.push({ component: relatedComp, depth: depth + 1 });
        }
      }
    }
    
    // Categorize components
    const componentArray = Array.from(systemComponents);
    const coreComponents = componentArray.filter(c => 
      c.type === ComponentType.CLASS || 
      c.type === ComponentType.MODULE ||
      c.type === ComponentType.SERVICE
    );
    
    const relatedComponents = componentArray.filter(c => 
      !coreComponents.includes(c)
    );
    
    // Find entry points (methods with no internal callers)
    const entryPoints = this.findEntryPoints(componentArray, relationships);
    
    return {
      id: `system_${randomUUID()}`,
      name: this.deriveSystemName(anchor, coreComponents),
      description: this.deriveSystemDescription(coreComponents),
      coreComponents,
      relatedComponents,
      entryPoints,
      boundaries: Array.from(boundaries),
      metadata: {
        componentCount: componentArray.length,
        cohesion: this.calculateCohesion(componentArray, relationships),
        coupling: this.calculateCoupling(componentArray, relationships, components)
      }
    };
  }
  
  /**
   * Find components directly related to a given component
   */
  private findDirectlyRelatedComponents(
    component: IComponent,
    components: IComponent[],
    relationships: IRelationship[]
  ): IComponent[] {
    const related = new Set<string>();
    
    // Find relationships where this component is involved
    relationships.forEach(rel => {
      if (rel.sourceId === component.id) {
        // Skip file-level relationships for tighter clustering
        const target = components.find(c => c.id === rel.targetId);
        if (target && target.type !== ComponentType.FILE) {
          related.add(rel.targetId);
        }
      } else if (rel.targetId === component.id) {
        const source = components.find(c => c.id === rel.sourceId);
        if (source && source.type !== ComponentType.FILE) {
          related.add(rel.sourceId);
        }
      }
    });
    
    return components.filter(c => related.has(c.id));
  }
  
  /**
   * Extract pipeline flows from relationships
   */
  private async extractPipelines(
    components: IComponent[],
    relationships: IRelationship[]
  ): Promise<DetectedPipeline[]> {
    const pipelines: DetectedPipeline[] = [];
    const callGraph = this.buildCallGraph(components, relationships);
    
    // Find entry points (methods with no callers)
    const entryPoints = this.findEntryPoints(components, relationships);
    
    for (const entry of entryPoints) {
      const flow = this.traceExecutionPath(entry, callGraph, components);
      
      if (flow.length > 2) { // Meaningful pipeline
        pipelines.push({
          id: `pipeline_${randomUUID()}`,
          name: this.derivePipelineName(entry, flow),
          description: this.derivePipelineDescription(flow),
          stages: flow,
          entryPoint: entry,
          exitPoints: this.findExitPoints(flow, components)
        });
      }
    }
    
    return pipelines;
  }
  
  /**
   * Detect architectural patterns in the codebase
   */
  private async detectPatterns(
    components: IComponent[],
    relationships: IRelationship[]
  ): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    
    // Detect Factory pattern
    patterns.push(...this.detectFactoryPattern(components, relationships));
    
    // Detect Singleton pattern
    patterns.push(...this.detectSingletonPattern(components, relationships));
    
    // Detect Observer pattern
    patterns.push(...this.detectObserverPattern(components, relationships));
    
    // Add more pattern detectors as needed
    
    return patterns;
  }
  
  /**
   * Detect Factory pattern instances
   */
  private detectFactoryPattern(
    components: IComponent[],
    relationships: IRelationship[]
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    
    // Look for classes/methods with 'Factory' in name or that create multiple types
    const factoryCandidates = components.filter(c => 
      c.name.toLowerCase().includes('factory') ||
      (c.type === ComponentType.METHOD && c.name.toLowerCase().includes('create'))
    );
    
    for (const candidate of factoryCandidates) {
      // Check if it creates multiple different types
      const createsRelationships = relationships.filter(r => 
        r.sourceId === candidate.id && r.type === RelationshipType.CREATES
      );
      
      if (createsRelationships.length >= 2) {
        patterns.push({
          id: `pattern_factory_${randomUUID()}`,
          type: 'factory',
          confidence: 0.8,
          components: [candidate],
          relationships: createsRelationships,
          metadata: {
            factoryType: candidate.type,
            createdTypes: createsRelationships.map(r => r.targetId)
          }
        });
      }
    }
    
    return patterns;
  }
  
  /**
   * Detect Singleton pattern instances
   */
  private detectSingletonPattern(
    components: IComponent[],
    relationships: IRelationship[]
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    
    // Look for classes with getInstance methods or static instance fields
    const singletonCandidates = components.filter(c => c.type === ComponentType.CLASS);
    
    for (const candidate of singletonCandidates) {
      const methods = components.filter(c => 
        c.type === ComponentType.METHOD &&
        relationships.some(r => 
          r.sourceId === c.id && 
          r.targetId === candidate.id && 
          r.type === RelationshipType.BELONGS_TO
        )
      );
      
      const hasGetInstance = methods.some(m => 
        m.name.toLowerCase() === 'getinstance' ||
        m.name.toLowerCase() === 'instance'
      );
      
      if (hasGetInstance) {
        patterns.push({
          id: `pattern_singleton_${randomUUID()}`,
          type: 'singleton',
          confidence: 0.9,
          components: [candidate, ...methods],
          relationships: [],
          metadata: {
            className: candidate.name
          }
        });
      }
    }
    
    return patterns;
  }
  
  /**
   * Detect Observer pattern instances
   */
  private detectObserverPattern(
    components: IComponent[],
    relationships: IRelationship[]
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    
    // Look for subscribe/publish or addEventListener patterns
    const observerMethods = components.filter(c => 
      c.type === ComponentType.METHOD &&
      (c.name.toLowerCase().includes('subscribe') ||
       c.name.toLowerCase().includes('publish') ||
       c.name.toLowerCase().includes('addlistener') ||
       c.name.toLowerCase().includes('emit'))
    );
    
    // Group by parent class
    const classMethods = new Map<string, IComponent[]>();
    
    observerMethods.forEach(method => {
      const parentRel = relationships.find(r => 
        r.sourceId === method.id && 
        r.type === RelationshipType.BELONGS_TO
      );
      
      if (parentRel) {
        if (!classMethods.has(parentRel.targetId)) {
          classMethods.set(parentRel.targetId, []);
        }
        classMethods.get(parentRel.targetId)!.push(method);
      }
    });
    
    // Classes with both subscribe and publish methods are likely observers
    classMethods.forEach((methods, classId) => {
      const hasSubscribe = methods.some(m => 
        m.name.toLowerCase().includes('subscribe') ||
        m.name.toLowerCase().includes('addlistener')
      );
      const hasPublish = methods.some(m => 
        m.name.toLowerCase().includes('publish') ||
        m.name.toLowerCase().includes('emit')
      );
      
      if (hasSubscribe && hasPublish) {
        const classComponent = components.find(c => c.id === classId);
        if (classComponent) {
          patterns.push({
            id: `pattern_observer_${randomUUID()}`,
            type: 'observer',
            confidence: 0.85,
            components: [classComponent, ...methods],
            relationships: [],
            metadata: {
              className: classComponent.name,
              subscribeMethods: methods.filter(m => 
                m.name.toLowerCase().includes('subscribe') ||
                m.name.toLowerCase().includes('addlistener')
              ).map(m => m.name),
              publishMethods: methods.filter(m => 
                m.name.toLowerCase().includes('publish') ||
                m.name.toLowerCase().includes('emit')
              ).map(m => m.name)
            }
          });
        }
      }
    });
    
    return patterns;
  }
  
  /**
   * Create system components from detected systems
   */
  private createSystemComponents(systems: DetectedSystem[]): IComponent[] {
    return systems.map(system => ({
      id: system.id,
      name: system.name,
      type: ComponentType.SYSTEM,
      language: 'architecture',
      filePath: system.boundaries[0] || 'virtual',
      location: {
        startLine: 0,
        endLine: 0,
        startColumn: 0,
        endColumn: 0
      },
      code: '',
      metadata: {
        description: system.description,
        componentCount: system.metadata.componentCount,
        cohesion: system.metadata.cohesion,
        coupling: system.metadata.coupling,
        boundaries: system.boundaries,
        entryPoints: system.entryPoints.map(e => e.id),
        indexId: `S${systems.indexOf(system) + 1}`
      }
    }));
  }
  
  /**
   * Create pipeline components from detected pipelines
   */
  private createPipelineComponents(pipelines: DetectedPipeline[]): IComponent[] {
    return pipelines.map(pipeline => ({
      id: pipeline.id,
      name: pipeline.name,
      type: ComponentType.PIPELINE,
      language: 'architecture',
      filePath: pipeline.entryPoint.filePath,
      location: pipeline.entryPoint.location,
      code: '',
      metadata: {
        description: pipeline.description,
        flowPath: pipeline.stages,
        entryPoint: pipeline.entryPoint.id,
        exitPoints: pipeline.exitPoints.map(e => e.id),
        stageCount: pipeline.stages.length,
        indexId: `PF${pipelines.indexOf(pipeline) + 1}`
      }
    }));
  }
  
  /**
   * Create pattern components from detected patterns
   */
  private createPatternComponents(patterns: DetectedPattern[]): IComponent[] {
    return patterns.map(pattern => ({
      id: pattern.id,
      name: `${pattern.type}_pattern`,
      type: ComponentType.PATTERN,
      language: 'architecture',
      filePath: pattern.components[0]?.filePath || 'virtual',
      location: pattern.components[0]?.location || {
        startLine: 0,
        endLine: 0,
        startColumn: 0,
        endColumn: 0
      },
      code: '',
      metadata: {
        patternType: pattern.type,
        confidence: pattern.confidence,
        componentIds: pattern.components.map(c => c.id),
        ...pattern.metadata
      }
    }));
  }
  
  /**
   * Create relationships between systems and their components
   */
  private createSystemRelationships(
    systemComponents: IComponent[],
    allComponents: IComponent[],
    detectedSystems: DetectedSystem[]
  ): IRelationship[] {
    const relationships: IRelationship[] = [];
    
    systemComponents.forEach((system, index) => {
      const detectedSystem = detectedSystems[index];
      
      // Create relationships for all components in the system
      [...detectedSystem?.coreComponents || [], ...detectedSystem?.relatedComponents || []].forEach(comp => {
        relationships.push({
          id: `${comp.id}_belongs_to_${system.id}`,
          type: RelationshipType.BELONGS_TO_SYSTEM,
          sourceId: comp.id,
          targetId: system.id,
          metadata: {
            role: detectedSystem?.coreComponents.includes(comp) ? 'core' : 'related'
          }
        });
      });
    });
    
    return relationships;
  }
  
  /**
   * Create relationships between pipelines and their stages
   */
  private createPipelineRelationships(
    pipelineComponents: IComponent[],
    allComponents: IComponent[],
    detectedPipelines: DetectedPipeline[]
  ): IRelationship[] {
    const relationships: IRelationship[] = [];
    
    pipelineComponents.forEach((pipeline, index) => {
      const detectedPipeline = detectedPipelines[index];
      
      detectedPipeline?.stages.forEach((stage, stageIndex) => {
        relationships.push({
          id: `${stage.componentId}_part_of_${pipeline.id}`,
          type: RelationshipType.PART_OF_PIPELINE,
          sourceId: stage.componentId,
          targetId: pipeline.id,
          metadata: {
            stageIndex,
            method: stage.method,
            lineRange: stage.lineRange
          }
        });
      });
    });
    
    return relationships;
  }
  
  /**
   * Create relationships between patterns and their components
   */
  private createPatternRelationships(
    patternComponents: IComponent[],
    allComponents: IComponent[],
    detectedPatterns: DetectedPattern[]
  ): IRelationship[] {
    const relationships: IRelationship[] = [];
    
    patternComponents.forEach((pattern, index) => {
      const detectedPattern = detectedPatterns[index];
      
      detectedPattern?.components.forEach(comp => {
        relationships.push({
          id: `${comp.id}_implements_${pattern.id}`,
          type: RelationshipType.IMPLEMENTS_PATTERN,
          sourceId: comp.id,
          targetId: pattern.id,
          metadata: {
            patternType: detectedPattern?.type,
            confidence: detectedPattern?.confidence
          }
        });
      });
    });
    
    return relationships;
  }
  
  // Helper methods
  
  private deriveSystemName(anchor: IComponent, coreComponents: IComponent[]): string {
    // Try to derive a meaningful name from the components
    const commonPrefix = this.findCommonPrefix(coreComponents.map(c => c.name));
    if (commonPrefix && commonPrefix.length > 3) {
      return `${commonPrefix}System`;
    }
    return `${anchor.name}System`;
  }
  
  private deriveSystemDescription(coreComponents: IComponent[]): string {
    const types = [...new Set(coreComponents.map(c => c.type))];
    return `System containing ${coreComponents.length} core components (${types.join(', ')})`;
  }
  
  private findCommonPrefix(names: string[]): string {
    if (names.length === 0) return '';
    if (names.length === 1) return names[0] || '';
    
    let prefix = '';
    const minLength = Math.min(...names.map(n => n.length));
    
    for (let i = 0; i < minLength; i++) {
      const char = names[0]?.[i];
      if (names.every(n => n[i] === char)) {
        prefix += char;
      } else {
        break;
      }
    }
    
    return prefix;
  }
  
  private calculateCohesion(components: IComponent[], relationships: IRelationship[]): number {
    // Calculate how interconnected the components are
    const componentIds = new Set(components.map(c => c.id));
    const internalRelationships = relationships.filter(r => 
      componentIds.has(r.sourceId) && componentIds.has(r.targetId)
    );
    
    const maxPossible = components.length * (components.length - 1);
    return maxPossible > 0 ? internalRelationships.length / maxPossible : 0;
  }
  
  private calculateCoupling(
    systemComponents: IComponent[], 
    relationships: IRelationship[],
    allComponents: IComponent[]
  ): number {
    // Calculate external dependencies
    const componentIds = new Set(systemComponents.map(c => c.id));
    const externalRelationships = relationships.filter(r => 
      (componentIds.has(r.sourceId) && !componentIds.has(r.targetId)) ||
      (!componentIds.has(r.sourceId) && componentIds.has(r.targetId))
    );
    
    return externalRelationships.length / relationships.length;
  }
  
  private findEntryPoints(components: IComponent[], relationships: IRelationship[]): IComponent[] {
    // Find methods/functions that are not called by other internal components
    const calledIds = new Set(
      relationships
        .filter(r => r.type === RelationshipType.CALLS)
        .map(r => r.targetId)
    );
    
    return components.filter(c => 
      (c.type === ComponentType.METHOD || c.type === ComponentType.FUNCTION) &&
      !calledIds.has(c.id)
    );
  }
  
  private buildCallGraph(
    components: IComponent[], 
    relationships: IRelationship[]
  ): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    relationships
      .filter(r => r.type === RelationshipType.CALLS)
      .forEach(r => {
        if (!graph.has(r.sourceId)) {
          graph.set(r.sourceId, []);
        }
        graph.get(r.sourceId)!.push(r.targetId);
      });
    
    return graph;
  }
  
  private traceExecutionPath(
    entry: IComponent,
    callGraph: Map<string, string[]>,
    components: IComponent[]
  ): Array<{componentId: string; method?: string; file: string; lineRange?: {start: number; end: number}}> {
    const path: Array<{componentId: string; method?: string; file: string; lineRange?: {start: number; end: number}}> = [];
    const visited = new Set<string>();
    const queue = [entry.id];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      
      visited.add(currentId);
      const component = components.find(c => c.id === currentId);
      
      if (component) {
        const pathStep: any = {
          componentId: currentId,
          file: component.filePath
        };
        
        if (component.type === ComponentType.METHOD) {
          pathStep.method = component.name;
        }
        
        if (component.location) {
          pathStep.lineRange = {
            start: component.location.startLine,
            end: component.location.endLine
          };
        }
        
        path.push(pathStep);
        
        // Add called components to queue
        const calls = callGraph.get(currentId) || [];
        calls.forEach(calledId => {
          if (!visited.has(calledId)) {
            queue.push(calledId);
          }
        });
      }
    }
    
    return path;
  }
  
  private derivePipelineName(entry: IComponent, flow: any[]): string {
    return `${entry.name}Pipeline`;
  }
  
  private derivePipelineDescription(flow: any[]): string {
    return `Execution flow with ${flow.length} stages`;
  }
  
  private findExitPoints(flow: any[], components: IComponent[]): IComponent[] {
    // Last stage components that don't call others
    const lastStages = flow.slice(-3); // Last few stages
    return lastStages
      .map(stage => components.find(c => c.id === stage.componentId))
      .filter((c): c is IComponent => c !== undefined);
  }
}