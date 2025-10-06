import { mat4, vec3 } from 'gl-matrix';

export interface CameraOptions {
  fov?: number;
  near?: number;
  far?: number;
  minZoom?: number;
  maxZoom?: number;
}

export class Camera {
  position: vec3 = vec3.create();
  target: vec3 = vec3.create();
  up: vec3 = vec3.fromValues(0, 1, 0);
  
  zoom: number = 1.0;
  minZoom: number = 0.1;
  maxZoom: number = 5.0;
  
  viewMatrix: mat4 = mat4.create();
  projectionMatrix: mat4 = mat4.create();
  viewProjectionMatrix: mat4 = mat4.create();
  
  private width: number = 800;
  private height: number = 600;
  private fov: number = 45;
  private near: number = 1;
  private far: number = 10000;
  
  constructor(width: number, height: number, options: CameraOptions = {}) {
    this.fov = options.fov ?? 45;
    this.near = options.near ?? 1;
    this.far = options.far ?? 10000;
    this.minZoom = options.minZoom ?? 0.1;
    this.maxZoom = options.maxZoom ?? 5.0;
    
    this.resize(width, height);
    this.reset();
  }
  
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    
    // Use perspective projection for 3D graph visualization
    const aspect = width / height;
    
    mat4.perspective(
      this.projectionMatrix,
      (this.fov * Math.PI) / 180, // Convert to radians
      aspect,
      this.near,
      this.far
    );
    
    this.updateViewProjection();
  }
  
  pan(deltaX: number, deltaY: number): void {
    const scale = 2.0; // Adjust pan sensitivity
    
    // Get camera's right and up vectors
    const forward = vec3.create();
    vec3.subtract(forward, this.target, this.position);
    vec3.normalize(forward, forward);
    
    const right = vec3.create();
    vec3.cross(right, forward, this.up);
    vec3.normalize(right, right);
    
    const up = vec3.create();
    vec3.cross(up, right, forward);
    vec3.normalize(up, up);
    
    // Pan both position and target
    const panVector = vec3.create();
    vec3.scaleAndAdd(panVector, panVector, right, -deltaX * scale);
    vec3.scaleAndAdd(panVector, panVector, up, deltaY * scale);
    
    vec3.add(this.position, this.position, panVector);
    vec3.add(this.target, this.target, panVector);
    
    this.updateMatrices();
  }
  
  orbit(deltaX: number, deltaY: number): void {
    const sensitivity = 0.01;
    
    // Get vector from target to camera
    const offset = vec3.create();
    vec3.subtract(offset, this.position, this.target);
    
    // Convert to spherical coordinates
    const radius = vec3.length(offset);
    let theta = Math.atan2(offset[0], offset[2]); // Horizontal angle
    let phi = Math.acos(offset[1] / radius); // Vertical angle
    
    // Update angles
    theta -= deltaX * sensitivity;
    phi = Math.max(0.01, Math.min(Math.PI - 0.01, phi - deltaY * sensitivity));
    
    // Convert back to cartesian
    offset[0] = radius * Math.sin(phi) * Math.sin(theta);
    offset[1] = radius * Math.cos(phi);
    offset[2] = radius * Math.sin(phi) * Math.cos(theta);
    
    // Update camera position
    vec3.add(this.position, this.target, offset);
    
    this.updateMatrices();
  }
  
  // WASD movement controls
  moveForward(distance: number): void {
    const forward = vec3.create();
    vec3.subtract(forward, this.target, this.position);
    vec3.normalize(forward, forward);
    vec3.scaleAndAdd(this.position, this.position, forward, distance);
    vec3.scaleAndAdd(this.target, this.target, forward, distance);
    this.updateMatrices();
  }
  
  moveBackward(distance: number): void {
    this.moveForward(-distance);
  }
  
  moveLeft(distance: number): void {
    const forward = vec3.create();
    vec3.subtract(forward, this.target, this.position);
    vec3.normalize(forward, forward);
    
    const right = vec3.create();
    vec3.cross(right, forward, this.up);
    vec3.normalize(right, right);
    
    vec3.scaleAndAdd(this.position, this.position, right, -distance);
    vec3.scaleAndAdd(this.target, this.target, right, -distance);
    this.updateMatrices();
  }
  
  moveRight(distance: number): void {
    this.moveLeft(-distance);
  }
  
  moveUp(distance: number): void {
    // Move along world up direction (Y axis)
    const worldUp = vec3.fromValues(0, 1, 0);
    vec3.scaleAndAdd(this.position, this.position, worldUp, distance);
    vec3.scaleAndAdd(this.target, this.target, worldUp, distance);
    this.updateMatrices();
  }
  
  moveDown(distance: number): void {
    this.moveUp(-distance);
  }
  
  zoomBy(factor: number, _centerX?: number, _centerY?: number): void {
    // For 3D, we move the camera closer/further from the target
    const direction = vec3.create();
    vec3.subtract(direction, this.position, this.target);
    
    const distance = vec3.length(direction);
    const newDistance = Math.max(10, Math.min(5000, distance / factor)); // Clamp distance
    
    vec3.normalize(direction, direction);
    vec3.scale(direction, direction, newDistance);
    vec3.add(this.position, this.target, direction);
    
    this.updateMatrices();
  }
  
  zoomTo(targetZoom: number, centerX?: number, centerY?: number): void {
    const factor = targetZoom / this.zoom;
    this.zoomBy(factor, centerX, centerY);
  }
  
  focusOn(target: vec3, smooth: boolean = false): void {
    if (smooth) {
      // Smooth animation disabled to keep large graphs responsive
    }

    vec3.copy(this.target, target);
    vec3.copy(this.position, target);
    this.position[2] = 10; // Move camera back slightly for orthographic view
    
    this.updateMatrices();
  }
  
  reset(): void {
    vec3.set(this.position, 500, 500, 500); // Position camera away from origin
    vec3.set(this.target, 0, 0, 0); // Look at center
    vec3.set(this.up, 0, 1, 0);
    this.zoom = 1.0;
    this.resize(this.width, this.height);
  }
  
  screenToWorld(screenX: number, screenY: number, z: number = 0): vec3 {
    // Convert screen coordinates to normalized device coordinates
    const ndc = vec3.fromValues(
      (screenX / this.width) * 2 - 1,
      -((screenY / this.height) * 2 - 1),
      z
    );
    
    // Invert the view-projection matrix
    const invMatrix = mat4.create();
    const success = mat4.invert(invMatrix, this.viewProjectionMatrix);
    
    if (!success) {
      console.warn('Failed to invert view-projection matrix');
      return vec3.create();
    }
    
    // Transform NDC to world coordinates
    const worldPos = vec3.create();
    vec3.transformMat4(worldPos, ndc, invMatrix);
    
    return worldPos;
  }
  
  worldToScreen(worldPos: vec3): vec3 {
    // Transform world coordinates to clip space
    const clipPos = vec3.create();
    vec3.transformMat4(clipPos, worldPos, this.viewProjectionMatrix);
    
    // Convert to screen coordinates
    const screenPos = vec3.fromValues(
      (clipPos[0] + 1) * 0.5 * this.width,
      (1 - clipPos[1]) * 0.5 * this.height,
      clipPos[2]
    );
    
    return screenPos;
  }
  
  getViewMatrix(): mat4 {
    return mat4.clone(this.viewMatrix);
  }
  
  getProjectionMatrix(): mat4 {
    return mat4.clone(this.projectionMatrix);
  }
  
  getViewProjectionMatrix(): mat4 {
    return mat4.clone(this.viewProjectionMatrix);
  }
  
  getBounds(): { left: number; right: number; top: number; bottom: number } {
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.width, this.height);
    
    return {
      left: topLeft[0],
      right: bottomRight[0],
      top: topLeft[1],
      bottom: bottomRight[1]
    };
  }
  
  updateMatrices(): void {
    mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
    this.updateViewProjection();
  }
  
  private updateViewProjection(): void {
    mat4.multiply(this.viewProjectionMatrix, this.projectionMatrix, this.viewMatrix);
  }
}
