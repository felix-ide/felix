import { Network, X } from 'lucide-react';
import type { ComponentNode } from '../types';

interface FocusedNodeBadgeProps {
  focusedNodeId: string | null;
  nodes: ComponentNode[];
  onClear: () => void;
}

export function FocusedNodeBadge({ focusedNodeId, nodes, onClear }: FocusedNodeBadgeProps) {
  if (!focusedNodeId) return null;
  const focusedNode = nodes.find((n) => n.id === focusedNodeId);

  return (
    <div className="absolute top-16 left-4 p-3 bg-primary/90 backdrop-blur-sm rounded-lg text-primary-foreground text-sm z-40 flex items-center gap-2">
      <Network className="h-4 w-4" />
      <span>Focused on: {focusedNode?.name || focusedNodeId}</span>
      <button onClick={onClear} className="ml-2 p-1 hover:bg-card/20 rounded" title="Clear focus">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
