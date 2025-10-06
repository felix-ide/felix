import { vec3 } from 'gl-matrix';

export interface SimulationNode {
  id: string;
  position: vec3;
  velocity: vec3;
  mass: number;
  fixed: boolean;
}

export interface SimulationEdge {
  id: string;
  source: string;
  target: string;
  length: number;
  strength: number;
}

export interface Force {
  apply(nodes: SimulationNode[], edges: SimulationEdge[], deltaTime: number): void;
}

export interface ForceSimulationOptions {
  damping?: number;
  timeStep?: number;
  maxVelocity?: number;
  stabilityThreshold?: number;
}

export class ForceSimulation {
  private nodes: Map<string, SimulationNode> = new Map();
  private edges: SimulationEdge[] = [];
  private forces: Force[] = [];
  
  private isRunning = false;
  private animationId: number | null = null;
  
  // Simulation parameters
  private damping: number;
  private timeStep: number;
  private maxVelocity: number;
  private stabilityThreshold: number;
  
  // Event listeners
  private onTickListeners: Array<() => void> = [];
  private onStabilizeListeners: Array<() => void> = [];
  
  constructor(options: ForceSimulationOptions = {}) {
    this.damping = options.damping ?? 0.95;
    this.timeStep = options.timeStep ?? 0.016; // 60fps
    this.maxVelocity = options.maxVelocity ?? 10;
    this.stabilityThreshold = options.stabilityThreshold ?? 0.01;
  }
  
  addNode(node: Omit<SimulationNode, 'velocity'>): void {
    this.nodes.set(node.id, {
      ...node,
      velocity: vec3.create()
    });
  }
  
  removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    // Remove edges connected to this node
    this.edges = this.edges.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    );
  }
  
  getNode(nodeId: string): SimulationNode | undefined {
    return this.nodes.get(nodeId);
  }
  
  updateNode(nodeId: string, updates: Partial<SimulationNode>): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      Object.assign(node, updates);
    }
  }
  
  addEdge(edge: SimulationEdge): void {
    this.edges.push(edge);
  }
  
  removeEdge(edgeId: string): void {
    this.edges = this.edges.filter(edge => edge.id !== edgeId);
  }
  
  addForce(force: Force): void {
    this.forces.push(force);
  }
  
  removeForce(force: Force): void {
    const index = this.forces.indexOf(force);
    if (index >= 0) {
      this.forces.splice(index, 1);
    }
  }
  
  clearForces(): void {
    this.forces = [];
  }
  
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.animate();
  }
  
  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  step(): void {
    const nodeArray = Array.from(this.nodes.values());
    
    // Apply all forces
    for (const force of this.forces) {
      force.apply(nodeArray, this.edges, this.timeStep);
    }
    
    // Integrate velocities
    for (const node of nodeArray) {
      if (node.fixed) continue;
      
      // Apply damping
      vec3.scale(node.velocity, node.velocity, this.damping);
      
      // Clamp velocity
      const speed = vec3.length(node.velocity);
      if (speed > this.maxVelocity) {
        vec3.scale(node.velocity, node.velocity, this.maxVelocity / speed);
      }
      
      // Update position
      vec3.scaleAndAdd(node.position, node.position, node.velocity, this.timeStep);
    }
    
    // Notify tick listeners
    this.onTickListeners.forEach(listener => listener());
  }
  
  stabilize(maxIterations: number = 300): Promise<void> {
    return new Promise((resolve) => {
      let iterations = 0;
      
      const stabilizeStep = () => {
        this.step();
        iterations++;
        
        // Check if stable (low kinetic energy)
        const totalKineticEnergy = this.getTotalKineticEnergy();
        
        if (totalKineticEnergy < this.stabilityThreshold || iterations >= maxIterations) {
          this.onStabilizeListeners.forEach(listener => listener());
          resolve();
        } else {
          requestAnimationFrame(stabilizeStep);
        }
      };
      
      stabilizeStep();
    });
  }
  
  getTotalKineticEnergy(): number {
    let totalEnergy = 0;
    for (const node of this.nodes.values()) {
      if (!node.fixed) {
        totalEnergy += vec3.squaredLength(node.velocity);
      }
    }
    return totalEnergy;
  }
  
  private animate(): void {
    if (!this.isRunning) return;
    
    this.step();
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  getNodes(): SimulationNode[] {
    return Array.from(this.nodes.values());
  }
  
  getEdges(): SimulationEdge[] {
    return [...this.edges];
  }
  
  getNodePositions(): Map<string, vec3> {
    const positions = new Map<string, vec3>();
    for (const [id, node] of this.nodes) {
      positions.set(id, vec3.clone(node.position));
    }
    return positions;
  }
  
  onTick(listener: () => void): () => void {
    this.onTickListeners.push(listener);
    return () => {
      const index = this.onTickListeners.indexOf(listener);
      if (index >= 0) {
        this.onTickListeners.splice(index, 1);
      }
    };
  }
  
  onStabilize(listener: () => void): () => void {
    this.onStabilizeListeners.push(listener);
    return () => {
      const index = this.onStabilizeListeners.indexOf(listener);
      if (index >= 0) {
        this.onStabilizeListeners.splice(index, 1);
      }
    };
  }
  
  clear(): void {
    this.stop();
    this.nodes.clear();
    this.edges = [];
    this.onTickListeners = [];
    this.onStabilizeListeners = [];
  }
  
  dispose(): void {
    this.clear();
    this.forces = [];
  }
}