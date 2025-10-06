import { vec3 } from 'gl-matrix';
import { ForceSimulation } from './ForceSimulation';
import { RepulsiveForce } from './RepulsiveForce';
import { SpringForce } from './SpringForce';
import { CenterForce } from './CenterForce';
import { GraphNode, GraphEdge } from '../webgl/types';

export type LayoutType = 'force' | 'hierarchical' | 'radial' | 'grid';

export interface GraphLayoutOptions {
  layoutType?: LayoutType;
  repulsiveStrength?: number;
  springConstant?: number;
  centerStrength?: number;
  restLength?: number;
  damping?: number;
  stabilityThreshold?: number;
}

export class GraphLayout {
  private simulation: ForceSimulation;
  private repulsiveForce: RepulsiveForce;
  private springForce: SpringForce;
  private centerForce: CenterForce;
  private layoutType: LayoutType = 'force';
  
  // Event listeners
  private onUpdateListeners: Array<(positions: Map<string, vec3>) => void> = [];
  
  constructor(options: GraphLayoutOptions = {}) {
    this.layoutType = options.layoutType ?? 'force';
    
    this.simulation = new ForceSimulation({
      damping: options.damping ?? 0.95,
      stabilityThreshold: options.stabilityThreshold ?? 0.01
    });
    
    // Initialize forces
    this.repulsiveForce = new RepulsiveForce({
      strength: options.repulsiveStrength ?? 2000,
      maxDistance: 150
    });
    
    this.springForce = new SpringForce({
      springConstant: options.springConstant ?? 0.1,
      restLength: options.restLength ?? 50
    });
    
    this.centerForce = new CenterForce({
      center: vec3.create(),
      strength: options.centerStrength ?? 0.02
    });
    
    // Add forces to simulation
    if (this.layoutType === 'force') {
      this.simulation.addForce(this.repulsiveForce);
      this.simulation.addForce(this.springForce);
      this.simulation.addForce(this.centerForce);
    }
    
    // Set up update listener
    this.simulation.onTick(() => {
      const positions = this.simulation.getNodePositions();
      this.onUpdateListeners.forEach(listener => listener(positions));
    });
  }
  
  updateGraph(nodes: GraphNode[], edges: GraphEdge[]): void {
    // Clear existing simulation
    this.simulation.clear();
    
    // Re-add forces based on layout type
    if (this.layoutType === 'force') {
      this.simulation.addForce(this.repulsiveForce);
      this.simulation.addForce(this.springForce);
      this.simulation.addForce(this.centerForce);
    }
    
    // Add nodes to simulation
    for (const node of nodes) {
      let position: vec3;
      
      if (node.position) {
        position = vec3.clone(node.position);
      } else {
        // Initialize with layout-specific positioning
        position = this.getInitialPosition(node, nodes);
      }
      
      this.simulation.addNode({
        id: node.id,
        position,
        mass: 1,
        fixed: false
      });
    }
    
    // Add edges to simulation
    for (const edge of edges) {
      this.simulation.addEdge({
        id: edge.id,
        source: edge.from,
        target: edge.to,
        length: 50,
        strength: 1
      });
    }
    
    // Apply layout-specific positioning
    if (this.layoutType !== 'force') {
      this.applyStaticLayout(nodes, edges);
    }
  }
  
  private getInitialPosition(node: GraphNode, allNodes: GraphNode[]): vec3 {
    switch (this.layoutType) {
      case 'hierarchical':
        return this.getHierarchicalPosition(node, allNodes);
      case 'radial':
        return this.getRadialPosition(node, allNodes);
      case 'grid':
        return this.getGridPosition(node, allNodes);
      case 'force':
      default:
        // Random position for force-directed layout
        return vec3.fromValues(
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 200,
          0
        );
    }
  }
  
  private getHierarchicalPosition(node: GraphNode, allNodes: GraphNode[]): vec3 {
    // Simple hierarchical layout - arrange in levels
    const nodeIndex = allNodes.findIndex(n => n.id === node.id);
    const nodesPerLevel = Math.ceil(Math.sqrt(allNodes.length));
    const level = Math.floor(nodeIndex / nodesPerLevel);
    const positionInLevel = nodeIndex % nodesPerLevel;
    
    return vec3.fromValues(
      (positionInLevel - nodesPerLevel / 2) * 100,
      level * 80,
      0
    );
  }
  
  private getRadialPosition(node: GraphNode, allNodes: GraphNode[]): vec3 {
    // Arrange nodes in a circle
    const nodeIndex = allNodes.findIndex(n => n.id === node.id);
    const angle = (nodeIndex / allNodes.length) * 2 * Math.PI;
    const radius = Math.min(200, allNodes.length * 10);
    
    return vec3.fromValues(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      0
    );
  }
  
  private getGridPosition(node: GraphNode, allNodes: GraphNode[]): vec3 {
    // Arrange nodes in a grid
    const nodeIndex = allNodes.findIndex(n => n.id === node.id);
    const gridSize = Math.ceil(Math.sqrt(allNodes.length));
    const row = Math.floor(nodeIndex / gridSize);
    const col = nodeIndex % gridSize;
    
    return vec3.fromValues(
      (col - gridSize / 2) * 80,
      (row - gridSize / 2) * 80,
      0
    );
  }
  
  private applyStaticLayout(nodes: GraphNode[], _edges: GraphEdge[]): void {
    // For static layouts, fix all nodes in their positions
    for (const node of nodes) {
      const simNode = this.simulation.getNode(node.id);
      if (simNode) {
        simNode.fixed = true;
      }
    }
  }
  
  setLayoutType(layoutType: LayoutType): void {
    this.layoutType = layoutType;
    // Note: Call updateGraph() after changing layout type to apply changes
  }
  
  getLayoutType(): LayoutType {
    return this.layoutType;
  }
  
  start(): void {
    this.simulation.start();
  }
  
  stop(): void {
    this.simulation.stop();
  }
  
  async stabilize(maxIterations: number = 300): Promise<void> {
    await this.simulation.stabilize(maxIterations);
  }
  
  getNodePositions(): Map<string, vec3> {
    return this.simulation.getNodePositions();
  }
  
  fixNode(nodeId: string, fixed: boolean = true): void {
    const node = this.simulation.getNode(nodeId);
    if (node) {
      node.fixed = fixed;
    }
  }
  
  setNodePosition(nodeId: string, position: vec3): void {
    const node = this.simulation.getNode(nodeId);
    if (node) {
      vec3.copy(node.position, position);
      vec3.set(node.velocity, 0, 0, 0); // Reset velocity
    }
  }
  
  // Force configuration methods
  setRepulsiveStrength(strength: number): void {
    this.repulsiveForce.setStrength(strength);
  }
  
  setSpringConstant(constant: number): void {
    this.springForce.setSpringConstant(constant);
  }
  
  setCenterStrength(strength: number): void {
    this.centerForce.setStrength(strength);
  }
  
  setRestLength(length: number): void {
    this.springForce.setRestLength(length);
  }
  
  // Event handling
  onUpdate(listener: (positions: Map<string, vec3>) => void): () => void {
    this.onUpdateListeners.push(listener);
    return () => {
      const index = this.onUpdateListeners.indexOf(listener);
      if (index >= 0) {
        this.onUpdateListeners.splice(index, 1);
      }
    };
  }
  
  getTotalKineticEnergy(): number {
    return this.simulation.getTotalKineticEnergy();
  }
  
  dispose(): void {
    this.simulation.dispose();
    this.onUpdateListeners = [];
  }
}
