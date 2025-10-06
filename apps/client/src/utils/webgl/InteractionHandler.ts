import { Camera } from './Camera';
import { GraphNode, GraphEdge } from './types';

export interface HitResult {
  node?: GraphNode;
  edge?: GraphEdge;
  distance?: number;
}

export interface GraphInteractionEvents {
  onNodeClick?: (nodeId: string, event: MouseEvent) => void;
  onNodeDoubleClick?: (nodeId: string, event: MouseEvent) => void;
  onNodeHover?: (nodeId: string | null, event: MouseEvent) => void;
  onEdgeClick?: (edgeId: string, event: MouseEvent) => void;
  onSelectionChange?: (selection: { nodes: string[]; edges: string[] }) => void;
  onViewportChange?: (camera: Camera) => void;
}

export interface InteractionState {
  isDragging: boolean;
  dragStartPos: { x: number; y: number };
  lastMousePos: { x: number; y: number };
  hoveredNode: string | null;
  selectedNodes: Set<string>;
  selectedEdges: Set<string>;
  mouseDownTime: number;
  dragThreshold: number;
  canvasHasFocus: boolean;
}

export class InteractionHandler {
  private canvas: HTMLCanvasElement;
  private camera: Camera;
  private events: GraphInteractionEvents;
  private state: InteractionState;

  // Raycast data - will be updated by the renderer
  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];

  private readonly mouseDownHandler: (event: MouseEvent) => void;
  private readonly mouseMoveHandler: (event: MouseEvent) => void;
  private readonly mouseUpHandler: (event: MouseEvent) => void;
  private readonly wheelHandler: (event: WheelEvent) => void;
  private readonly doubleClickHandler: (event: MouseEvent) => void;
  private readonly contextMenuHandler: (event: MouseEvent) => void;
  private readonly focusHandler: (event: FocusEvent) => void;
  private readonly blurHandler: (event: FocusEvent) => void;
  private readonly keyDownHandler: (event: KeyboardEvent) => void;
  private readonly keyUpHandler: (event: KeyboardEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    camera: Camera,
    events: GraphInteractionEvents = {}
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.events = events;
    
    this.state = {
      isDragging: false,
      dragStartPos: { x: 0, y: 0 },
      lastMousePos: { x: 0, y: 0 },
      hoveredNode: null,
      selectedNodes: new Set<string>(),
      selectedEdges: new Set<string>(),
      mouseDownTime: 0,
      dragThreshold: 5, // Pixels before considering it a drag
      canvasHasFocus: false
    };
    
    // Make canvas focusable
    this.canvas.tabIndex = 0;
    this.canvas.style.outline = 'none';

    this.mouseDownHandler = this.onMouseDown.bind(this);
    this.mouseMoveHandler = this.onMouseMove.bind(this);
    this.mouseUpHandler = this.onMouseUp.bind(this);
    this.wheelHandler = this.onWheel.bind(this);
    this.doubleClickHandler = this.onDoubleClick.bind(this);
    this.contextMenuHandler = this.onContextMenu.bind(this);
    this.focusHandler = this.onCanvasFocus.bind(this);
    this.blurHandler = this.onCanvasBlur.bind(this);
    this.keyDownHandler = this.onKeyDown.bind(this);
    this.keyUpHandler = this.onKeyUp.bind(this);

    this.setupEventListeners();
  }
  
  /**
   * Update the graph data for raycasting
   */
  updateGraphData(nodes: GraphNode[], edges: GraphEdge[]): void {
    this.nodes = nodes;
    this.edges = edges;
  }
  
  /**
   * Get current selection state
   */
  getSelection(): { nodes: string[]; edges: string[] } {
    return {
      nodes: Array.from(this.state.selectedNodes),
      edges: Array.from(this.state.selectedEdges)
    };
  }
  
  /**
   * Set selected nodes programmatically
   */
  setSelectedNodes(nodeIds: string[]): void {
    this.state.selectedNodes.clear();
    nodeIds.forEach(id => this.state.selectedNodes.add(id));
    this.notifySelectionChange();
  }
  
  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.state.selectedNodes.clear();
    this.state.selectedEdges.clear();
    this.notifySelectionChange();
  }
  
  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.mouseDownHandler);
    this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.addEventListener('mouseup', this.mouseUpHandler);
    this.canvas.addEventListener('wheel', this.wheelHandler, { passive: false });
    this.canvas.addEventListener('dblclick', this.doubleClickHandler);
    this.canvas.addEventListener('contextmenu', this.contextMenuHandler);

    // Canvas focus/blur events
    this.canvas.addEventListener('focus', this.focusHandler);
    this.canvas.addEventListener('blur', this.blurHandler);

    // Keyboard events - only listen on canvas, not window
    this.canvas.addEventListener('keydown', this.keyDownHandler);
    this.canvas.addEventListener('keyup', this.keyUpHandler);
  }
  
  private onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    
    // Focus canvas when clicked
    this.canvas.focus();
    
    this.state.mouseDownTime = Date.now();
    this.state.dragStartPos = { x: event.clientX, y: event.clientY };
    this.state.lastMousePos = { x: event.clientX, y: event.clientY };
    // Don't set isDragging yet - wait for movement
  }
  
  private onMouseMove(event: MouseEvent): void {
    // Check if we should start dragging
    if (this.state.mouseDownTime > 0 && !this.state.isDragging) {
      const distance = Math.sqrt(
        Math.pow(event.clientX - this.state.dragStartPos.x, 2) +
        Math.pow(event.clientY - this.state.dragStartPos.y, 2)
      );
      
      if (distance > this.state.dragThreshold) {
        this.state.isDragging = true;
      }
    }
    
    if (this.state.isDragging) {
      // 3D orbital controls
      const deltaX = event.clientX - this.state.lastMousePos.x;
      const deltaY = event.clientY - this.state.lastMousePos.y;
      
      if (event.shiftKey) {
        // Pan with Shift key
        this.camera.pan(deltaX, deltaY);
      } else {
        // Orbit by default
        this.camera.orbit(deltaX, deltaY);
      }
      
      this.events.onViewportChange?.(this.camera);
      
      this.state.lastMousePos = { x: event.clientX, y: event.clientY };
      this.canvas.style.cursor = 'move';
    } else {
      // Check for hover
      const hitResult = this.raycast(event.offsetX, event.offsetY);
      const newHoveredNode = hitResult.node?.id || null;
      
      if (newHoveredNode !== this.state.hoveredNode) {
        this.state.hoveredNode = newHoveredNode;
        this.events.onNodeHover?.(newHoveredNode, event);
        
        // Change cursor based on hover state
        this.canvas.style.cursor = newHoveredNode ? 'pointer' : 'grab';
      }
    }
  }
  
  private onMouseUp(event: MouseEvent): void {
    // Only process click if we didn't drag
    if (!this.state.isDragging && this.state.mouseDownTime > 0) {
      const clickDuration = Date.now() - this.state.mouseDownTime;
      
      // Process as click only if it was a quick click (not a long press)
      if (clickDuration < 500) {
        // Check for node/edge selection
        const hitResult = this.raycast(event.offsetX, event.offsetY);
        
        if (hitResult.node) {
          this.selectNode(hitResult.node.id, event.ctrlKey || event.metaKey);
          this.events.onNodeClick?.(hitResult.node.id, event);
        } else if (hitResult.edge) {
          this.selectEdge(hitResult.edge.id, event.ctrlKey || event.metaKey);
          this.events.onEdgeClick?.(hitResult.edge.id, event);
        } else {
          // Click on empty space - clear selection unless holding Ctrl/Cmd
          if (!event.ctrlKey && !event.metaKey) {
            this.clearSelection();
          }
        }
      }
    }
    
    this.state.isDragging = false;
    this.state.mouseDownTime = 0;
    this.canvas.style.cursor = this.state.hoveredNode ? 'pointer' : 'grab';
  }
  
  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    this.camera.zoomBy(zoomFactor, event.offsetX, event.offsetY);
    this.events.onViewportChange?.(this.camera);
  }
  
  private onDoubleClick(event: MouseEvent): void {
    event.preventDefault();
    
    const hitResult = this.raycast(event.offsetX, event.offsetY);
    
    if (hitResult.node) {
      // Trigger double-click event
      this.events.onNodeDoubleClick?.(hitResult.node.id, event);
      
      // Focus on the double-clicked node
      this.camera.focusOn(hitResult.node.position);
      this.events.onViewportChange?.(this.camera);
    } else {
      // Reset camera view
      this.camera.reset();
      this.events.onViewportChange?.(this.camera);
    }
  }
  
  private onContextMenu(event: MouseEvent): void {
    event.preventDefault(); // Prevent browser context menu
  }
  
  private onKeyDown(event: KeyboardEvent): void {
    // Only handle keys if canvas has focus
    if (!this.state.canvasHasFocus) return;
    
    const moveSpeed = 50;
    const key = event.key.toLowerCase();
    
    // Only prevent default for keys we're actually handling
    switch (key) {
      case 'escape':
        event.preventDefault();
        this.clearSelection();
        break;
      case 'a':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.selectAllNodes();
        } else if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
          // Only handle movement if no modifiers are pressed
          event.preventDefault();
          this.camera.moveLeft(moveSpeed);
          this.events.onViewportChange?.(this.camera);
        }
        break;
      case 'd':
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          this.camera.moveRight(moveSpeed);
          this.events.onViewportChange?.(this.camera);
        }
        break;
      case 'w':
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          this.camera.moveForward(moveSpeed);
          this.events.onViewportChange?.(this.camera);
        }
        break;
      case 's':
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          this.camera.moveBackward(moveSpeed);
          this.events.onViewportChange?.(this.camera);
        }
        break;
      case 'q':
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          this.camera.moveUp(moveSpeed);
          this.events.onViewportChange?.(this.camera);
        }
        break;
      case 'e':
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          this.camera.moveDown(moveSpeed);
          this.events.onViewportChange?.(this.camera);
        }
        break;
      case 'f':
        if (this.state.selectedNodes.size > 0) {
          event.preventDefault();
          this.focusOnSelectedNodes();
        }
        break;
    }
  }
  
  private onKeyUp(_event: KeyboardEvent): void {
    // Handle key up events if needed
  }
  
  private selectNode(nodeId: string, multiSelect: boolean): void {
    if (!multiSelect) {
      this.state.selectedNodes.clear();
      this.state.selectedEdges.clear();
    }
    
    if (this.state.selectedNodes.has(nodeId)) {
      this.state.selectedNodes.delete(nodeId);
    } else {
      this.state.selectedNodes.add(nodeId);
    }
    
    this.notifySelectionChange();
  }
  
  private selectEdge(edgeId: string, multiSelect: boolean): void {
    if (!multiSelect) {
      this.state.selectedNodes.clear();
      this.state.selectedEdges.clear();
    }
    
    if (this.state.selectedEdges.has(edgeId)) {
      this.state.selectedEdges.delete(edgeId);
    } else {
      this.state.selectedEdges.add(edgeId);
    }
    
    this.notifySelectionChange();
  }
  
  private selectAllNodes(): void {
    this.state.selectedNodes.clear();
    this.nodes.forEach(node => this.state.selectedNodes.add(node.id));
    this.notifySelectionChange();
  }
  
  private focusOnSelectedNodes(): void {
    if (this.state.selectedNodes.size === 0) return;
    
    // Calculate bounding box of selected nodes
    const selectedNodePositions = this.nodes
      .filter(node => this.state.selectedNodes.has(node.id))
      .map(node => node.position);
    
    if (selectedNodePositions.length === 0) return;
    
    // Calculate center point
    const center: [number, number, number] = [0, 0, 0];
    selectedNodePositions.forEach(pos => {
      center[0] += pos[0];
      center[1] += pos[1];
      center[2] += pos[2];
    });
    center[0] /= selectedNodePositions.length;
    center[1] /= selectedNodePositions.length;
    center[2] /= selectedNodePositions.length;
    
    this.camera.focusOn(center);
    this.events.onViewportChange?.(this.camera);
  }
  
  private raycast(x: number, y: number): HitResult {
    // 3D raycasting - project all nodes to screen space and find closest
    let closestNode: GraphNode | undefined;
    let closestDistance = Infinity;
    
    // Check nodes by projecting them to screen space
    for (const node of this.nodes) {
      const screenPos = this.camera.worldToScreen(node.position);
      
      // Calculate 2D distance in screen space
      const dx = x - screenPos[0];
      const dy = y - screenPos[1];
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Hit test with a reasonable pixel radius (accounting for node size)
      const hitRadius = Math.max(8, node.size * 3); // Minimum 8px hit area
      
      if (distance < hitRadius && distance < closestDistance) {
        closestNode = node;
        closestDistance = distance;
      }
    }
    
    if (closestNode) {
      return { node: closestNode, distance: closestDistance };
    }
    
    // Check edges in screen space
    for (const edge of this.edges) {
      const sourceNode = this.nodes.find(n => n.id === edge.from);
      const targetNode = this.nodes.find(n => n.id === edge.to);
      
      if (sourceNode && targetNode) {
        const sourceScreen = this.camera.worldToScreen(sourceNode.position);
        const targetScreen = this.camera.worldToScreen(targetNode.position);
        
        const distance = this.distanceToLineSegment2D(
          [x, y],
          [sourceScreen[0], sourceScreen[1]],
          [targetScreen[0], targetScreen[1]]
        );
        
        // Edge hit test with pixel-based width
        if (distance < Math.max(3, edge.width * 2)) {
          return { edge, distance };
        }
      }
    }
    
    return {};
  }
  
  private distanceToLineSegment2D(
    point: [number, number],
    lineStart: [number, number],
    lineEnd: [number, number]
  ): number {
    const dx = lineEnd[0] - lineStart[0];
    const dy = lineEnd[1] - lineStart[1];
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) {
      // Line is a point
      const pdx = point[0] - lineStart[0];
      const pdy = point[1] - lineStart[1];
      return Math.sqrt(pdx * pdx + pdy * pdy);
    }
    
    // Calculate the parameter t that represents the projection of the point onto the line
    const t = Math.max(0, Math.min(1, 
      ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (length * length)
    ));
    
    // Calculate the closest point on the line segment
    const closestX = lineStart[0] + t * dx;
    const closestY = lineStart[1] + t * dy;
    
    // Return distance from point to closest point on line
    const distX = point[0] - closestX;
    const distY = point[1] - closestY;
    return Math.sqrt(distX * distX + distY * distY);
  }
  
  // (removed) unused 3D distanceToLineSegment
  
  private onCanvasFocus(): void {
    this.state.canvasHasFocus = true;
    // Optional: Add visual feedback
    this.canvas.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.3)';
  }
  
  private onCanvasBlur(): void {
    this.state.canvasHasFocus = false;
    // Remove visual feedback
    this.canvas.style.boxShadow = 'none';
  }
  
  private notifySelectionChange(): void {
    this.events.onSelectionChange?.(this.getSelection());
  }
  
  dispose(): void {
    this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
    this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
    this.canvas.removeEventListener('wheel', this.wheelHandler);
    this.canvas.removeEventListener('dblclick', this.doubleClickHandler);
    this.canvas.removeEventListener('contextmenu', this.contextMenuHandler);
    this.canvas.removeEventListener('focus', this.focusHandler);
    this.canvas.removeEventListener('blur', this.blurHandler);
    this.canvas.removeEventListener('keydown', this.keyDownHandler);
    this.canvas.removeEventListener('keyup', this.keyUpHandler);
    this.canvas.style.cursor = 'grab';
    this.canvas.style.boxShadow = 'none';
  }
}
