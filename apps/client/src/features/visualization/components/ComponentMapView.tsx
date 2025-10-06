import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useComponentMapController } from './component-map/hooks/useComponentMapController';
import type { ComponentMapViewProps } from './component-map/types';
import { FilterPanel } from './component-map/ui/FilterPanel';
import { NodeLabelsLayer } from './component-map/ui/NodeLabelsLayer';
import { HoverTooltip } from './component-map/ui/HoverTooltip';
import { ComponentDetailsPanel } from './component-map/ui/ComponentDetailsPanel';
import { LegendPanel } from './component-map/ui/LegendPanel';
import { StatsPanel } from './component-map/ui/StatsPanel';
import { FocusedNodeBadge } from './component-map/ui/FocusedNodeBadge';
export { ComponentMapViewControls } from './component-map/ComponentMapViewControls';

export function ComponentMapView({
  showFilters: externalShowFilters,
  showStats: externalShowStats,
  showLegend: externalShowLegend,
  filterText: externalFilterText,
  focusedComponentId,
}: ComponentMapViewProps = {}) {
  const controller = useComponentMapController({
    filterText: externalFilterText,
    focusedComponentId,
  });

  const {
    canvasRef,
    isLoading,
    error,
    nodes,
    relationships,
    filteredNodes,
    filteredRelationships,
    nodeLabels,
    hoveredNode,
    setHoveredNode,
    selectedNode,
    setSelectedNode,
    showDetailsPanel,
    setShowDetailsPanel,
    detailsPanelDocked,
    setDetailsPanelDocked,
    nodeDetails,
    loadNodeDetails,
    focusOnNode,
    focusedNode,
    setFocusedNode,
    activeRelTypes,
    toggleRelTypeFilter,
    relationshipTypes,
    activeNodeTypes,
    toggleNodeTypeFilter,
    nodeTypes,
    architecturalStats,
    theme,
  } = controller;

  const showFilters = externalShowFilters ?? false;
  const showStats = externalShowStats ?? false;
  const showLegend = externalShowLegend ?? false;

  const onRelationshipFocus = useMemo(
    () => () => {
      if (!selectedNode) return;
      setFocusedNode(selectedNode.id);
      focusOnNode(selectedNode.id);
    },
    [focusOnNode, selectedNode, setFocusedNode]
  );

  return (
    <div className="h-full relative">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full focus:outline-none"
        style={{ cursor: hoveredNode ? 'pointer' : 'grab' }}
        title="Click to focus for keyboard controls"
        onMouseLeave={() => setHoveredNode(null)}
      />

      {isLoading && (
        <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Loading components...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-16 left-4 right-4 p-3 bg-destructive/90 backdrop-blur-sm rounded-lg text-destructive-foreground text-sm z-40">
          {error}
        </div>
      )}

      <FocusedNodeBadge
        focusedNodeId={focusedNode}
        nodes={nodes}
        onClear={() => setFocusedNode(null)}
      />

      <FilterPanel
        visible={showFilters}
        relationshipTypes={relationshipTypes}
        activeRelTypes={activeRelTypes}
        onToggleRelationship={toggleRelTypeFilter}
        nodeTypes={nodeTypes}
        activeNodeTypes={activeNodeTypes}
        onToggleNodeType={toggleNodeTypeFilter}
      />

      <NodeLabelsLayer labels={nodeLabels} />

      {!showDetailsPanel && (
        <HoverTooltip hoveredNode={hoveredNode} relationships={relationships} />
      )}

      <ComponentDetailsPanel
        visible={showDetailsPanel && !!selectedNode}
        selectedNode={selectedNode}
        detailsPanelDocked={detailsPanelDocked}
        onDockToggle={() => setDetailsPanelDocked(!detailsPanelDocked)}
        onClose={() => setShowDetailsPanel(false)}
        onFocusRelationships={onRelationshipFocus}
        relationships={relationships}
        nodes={nodes}
        nodeDetails={nodeDetails}
        theme={theme}
        onSelectNode={(node) => setSelectedNode(node)}
        loadNodeDetails={loadNodeDetails}
        focusOnNode={focusOnNode}
      />

      <LegendPanel
        visible={showLegend}
        relationshipTypes={relationshipTypes}
        activeRelTypes={activeRelTypes}
        filteredRelationships={filteredRelationships}
        nodeTypes={nodeTypes}
        activeNodeTypes={activeNodeTypes}
        nodes={nodes}
        theme={theme}
      />

      <StatsPanel
        visible={showStats}
        nodes={nodes}
        filteredNodes={filteredNodes}
        relationships={relationships}
        filteredRelationships={filteredRelationships}
        architecturalStats={architecturalStats}
      />
    </div>
  );
}
