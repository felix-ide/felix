import { useMemo } from 'react';
import type { ComponentEdge, ComponentNode, RelationshipSummary } from '../types';

interface UseComponentMapFilteringParams {
  nodes: ComponentNode[];
  relationships: ComponentEdge[];
  activeNodeTypes: Set<string>;
  activeRelTypes: Set<string>;
  filterText: string;
  focusedNode: string | null;
}

interface UseComponentMapFilteringResult {
  filteredNodes: ComponentNode[];
  filteredRelationships: ComponentEdge[];
  architecturalStats: RelationshipSummary;
}

const matchFilter = (node: ComponentNode, filter: string) => {
  if (!filter) return true;
  const normalized = filter.toLowerCase();
  return (
    node.name.toLowerCase().includes(normalized) ||
    node.filePath?.toLowerCase().includes(normalized) ||
    node.type.toLowerCase().includes(normalized)
  );
};

export function useComponentMapFiltering({
  nodes,
  relationships,
  activeNodeTypes,
  activeRelTypes,
  filterText,
  focusedNode,
}: UseComponentMapFilteringParams): UseComponentMapFilteringResult {
  const filteredNodes = useMemo(() => {
    let baseNodes = nodes.filter((node) => activeNodeTypes.has(node.type) && matchFilter(node, filterText));

    if (focusedNode) {
      const connectedIds = new Set<string>([focusedNode]);

      relationships.forEach((relationship) => {
        if (relationship.source === focusedNode) connectedIds.add(relationship.target);
        if (relationship.target === focusedNode) connectedIds.add(relationship.source);
      });

      baseNodes = baseNodes.filter((node) => connectedIds.has(node.id));
    }

    return baseNodes;
  }, [nodes, activeNodeTypes, filterText, focusedNode, relationships]);

  const filteredRelationships = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((node) => node.id));
    return relationships.filter(
      (relationship) => activeRelTypes.has(relationship.type) && nodeIds.has(relationship.source) && nodeIds.has(relationship.target)
    );
  }, [relationships, filteredNodes, activeRelTypes]);

  const architecturalStats = useMemo<RelationshipSummary>(() => {
    const nodeConnections = nodes
      .map((node) => {
        const connections = relationships.filter((relationship) => relationship.source === node.id || relationship.target === node.id).length;
        return { node, connections };
      })
      .sort((a, b) => b.connections - a.connections);

    const topHubs = nodeConnections.slice(0, 3).filter((entry) => entry.connections > 5);
    const isolatedNodes = nodeConnections.filter((entry) => entry.connections === 0).length;

    const criticalRels = relationships.filter((relationship) => ['extends', 'implements'].includes(relationship.type)).length;
    const dependencyRels = relationships.filter((relationship) => relationship.type === 'imports').length;

    return {
      topHubs,
      isolatedNodes,
      criticalRels,
      dependencyRels,
    };
  }, [nodes, relationships]);

  return {
    filteredNodes,
    filteredRelationships,
    architecturalStats,
  };
}
