import type { IRelationship } from '@felix/code-intelligence';

import type { RelationshipQueryService } from './RelationshipQueryService.js';

const DEPENDENCY_TYPES = ['imports', 'uses', 'depends_on', 'requires'];

export class RelationshipGraphAnalyzer {
  constructor(private readonly query: RelationshipQueryService) {}

  async buildDependencyGraph(): Promise<Map<string, string[]>> {
    const relationships = await this.query.getAllRelationships();
    return this.toDependencyGraph(relationships);
  }

  async findCircularDependencies(): Promise<string[][]> {
    const graph = await this.buildDependencyGraph();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (node: string, path: string[]): void => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), node]);
        }
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, [...path]);
      }

      recursionStack.delete(node);
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }

  async getReverseDependencies(componentId: string): Promise<string[]> {
    const incoming = await this.query.getIncomingRelationships(componentId);
    return incoming
      .filter(rel => DEPENDENCY_TYPES.includes(rel.type as string))
      .map(rel => rel.sourceId);
  }

  async getForwardDependencies(componentId: string): Promise<string[]> {
    const outgoing = await this.query.getOutgoingRelationships(componentId);
    return outgoing
      .filter(rel => DEPENDENCY_TYPES.includes(rel.type as string))
      .map(rel => rel.targetId);
  }

  private toDependencyGraph(relationships: IRelationship[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const relationship of relationships) {
      if (!DEPENDENCY_TYPES.includes(relationship.type as string)) {
        continue;
      }

      if (!graph.has(relationship.sourceId)) {
        graph.set(relationship.sourceId, []);
      }

      graph.get(relationship.sourceId)!.push(relationship.targetId);
    }

    return graph;
  }
}
