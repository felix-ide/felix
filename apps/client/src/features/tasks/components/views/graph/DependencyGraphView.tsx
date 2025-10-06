import { useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  NodeProps
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { TaskData, TaskDependency } from '@/types/api';
import { cn } from '@/utils/cn';
import { felixService } from '@/services/felixService';

interface DependencyGraphViewProps {
  tasks: TaskData[];
  onTaskClick?: (task: TaskData) => void;
}

// Custom node component that looks like a Kanban card
const TaskNode = ({ data }: NodeProps) => {
  const { task, onTaskClick } = data;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'border-green-500 bg-green-50 /20';
      case 'in_progress': return 'border-blue-500 bg-blue-50 /20/20';
      case 'blocked': return 'border-red-500 bg-red-50 /20/20';
      case 'todo': return 'border-border bg-gray-50 /20';
      default: return 'border-border bg-gray-50 /20';
    }
  };

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-destructive';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-primary';
      case 'low': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'epic': return '📋';
      case 'story': return '📝';
      case 'task': return '✓';
      case 'subtask': return '◦';
      case 'milestone': return '🎯';
      case 'bug': return '🐛';
      default: return '•';
    }
  };

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border-2 min-w-[200px] max-w-[300px] cursor-pointer transition-all",
        "hover:shadow-lg hover:scale-105",
        getStatusColor(task.task_status)
      )}
      onClick={() => onTaskClick?.(task)}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-start gap-2">
        <span className="text-lg">{getTypeIcon(task.task_type)}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate text-foreground">{task.title}</h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <div className={cn("w-2 h-2 rounded-full", getPriorityDot(task.task_priority))} />
            <span>{task.task_priority}</span>
            {task.assigned_to && (
              <>
                <span>•</span>
                <span>{task.assigned_to}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

const nodeTypes = {
  task: TaskNode,
};

export function DependencyGraphView({ tasks, onTaskClick }: DependencyGraphViewProps) {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Load dependencies
  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const response = await felixService.listTaskDependencies();
        setDependencies(response.dependencies || []);
      } catch (error) {
        console.error('Failed to load dependencies:', error);
      }
    };
    loadDependencies();
  }, []);

  // Build nodes and edges
  useEffect(() => {
    // Create nodes from tasks
    const taskNodes: Node[] = tasks.map((task, index) => {
      // Calculate position based on status and index
      const statusPositions = {
        todo: 0,
        in_progress: 1,
        blocked: 1.5,
        done: 2
      };
      
      const xPos = (statusPositions[task.task_status as keyof typeof statusPositions] || 0) * 400;
      const yPos = index * 120;
      
      return {
        id: task.id,
        type: 'task',
        position: { x: xPos, y: yPos },
        data: { task, onTaskClick }
      };
    });

    // Create edges from dependencies and parent-child relationships
    const dependencyEdges: Edge[] = [];
    
    // Add dependency edges
    dependencies.forEach(dep => {
      if (tasks.find(t => t.id === dep.dependent_task_id) && 
          tasks.find(t => t.id === dep.dependency_task_id)) {
        dependencyEdges.push({
          id: `dep-${dep.dependent_task_id}-${dep.dependency_task_id}`,
          source: dep.dependency_task_id,
          target: dep.dependent_task_id,
          type: 'smoothstep',
          animated: dep.dependency_type === 'blocks',
          style: {
            stroke: dep.dependency_type === 'blocks' ? '#ef4444' : '#6b7280',
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: dep.dependency_type === 'blocks' ? '#ef4444' : '#6b7280',
          },
          label: dep.dependency_type,
          labelStyle: { fontSize: '10px' },
          labelBgStyle: { fill: 'white', fillOpacity: 0.8 }
        });
      }
    });

    // Add parent-child edges
    tasks.forEach(task => {
      if (task.parent_id && tasks.find(t => t.id === task.parent_id)) {
        dependencyEdges.push({
          id: `parent-${task.parent_id}-${task.id}`,
          source: task.parent_id,
          target: task.id,
          type: 'smoothstep',
          style: {
            stroke: '#3b82f6',
            strokeWidth: 2,
            strokeDasharray: '5,5'
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#3b82f6',
          },
          label: 'parent',
          labelStyle: { fontSize: '10px' },
          labelBgStyle: { fill: 'white', fillOpacity: 0.8 }
        });
      }
    });

    setNodes(taskNodes);
    setEdges(dependencyEdges);
  }, [tasks, dependencies, onTaskClick]);

  return (
    <div className="h-full bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false
        }}
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            const task = node.data?.task;
            if (!task) return '#999';
            switch (task.task_status) {
              case 'done': return '#10b981';
              case 'in_progress': return '#3b82f6';
              case 'blocked': return '#ef4444';
              case 'todo': return '#6b7280';
              default: return '#6b7280';
            }
          }}
          style={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))'
          }}
        />
      </ReactFlow>
    </div>
  );
}
