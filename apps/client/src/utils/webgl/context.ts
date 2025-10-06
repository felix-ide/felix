/**
 * WebGL utility functions for shader and program management
 */

export interface ShaderCompilationError extends Error {
  shaderType: 'vertex' | 'fragment';
  source: string;
  log: string;
}

export interface ProgramLinkError extends Error {
  vertexSource: string;
  fragmentSource: string;
  log: string;
}

// ProgramInfo type lives in './types' to avoid duplication

/**
 * Creates and compiles a WebGL shader
 */
export function createShader(
  gl: WebGL2RenderingContext,
  type: GLenum,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Failed to create shader object');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || 'Unknown shader error';
    gl.deleteShader(shader);
    
    const error = new Error(`Shader compilation failed: ${log}`) as ShaderCompilationError;
    error.shaderType = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
    error.source = source;
    error.log = log;
    throw error;
  }

  return shader;
}

/**
 * Creates and links a WebGL program from vertex and fragment shaders
 */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) {
    throw new Error('Failed to create program object');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) || 'Unknown program error';
    gl.deleteProgram(program);
    
    const error = new Error(`Program linking failed: ${log}`) as ProgramLinkError;
    error.vertexSource = gl.getShaderSource(vertexShader) || '';
    error.fragmentSource = gl.getShaderSource(fragmentShader) || '';
    error.log = log;
    throw error;
  }

  return program;
}

/**
 * Creates a program from vertex and fragment shader source code
 */
export function createProgramFromSources(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  
  try {
    return createProgram(gl, vertexShader, fragmentShader);
  } finally {
    // Clean up shaders (they're no longer needed after linking)
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
  }
}

/**
 * Gets all attribute locations for a program
 */
export function getAttributeLocations(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  attributeNames: string[]
): Record<string, number> {
  const locations: Record<string, number> = {};
  
  for (const name of attributeNames) {
    const location = gl.getAttribLocation(program, name);
    if (location === -1) {
      console.warn(`Attribute '${name}' not found in shader program`);
    }
    locations[name] = location;
  }
  
  return locations;
}

/**
 * Gets all uniform locations for a program
 */
export function getUniformLocations(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  uniformNames: string[]
): Record<string, WebGLUniformLocation | null> {
  const locations: Record<string, WebGLUniformLocation | null> = {};
  
  for (const name of uniformNames) {
    const location = gl.getUniformLocation(program, name);
    if (!location) {
      console.warn(`Uniform '${name}' not found in shader program`);
    }
    locations[name] = location;
  }
  
  return locations;
}

/**
 * Creates a buffer and uploads data
 */
export function createBuffer(
  gl: WebGL2RenderingContext,
  target: GLenum,
  data: BufferSource,
  usage: GLenum = gl.STATIC_DRAW
): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new Error('Failed to create buffer');
  }
  
  gl.bindBuffer(target, buffer);
  gl.bufferData(target, data, usage);
  gl.bindBuffer(target, null);
  
  return buffer;
}

/**
 * Creates a vertex array object with attribute setup
 */
export function createVertexArray(
  gl: WebGL2RenderingContext,
  setup: (gl: WebGL2RenderingContext) => void
): WebGLVertexArrayObject {
  const vao = gl.createVertexArray();
  if (!vao) {
    throw new Error('Failed to create vertex array object');
  }
  
  gl.bindVertexArray(vao);
  setup(gl);
  gl.bindVertexArray(null);
  
  return vao;
}

/**
 * Checks for WebGL errors and throws if any are found
 */
export function checkGLError(gl: WebGL2RenderingContext, operation?: string): void {
  const error = gl.getError();
  if (error !== gl.NO_ERROR) {
    const errorName = getGLErrorName(gl, error);
    const message = operation 
      ? `WebGL error after ${operation}: ${errorName} (${error})`
      : `WebGL error: ${errorName} (${error})`;
    throw new Error(message);
  }
}

/**
 * Gets a human-readable name for a WebGL error code
 */
function getGLErrorName(gl: WebGL2RenderingContext, error: GLenum): string {
  switch (error) {
    case gl.NO_ERROR: return 'NO_ERROR';
    case gl.INVALID_ENUM: return 'INVALID_ENUM';
    case gl.INVALID_VALUE: return 'INVALID_VALUE';
    case gl.INVALID_OPERATION: return 'INVALID_OPERATION';
    case gl.INVALID_FRAMEBUFFER_OPERATION: return 'INVALID_FRAMEBUFFER_OPERATION';
    case gl.OUT_OF_MEMORY: return 'OUT_OF_MEMORY';
    case gl.CONTEXT_LOST_WEBGL: return 'CONTEXT_LOST_WEBGL';
    default: return 'UNKNOWN_ERROR';
  }
}

/**
 * Safely disposes of WebGL resources
 */
export function disposeResources(gl: WebGL2RenderingContext, resources: {
  programs?: WebGLProgram[];
  buffers?: WebGLBuffer[];
  vaos?: WebGLVertexArrayObject[];
  textures?: WebGLTexture[];
}): void {
  const { programs = [], buffers = [], vaos = [], textures = [] } = resources;
  
  programs.forEach(program => gl.deleteProgram(program));
  buffers.forEach(buffer => gl.deleteBuffer(buffer));
  vaos.forEach(vao => gl.deleteVertexArray(vao));
  textures.forEach(texture => gl.deleteTexture(texture));
}
