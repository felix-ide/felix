import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GitBranch } from 'lucide-react';
import { useTheme, getComponentStyles } from '@felix/theme-system';
import { formatTypeLabel } from '@/utils/relationship-format';

interface CallGraphVisualizationProps {
  focusComponent: any;
  callers: any[];
  callees: any[];
  height?: string;
}

// Custom node component
const CallGraphNode = ({ data }: any) => {
  const isFocus = data.isFocus;
  const isCallee = data.isCallee;

  return (
    <div
      className={`px-4 py-2 rounded-md border-2 ${
        isFocus
          ? 'bg-primary/20 border-primary shadow-lg ring-2 ring-primary/50'
          : isCallee
          ? 'bg-accent/10 border-accent/40'
          : 'bg-card border-border'
      }`}
    >
      <div className="text-xs font-semibold text-foreground">{data.label}</div>
      <div className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={data.filePath}>
        {data.filePath}:{data.line}
      </div>
    </div>
  );
};

const nodeTypes = {
  callGraph: CallGraphNode,
};

export function CallGraphVisualization({
  focusComponent,
  callers,
  callees,
  height = '400px',
}: CallGraphVisualizationProps) {
  const { theme } = useTheme();

  // Build nodes and edges from call data
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Focus node in the center
    nodes.push({
      id: focusComponent.id,
      type: 'callGraph',
      position: { x: 400, y: 200 },
      data: {
        label: focusComponent.name,
        filePath: focusComponent.filePath,
        line: focusComponent.location?.startLine || 0,
        isFocus: true,
        isCallee: false,
      },
    });

    // Caller nodes (left side)
    callers.forEach((caller, index) => {
      const callerId = caller.sourceId || `caller-${index}`;
      nodes.push({
        id: callerId,
        type: 'callGraph',
        position: { x: 50, y: 50 + index * 100 },
        data: {
          label: caller.sourceName || 'Unknown',
          filePath: caller.sourceFilePath || '',
          line: caller.sourceLocation?.startLine || 0,
          isFocus: false,
          isCallee: false,
        },
        sourcePosition: Position.Right,
      });

      edges.push({
        id: `${callerId}-${focusComponent.id}`,
        source: callerId,
        target: focusComponent.id,
        animated: true,
        style: { stroke: theme?.colors.primary[500] || '#3b82f6', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: theme?.colors.primary[500] || '#3b82f6',
        },
        label: 'calls',
        labelStyle: { fontSize: 10, fill: theme?.colors.foreground.secondary },
      });
    });

    // Callee nodes (right side)
    callees.forEach((callee, index) => {
      const calleeId = callee.targetId || `callee-${index}`;
      nodes.push({
        id: calleeId,
        type: 'callGraph',
        position: { x: 750, y: 50 + index * 100 },
        data: {
          label: callee.targetName || 'Unknown',
          filePath: callee.targetFilePath || '',
          line: callee.targetLocation?.startLine || 0,
          isFocus: false,
          isCallee: true,
        },
        targetPosition: Position.Left,
      });

      edges.push({
        id: `${focusComponent.id}-${calleeId}`,
        source: focusComponent.id,
        target: calleeId,
        animated: true,
        style: { stroke: theme?.colors.accent[500] || '#f59e0b', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: theme?.colors.accent[500] || '#f59e0b',
        },
        label: 'calls',
        labelStyle: { fontSize: 10, fill: theme?.colors.foreground.secondary },
      });
    });

    return { nodes, edges };
  }, [focusComponent, callers, callees, theme]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  if (!callers.length && !callees.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No call relationships found</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="border border-border/40 rounded-lg overflow-hidden"
      style={{ height }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.data.isFocus) return theme?.colors.primary[500] || '#3b82f6';
            if (node.data.isCallee) return theme?.colors.accent[500] || '#f59e0b';
            return theme?.colors.secondary[400] || '#9ca3af';
          }}
        />
      </ReactFlow>
    </div>
  );
}
