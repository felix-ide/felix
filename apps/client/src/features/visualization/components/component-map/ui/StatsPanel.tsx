import { Info } from 'lucide-react';
import type { ComponentEdge, ComponentNode, RelationshipSummary } from '../types';

interface StatsPanelProps {
  visible: boolean;
  nodes: ComponentNode[];
  filteredNodes: ComponentNode[];
  relationships: ComponentEdge[];
  filteredRelationships: ComponentEdge[];
  architecturalStats: RelationshipSummary;
}

export function StatsPanel({
  visible,
  nodes,
  filteredNodes,
  relationships,
  filteredRelationships,
  architecturalStats,
}: StatsPanelProps) {
  if (!visible) return null;

  return (
    <div className="absolute top-20 left-4 p-3 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg z-20">
      <h4 className="text-xs font-semibold mb-2 flex items-center gap-2 uppercase tracking-wide">
        <Info className="h-3 w-3" />
        Statistics
      </h4>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Total Nodes:</span>
          <span>{nodes.length}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Visible Nodes:</span>
          <span>{filteredNodes.length}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Total Relationships:</span>
          <span>{relationships.length}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Visible Relationships:</span>
          <span>{filteredRelationships.length}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <h5 className="text-xs font-semibold mb-2 text-muted-foreground">Architectural Analysis</h5>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Hub Nodes:</span>
            <span>{architecturalStats.topHubs.length}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Isolated Nodes:</span>
            <span>{architecturalStats.isolatedNodes}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Critical Relations:</span>
            <span>{architecturalStats.criticalRels}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Dependencies:</span>
            <span>{architecturalStats.dependencyRels}</span>
          </div>
          {architecturalStats.topHubs.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="text-muted-foreground text-xs mb-1">Top Hubs:</div>
              {architecturalStats.topHubs.map(({ node, connections }) => (
                <div key={node.id} className="flex justify-between gap-2 text-xs">
                  <span className="text-muted-foreground truncate" title={node.name}>
                    {node.name.length > 12 ? `${node.name.substring(0, 9)}...` : node.name}
                  </span>
                  <span className="text-muted-foreground">({connections})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
