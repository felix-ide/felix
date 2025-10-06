/**
 * TypeScript definitions for WebGL-related types and interfaces
 */

export interface WebGLContextConfig {
  antialias?: boolean;
  alpha?: boolean;
  premultipliedAlpha?: boolean;
  depth?: boolean;
  stencil?: boolean;
  preserveDrawingBuffer?: boolean;
  powerPreference?: 'default' | 'high-performance' | 'low-power';
}

export interface ShaderSource {
  vertex: string;
  fragment: string;
}

export interface AttributeInfo {
  name: string;
  location: number;
  type: GLenum;
  size: number;
}

export interface UniformInfo {
  name: string;
  location: WebGLUniformLocation | null;
  type: GLenum;
  size: number;
}

export interface ProgramInfo {
  program: WebGLProgram;
  attributes: Record<string, number>;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

export interface BufferInfo {
  buffer: WebGLBuffer;
  target: GLenum;
  usage: GLenum;
  size: number;
}

export interface VertexArrayInfo {
  vao: WebGLVertexArrayObject;
  buffers: BufferInfo[];
  indexBuffer?: BufferInfo;
  elementCount: number;
}

export interface RenderState {
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  uniforms: Record<string, any>;
  elementCount: number;
  mode: GLenum;
}

export interface WebGLCapabilities {
  maxTextureSize: number;
  maxTextureUnits: number;
  maxVertexAttributes: number;
  maxUniformVectors: number;
  maxVaryingVectors: number;
  extensions: string[];
}

export interface GraphNode {
  id: string;
  position: [number, number, number];
  size: number;
  color: [number, number, number, number];
  selected: boolean;
  type: string;
  label?: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  width: number;
  color: [number, number, number, number];
  selected: boolean;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RenderTarget {
  framebuffer: WebGLFramebuffer | null;
  width: number;
  height: number;
  colorTexture?: WebGLTexture;
  depthTexture?: WebGLTexture;
}

export interface MaterialUniforms {
  viewProjectionMatrix: Float32Array;
  resolution: [number, number];
  pixelRatio: number;
  time: number;
}

export interface InstancedDrawCall {
  vao: WebGLVertexArrayObject;
  program: WebGLProgram;
  uniforms: Record<string, any>;
  instanceCount: number;
  mode: GLenum;
  first?: number;
  count?: number;
}

export interface Camera3DState {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  fov: number;
  near: number;
  far: number;
  zoom: number;
}

export interface ViewportState {
  x: number;
  y: number;
  width: number;
  height: number;
  pixelRatio: number;
}