import { vec3 } from 'gl-matrix';
import { Force, SimulationNode, SimulationEdge } from './ForceSimulation';

export interface CenterForceOptions {
  center?: vec3;
  strength?: number;
}

export class CenterForce implements Force {
  private center: vec3;
  private strength: number;
  
  constructor(options: CenterForceOptions = {}) {
    this.center = options.center ? vec3.clone(options.center) : vec3.create();
    this.strength = options.strength ?? 0.01;
  }
  
  apply(nodes: SimulationNode[], _edges: SimulationEdge[], deltaTime: number): void {
    // Calculate center of mass for non-fixed nodes
    const centerOfMass = vec3.create();
    let totalMass = 0;
    let nodeCount = 0;
    
    for (const node of nodes) {
      if (node.fixed) continue;
      
      vec3.scaleAndAdd(centerOfMass, centerOfMass, node.position, node.mass);
      totalMass += node.mass;
      nodeCount++;
    }
    
    if (totalMass === 0 || nodeCount === 0) return;
    
    // Calculate average position weighted by mass
    vec3.scale(centerOfMass, centerOfMass, 1 / totalMass);
    
    // Calculate offset from desired center to current center of mass
    const offset = vec3.create();
    vec3.subtract(offset, this.center, centerOfMass);
    
    // Apply centering force to each non-fixed node
    for (const node of nodes) {
      if (node.fixed) continue;
      
      const force = vec3.create();
      vec3.scale(force, offset, this.strength * deltaTime);
      vec3.add(node.velocity, node.velocity, force);
    }
  }
  
  setCenter(center: vec3): void {
    vec3.copy(this.center, center);
  }
  
  getCenter(): vec3 {
    return vec3.clone(this.center);
  }
  
  setStrength(strength: number): void {
    this.strength = strength;
  }
  
  getStrength(): number {
    return this.strength;
  }
}
