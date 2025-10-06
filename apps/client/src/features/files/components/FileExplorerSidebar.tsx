import { useCallback, useState } from 'react';
import type { CSSProperties, ComponentType, ReactNode } from 'react';
import { Input } from '@client/shared/ui/Input';
import { cn } from '@/utils/cn';
import { ChevronDown, ChevronRight, FileCode, Folder } from 'lucide-react';
import type { FileExplorerComponent, FileExplorerTreeNode } from './fileExplorerData';

type Component = FileExplorerComponent;
type TreeNode = FileExplorerTreeNode;

type ComponentStatusMap = Record<string, { status: 'idle' | 'loading' | 'loaded' | 'error'; error?: string }>;

type ChildrenMap = Map<string, Map<string, Component[]>>;

type TreeState = {
  nodes: Map<string, TreeNode>;
  rootChildren: string[];
};

export interface TypeFilterOption {
  type: string;
  label: string;
}

export interface FileExplorerSidebarProps {
  filterText: string;
  onFilterTextChange: (value: string) => void;
  activeTypes: Set<string>;
  onToggleTypeFilter: (type: string) => void;
  typeFilters: TypeFilterOption[];
  fileTree: TreeState;
  fileChildrenMap: ChildrenMap;
  fileComponentStatus: ComponentStatusMap;
  expandedTreeNodes: Set<string>;
  onToggleTreeNode: (nodeId: string) => void;
  expandedComponentIds: Set<string>;
  onToggleComponent: (componentId: string) => void;
  ensureFileComponentsLoaded: (node: TreeNode) => Promise<Component[] | null>;
  onSelectComponent: (componentId: string) => void;
  selectedComponentId: string | null;
  isLoading: boolean;
  dataError: string | null;
  getComponentColor: (type: string) => string;
  getComponentIcon: (type: string) => ComponentType<{ className?: string; style?: CSSProperties }>;
}

export function FileExplorerSidebar({
  filterText,
  onFilterTextChange,
  activeTypes,
  onToggleTypeFilter,
  fileTree,
  fileChildrenMap,
  fileComponentStatus,
  expandedTreeNodes,
  onToggleTreeNode,
  expandedComponentIds,
  onToggleComponent,
  ensureFileComponentsLoaded,
  onSelectComponent,
  selectedComponentId,
  isLoading,
  dataError,
  getComponentColor,
  getComponentIcon,
  typeFilters,
}: FileExplorerSidebarProps) {
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);

  const renderComponentTree = useCallback((component: Component, level: number, childrenMap?: Map<string, Component[]>): ReactNode => {
    if (!component._visible) return null;

    const childComponents = childrenMap?.get(component.id) ?? [];
    const hasChildren = childComponents.length > 0;
    const isExpanded = expandedComponentIds.has(component.id);
    const isSelected = selectedComponentId === component.id;
    const isHovered = hoveredComponentId === component.id;

    const Icon = getComponentIcon(component.type);
    const indicatorColor = getComponentColor(component.type);

    return (
      <div key={component.id}>
        <div
          className={cn(
            'flex items-center py-1.5 px-2 cursor-pointer border-b border-border/50',
            isSelected && 'border-l-4',
            isHovered && 'shadow-sm',
          )}
          style={{
            paddingLeft: `${level * 20 + 8}px`,
            marginLeft: isSelected ? '-4px' : '0px',
            borderLeftColor: isSelected ? indicatorColor : undefined,
          }}
          onClick={() => onSelectComponent(component.id)}
          onMouseEnter={() => setHoveredComponentId(component.id)}
          onMouseLeave={() => setHoveredComponentId(null)}
          tabIndex={0}
        >
          {hasChildren ? (
            <button
              type="button"
              className="w-4 h-4 cursor-pointer flex items-center justify-center mr-1"
              onClick={(event) => {
                event.stopPropagation();
                onToggleComponent(component.id);
              }}
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : (
            <span className="w-5 mr-1" />
          )}

          <Icon className="h-4 w-4 mr-2" style={{ color: indicatorColor }} />
          <span className="flex-1 text-sm font-medium">{component.name}</span>
          {hasChildren && (
            <span className="text-xs text-muted-foreground ml-2">({childComponents.length})</span>
          )}
        </div>

        {hasChildren && isExpanded && childComponents.map(child =>
          renderComponentTree(child, level + 1, childrenMap)
        )}
      </div>
    );
  }, [expandedComponentIds, getComponentColor, getComponentIcon, hoveredComponentId, onSelectComponent, onToggleComponent, selectedComponentId]);

  const renderTreeNode = useCallback((nodeId: string, level: number): ReactNode => {
    const node = fileTree.nodes.get(nodeId);
    if (!node) return null;

    const isExpanded = expandedTreeNodes.has(nodeId);
    const effectiveFileId = node.type === 'file' ? node.fileId || node.id : undefined;
    const statusInfo = effectiveFileId ? fileComponentStatus[effectiveFileId] : undefined;
    const status = statusInfo?.status;
    const isSelected = selectedComponentId === node.id || (!!effectiveFileId && selectedComponentId === effectiveFileId);
    const children = node.childrenIds;

    const visibleFileChildren = effectiveFileId && status === 'loaded'
      ? fileChildrenMap.get(effectiveFileId)?.get(effectiveFileId) ?? []
      : [];

    const hasChildren = node.type === 'directory'
      ? children.length > 0
      : status === 'loaded'
        ? visibleFileChildren.length > 0
        : true;

    const handleToggle = (event: React.MouseEvent) => {
      event.stopPropagation();
      onToggleTreeNode(node.id);
      if (!isExpanded && node.type === 'file') {
        void ensureFileComponentsLoaded(node);
      }
    };

    const handleSelect = () => {
      if (node.type === 'file') {
        if (!isExpanded) {
          onToggleTreeNode(node.id);
        }
        void ensureFileComponentsLoaded(node).then(() => {
          onSelectComponent(effectiveFileId ?? node.id);
        });
      } else if (hasChildren) {
        onToggleTreeNode(node.id);
      }
    };

    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center py-1.5 px-2 cursor-pointer border-b border-border/40',
            isSelected && 'bg-primary/10 text-primary',
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={handleSelect}
        >
          {hasChildren ? (
            <button
              type="button"
              className="w-4 h-4 flex items-center justify-center mr-1"
              onClick={handleToggle}
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : (
            <span className="w-4 mr-1" />
          )}
          {(() => {
            const Icon = node.type === 'directory' ? Folder : FileCode;
            return <Icon className="h-4 w-4 mr-2 text-muted-foreground" />;
          })()}
          <span className="flex-1 text-sm font-medium truncate">{node.name}</span>
        </div>

        {isExpanded && node.type === 'directory' && (
          node.childrenIds.map(childId => renderTreeNode(childId, level + 1))
        )}

        {isExpanded && node.type === 'file' && (
          <div>
            {status === 'loading' && (
              <div className="pl-6 py-2 text-xs text-muted-foreground">Loading components…</div>
            )}
            {status === 'error' && (
              <div className="pl-6 py-2 text-xs text-destructive">
                Failed to load components{statusInfo?.error ? `: ${statusInfo.error}` : ''}
              </div>
            )}
            {status === 'loaded' && visibleFileChildren.map(child =>
              renderComponentTree(child, level + 1, fileChildrenMap.get(effectiveFileId!))
            )}
            {status === 'loaded' && visibleFileChildren.length === 0 && (
              <div className="pl-6 py-2 text-xs text-muted-foreground">No components in this file</div>
            )}
          </div>
        )}
      </div>
    );
  }, [ensureFileComponentsLoaded, expandedTreeNodes, fileChildrenMap, fileComponentStatus, onSelectComponent, onToggleTreeNode, renderComponentTree, selectedComponentId]);

  return (
    <div className="w-64 flex flex-col border-r border-border shrink-0">
      <div className="p-2 border-b border-border bg-background">
        <Input
          type="text"
          placeholder="Filter..."
          value={filterText}
          onChange={(event) => onFilterTextChange(event.target.value)}
          className="w-full h-7 text-xs mb-2"
        />
        <div className="flex flex-wrap gap-1">
          {typeFilters.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              className={cn(
                'px-1.5 py-0.5 text-xs rounded transition-colors',
                activeTypes.has(type)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-accent',
              )}
              onClick={() => onToggleTypeFilter(type)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-1">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground text-xs">Loading...</div>
        ) : dataError ? (
          <div className="text-center py-4 text-destructive text-xs">Error: {dataError}</div>
        ) : (
          fileTree.rootChildren.length > 0 ? (
            <div className="space-y-0.5">
              {fileTree.rootChildren.map(nodeId => renderTreeNode(nodeId, 0))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-xs">No files indexed</div>
          )
        )}
      </div>
    </div>
  );
}
