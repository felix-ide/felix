import { useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  NodeProps,
  BackgroundVariant,
} from 'reactflow';
import type {
  Node,
  Edge,
  ReactFlowInstance,
  FitViewOptions,
  OnNodesChange,
  OnEdgesChange,
} from 'reactflow';
import { Button } from '@client/shared/ui/Button';
import { useTheme, getComponentStyles } from '@felix/theme-system';
import { getThemeById } from '@felix/theme-system/themes';
import { cn } from '@/utils/cn';
import {
  Maximize2,
  Minimize2,
  Layers,
  Box,
  Code,
  FileCode,
  BookOpen,
  Shield,
  FileText,
  Target,
  Hash,
} from 'lucide-react';
import { normalizeFilePath } from '../utils/contextDisplayUtils';

interface ContextGraphViewProps {
  visible: boolean;
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  handleInit: (instance: ReactFlowInstance) => void;
  applyLayout: (direction: 'LR' | 'TB') => void;
  fitView: (options?: FitViewOptions) => void;
  centerOnComponent: (componentId?: string | null) => void;
  getViewport: () => { x: number; y: number; zoom: number } | null;
  displayMode: 'focus' | 'all';
  focusId?: string | null;
  onChangeLayout?: (dir: 'LR' | 'TB') => void;
  onSaveViewport?: (viewport: { x: number; y: number; zoom: number }) => void;
}

const MindMapNode = ({ data, selected }: NodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme } = useTheme();

  const getNodeIcon = () => {
    switch (data.entityType) {
      case 'component':
        return data.componentType === 'class' ? <Box className="h-4 w-4" /> :
               data.componentType === 'function' ? <Code className="h-4 w-4" /> :
               data.componentType === 'interface' ? <Layers className="h-4 w-4" /> :
               <FileCode className="h-4 w-4" />;
      case 'documentation':
        return <BookOpen className="h-4 w-4" />;
      case 'rule':
        return <Shield className="h-4 w-4" />;
      case 'note':
        return <FileText className="h-4 w-4" />;
      case 'task':
        return <Target className="h-4 w-4" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  const getNodeStyles = () => {
    if (!theme) return {} as any;
    if (data.entityType === 'component' && data.componentType) {
      return getComponentStyles(theme, data.componentType.toLowerCase());
    }

    const entityStyles = {
      documentation: {
        borderColor: theme.colors.info['400'],
        backgroundColor: `${theme.colors.info['500']}10`,
        color: theme.colors.info['300'],
      },
      rule: {
        borderColor: theme.colors.warning['400'],
        backgroundColor: `${theme.colors.warning['500']}10`,
        color: theme.colors.warning['300'],
      },
      note: {
        borderColor: theme.colors.accent['400'],
        backgroundColor: `${theme.colors.accent['500']}10`,
        color: theme.colors.accent['300'],
      },
      task: {
        borderColor: theme.colors.secondary['400'],
        backgroundColor: `${theme.colors.secondary['500']}10`,
        color: theme.colors.secondary['300'],
      },
    };

    return (entityStyles as any)[data.entityType] || { borderColor: theme.colors.border.primary };
  };

  const nodeStyles = getNodeStyles();

  return (
    <div
      className={cn(
        'rounded-lg border-2 transition-all',
        isExpanded ? 'min-w-[400px] max-w-[800px] shadow-2xl' : 'min-w-[200px] max-w-[300px]',
        selected && 'shadow-lg ring-2 ring-primary',
        isExpanded && 'z-50 relative'
      )}
      style={{
        borderColor: nodeStyles.borderColor,
        backgroundColor: nodeStyles.backgroundColor,
        color: nodeStyles.color,
      }}
    >
      <div className="p-3 flex items-start gap-2">
        <div
          className="flex items-center justify-center h-8 w-8 rounded-full border"
          style={{ borderColor: nodeStyles.borderColor, backgroundColor: nodeStyles.backgroundColor }}
        >
          {getNodeIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate" title={data.label}>{data.label}</div>
          {data.subtitle && (
            <div className="text-xs text-muted-foreground truncate">{data.subtitle}</div>
          )}
          {data.metadata?.description && (
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{data.metadata.description}</div>
          )}
        </div>
        <button
          className="h-6 w-6 flex items-center justify-center rounded-full border border-border/40"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </button>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 text-xs">
          {data.filePath && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">File</span>
              <span className="font-mono truncate" title={data.filePath}>{normalizeFilePath(data.filePath)}</span>
            </div>
          )}
          {data.lineNumber && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Line</span>
              <span>{data.lineNumber}</span>
            </div>
          )}

          {data.metadata && Object.keys(data.metadata).length > 0 && (
            <div>
              <div className="text-muted-foreground mb-1">Metadata</div>
              <div className="space-y-1">
                {Object.entries(data.metadata).slice(0, 6).map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground capitalize">{key}</span>
                    <span className="text-right truncate font-mono" title={String(value)}>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Handle type="target" position={Position.Left} className="!bg-primary" />
      <Handle type="source" position={Position.Right} className="!bg-primary" />
    </div>
  );
};

export function ContextGraphView({
  visible,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  handleInit,
  applyLayout,
  fitView,
  centerOnComponent,
  getViewport,
  displayMode,
  focusId,
  onChangeLayout,
  onSaveViewport,
}: ContextGraphViewProps) {
  const nodeTypes = useMemo(() => ({
    mindMapNode: MindMapNode,
  }), []);

  const handleLayout = (direction: 'LR' | 'TB') => {
    applyLayout(direction);
    onChangeLayout?.(direction);
  };

  return (
    <div
      className={cn(
        'border-2 border-border/30 rounded-lg bg-background/90 overflow-hidden relative shadow-inner',
        !visible && 'hidden'
      )}
      style={{ height: '800px' }}
    >
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => handleLayout('TB')}>
          <Layers className="h-4 w-4 mr-1" />
          Vertical Layout
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleLayout('LR')}>
          <Layers className="h-4 w-4 mr-1" />
          Horizontal Layout
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fitView({ padding: 0.2 });
            if (displayMode === 'all') {
              const viewport = getViewport();
              if (viewport) onSaveViewport?.(viewport);
            }
          }}
        >
          <Maximize2 className="h-4 w-4 mr-1" />
          Fit View
        </Button>
        <Button variant="default" size="sm" onClick={() => centerOnComponent(focusId)}>
          Refocus
        </Button>
      </div>

      <div className="w-full h-[600px] min-h-[480px] border-2 border-border/30 rounded-lg overflow-hidden bg-background/80 shadow-inner">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          zoomOnScroll={false}
          zoomOnDoubleClick={false}
          panOnScroll
          panOnDrag
          preventScrolling={false}
          onInit={handleInit}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#374151" />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const currentThemeId = localStorage.getItem('felix-current-theme') || 'classic-dark';
              const currentTheme = getThemeById(currentThemeId);

              switch (node.data?.entityType) {
                case 'component': {
                  if (currentTheme && node.data.componentType) {
                    const styles = getComponentStyles(currentTheme, node.data.componentType);
                    return styles.color || '#8b5cf6';
                  }
                  return '#8b5cf6';
                }
                case 'documentation':
                  return currentTheme?.colors.info[500] || '#f59e0b';
                case 'rule':
                  return currentTheme?.colors.warning[500] || '#ef4444';
                case 'note':
                  return '#6366f1';
                default:
                  return '#6b7280';
              }
            }}
            style={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
