export interface ComponentNode {
  id: string;
  name: string;
  type: string;
  filePath?: string;
  language?: string;
  metadata?: any;
  x?: number;
  y?: number;
  z?: number;
}

export interface ComponentEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  metadata?: any;
}

export type LayoutName =
  | 'force'
  | 'hierarchical'
  | 'radial'
  | 'tree'
  | 'circular'
  | 'dependency'
  | 'grid';

export interface ComponentMapViewProps {
  showFilters?: boolean;
  showStats?: boolean;
  showLegend?: boolean;
  filterText?: string;
  mode?: 'overview' | 'relationships';
  focusedComponentId?: string;
}

export interface RelationshipSummary {
  topHubs: Array<{ node: ComponentNode; connections: number }>;
  isolatedNodes: number;
  criticalRels: number;
  dependencyRels: number;
}

export interface NodeLabel {
  id: string;
  name: string;
  x: number;
  y: number;
  size: number;
}

export interface ComponentDetails {
  id: string;
  name: string;
  type: string;
  language?: string;
  filePath?: string;
  startLine?: number;
  endLine?: number;
  source?: string;
  content?: string;
  metadata?: any;
  [key: string]: unknown;
}

export interface ComponentMapControllerState {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  nodes: ComponentNode[];
  relationships: ComponentEdge[];
  filteredNodes: ComponentNode[];
  filteredRelationships: ComponentEdge[];
  nodeLabels: NodeLabel[];
  isLoading: boolean;
  error: string | null;
  selectedNode: ComponentNode | null;
  hoveredNode: ComponentNode | null;
  nodeDetails: ComponentDetails | null;
  showDetailsPanel: boolean;
  detailsPanelDocked: boolean;
  focusedNode: string | null;
  layoutType: LayoutName;
  filterText: string;
  activeRelTypes: Set<string>;
  activeNodeTypes: Set<string>;
  architecturalStats: RelationshipSummary;
}

export interface ComponentMapControllerActions {
  setFilterText: (value: string) => void;
  toggleRelTypeFilter: (type: string) => void;
  toggleNodeTypeFilter: (type: string) => void;
  applyLayout: (layout: LayoutName) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetView: () => void;
  setShowDetailsPanel: (value: boolean) => void;
  setDetailsPanelDocked: (value: boolean) => void;
  loadNodeDetails: (node: ComponentNode) => Promise<void>;
  focusOnNode: (nodeId: string) => void;
  setSelectedNode: (node: ComponentNode | null) => void;
  setHoveredNode: (node: ComponentNode | null) => void;
  setFocusedNode: (nodeId: string | null) => void;
}

export interface ComponentMapController extends ComponentMapControllerState, ComponentMapControllerActions {
  relationshipTypes: string[];
  nodeTypes: string[];
  theme: any;
}

