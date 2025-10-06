import { vec3 } from 'gl-matrix';
import { Force, SimulationNode, SimulationEdge } from './ForceSimulation';

export interface RepulsiveForceOptions {
  strength?: number;
  maxDistance?: number;
  minDistance?: number;
}

export class RepulsiveForce implements Force {
  private strength: number;
  private maxDistance: number;
  private minDistance: number;
  
  constructor(options: RepulsiveForceOptions = {}) {
    this.strength = options.strength ?? 1000;
    this.maxDistance = options.maxDistance ?? 100;
    this.minDistance = options.minDistance ?? 0.1;
  }
  
  apply(nodes: SimulationNode[], _edges: SimulationEdge[], deltaTime: number): void {
    const nodeCount = nodes.length;
    
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        
        // Skip if both nodes are fixed
        if (nodeA.fixed && nodeB.fixed) continue;
        
        const direction = vec3.create();
        vec3.subtract(direction, nodeB.position, nodeA.position);
        
        const distance = vec3.length(direction);
        
        // Skip if too far apart or too close
        if (distance > this.maxDistance || distance < this.minDistance) continue;
        
        // Normalize direction vector
        if (distance > 0) {
          vec3.scale(direction, direction, 1 / distance);
        } else {
          // If nodes are at exactly the same position, push them apart randomly
          vec3.set(direction, 
            Math.random() - 0.5, 
            Math.random() - 0.5, 
            0
          );
          vec3.normalize(direction, direction);
        }
        
        // Calculate repulsive force using inverse square law
        // F = k * (m1 * m2) / r²
        const forceMagnitude = (this.strength * nodeA.mass * nodeB.mass) / (distance * distance + this.minDistance);
        
        // Apply force to both nodes
        const forceVector = vec3.create();
        vec3.scale(forceVector, direction, forceMagnitude * deltaTime);
        
        if (!nodeA.fixed) {
          vec3.subtract(nodeA.velocity, nodeA.velocity, forceVector);
        }
        
        if (!nodeB.fixed) {
          vec3.add(nodeB.velocity, nodeB.velocity, forceVector);
        }
      }
    }
  }
  
  setStrength(strength: number): void {
    this.strength = strength;
  }
  
  getStrength(): number {
    return this.strength;
  }
  
  setMaxDistance(maxDistance: number): void {
    this.maxDistance = maxDistance;
  }
  
  getMaxDistance(): number {
    return this.maxDistance;
  }
  
  setMinDistance(minDistance: number): void {
    this.minDistance = minDistance;
  }
  
  getMinDistance(): number {
    return this.minDistance;
  }
}
