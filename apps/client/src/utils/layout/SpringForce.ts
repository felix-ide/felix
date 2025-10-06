import { vec3 } from 'gl-matrix';
import { Force, SimulationNode, SimulationEdge } from './ForceSimulation';

export interface SpringForceOptions {
  springConstant?: number;
  restLength?: number;
}

export class SpringForce implements Force {
  private springConstant: number;
  private restLength: number;
  
  constructor(options: SpringForceOptions = {}) {
    this.springConstant = options.springConstant ?? 0.1;
    this.restLength = options.restLength ?? 50;
  }
  
  apply(nodes: SimulationNode[], edges: SimulationEdge[], deltaTime: number): void {
    // Create a map for quick node lookup
    const nodeMap = new Map<string, SimulationNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }
    
    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      
      if (!source || !target) continue;
      
      // Skip if both nodes are fixed
      if (source.fixed && target.fixed) continue;
      
      const direction = vec3.create();
      vec3.subtract(direction, target.position, source.position);
      
      const currentLength = vec3.length(direction);
      
      // Avoid division by zero
      if (currentLength < 0.001) continue;
      
      // Normalize direction vector
      vec3.scale(direction, direction, 1 / currentLength);
      
      // Calculate spring force using Hooke's law: F = k * (x - x₀)
      // where x is current length, x₀ is rest length
      const restLength = edge.length || this.restLength;
      const displacement = currentLength - restLength;
      const forceMagnitude = this.springConstant * edge.strength * displacement;
      
      // Apply force to both nodes
      const forceVector = vec3.create();
      vec3.scale(forceVector, direction, forceMagnitude * deltaTime);
      
      if (!source.fixed) {
        vec3.add(source.velocity, source.velocity, forceVector);
      }
      
      if (!target.fixed) {
        vec3.subtract(target.velocity, target.velocity, forceVector);
      }
    }
  }
  
  setSpringConstant(springConstant: number): void {
    this.springConstant = springConstant;
  }
  
  getSpringConstant(): number {
    return this.springConstant;
  }
  
  setRestLength(restLength: number): void {
    this.restLength = restLength;
  }
  
  getRestLength(): number {
    return this.restLength;
  }
}