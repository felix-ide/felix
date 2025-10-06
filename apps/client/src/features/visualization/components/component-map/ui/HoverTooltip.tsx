import type { ComponentEdge, ComponentNode } from '../types';
import { getNodeIcon } from '../helpers';

interface HoverTooltipProps {
  hoveredNode: ComponentNode | null;
  relationships: ComponentEdge[];
}

export function HoverTooltip({ hoveredNode, relationships }: HoverTooltipProps) {
  if (!hoveredNode) return null;

  const Icon = getNodeIcon(hoveredNode.type);
  const connectionCount = relationships.filter(
    (rel) => rel.source === hoveredNode.id || rel.target === hoveredNode.id
  ).length;

  return (
    <div
      className="absolute z-30 pointer-events-none"
      style={{ left: '50%', top: '20px', transform: 'translateX(-50%)' }}
    >
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="font-medium">{hoveredNode.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{hoveredNode.type}</span>
        </div>
        <div className="text-xs mt-1 text-muted-foreground">{connectionCount} connections</div>
      </div>
    </div>
  );
}
