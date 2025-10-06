import { Repository } from 'typeorm';
import { Relationship } from '../entities/index/Relationship.entity.js';
import { logger } from '../../../shared/logger.js';

export interface RelationshipQueryOptions {
  /**
   * Maximum depth to traverse relationships
   */
  depth?: number;

  /**
   * Filter by relationship types
   */
  relationshipTypes?: string[];

  /**
   * Direction to query: 'in' (incoming), 'out' (outgoing), 'both'
   */
  direction?: 'in' | 'out' | 'both';

  /**
   * Include inverse relationships
   */
  includeInverse?: boolean;

  /**
   * Maximum number of relationships to return
   */
  limit?: number;
}

export interface RelationshipChainNode {
  relationship: Relationship;
  depth: number;
  path: string[];
}

export interface RelationshipGraphResult {
  nodes: Map<string, any>;
  edges: Relationship[];
  depth: number;
  cyclesDetected: string[][];
}

/**
 * Advanced relationship querying with depth traversal, type filtering, and cycle detection
 */
export class RelationshipQuery {
  constructor(private readonly repository: Repository<Relationship>) {}

  /**
   * Get all relationships for a component with filtering and depth control
   */
  async getRelationshipsByComponent(
    componentId: string,
    options: RelationshipQueryOptions = {}
  ): Promise<Relationship[]> {
    const {
      relationshipTypes,
      direction = 'both',
      limit
    } = options;

    let query = this.repository.createQueryBuilder('rel');

    // Apply direction filter
    if (direction === 'in') {
      query = query.where('rel.target_id = :componentId', { componentId });
    } else if (direction === 'out') {
      query = query.where('rel.source_id = :componentId', { componentId });
    } else {
      query = query.where('rel.source_id = :componentId OR rel.target_id = :componentId', { componentId });
    }

    // Apply relationship type filter
    if (relationshipTypes && relationshipTypes.length > 0) {
      query = query.andWhere('rel.type IN (:...types)', { types: relationshipTypes });
    }

    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }

    return await query.getMany();
  }

  /**
   * Traverse relationships to build a chain with depth control
   */
  async getRelationshipChain(
    startComponentId: string,
    options: RelationshipQueryOptions = {}
  ): Promise<RelationshipChainNode[]> {
    const {
      depth = 2,
      relationshipTypes,
      direction = 'out'
    } = options;

    const visited = new Set<string>();
    const chain: RelationshipChainNode[] = [];
    const queue: Array<{ id: string; currentDepth: number; path: string[] }> = [
      { id: startComponentId, currentDepth: 0, path: [startComponentId] }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.currentDepth >= depth) continue;
      if (visited.has(current.id)) continue;

      visited.add(current.id);

      // Get relationships for current component
      const relationships = await this.getRelationshipsByComponent(current.id, {
        relationshipTypes,
        direction
      });

      for (const rel of relationships) {
        const nextId = direction === 'in'
          ? rel.source_id
          : direction === 'out'
          ? rel.target_id
          : rel.source_id === current.id ? rel.target_id : rel.source_id;

        const newPath = [...current.path, nextId];

        chain.push({
          relationship: rel,
          depth: current.currentDepth + 1,
          path: newPath
        });

        // Add to queue for further traversal
        if (current.currentDepth + 1 < depth && !visited.has(nextId)) {
          queue.push({
            id: nextId,
            currentDepth: current.currentDepth + 1,
            path: newPath
          });
        }
      }
    }

    return chain;
  }

  /**
   * Build a complete relationship graph with cycle detection
   */
  async getRelationshipGraph(
    startComponentId: string,
    options: RelationshipQueryOptions = {}
  ): Promise<RelationshipGraphResult> {
    const {
      depth = 3,
      relationshipTypes,
      direction = 'both'
    } = options;

    const nodes = new Map<string, any>();
    const edges: Relationship[] = [];
    const visited = new Set<string>();
    const cyclesDetected: string[][] = [];
    const queue: Array<{ id: string; currentDepth: number; path: Set<string> }> = [
      { id: startComponentId, currentDepth: 0, path: new Set([startComponentId]) }
    ];

    nodes.set(startComponentId, { id: startComponentId, depth: 0 });

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.currentDepth >= depth) continue;

      const visitKey = `${current.id}-${current.currentDepth}`;
      if (visited.has(visitKey)) continue;
      visited.add(visitKey);

      // Get relationships
      const relationships = await this.getRelationshipsByComponent(current.id, {
        relationshipTypes,
        direction
      });

      for (const rel of relationships) {
        const nextId = direction === 'in'
          ? rel.source_id
          : direction === 'out'
          ? rel.target_id
          : rel.source_id === current.id ? rel.target_id : rel.source_id;

        // Check for cycles
        if (current.path.has(nextId)) {
          cyclesDetected.push([...current.path, nextId]);
          continue;
        }

        // Add edge
        const edgeExists = edges.some(e =>
          e.id === rel.id ||
          (e.source_id === rel.source_id && e.target_id === rel.target_id && e.type === rel.type)
        );
        if (!edgeExists) {
          edges.push(rel);
        }

        // Add node
        if (!nodes.has(nextId)) {
          nodes.set(nextId, { id: nextId, depth: current.currentDepth + 1 });

          // Add to queue
          const newPath = new Set(current.path);
          newPath.add(nextId);
          queue.push({
            id: nextId,
            currentDepth: current.currentDepth + 1,
            path: newPath
          });
        }
      }
    }

    return {
      nodes,
      edges,
      depth,
      cyclesDetected
    };
  }

  /**
   * Find all callers of a component (incoming CALLS/CALLED_BY relationships)
   */
  async getCallers(componentId: string, depth: number = 1): Promise<Relationship[]> {
    return this.getRelationshipsByComponent(componentId, {
      depth,
      relationshipTypes: ['calls', 'called_by'],
      direction: 'in'
    });
  }

  /**
   * Find all callees of a component (outgoing CALLS relationships)
   */
  async getCallees(componentId: string, depth: number = 1): Promise<Relationship[]> {
    return this.getRelationshipsByComponent(componentId, {
      depth,
      relationshipTypes: ['calls'],
      direction: 'out'
    });
  }

  /**
   * Get inheritance hierarchy (EXTENDS/EXTENDED_BY)
   */
  async getInheritanceChain(componentId: string): Promise<RelationshipChainNode[]> {
    return this.getRelationshipChain(componentId, {
      depth: 10, // Deep traversal for inheritance
      relationshipTypes: ['extends', 'extended_by', 'implements', 'implemented_by'],
      direction: 'both'
    });
  }

  /**
   * Get data flow relationships (semantic analysis)
   */
  async getDataFlow(componentId: string, depth: number = 2): Promise<Relationship[]> {
    return this.getRelationshipsByComponent(componentId, {
      depth,
      relationshipTypes: [
        'uses_field',
        'transforms_data',
        'passes_to',
        'returns_from',
        'reads_from',
        'writes_to',
        'derives_from',
        'modifies'
      ],
      direction: 'both'
    });
  }

  /**
   * Find components that import/depend on this component
   */
  async getDependents(componentId: string): Promise<Relationship[]> {
    return this.getRelationshipsByComponent(componentId, {
      relationshipTypes: ['imports', 'imported_by', 'depends_on'],
      direction: 'in'
    });
  }

  /**
   * Find components that this component imports/depends on
   */
  async getDependencies(componentId: string): Promise<Relationship[]> {
    return this.getRelationshipsByComponent(componentId, {
      relationshipTypes: ['imports', 'depends_on'],
      direction: 'out'
    });
  }
}
