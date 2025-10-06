import { useCallback, useEffect, useRef } from 'react';
import type { Node, Edge, ReactFlowInstance, FitViewOptions } from 'reactflow';
import { useNodesState, useEdgesState, MarkerType } from 'reactflow';
import dagre from 'dagre';
import { formatTypeLabel, getRelationshipChipStyle } from '@/utils/relationship-format';
import { normalizeFilePath, getLanguageFromFile } from '../utils/contextDisplayUtils';

interface UseMindMapGraphParams {
  parsedContext: any;
  allComponents: any[];
  relationships: any[];
  displayMode: 'focus' | 'all';
  focusId?: string | null;
  containerId?: string;
  layoutDirection: 'LR' | 'TB';
  theme: any;
}

interface MindMapNodeData {
  label?: string;
  subtitle?: string;
  entityType?: string;
  entityId?: string;
  componentType?: string;
  filePath?: string;
  lineNumber?: number;
  skeleton?: string;
  codeSnippet?: string;
  source?: string;
  code?: string;
  language?: string;
  metadata?: Record<string, any>;
  content?: string;
  description?: string;
  guidance?: string;
}

type MindMapNode = Node<MindMapNodeData>;
type MindMapEdge = Edge;

interface UseMindMapGraphResult {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  onNodesChange: ReturnType<typeof useNodesState>[2];
  onEdgesChange: ReturnType<typeof useEdgesState>[2];
  handleInit: (instance: ReactFlowInstance) => void;
  applyLayout: (direction: 'LR' | 'TB') => void;
  fitView: (options?: FitViewOptions) => void;
  centerOnComponent: (componentId?: string | null) => void;
  getViewport: () => { x: number; y: number; zoom: number } | null;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
}

const getLayoutedElements = (nodes: MindMapNode[], edges: MindMapEdge[], direction: 'LR' | 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 250;
  const nodeHeight = 100;

  dagreGraph.setGraph({
    rankdir: direction,
    align: 'DR',
    nodesep: 100,
    ranksep: 150,
    marginx: 50,
    marginy: 50,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export function useMindMapGraph({
  parsedContext,
  allComponents,
  relationships,
  displayMode,
  focusId,
  containerId,
  layoutDirection,
  theme,
}: UseMindMapGraphParams): UseMindMapGraphResult {
  const [nodes, setNodes, onNodesChange] = useNodesState<MindMapNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const flowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const graphInitializedRef = useRef(false);

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    flowInstanceRef.current = instance;
  }, []);

  const fitView = useCallback((options?: FitViewOptions) => {
    flowInstanceRef.current?.fitView(options ?? { padding: 0.2 });
  }, []);

  const setViewport = useCallback((viewport: { x: number; y: number; zoom: number }) => {
    try {
      flowInstanceRef.current?.setViewport?.(viewport);
    } catch {}
  }, []);

  const getViewport = useCallback(() => {
    try {
      const obj = flowInstanceRef.current?.toObject?.();
      return obj?.viewport ?? null;
    } catch {
      return null;
    }
  }, []);

  const centerOnComponent = useCallback(
    (componentId?: string | null) => {
      if (!componentId) return;
      const targetNode = nodes.find(
        (node) => node?.data?.entityType === 'component' && String(node?.data?.entityId ?? '') === String(componentId)
      );
      if (!targetNode) return;
      try {
        flowInstanceRef.current?.setCenter?.(targetNode.position.x, targetNode.position.y, {
          zoom: 1.2,
          duration: 200,
        });
      } catch {
        flowInstanceRef.current?.fitView?.({ padding: 0.3 });
      }
    },
    [nodes]
  );

  const applyLayout = useCallback(
    (direction: 'LR' | 'TB') => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, direction);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setTimeout(() => flowInstanceRef.current?.fitView({ padding: 0.2 }), 50);
    },
    [nodes, edges, setNodes, setEdges]
  );

  useEffect(() => {
    const newNodes: MindMapNode[] = [];
    const newEdges: MindMapEdge[] = [];
    const nodeMap = new Map<string, string>();
    let nodeId = 0;
    let edgeId = 0;

    const fullComponents = Array.isArray(allComponents) ? allComponents : [];
    const fullRelationships = Array.isArray(relationships) ? relationships : [];
    const localFocusId = focusId || parsedContext?.component?.id || (fullComponents[0]?.id ?? null);

    let componentsInScope = fullComponents;
    let relationshipsInScope = fullRelationships;

    if (displayMode !== 'all' && localFocusId) {
      const visibleIds = new Set<string>();
      visibleIds.add(String(localFocusId));
      if (containerId) visibleIds.add(String(containerId));

      for (const relationship of fullRelationships) {
        const sourceId = String(relationship?.sourceId ?? '');
        const targetId = String(relationship?.targetId ?? '');
        if (sourceId === String(localFocusId)) visibleIds.add(targetId);
        if (targetId === String(localFocusId)) visibleIds.add(sourceId);
      }

      componentsInScope = fullComponents.filter((component: any) => visibleIds.has(String(component?.id ?? '')));
      relationshipsInScope = fullRelationships.filter(
        (relationship: any) =>
          visibleIds.has(String(relationship?.sourceId ?? '')) && visibleIds.has(String(relationship?.targetId ?? ''))
      );
    }

    const mainComponent =
      componentsInScope.find((component: any) => String(component?.id ?? '') === String(localFocusId)) ||
      parsedContext?.component ||
      componentsInScope[0] ||
      fullComponents[0];

    if (mainComponent) {
      const mainNodeId = `node-${nodeId++}`;
      const key = mainComponent.id || mainComponent.name || 'main';
      nodeMap.set(key, mainNodeId);

      newNodes.push({
        id: mainNodeId,
        type: 'mindMapNode',
        position: { x: 0, y: 0 },
        data: {
          label: mainComponent.name || 'Main Component',
          subtitle: normalizeFilePath(mainComponent.filePath)?.split('/').pop(),
          entityType: 'component',
          entityId: mainComponent.id,
          componentType: mainComponent.type,
          filePath: mainComponent.filePath,
          lineNumber: mainComponent.lineNumber,
          skeleton: mainComponent.metadata?.skeleton,
          codeSnippet: mainComponent.code || mainComponent.source,
          source: mainComponent.source,
          code: mainComponent.code,
          language: mainComponent.language || getLanguageFromFile(mainComponent.filePath),
          metadata: mainComponent.metadata,
        },
      });
    }

    if (componentsInScope && componentsInScope.length > 0) {
      const toAdd = componentsInScope.filter(
        (component: any) => !mainComponent || String(component?.id ?? '') !== String(mainComponent.id)
      );

      toAdd.forEach((component: any, index: number) => {
        const compNodeId = `node-${nodeId++}`;
        const compKey = component.id || component.name || `comp-${index}`;
        nodeMap.set(compKey, compNodeId);

        newNodes.push({
          id: compNodeId,
          type: 'mindMapNode',
          position: { x: 0, y: 0 },
          data: {
            label: component.name || component.id?.split('|').pop() || 'Component',
            subtitle: `${component.type} - ${normalizeFilePath(component.filePath)?.split('/').pop() || 'unknown'}`,
            entityType: 'component',
            entityId: component.id,
            componentType: component.type,
            filePath: component.filePath,
            lineNumber: component.location?.startLine,
            skeleton: component.metadata?.skeleton,
            codeSnippet: component.code || component.source,
            source: component.source,
            code: component.code,
            language: component.language || getLanguageFromFile(component.filePath),
            metadata: component.metadata,
          },
        });
      });
    }

    if (parsedContext?.documentation) {
      parsedContext.documentation.forEach((doc: any, index: number) => {
        const docNodeId = `node-${nodeId++}`;
        nodeMap.set(doc.id || doc.title || `doc-${index}`, docNodeId);

        newNodes.push({
          id: docNodeId,
          type: 'mindMapNode',
          position: { x: 0, y: 0 },
          data: {
            label: doc.title || 'Documentation',
            subtitle: doc.type || doc.path,
            entityType: 'documentation',
            content: doc.content,
            metadata: doc.metadata,
          },
        });

        if (mainComponent && nodeMap.has(mainComponent.id || mainComponent.name || 'main')) {
          newEdges.push({
            id: `edge-${edgeId++}`,
            source: nodeMap.get(mainComponent.id || mainComponent.name || 'main')!,
            target: docNodeId,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#facc15', strokeWidth: 1.5 },
            label: 'documents',
          });
        }
      });
    }

    if (parsedContext?.rules) {
      parsedContext.rules.forEach((rule: any, index: number) => {
        const ruleNodeId = `node-${nodeId++}`;
        nodeMap.set(rule.id || rule.name || `rule-${index}`, ruleNodeId);

        newNodes.push({
          id: ruleNodeId,
          type: 'mindMapNode',
          position: { x: 0, y: 0 },
          data: {
            label: rule.name || 'Rule',
            subtitle: rule.rule_type,
            entityType: 'rule',
            description: rule.description,
            guidance: rule.guidance_text,
            metadata: rule.metadata,
          },
        });

        if (mainComponent && nodeMap.has(mainComponent.id || mainComponent.name || 'main')) {
          newEdges.push({
            id: `edge-${edgeId++}`,
            source: nodeMap.get(mainComponent.id || mainComponent.name || 'main')!,
            target: ruleNodeId,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '5 5' },
            label: 'applies to',
          });
        }
      });
    }

    if (parsedContext?.notes) {
      parsedContext.notes.forEach((note: any, index: number) => {
        const noteNodeId = `node-${nodeId++}`;
        nodeMap.set(note.id || note.title || `note-${index}`, noteNodeId);

        newNodes.push({
          id: noteNodeId,
          type: 'mindMapNode',
          position: { x: 0, y: 0 },
          data: {
            label: note.title || 'Note',
            subtitle: note.note_type,
            entityType: 'note',
            content: note.content,
            metadata: note.metadata,
          },
        });
      });
    }

    if (relationshipsInScope && relationshipsInScope.length > 0) {
      relationshipsInScope.forEach((relationship: any) => {
        const sourceId = relationship.sourceId?.split('|').pop() || relationship.sourceId;
        const targetId = relationship.targetId?.split('|').pop() || relationship.targetId;

        const sourceNodeId = nodeMap.get(sourceId) || nodeMap.get(relationship.sourceId);
        const targetNodeId = nodeMap.get(targetId) || nodeMap.get(relationship.targetId);

        if (sourceNodeId && targetNodeId) {
          const chip = getRelationshipChipStyle(theme, relationship.type);
          const strokeColor = (chip.borderColor as string) || (chip.color as string) || '#6b7280';
          newEdges.push({
            id: `edge-${edgeId++}`,
            source: sourceNodeId,
            target: targetNodeId,
            type: 'smoothstep',
            animated: ['calls', 'uses', 'imports', 'exports'].includes(String(relationship.type).toLowerCase()),
            style: { stroke: strokeColor, strokeWidth: 2 },
            label: formatTypeLabel(relationship.type),
            labelStyle: { fontSize: 10, fontWeight: 500 },
            markerEnd: { type: MarkerType.ArrowClosed },
          });
        }
      });
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges, layoutDirection);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    if (!graphInitializedRef.current && flowInstanceRef.current) {
      setTimeout(() => {
        flowInstanceRef.current?.fitView({ padding: 0.2 });
        graphInitializedRef.current = true;
      }, 50);
    }
  }, [
    parsedContext,
    allComponents,
    relationships,
    displayMode,
    focusId,
    containerId,
    layoutDirection,
    setNodes,
    setEdges,
    theme,
  ]);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    handleInit,
    applyLayout,
    fitView,
    centerOnComponent,
    getViewport,
    setViewport,
  };
}
