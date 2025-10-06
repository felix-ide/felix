import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectStore } from '@client/features/projects/state/projectStore';
import { useVisualizationStore } from '@client/features/visualization/state/visualizationStore';
import { useTheme } from '@felix/theme-system';
import { useComponentMapSimulation } from './useComponentMapSimulation';
import { useComponentMapData } from './useComponentMapData';
import { useComponentMapPreferences } from './useComponentMapPreferences';
import { useComponentMapFiltering } from './useComponentMapFiltering';
import { useComponentMapInteractions } from './useComponentMapInteractions';
import { useComponentMapControls } from './useComponentMapControls';
import type {
  ComponentEdge,
  ComponentMapController,
  ComponentMapControllerActions,
  ComponentMapControllerState,
  ComponentNode,
  LayoutName,
} from '../types';

const RELATIONSHIP_TYPES = ['imports', 'extends', 'implements', 'calls', 'contains', 'uses', 'references'];
const NODE_TYPES = ['file', 'class', 'function', 'method', 'interface', 'module', 'variable', 'property'];

interface ControllerOptions {
  filterText?: string;
  focusedComponentId?: string;
}

export function useComponentMapController({ filterText: externalFilterText, focusedComponentId }: ControllerOptions): ComponentMapController {
  const rawProjectPath = useProjectStore((state) => state.path);
  const projectPath = rawProjectPath ?? null;
  const { getProjectSettings, updateComponentMapSettings } = useVisualizationStore();
  const { theme } = useTheme();

  useEffect(() => {
    (window as any).__currentTheme = theme;
  }, [theme]);

  const projectSettings = projectPath ? getProjectSettings(projectPath) : null;
  const rawComponentMapSettings = projectSettings?.componentMap;
  const componentMapSettings: {
    filterText: string;
    activeRelTypes: string[];
    activeNodeTypes: string[];
    layoutType: LayoutName;
  } | null = rawComponentMapSettings
    ? {
        filterText: rawComponentMapSettings.filterText ?? '',
        activeRelTypes: rawComponentMapSettings.activeRelTypes ?? [],
        activeNodeTypes: rawComponentMapSettings.activeNodeTypes ?? [],
        layoutType: rawComponentMapSettings.layoutType as LayoutName,
      }
    : null;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    nodes,
    relationships,
    isLoading,
    error,
    nodeDetails,
    loadRelationships,
    loadNodeDetails,
    resetData,
    setError,
  } = useComponentMapData();

  const {
    filterText,
    setFilterText,
    activeRelTypes,
    toggleRelTypeFilter,
    activeNodeTypes,
    toggleNodeTypeFilter,
    layoutType,
    setLayoutType,
    preferencesReady,
  } = useComponentMapPreferences({
    projectPath,
    componentMapSettings,
    externalFilterText,
    updateComponentMapSettings,
  });

  const [focusedNode, setFocusedNode] = useState<string | null>(focusedComponentId ?? null);
  const [, setNavigationHistory] = useState<string[]>([]);
  const [, setVisibleNodes] = useState<Set<string>>(new Set());

  const nodesRef = useRef<ComponentNode[]>(nodes);
  const relationshipsRef = useRef<ComponentEdge[]>(relationships);
  const focusCameraOnNodeRef = useRef<(nodeId: string) => void>(() => {});

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    relationshipsRef.current = relationships;
  }, [relationships]);

  const hasAppliedInitialLayout = useRef(false);
  const previousLayoutRef = useRef<LayoutName | null>(null);

  const {
    filteredNodes,
    filteredRelationships,
    architecturalStats,
  } = useComponentMapFiltering({
    nodes,
    relationships,
    activeNodeTypes,
    activeRelTypes,
    filterText,
    focusedNode,
  });

  useEffect(() => {
    if (focusedComponentId && focusedComponentId !== focusedNode) {
      setFocusedNode(focusedComponentId ?? null);
    }
  }, [focusedComponentId, focusedNode]);

  useEffect(() => {
    loadRelationships();

    const handleProjectRestored = () => {
      loadRelationships();
    };

    const handleProjectSwitched = () => {
      resetData();
      setSelectedNode(null);
      setHoveredNode(null);
      setFocusedNode(null);
      hasAppliedInitialLayout.current = false;
      previousLayoutRef.current = null;
      loadRelationships();
    };

    window.addEventListener('project-restored', handleProjectRestored);
    window.addEventListener('project-switched', handleProjectSwitched);

    return () => {
      window.removeEventListener('project-restored', handleProjectRestored);
      window.removeEventListener('project-switched', handleProjectSwitched);
    };
  }, [loadRelationships, resetData]);

  useEffect(() => {
    if (externalFilterText !== undefined) {
      setFilterText(externalFilterText);
    }
  }, [externalFilterText]);

  const focusOnNode = useCallback((nodeId: string) => {
    setFocusedNode(nodeId);
    setNavigationHistory((prev) => [...prev, nodeId]);

    const targetNode = nodesRef.current.find((node) => node.id === nodeId);
    if (!targetNode) return;

    const connectedNodes = new Set<string>([nodeId]);
    relationshipsRef.current.forEach((relationship) => {
      if (relationship.source === nodeId) connectedNodes.add(relationship.target);
      if (relationship.target === nodeId) connectedNodes.add(relationship.source);
    });
    setVisibleNodes(connectedNodes);

    focusCameraOnNodeRef.current(nodeId);
  }, []);

  const {
    selectedNode,
    hoveredNode,
    showDetailsPanel,
    detailsPanelDocked,
    setSelectedNode,
    setHoveredNode,
    setShowDetailsPanel,
    setDetailsPanelDocked,
    interactionCallbacks,
  } = useComponentMapInteractions({
    nodesRef,
    loadNodeDetails,
    focusOnNode,
  });

  const {
    nodeLabels,
    runLayout,
    focusCameraOnNode,
    handleZoomIn,
    handleZoomOut,
    handleResetView,
    isReady,
  } = useComponentMapSimulation({
    canvasRef,
    nodes,
    relationships,
    filteredNodes,
    filteredRelationships,
    selectedNode,
    hoveredNode,
    layoutType,
    onError: setError,
    interactionCallbacks,
  });

  useEffect(() => {
    if (!preferencesReady || !isReady || nodes.length === 0) {
      return;
    }

    if (previousLayoutRef.current === layoutType && hasAppliedInitialLayout.current) {
      return;
    }

    runLayout(layoutType);
    hasAppliedInitialLayout.current = true;
    previousLayoutRef.current = layoutType;
  }, [preferencesReady, isReady, nodes.length, layoutType, runLayout]);

  useEffect(() => {
    focusCameraOnNodeRef.current = focusCameraOnNode;
  }, [focusCameraOnNode]);

  const { applyLayout } = useComponentMapControls({
    layoutType,
    filterText,
    projectPath,
    updateComponentMapSettings,
    setLayoutType,
    setFilterText,
    runLayout,
    handleZoomIn,
    handleZoomOut,
    handleResetView,
    canvasRef,
  });

  const controllerState: ComponentMapControllerState = {
    canvasRef,
    nodes,
    relationships,
    filteredNodes,
    filteredRelationships,
    nodeLabels,
    isLoading,
    error,
    selectedNode,
    hoveredNode,
    nodeDetails,
    showDetailsPanel,
    detailsPanelDocked,
    focusedNode,
    layoutType,
    filterText,
    activeRelTypes,
    activeNodeTypes,
    architecturalStats,
  };

  const controllerActions: ComponentMapControllerActions = {
    setFilterText,
    toggleRelTypeFilter,
    toggleNodeTypeFilter,
    applyLayout,
    handleZoomIn,
    handleZoomOut,
    handleResetView,
    setShowDetailsPanel,
    setDetailsPanelDocked,
    loadNodeDetails,
    focusOnNode,
    setSelectedNode,
    setHoveredNode,
    setFocusedNode,
  };

  return {
    ...controllerState,
    ...controllerActions,
    relationshipTypes: RELATIONSHIP_TYPES,
    nodeTypes: NODE_TYPES,
    theme,
  };
}
