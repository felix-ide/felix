import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { WebGLRenderer } from '@/utils/webgl/WebGLRenderer';
import { ForceSimulation } from '@/utils/layout/ForceSimulation';
import { SpringForce } from '@/utils/layout/SpringForce';
import { RepulsiveForce } from '@/utils/layout/RepulsiveForce';
import { CenterForce } from '@/utils/layout/CenterForce';
import { Camera } from '@/utils/webgl/Camera';
import { InteractionHandler } from '@/utils/webgl/InteractionHandler';
import type {
  ComponentEdge,
  ComponentNode,
  LayoutName,
  NodeLabel,
} from '../types';

interface SimulationCallbacks {
  onNodeHover: (nodeId: string | null) => void;
  onNodeClick: (nodeId: string) => void;
  onNodeDoubleClick: (nodeId: string) => void;
}

interface SimulationOptions {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  nodes: ComponentNode[];
  relationships: ComponentEdge[];
  filteredNodes: ComponentNode[];
  filteredRelationships: ComponentEdge[];
  selectedNode: ComponentNode | null;
  hoveredNode: ComponentNode | null;
  layoutType: LayoutName;
  onError: (message: string) => void;
  interactionCallbacks: SimulationCallbacks;
}

interface SimulationApi {
  nodeLabels: NodeLabel[];
  runLayout: (type: LayoutName) => void;
  focusCameraOnNode: (nodeId: string) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetView: () => void;
  isReady: boolean;
}

const INITIAL_CAMERA_POSITION: [number, number, number] = [800, 600, 800];

export function useComponentMapSimulation({
  canvasRef,
  nodes,
  relationships,
  filteredNodes,
  filteredRelationships,
  selectedNode,
  hoveredNode,
  layoutType,
  onError,
  interactionCallbacks,
}: SimulationOptions): SimulationApi {
  const webglRef = useRef<WebGLRenderer | null>(null);
  const simulationRef = useRef<ForceSimulation | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const interactionRef = useRef<InteractionHandler | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const renderFunctionRef = useRef<(() => void) | null>(null);
  const renderDataRef = useRef<{ lastUpdateTime: number; graphNodes: any[]; graphEdges: any[] }>(
    { lastUpdateTime: 0, graphNodes: [], graphEdges: [] }
  );
  const isMountedRef = useRef(true);

  const nodesRef = useRef<ComponentNode[]>(nodes);
  const relationshipsRef = useRef<ComponentEdge[]>(relationships);
  const filteredNodesRef = useRef<ComponentNode[]>(filteredNodes);
  const filteredRelationshipsRef = useRef<ComponentEdge[]>(filteredRelationships);
  const hoveredNodeRef = useRef<ComponentNode | null>(hoveredNode);
  const selectedNodeRef = useRef<ComponentNode | null>(selectedNode);
  const interactionCallbacksRef = useRef<SimulationCallbacks>(interactionCallbacks);
  const onErrorRef = useRef(onError);

  const [nodeLabels, setNodeLabels] = useState<NodeLabel[]>([]);
  const [simulationPaused, setSimulationPaused] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const layoutTypeRef = useRef(layoutType);

  useEffect(() => {
    layoutTypeRef.current = layoutType;
  }, [layoutType]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    relationshipsRef.current = relationships;
  }, [relationships]);

  useEffect(() => {
    filteredNodesRef.current = filteredNodes;
  }, [filteredNodes]);

  useEffect(() => {
    filteredRelationshipsRef.current = filteredRelationships;
  }, [filteredRelationships]);

  useEffect(() => {
    hoveredNodeRef.current = hoveredNode;
    if (renderFunctionRef.current && isMountedRef.current) {
      renderFunctionRef.current();
    }
  }, [hoveredNode]);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
    if (renderFunctionRef.current && isMountedRef.current) {
      renderFunctionRef.current();
    }
  }, [selectedNode]);

  useEffect(() => {
    interactionCallbacksRef.current = interactionCallbacks;
  }, [interactionCallbacks]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const scheduleRender = useCallback(() => {
    if (renderFunctionRef.current && isMountedRef.current) {
      renderFunctionRef.current();
    }
  }, []);

  const handleResetView = useCallback(() => {
    if (!cameraRef.current) return;

    cameraRef.current.position[0] = INITIAL_CAMERA_POSITION[0];
    cameraRef.current.position[1] = INITIAL_CAMERA_POSITION[1];
    cameraRef.current.position[2] = INITIAL_CAMERA_POSITION[2];
    cameraRef.current.target = [0, 0, 0];
    cameraRef.current.zoom = 1.0;
    (cameraRef.current as any).updateMatrices();
    scheduleRender();
  }, [scheduleRender]);

  const handleZoomIn = useCallback(() => {
    if (!cameraRef.current) return;
    cameraRef.current.zoomBy(1.2);
    scheduleRender();
  }, [scheduleRender]);

  const handleZoomOut = useCallback(() => {
    if (!cameraRef.current) return;
    cameraRef.current.zoomBy(0.8);
    scheduleRender();
  }, [scheduleRender]);

  const focusCameraOnNode = useCallback(
    (nodeId: string) => {
      if (!cameraRef.current) return;

      const targetNode = nodesRef.current.find((n) => n.id === nodeId);
      if (!targetNode) return;

      const simNode = simulationRef.current?.getNode(nodeId) as any;
      const pos: [number, number, number] =
        simNode?.position || [targetNode.x || 0, targetNode.y || 0, targetNode.z || 0];

      cameraRef.current.target = [...pos];
      const distance = 300;
      cameraRef.current.position = [
        pos[0] + distance,
        pos[1] + distance * 0.7,
        pos[2] + distance,
      ];
      (cameraRef.current as any).updateMatrices();
      scheduleRender();
    },
    [scheduleRender]
  );

  const runLayout = useCallback(
    (type: LayoutName) => {
      if (!simulationRef.current) {
        return;
      }

      const nodeArray = nodesRef.current;

      switch (type) {
        case 'hierarchical': {
          const depthGroups = new Map<number, ComponentNode[]>();

          nodeArray.forEach((node) => {
            const depth = node.filePath ? node.filePath.split('/').length : 0;
            if (!depthGroups.has(depth)) {
              depthGroups.set(depth, []);
            }
            depthGroups.get(depth)!.push(node);
          });

          let y = -600;
          depthGroups.forEach((nodesAtDepth, depth) => {
            const levelWidth = Math.max(50, 800 - depth * 100);
            const gridSize = Math.ceil(Math.sqrt(nodesAtDepth.length));
            const spacing = levelWidth / Math.max(gridSize, 1);

            nodesAtDepth.forEach((node, index) => {
              const row = Math.floor(index / gridSize);
              const col = index % gridSize;
              const x = (col - gridSize / 2) * spacing;
              const z = (row - gridSize / 2) * spacing;

              simulationRef.current?.updateNode(node.id, {
                position: [x, y, z],
                fixed: true,
              });
            });
            y += 200;
          });
          break;
        }
        case 'radial': {
          const nodesByType = new Map<string, ComponentNode[]>();
          nodeArray.forEach((node) => {
            const typeName = node.type;
            if (!nodesByType.has(typeName)) {
              nodesByType.set(typeName, []);
            }
            nodesByType.get(typeName)!.push(node);
          });

          const typeArray = Array.from(nodesByType.keys());
          const armCount = Math.max(typeArray.length, 1);

          typeArray.forEach((typeName, armIndex) => {
            const nodesOfType = nodesByType.get(typeName)!;
            const armAngle = (armIndex / armCount) * 2 * Math.PI;

            nodesOfType.forEach((node, nodeIndex) => {
              const t = nodeIndex / Math.max(nodesOfType.length - 1, 1);
              const radius = 100 + t * 800;
              const angle = armAngle + t * Math.PI * 4;

              const diskHeight = Math.exp(-radius / 300) * 100;
              const verticalVariation = (Math.random() - 0.5) * diskHeight;

              const armThickness = 50 + t * 20;
              const armOffset = (Math.random() - 0.5) * armThickness;

              const x = (radius + armOffset) * Math.cos(angle);
              const z = (radius + armOffset) * Math.sin(angle);
              const y = verticalVariation;

              simulationRef.current?.updateNode(node.id, {
                position: [x, y, z],
                fixed: true,
              });
            });
          });
          break;
        }
        case 'tree': {
          const buildTree = (items: ComponentNode[]) => {
            const tree: any = { children: new Map() };

            items.forEach((node) => {
              const parts = (node.filePath || node.name).split('/').filter((p) => p);
              let current = tree;

              parts.forEach((part, index) => {
                if (!current.children.has(part)) {
                  current.children.set(part, {
                    name: part,
                    children: new Map(),
                    nodes: [],
                    isLeaf: index === parts.length - 1,
                  });
                }
                current = current.children.get(part);
                if (index === parts.length - 1) {
                  current.nodes.push(node);
                }
              });
            });

            return tree;
          };

          const positionTree = (
            tree: any,
            x: number,
            y: number,
            z: number,
            spacing: number,
            depth: number
          ) => {
            const children = Array.from(tree.children.values());
            const childSpacing = spacing / Math.max(1, children.length - 1);

            children.forEach((child: any, index: number) => {
              const childX = x + (index - (children.length - 1) / 2) * childSpacing;
              const childY = y - depth * 150;
              const childZ = z;

              child.nodes.forEach((node: ComponentNode, nodeIndex: number) => {
                simulationRef.current?.updateNode(node.id, {
                  position: [
                    childX + (nodeIndex - (child.nodes.length - 1) / 2) * 30,
                    childY,
                    childZ + nodeIndex * 20,
                  ],
                  fixed: true,
                });
              });

              if (child.children.size > 0) {
                positionTree(child, childX, childY, childZ, childSpacing * 0.8, depth + 1);
              }
            });
          };

          const tree = buildTree(nodeArray);
          positionTree(tree, 0, 400, 0, 800, 1);
          break;
        }
        case 'circular': {
          const nodesByType = new Map<string, ComponentNode[]>();
          nodeArray.forEach((node) => {
            const typeName = node.type;
            if (!nodesByType.has(typeName)) {
              nodesByType.set(typeName, []);
            }
            nodesByType.get(typeName)!.push(node);
          });

          const typeArray = Array.from(nodesByType.keys());
          const baseRadius = 200;

          typeArray.forEach((typeName, typeIndex) => {
            const nodesOfType = nodesByType.get(typeName)!;
            const radius = baseRadius + typeIndex * 150;
            const angleStep = (2 * Math.PI) / nodesOfType.length;

            nodesOfType.forEach((node, nodeIndex) => {
              const angle = nodeIndex * angleStep;
              const x = radius * Math.cos(angle);
              const z = radius * Math.sin(angle);
              const y = (typeIndex - typeArray.length / 2) * 100;

              simulationRef.current?.updateNode(node.id, {
                position: [x, y, z],
                fixed: true,
              });
            });
          });
          break;
        }
        case 'dependency': {
          const typeHierarchy: Record<string, number> = {
            file: 0,
            module: 1,
            class: 2,
            interface: 2,
            function: 3,
            method: 4,
            variable: 5,
            property: 5,
          };

          const layerGroups = new Map<number, ComponentNode[]>();
          nodeArray.forEach((node) => {
            const layer = typeHierarchy[node.type] || 3;
            if (!layerGroups.has(layer)) {
              layerGroups.set(layer, []);
            }
            layerGroups.get(layer)!.push(node);
          });

          const sortedLayers = Array.from(layerGroups.keys()).sort((a, b) => a - b);

          sortedLayers.forEach((layer, layerIndex) => {
            const nodesInLayer = layerGroups.get(layer)!;
            const gridSize = Math.ceil(Math.sqrt(nodesInLayer.length));
            const spacing = 100;
            const y = layerIndex * 200 - 400;

            nodesInLayer.forEach((node, index) => {
              const row = Math.floor(index / gridSize);
              const col = index % gridSize;
              const x = (col - gridSize / 2) * spacing;
              const z = (row - gridSize / 2) * spacing;

              simulationRef.current?.updateNode(node.id, {
                position: [x, y, z],
                fixed: true,
              });
            });
          });
          break;
        }
        case 'grid': {
          const gridSize = Math.ceil(Math.sqrt(nodeArray.length));
          const spacing = 100;
          const offset = ((gridSize - 1) * spacing) / 2;

          nodeArray.forEach((node, index) => {
            const row = Math.floor(index / gridSize);
            const col = index % gridSize;
            const x = col * spacing - offset;
            const z = row * spacing - offset;
            const y = 0;

            simulationRef.current?.updateNode(node.id, {
              position: [x, y, z],
              fixed: true,
            });
          });
          break;
        }
        case 'force':
        default: {
          const cubeSize = Math.ceil(Math.pow(nodeArray.length, 1 / 3));
          const spacing = 80;
          const offset = ((cubeSize - 1) * spacing) / 2;

          nodeArray.forEach((node, index) => {
            const z = Math.floor(index / (cubeSize * cubeSize));
            const y = Math.floor((index % (cubeSize * cubeSize)) / cubeSize);
            const x = index % cubeSize;

            const jitter = 20;
            const jitterX = (Math.random() - 0.5) * jitter;
            const jitterY = (Math.random() - 0.5) * jitter;
            const jitterZ = (Math.random() - 0.5) * jitter;

            simulationRef.current?.updateNode(node.id, {
              position: [
                x * spacing - offset + jitterX,
                y * spacing - offset + jitterY,
                z * spacing - offset + jitterZ,
              ],
              fixed: true,
            });
          });
          break;
        }
      }

      setSimulationPaused(true);
      (simulationRef.current as any)?.stop?.();
      scheduleRender();
    },
    [scheduleRender]
  );

  const runLayoutRef = useRef(runLayout);
  useEffect(() => {
    runLayoutRef.current = runLayout;
  }, [runLayout]);

  const handleResetViewRef = useRef(handleResetView);
  useEffect(() => {
    handleResetViewRef.current = handleResetView;
  }, [handleResetView]);

  const scheduleRenderRef = useRef(scheduleRender);
  useEffect(() => {
    scheduleRenderRef.current = scheduleRender;
  }, [scheduleRender]);

  useEffect(() => {
    if (!canvasRef.current || nodesRef.current.length === 0 || webglRef.current) {
      return;
    }

    setIsReady(false);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.parentElement?.clientWidth || 1;
    const height = rect.height || canvas.parentElement?.clientHeight || 1;
    canvas.width = width;
    canvas.height = height;
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      onErrorRef.current('WebGL 2.0 not supported');
      return;
    }

    webglRef.current = new WebGLRenderer(gl);
    cameraRef.current = new Camera(canvas.width, canvas.height);
    cameraRef.current.position = [...INITIAL_CAMERA_POSITION];
    cameraRef.current.target = [0, 0, 0];
    cameraRef.current.zoom = 1.0;
    (cameraRef.current as any).updateMatrices();
    simulationRef.current = new ForceSimulation({ damping: 0.9 });

    nodesRef.current.forEach((node) => {
      simulationRef.current?.addNode({
        id: node.id,
        position: [node.x || 0, node.y || 0, node.z || 0],
        mass: 1,
        fixed: true,
      });
    });

    simulationRef.current.addForce(new SpringForce({ stiffness: 0.1, damping: 0.5 } as any));
    simulationRef.current.addForce(new RepulsiveForce({ strength: 100, minDistance: 50 }));
    simulationRef.current.addForce(new CenterForce({ strength: 0.05 }));

    relationshipsRef.current.forEach((rel) => {
      simulationRef.current?.addEdge({
        id: rel.id,
        source: rel.source,
        target: rel.target,
        length: 100,
        strength: 0.2,
      });
    });

    interactionRef.current = new InteractionHandler(canvas, cameraRef.current, {
      onNodeHover: (nodeId: string | null) => {
        interactionCallbacksRef.current.onNodeHover(nodeId);
      },
      onNodeClick: (nodeId: string) => {
        interactionCallbacksRef.current.onNodeClick(nodeId);
      },
      onNodeDoubleClick: (nodeId: string) => {
        interactionCallbacksRef.current.onNodeDoubleClick(nodeId);
      },
      onViewportChange: () => {
        scheduleRenderRef.current();
      },
    });

    const render = () => {
      if (
        !webglRef.current ||
        !cameraRef.current ||
        !simulationRef.current ||
        !interactionRef.current ||
        !isMountedRef.current
      ) {
        return;
      }

      const visibleFilteredNodes = filteredNodesRef.current;
      const filteredRels = filteredRelationshipsRef.current;

      const positions = new Map<string, [number, number, number]>();
      visibleFilteredNodes.forEach((node) => {
        const simNode = simulationRef.current?.getNode(node.id) as any;
        if (simNode && simNode.position) {
          positions.set(node.id, simNode.position);
        } else {
          positions.set(node.id, [node.x || 0, node.y || 0, node.z || 0]);
        }
      });

      const labels: NodeLabel[] = [];
      const hoveredId = hoveredNodeRef.current?.id ?? null;
      const selectedId = selectedNodeRef.current?.id ?? null;
      visibleFilteredNodes.forEach((node) => {
        const pos = positions.get(node.id);
        if (!pos || !cameraRef.current) return;

        const shouldShowLabel = hoveredId
          ? node.id === hoveredId
          : selectedId
            ? node.id === selectedId
            : false;

        if (!shouldShowLabel) {
          return;
        }

        const worldPos: [number, number, number] = [pos[0], pos[1], pos[2]];
        const screenPos = cameraRef.current.worldToScreen(worldPos);
        const distance = Math.sqrt(
          Math.pow(cameraRef.current.position[0] - worldPos[0], 2) +
            Math.pow(cameraRef.current.position[1] - worldPos[1], 2) +
            Math.pow(cameraRef.current.position[2] - worldPos[2], 2)
        );

        if (
          distance <= 500 &&
          screenPos[0] >= 0 &&
          screenPos[0] <= (canvasRef.current?.width || 0) &&
          screenPos[1] >= 0 &&
          screenPos[1] <= (canvasRef.current?.height || 0)
        ) {
          labels.push({
            id: node.id,
            name: node.name.length > 20 ? `${node.name.substring(0, 17)}...` : node.name,
            x: screenPos[0] + 8,
            y: screenPos[1] - 8,
            size: Math.max(8, Math.min(12, 500 / distance)),
          });
        }
      });
      setNodeLabels(labels);

      renderDataRef.current.graphNodes = visibleFilteredNodes.map((node) => {
        const pos = positions.get(node.id) || [node.x || 0, node.y || 0, node.z || 0];
        return {
          id: node.id,
          position: pos as [number, number, number],
          size: 8,
          label: node.name,
          type: node.type,
        };
      });

      renderDataRef.current.graphEdges = filteredRels.map((rel) => ({
        id: rel.id,
        from: rel.source,
        to: rel.target,
        width: 1,
        type: rel.type,
      }));

      interactionRef.current.updateGraphData(
        renderDataRef.current.graphNodes,
        renderDataRef.current.graphEdges
      );

      const nodesWithPositions = visibleFilteredNodes.map((node) => {
        const pos = positions.get(node.id);
        if (pos) {
          return { ...node, x: pos[0], y: pos[1], z: pos[2] };
        }
        return node;
      });

      const connectionCounts = new Map<string, number>();
      visibleFilteredNodes.forEach((node) => {
        const count = filteredRels.filter((rel) => rel.source === node.id || rel.target === node.id).length;
        connectionCounts.set(node.id, count);
      });

      (cameraRef.current as any).updateMatrices();

      webglRef.current.render(
        nodesWithPositions as any,
        filteredRels as any,
        cameraRef.current,
        hoveredNodeRef.current?.id || null,
        selectedNodeRef.current?.id || null,
        connectionCounts
      );
    };

    renderFunctionRef.current = render;
    render();

    const initializationTimeout = window.setTimeout(() => {
      runLayoutRef.current(layoutTypeRef.current);
      handleResetViewRef.current();
      if (simulationRef.current) {
        (simulationRef.current as any).initialized = true;
        setSimulationPaused(true);
        (simulationRef.current as any).stop?.();
      }
    }, 100);

    setIsReady(true);

    return () => {
      isMountedRef.current = false;
      window.clearTimeout(initializationTimeout);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      webglRef.current?.destroy();
      webglRef.current = null;
      interactionRef.current?.dispose();
      interactionRef.current = null;
      simulationRef.current = null;
    };
  }, [canvasRef, nodes.length, relationships.length]);

  useEffect(() => {
    if (!simulationRef.current || !webglRef.current) return;

    (simulationRef.current as any).filteredNodes = filteredNodes;
    (simulationRef.current as any).filteredRels = filteredRelationships;

    scheduleRender();

    if (simulationRef.current && simulationPaused) {
      (simulationRef.current as any).stop?.();
    }
  }, [filteredNodes, filteredRelationships, simulationPaused, scheduleRender]);

  return {
    nodeLabels,
    runLayout,
    focusCameraOnNode,
    handleZoomIn,
    handleZoomOut,
    handleResetView,
    isReady,
  };
}
