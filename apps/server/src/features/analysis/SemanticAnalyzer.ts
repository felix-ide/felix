/**
 * SemanticAnalyzer - Detect higher-level semantic patterns
 * Identifies design patterns like Factory, Observer, Singleton, etc.
 */

import { logger } from '../../shared/logger.js';

interface Component {
  id: string;
  name: string;
  type: string;
  metadata?: Record<string, any>;
  code?: string;
}

interface Relationship {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  metadata?: Record<string, any>;
}

interface PatternMatch {
  pattern: string;
  confidence: number;
  components: string[];
  description: string;
  evidence: string[];
}

/**
 * Semantic pattern analyzer
 */
export class SemanticAnalyzer {
  /**
   * Analyze components for design patterns
   */
  analyzePatterns(
    components: Component[],
    relationships: Relationship[]
  ): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    patterns.push(...this.detectFactoryPattern(components, relationships));
    patterns.push(...this.detectSingletonPattern(components));
    patterns.push(...this.detectObserverPattern(components, relationships));
    patterns.push(...this.detectBuilderPattern(components, relationships));
    patterns.push(...this.detectStrategyPattern(components, relationships));
    patterns.push(...this.detectDecoratorPattern(components, relationships));

    return patterns.filter(p => p.confidence > 0.5);
  }

  /**
   * Detect Factory pattern
   */
  private detectFactoryPattern(
    components: Component[],
    relationships: Relationship[]
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const component of components) {
      const evidence: string[] = [];
      let confidence = 0;

      // Check name patterns
      if (
        component.name.toLowerCase().includes('factory') ||
        component.name.toLowerCase().includes('creator')
      ) {
        evidence.push(`Name contains 'factory' or 'creator'`);
        confidence += 0.4;
      }

      // Check if it has methods that create objects
      const createsRelationships = relationships.filter(
        (r) => r.sourceId === component.id && r.type === 'creates'
      );

      if (createsRelationships.length > 0) {
        evidence.push(`Creates ${createsRelationships.length} objects`);
        confidence += 0.4;
      }

      // Check for static factory methods
      if (
        component.metadata?.methods?.some(
          (m: any) =>
            m.isStatic &&
            (m.name.includes('create') || m.name.includes('make') || m.name.includes('build'))
        )
      ) {
        evidence.push('Has static factory methods');
        confidence += 0.3;
      }

      if (confidence > 0.5) {
        matches.push({
          pattern: 'Factory',
          confidence,
          components: [component.id],
          description: 'Creates objects without specifying exact class',
          evidence,
        });
      }
    }

    return matches;
  }

  /**
   * Detect Singleton pattern
   */
  private detectSingletonPattern(components: Component[]): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const component of components) {
      const evidence: string[] = [];
      let confidence = 0;

      // Check for getInstance method
      if (
        component.metadata?.methods?.some(
          (m: any) => m.name === 'getInstance' && m.isStatic
        )
      ) {
        evidence.push('Has static getInstance() method');
        confidence += 0.6;
      }

      // Check name
      if (component.name.toLowerCase().includes('singleton')) {
        evidence.push(`Name contains 'singleton'`);
        confidence += 0.3;
      }

      // Check for private constructor
      if (component.type === 'class' && component.code) {
        if (
          component.code.includes('private constructor') ||
          component.code.includes('private static instance')
        ) {
          evidence.push('Has private constructor or static instance');
          confidence += 0.4;
        }
      }

      if (confidence > 0.5) {
        matches.push({
          pattern: 'Singleton',
          confidence,
          components: [component.id],
          description: 'Ensures only one instance exists',
          evidence,
        });
      }
    }

    return matches;
  }

  /**
   * Detect Observer pattern
   */
  private detectObserverPattern(
    components: Component[],
    relationships: Relationship[]
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const component of components) {
      const evidence: string[] = [];
      let confidence = 0;

      // Check for observer relationships
      const observesRels = relationships.filter(
        (r) =>
          (r.sourceId === component.id || r.targetId === component.id) &&
          (r.type === 'observes' || r.type === 'subscribes_to' || r.type === 'listens_to')
      );

      if (observesRels.length > 0) {
        evidence.push(`Has ${observesRels.length} observer relationships`);
        confidence += 0.5;
      }

      // Check for subscribe/unsubscribe methods
      if (
        component.metadata?.methods?.some((m: any) =>
          ['subscribe', 'unsubscribe', 'addListener', 'removeListener', 'on', 'off'].includes(
            m.name.toLowerCase()
          )
        )
      ) {
        evidence.push('Has subscribe/unsubscribe methods');
        confidence += 0.4;
      }

      // Check for notify/update methods
      if (
        component.metadata?.methods?.some((m: any) =>
          ['notify', 'notifyAll', 'update', 'emit'].includes(m.name.toLowerCase())
        )
      ) {
        evidence.push('Has notify/update methods');
        confidence += 0.3;
      }

      if (confidence > 0.5) {
        matches.push({
          pattern: 'Observer',
          confidence,
          components: [component.id],
          description: 'Notifies subscribers of state changes',
          evidence,
        });
      }
    }

    return matches;
  }

  /**
   * Detect Builder pattern
   */
  private detectBuilderPattern(
    components: Component[],
    relationships: Relationship[]
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const component of components) {
      const evidence: string[] = [];
      let confidence = 0;

      // Check name
      if (component.name.toLowerCase().includes('builder')) {
        evidence.push(`Name contains 'builder'`);
        confidence += 0.4;
      }

      // Check for chaining methods (return this)
      if (component.code && component.code.includes('return this')) {
        evidence.push('Has method chaining (return this)');
        confidence += 0.3;
      }

      // Check for build() method
      if (component.metadata?.methods?.some((m: any) => m.name === 'build')) {
        evidence.push('Has build() method');
        confidence += 0.4;
      }

      // Check for with* or set* methods
      const builderMethods = component.metadata?.methods?.filter((m: any) =>
        m.name.startsWith('with') || m.name.startsWith('set')
      );
      if (builderMethods && builderMethods.length > 2) {
        evidence.push(`Has ${builderMethods.length} with*/set* methods`);
        confidence += 0.3;
      }

      if (confidence > 0.5) {
        matches.push({
          pattern: 'Builder',
          confidence,
          components: [component.id],
          description: 'Constructs complex objects step by step',
          evidence,
        });
      }
    }

    return matches;
  }

  /**
   * Detect Strategy pattern
   */
  private detectStrategyPattern(
    components: Component[],
    relationships: Relationship[]
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];

    // Look for interfaces/abstract classes with multiple implementations
    for (const component of components) {
      if (component.type !== 'interface' && component.type !== 'abstract_class') continue;

      const implementations = relationships.filter(
        (r) =>
          r.targetId === component.id &&
          (r.type === 'implements' || r.type === 'extends')
      );

      if (implementations.length > 1) {
        const evidence = [
          `${implementations.length} implementations of ${component.name}`,
          'Multiple interchangeable algorithms',
        ];

        matches.push({
          pattern: 'Strategy',
          confidence: 0.6 + Math.min(implementations.length * 0.1, 0.3),
          components: [component.id, ...implementations.map((r) => r.sourceId)],
          description: 'Defines family of algorithms',
          evidence,
        });
      }
    }

    return matches;
  }

  /**
   * Detect Decorator pattern
   */
  private detectDecoratorPattern(
    components: Component[],
    relationships: Relationship[]
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const component of components) {
      const evidence: string[] = [];
      let confidence = 0;

      // Check name
      if (component.name.toLowerCase().includes('decorator')) {
        evidence.push(`Name contains 'decorator'`);
        confidence += 0.4;
      }

      // Check for wraps/decorates relationships
      const wrapsRels = relationships.filter(
        (r) =>
          r.sourceId === component.id &&
          (r.type === 'wraps' || r.type === 'decorates')
      );

      if (wrapsRels.length > 0) {
        evidence.push('Wraps other components');
        confidence += 0.5;
      }

      // Check if implements same interface as wrapped object
      const implementsRels = relationships.filter(
        (r) => r.sourceId === component.id && r.type === 'implements'
      );

      if (implementsRels.length > 0 && wrapsRels.length > 0) {
        evidence.push('Implements same interface as wrapped object');
        confidence += 0.3;
      }

      if (confidence > 0.5) {
        matches.push({
          pattern: 'Decorator',
          confidence,
          components: [component.id],
          description: 'Adds responsibilities to objects dynamically',
          evidence,
        });
      }
    }

    return matches;
  }

  /**
   * Analyze data flow complexity
   */
  analyzeDataFlowComplexity(relationships: Relationship[]): {
    cycleCount: number;
    maxDepth: number;
    branchingFactor: number;
  } {
    // Count cycles
    const cycles = this.findCycles(relationships);

    // Calculate max depth
    const depths = this.calculateDepths(relationships);
    const maxDepth = Math.max(...Array.from(depths.values()), 0);

    // Calculate average branching factor
    const outgoing = new Map<string, number>();
    for (const rel of relationships) {
      outgoing.set(rel.sourceId, (outgoing.get(rel.sourceId) || 0) + 1);
    }
    const branchingFactor =
      outgoing.size > 0
        ? Array.from(outgoing.values()).reduce((a, b) => a + b, 0) / outgoing.size
        : 0;

    return {
      cycleCount: cycles.length,
      maxDepth,
      branchingFactor,
    };
  }

  /**
   * Find cycles in relationship graph
   */
  private findCycles(relationships: Relationship[]): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack: string[] = [];

    const graph = new Map<string, string[]>();
    for (const rel of relationships) {
      if (!graph.has(rel.sourceId)) graph.set(rel.sourceId, []);
      graph.get(rel.sourceId)!.push(rel.targetId);
    }

    const dfs = (node: string) => {
      if (stack.includes(node)) {
        const cycleStart = stack.indexOf(node);
        cycles.push(stack.slice(cycleStart).concat(node));
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      stack.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor);
      }

      stack.pop();
    };

    for (const node of graph.keys()) {
      dfs(node);
    }

    return cycles;
  }

  /**
   * Calculate depths from root nodes
   */
  private calculateDepths(relationships: Relationship[]): Map<string, number> {
    const depths = new Map<string, number>();
    const hasIncoming = new Set<string>();

    for (const rel of relationships) {
      hasIncoming.add(rel.targetId);
    }

    // Find roots (nodes with no incoming edges)
    const roots: string[] = [];
    const allNodes = new Set<string>();
    for (const rel of relationships) {
      allNodes.add(rel.sourceId);
      allNodes.add(rel.targetId);
    }
    for (const node of allNodes) {
      if (!hasIncoming.has(node)) {
        roots.push(node);
        depths.set(node, 0);
      }
    }

    // BFS to calculate depths
    const queue = [...roots];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDepth = depths.get(current) || 0;

      for (const rel of relationships) {
        if (rel.sourceId === current) {
          const newDepth = currentDepth + 1;
          const existingDepth = depths.get(rel.targetId);
          if (existingDepth === undefined || newDepth > existingDepth) {
            depths.set(rel.targetId, newDepth);
            queue.push(rel.targetId);
          }
        }
      }
    }

    return depths;
  }
}
