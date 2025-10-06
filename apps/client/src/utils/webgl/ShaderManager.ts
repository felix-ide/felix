import { createProgramFromSources, getAttributeLocations, getUniformLocations } from './context';
import { ProgramInfo } from './types';
import { ShaderSource } from './types';

/**
 * Manages WebGL shader programs with caching and loading
 */
export class ShaderManager {
  private gl: WebGL2RenderingContext;
  private programs: Map<string, ProgramInfo> = new Map();

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /**
   * Load shader program from source strings
   */
  createProgram(
    name: string,
    vertexSource: string,
    fragmentSource: string,
    attributeNames: string[] = [],
    uniformNames: string[] = []
  ): ProgramInfo {
    if (this.programs.has(name)) {
      throw new Error(`Program '${name}' already exists`);
    }

    const program = createProgramFromSources(this.gl, vertexSource, fragmentSource);
    
    const attributes = getAttributeLocations(this.gl, program, attributeNames);
    const uniforms = getUniformLocations(this.gl, program, uniformNames);

    const programInfo: ProgramInfo = {
      program,
      attributes,
      uniforms
    };

    this.programs.set(name, programInfo);
    return programInfo;
  }

  /**
   * Load shader program from URLs
   */
  async loadProgram(
    name: string,
    vertexUrl: string,
    fragmentUrl: string,
    attributeNames: string[] = [],
    uniformNames: string[] = []
  ): Promise<ProgramInfo> {
    try {
      const [vertexSource, fragmentSource] = await Promise.all([
        fetch(vertexUrl).then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load vertex shader: ${response.statusText}`);
          }
          return response.text();
        }),
        fetch(fragmentUrl).then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load fragment shader: ${response.statusText}`);
          }
          return response.text();
        })
      ]);

      return this.createProgram(name, vertexSource, fragmentSource, attributeNames, uniformNames);
    } catch (error) {
      throw new Error(`Failed to load shader program '${name}': ${error}`);
    }
  }

  /**
   * Load shader program from shader source object
   */
  createProgramFromSource(
    name: string,
    shaderSource: ShaderSource,
    attributeNames: string[] = [],
    uniformNames: string[] = []
  ): ProgramInfo {
    return this.createProgram(
      name,
      shaderSource.vertex,
      shaderSource.fragment,
      attributeNames,
      uniformNames
    );
  }

  /**
   * Get a cached program
   */
  getProgram(name: string): ProgramInfo | undefined {
    return this.programs.get(name);
  }

  /**
   * Check if a program exists
   */
  hasProgram(name: string): boolean {
    return this.programs.has(name);
  }

  /**
   * Use a program (bind it for rendering)
   */
  useProgram(name: string): ProgramInfo {
    const programInfo = this.programs.get(name);
    if (!programInfo) {
      throw new Error(`Program '${name}' not found`);
    }

    this.gl.useProgram(programInfo.program);
    return programInfo;
  }

  /**
   * Delete a specific program
   */
  deleteProgram(name: string): boolean {
    const programInfo = this.programs.get(name);
    if (programInfo) {
      this.gl.deleteProgram(programInfo.program);
      this.programs.delete(name);
      return true;
    }
    return false;
  }

  /**
   * Get all program names
   */
  getProgramNames(): string[] {
    return Array.from(this.programs.keys());
  }

  /**
   * Dispose of all programs
   */
  dispose(): void {
    for (const programInfo of this.programs.values()) {
      this.gl.deleteProgram(programInfo.program);
    }
    this.programs.clear();
  }
}

/**
 * Predefined shader sources for nodes and edges
 */
export const GRAPH_SHADERS = {
  node: {
    vertex: `#version 300 es
precision highp float;

// Per-vertex attributes (circle geometry)
in vec2 a_position;  // (-1,-1) to (1,1) for circle

// Per-instance attributes
in vec3 a_instancePosition;  // World position
in float a_instanceSize;     // Radius
in vec4 a_instanceColor;     // RGBA color
in float a_instanceSelected; // 0.0 or 1.0

uniform mat4 u_viewProjectionMatrix;
uniform vec2 u_resolution;
uniform float u_pixelRatio;

out vec4 v_color;
out vec2 v_uv;
out float v_selected;

void main() {
  // Scale circle by instance size
  vec3 worldPos = vec3(
    a_position * a_instanceSize + a_instancePosition.xy,
    a_instancePosition.z
  );
  
  gl_Position = u_viewProjectionMatrix * vec4(worldPos, 1.0);
  
  v_color = a_instanceColor;
  v_uv = a_position;
  v_selected = a_instanceSelected;
}`,
    fragment: `#version 300 es
precision highp float;

in vec4 v_color;
in vec2 v_uv;
in float v_selected;

out vec4 fragColor;

void main() {
  float dist = length(v_uv);
  
  // Discard pixels outside circle
  if (dist > 1.0) discard;
  
  // Smooth circle edge
  float alpha = 1.0 - smoothstep(0.8, 1.0, dist);
  
  // Selection highlight
  vec3 finalColor = v_color.rgb;
  if (v_selected > 0.5) {
    finalColor = mix(finalColor, vec3(0.0, 0.5, 1.0), 0.3);
    alpha *= 1.0 + 0.5 * (1.0 - dist); // Glow effect
  }
  
  fragColor = vec4(finalColor, v_color.a * alpha);
}`
  },
  edge: {
    vertex: `#version 300 es
precision highp float;

// Per-vertex attributes (line geometry)
in vec2 a_position;  // (0,0) to (1,1) for line quad

// Per-instance attributes  
in vec3 a_startPosition;
in vec3 a_endPosition;
in float a_width;
in vec4 a_color;
in float a_selected;

uniform mat4 u_viewProjectionMatrix;
uniform vec2 u_resolution;

out vec4 v_color;
out vec2 v_uv;
out float v_selected;

void main() {
  // Calculate line direction and normal
  vec3 direction = a_endPosition - a_startPosition;
  vec3 normal = normalize(vec3(-direction.y, direction.x, 0.0));
  
  // Create line quad vertices
  vec3 offset = normal * a_width * (a_position.y - 0.5);
  vec3 worldPos = mix(a_startPosition, a_endPosition, a_position.x) + offset;
  
  gl_Position = u_viewProjectionMatrix * vec4(worldPos, 1.0);
  
  v_color = a_color;
  v_uv = a_position;
  v_selected = a_selected;
}`,
    fragment: `#version 300 es
precision highp float;

in vec4 v_color;
in vec2 v_uv;
in float v_selected;

out vec4 fragColor;

void main() {
  // Fade edges towards ends
  float fadeY = abs(v_uv.y - 0.5) * 2.0;
  float alpha = 1.0 - smoothstep(0.8, 1.0, fadeY);
  
  // Selection highlight
  vec3 finalColor = v_color.rgb;
  if (v_selected > 0.5) {
    finalColor = mix(finalColor, vec3(0.0, 0.5, 1.0), 0.4);
  }
  
  fragColor = vec4(finalColor, v_color.a * alpha);
}`
  }
} as const;

/**
 * Initialize standard graph shaders
 */
export function initializeGraphShaders(shaderManager: ShaderManager): void {
  // Node shader attributes and uniforms
  const nodeAttributes = [
    'a_position',
    'a_instancePosition',
    'a_instanceSize',
    'a_instanceColor',
    'a_instanceSelected'
  ];
  
  const nodeUniforms = [
    'u_viewProjectionMatrix',
    'u_resolution',
    'u_pixelRatio'
  ];

  // Edge shader attributes and uniforms
  const edgeAttributes = [
    'a_position',
    'a_startPosition',
    'a_endPosition',
    'a_width',
    'a_color',
    'a_selected'
  ];
  
  const edgeUniforms = [
    'u_viewProjectionMatrix',
    'u_resolution'
  ];

  // Create programs
  shaderManager.createProgramFromSource('node', GRAPH_SHADERS.node, nodeAttributes, nodeUniforms);
  shaderManager.createProgramFromSource('edge', GRAPH_SHADERS.edge, edgeAttributes, edgeUniforms);
}
