import { useMemo, useState } from 'react';
import type { ComponentNode } from '../types';

interface UseComponentMapInteractionsParams {
  nodesRef: React.MutableRefObject<ComponentNode[]>;
  loadNodeDetails: (node: ComponentNode) => Promise<void>;
  focusOnNode: (nodeId: string) => void;
}

interface NodeInteractionCallbacks {
  onNodeHover: (nodeId: string | null) => void;
  onNodeClick: (nodeId: string) => void;
  onNodeDoubleClick: (nodeId: string) => void;
}

interface UseComponentMapInteractionsResult {
  selectedNode: ComponentNode | null;
  hoveredNode: ComponentNode | null;
  showDetailsPanel: boolean;
  detailsPanelDocked: boolean;
  setSelectedNode: (node: ComponentNode | null) => void;
  setHoveredNode: (node: ComponentNode | null) => void;
  setShowDetailsPanel: (value: boolean) => void;
  setDetailsPanelDocked: (value: boolean) => void;
  interactionCallbacks: NodeInteractionCallbacks;
}

export function useComponentMapInteractions({
  nodesRef,
  loadNodeDetails,
  focusOnNode,
}: UseComponentMapInteractionsParams): UseComponentMapInteractionsResult {
  const [selectedNode, setSelectedNode] = useState<ComponentNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ComponentNode | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [detailsPanelDocked, setDetailsPanelDocked] = useState(true);

  const interactionCallbacks = useMemo<NodeInteractionCallbacks>(() => ({
    onNodeHover: (nodeId) => {
      if (!nodeId) {
        setHoveredNode(null);
        return;
      }
      const node = nodesRef.current.find((item) => item.id === nodeId) || null;
      setHoveredNode(node);
    },
    onNodeClick: (nodeId) => {
      const node = nodesRef.current.find((item) => item.id === nodeId);
      if (!node) return;
      setSelectedNode(node);
      setShowDetailsPanel(true);
      void loadNodeDetails(node);
    },
    onNodeDoubleClick: (nodeId) => {
      focusOnNode(nodeId);
    },
  }), [focusOnNode, loadNodeDetails, nodesRef]);

  return {
    selectedNode,
    hoveredNode,
    showDetailsPanel,
    detailsPanelDocked,
    setSelectedNode,
    setHoveredNode,
    setShowDetailsPanel,
    setDetailsPanelDocked,
    interactionCallbacks,
  };
}
