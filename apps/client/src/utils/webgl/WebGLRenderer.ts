import { createProgramFromSources, createBuffer, createVertexArray, checkGLError, disposeResources } from './context';
import { Camera } from './Camera';

interface Node {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  z: number;
}

interface Edge {
  source: string;
  target: string;
  type: string;
}

const nodeVertexShader = `#version 300 es
in vec3 position;
in vec3 color;
in float size;
in float nodeType;
in vec3 innerColor;

uniform mat4 viewProjectionMatrix;
uniform float pointSize;

out vec3 vColor;
out vec3 vInnerColor;
out float vNodeType;

void main() {
  gl_Position = viewProjectionMatrix * vec4(position, 1.0);
  gl_PointSize = pointSize * size;
  vColor = color;
  vInnerColor = innerColor;
  vNodeType = nodeType;
}
`;

const nodeFragmentShader = `#version 300 es
precision highp float;

in vec3 vColor;
in vec3 vInnerColor;
in float vNodeType;
out vec4 fragColor;

// Shape drawing functions
float drawCircle(vec2 coord, float radius) {
  return step(length(coord), radius);
}

float drawSquare(vec2 coord, float size) {
  vec2 absCoord = abs(coord);
  return step(max(absCoord.x, absCoord.y), size);
}

float drawDiamond(vec2 coord, float size) {
  vec2 absCoord = abs(coord);
  return step(absCoord.x + absCoord.y, size);
}

float drawTriangle(vec2 coord, float size) {
  // Upward pointing triangle
  float y = coord.y;
  float x = abs(coord.x);
  return step(y, size - x * 1.732) * step(-size, y);
}

float drawHexagon(vec2 coord, float size) {
  vec2 absCoord = abs(coord);
  float hex = step(absCoord.x, size * 0.866) * 
              step(absCoord.y, size * 0.5 + absCoord.x * 0.577);
  return hex;
}

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  
  // Node type mapping:
  // 0: file (square)
  // 1: class (diamond)  
  // 2: function (triangle)
  // 3: method (circle with square inside)
  // 4: interface (hexagon)
  // 5: module (hexagon with circle inside)
  // 6: variable (square with circle inside)
  // 7: property (circle with triangle inside)
  
  float outerShape = 0.0;
  float innerShape = 0.0;
  vec3 color = vColor;
  
  // Determine outer shape
  if (vNodeType < 0.5) {
    // File - square
    outerShape = drawSquare(coord, 0.4);
  } else if (vNodeType < 1.5) {
    // Class - diamond
    outerShape = drawDiamond(coord, 0.4);
  } else if (vNodeType < 2.5) {
    // Function - triangle
    outerShape = drawTriangle(coord, 0.4);
  } else if (vNodeType < 3.5) {
    // Method - circle with square inside
    outerShape = drawCircle(coord, 0.4);
    innerShape = drawSquare(coord, 0.2);
  } else if (vNodeType < 4.5) {
    // Interface - hexagon
    outerShape = drawHexagon(coord, 0.4);
  } else if (vNodeType < 5.5) {
    // Module - hexagon with circle inside
    outerShape = drawHexagon(coord, 0.4);
    innerShape = drawCircle(coord, 0.2);
  } else if (vNodeType < 6.5) {
    // Variable - square with circle inside
    outerShape = drawSquare(coord, 0.4);
    innerShape = drawCircle(coord, 0.2);
  } else {
    // Property - circle with triangle inside
    outerShape = drawCircle(coord, 0.4);
    innerShape = drawTriangle(coord, 0.15);
  }
  
  // Discard if outside outer shape
  if (outerShape < 0.5) {
    discard;
  }
  
  // Apply colors with better inner shape visibility
  vec3 finalColor = color;
  float alpha = 1.0;
  
  // If we have an inner shape, make it clearly visible
  if (innerShape > 0.5) {
    // Use the inner color directly for better contrast
    finalColor = vInnerColor;
    
    // Add a subtle border effect between outer and inner
    float innerEdge = 0.0;
    if (vNodeType > 2.5 && vNodeType < 3.5) {
      // Method - circle with square inside
      vec2 absCoord = abs(coord);
      innerEdge = smoothstep(0.18, 0.22, max(absCoord.x, absCoord.y));
    } else if (vNodeType > 5.5 && vNodeType < 6.5) {
      // Variable - square with circle inside  
      innerEdge = smoothstep(0.18, 0.22, length(coord));
    } else if (vNodeType > 6.5) {
      // Property - circle with triangle inside
      float y = coord.y;
      float x = abs(coord.x);
      float triDist = max(y - (0.15 - x * 1.732), -0.15 - y);
      innerEdge = smoothstep(-0.02, 0.02, triDist);
    } else {
      // Module - hexagon with circle inside
      innerEdge = smoothstep(0.18, 0.22, length(coord));
    }
    
    // Blend between inner and outer color at the edge
    finalColor = mix(vInnerColor, color * 0.8, innerEdge * 0.5);
  }
  
  // Add edge gradient for outer shape
  float edgeDist = 0.0;
  if (vNodeType < 0.5 || vNodeType > 5.5 && vNodeType < 6.5) {
    // Square-based shapes (file, variable)
    vec2 absCoord = abs(coord);
    edgeDist = max(absCoord.x, absCoord.y) / 0.4;
  } else if (vNodeType < 1.5) {
    // Diamond
    vec2 absCoord = abs(coord);
    edgeDist = (absCoord.x + absCoord.y) / 0.4;
  } else if (vNodeType < 2.5) {
    // Triangle
    float y = coord.y;
    float x = abs(coord.x);
    edgeDist = max((y - (0.4 - x * 1.732)) / 0.4, (-0.4 - y) / 0.4);
  } else if (vNodeType < 3.5 || vNodeType > 6.5) {
    // Circle-based shapes (method, property)
    edgeDist = length(coord) / 0.4;
  } else {
    // Hexagon-based shapes (interface, module)
    vec2 absCoord = abs(coord);
    float hexDist = max(absCoord.x / (0.4 * 0.866), 
                       (absCoord.y - 0.4 * 0.5) / (0.4 * 0.5 + absCoord.x * 0.577));
    edgeDist = hexDist;
  }
  
  // Soften edges slightly
  alpha = 1.0 - smoothstep(0.9, 1.0, edgeDist);
  
  // Add slight glow/outline effect
  float glow = 1.0 - smoothstep(0.95, 1.1, edgeDist);
  finalColor = mix(finalColor, finalColor * 1.2, glow * 0.3);
  
  fragColor = vec4(finalColor, alpha);
}
`;

const edgeVertexShader = `#version 300 es
in vec3 position;
in vec3 color;
in float thickness;
in float direction; // 0.0 = no arrow, 1.0 = forward arrow, -1.0 = reverse arrow

uniform mat4 viewProjectionMatrix;

out vec3 vColor;
out float vThickness;
out float vDirection;

void main() {
  gl_Position = viewProjectionMatrix * vec4(position, 1.0);
  vColor = color;
  vThickness = thickness;
  vDirection = direction;
}
`;

const edgeFragmentShader = `#version 300 es
precision highp float;

in vec3 vColor;
out vec4 fragColor;

void main() {
  fragColor = vec4(vColor, 0.6);
}
`;

export class WebGLRenderer {
  private gl: WebGL2RenderingContext;
  private nodeProgram: WebGLProgram;
  private edgeProgram: WebGLProgram;
  private nodeVAO: WebGLVertexArrayObject | null = null;
  private edgeVAO: WebGLVertexArrayObject | null = null;
  private nodeBuffer: WebGLBuffer | null = null;
  private edgeBuffer: WebGLBuffer | null = null;
  
  // Uniform locations
  private nodeViewProjectionLocation: WebGLUniformLocation | null = null;
  private nodePointSizeLocation: WebGLUniformLocation | null = null;
  private edgeViewProjectionLocation: WebGLUniformLocation | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    
    // Create shader programs
    this.nodeProgram = createProgramFromSources(gl, nodeVertexShader, nodeFragmentShader);
    this.edgeProgram = createProgramFromSources(gl, edgeVertexShader, edgeFragmentShader);
    
    // Get uniform locations
    this.nodeViewProjectionLocation = gl.getUniformLocation(this.nodeProgram, 'viewProjectionMatrix');
    this.nodePointSizeLocation = gl.getUniformLocation(this.nodeProgram, 'pointSize');
    this.edgeViewProjectionLocation = gl.getUniformLocation(this.edgeProgram, 'viewProjectionMatrix');
    
    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Enable depth testing with proper settings
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
  }

  render(nodes: Node[], edges: Edge[], camera: Camera, hoveredNodeId?: string | null, selectedNodeId?: string | null, nodeConnectionCounts?: Map<string, number>) {
    const gl = this.gl;
    
    // Clear the screen using theme background (fallback to dark blue)
    const theme = (window as any).__currentTheme;
    const bg = theme?.colors?.background?.primary || '#001133';
    const toRgb = (hex: string) => {
      try {
        const h = hex.replace('#','');
        const r = parseInt(h.substring(0,2),16)/255;
        const g = parseInt(h.substring(2,4),16)/255;
        const b = parseInt(h.substring(4,6),16)/255;
        return [r,g,b];
      } catch { return [0,0,0.2]; }
    };
    const [r,g,b] = bg.startsWith('#') ? toRgb(bg) : [0,0,0.2];
    gl.clearColor(r, g, b, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Update viewport
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    const viewProjectionMatrix = camera.getViewProjectionMatrix();
    
    
    // Render edges
    this.renderEdges(edges, nodes, viewProjectionMatrix);
    
    // Render nodes
    this.renderNodes(nodes, viewProjectionMatrix, hoveredNodeId, selectedNodeId, nodeConnectionCounts);
    
    checkGLError(gl, 'render');
  }

  private renderNodes(nodes: Node[], viewProjectionMatrix: any, hoveredNodeId?: string | null, selectedNodeId?: string | null, nodeConnectionCounts?: Map<string, number>) {
    const gl = this.gl;
    
    if (nodes.length === 0) {
      console.log('No nodes to render');
      return;
    }
    
    // Prepare node data
    const nodeData = new Float32Array(nodes.length * 11); // position(3) + color(3) + size(1) + nodeType(1) + innerColor(3)
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const isHovered = hoveredNodeId === node.id;
      const isSelected = selectedNodeId === node.id;
      
      // Position
      nodeData[i * 11 + 0] = node.x;
      nodeData[i * 11 + 1] = node.y;
      nodeData[i * 11 + 2] = node.z;
      
      // Color based on type
      const color = this.getNodeColor(node.type);
      if (isSelected) {
        nodeData[i * 11 + 3] = 1.0; // Bright yellow for selected
        nodeData[i * 11 + 4] = 1.0;
        nodeData[i * 11 + 5] = 0.0;
      } else if (isHovered) {
        nodeData[i * 11 + 3] = Math.min(color[0] + 0.3, 1.0);
        nodeData[i * 11 + 4] = Math.min(color[1] + 0.3, 1.0);
        nodeData[i * 11 + 5] = Math.min(color[2] + 0.3, 1.0);
      } else {
        nodeData[i * 11 + 3] = color[0];
        nodeData[i * 11 + 4] = color[1];
        nodeData[i * 11 + 5] = color[2];
      }
      
      // Size based on type importance and connections
      let baseSize = 1.0;
      const typeImportance: Record<string, number> = {
        'module': 1.5,    // Most important - architectural containers
        'file': 1.3,      // Important - file level
        'class': 1.2,     // Important - class definitions
        'interface': 1.1, // Important - interfaces
        'function': 0.9,  // Medium - functions
        'method': 0.8,    // Smaller - methods
        'variable': 0.7,  // Small - variables
        'property': 0.7   // Small - properties
      };
      
      baseSize = typeImportance[node.type] || 1.0;
      
      // Scale by connection count (complexity)
      const connectionCount = nodeConnectionCounts?.get(node.id) || 0;
      const complexityMultiplier = 1.0 + Math.min(connectionCount * 0.05, 1.0); // Max 2x size for highly connected nodes
      
      // Apply state multipliers
      const stateMultiplier = isSelected ? 2.0 : isHovered ? 1.5 : 1.0;
      
      nodeData[i * 11 + 6] = baseSize * complexityMultiplier * stateMultiplier;
      
      // Node type for shape selection
      let nodeType = 0;
      switch (node.type) {
        case 'file': nodeType = 0; break;
        case 'class': nodeType = 1; break;
        case 'function': nodeType = 2; break;
        case 'method': nodeType = 3; break;
        case 'interface': nodeType = 4; break;
        case 'module': nodeType = 5; break;
        case 'variable': nodeType = 6; break;
        case 'property': nodeType = 7; break;
      }
      nodeData[i * 11 + 7] = nodeType;
      
      // Inner color — avoid pure white; derive from outer color
      const lighten = (c: [number,number,number], amt = 0.2): [number,number,number] => [
        Math.min(c[0] + amt, 1),
        Math.min(c[1] + amt, 1),
        Math.min(c[2] + amt, 1)
      ];
      const darken = (c: [number,number,number], amt = 0.4): [number,number,number] => [
        Math.max(c[0] * (1-amt), 0),
        Math.max(c[1] * (1-amt), 0),
        Math.max(c[2] * (1-amt), 0)
      ];

      let inner: [number,number,number];
      if (node.type === 'method' || node.type === 'property') {
        inner = lighten(color, 0.25);
      } else if (node.type === 'variable') {
        inner = darken(color, 0.5);
      } else if (node.type === 'module') {
        inner = lighten(color, 0.15);
      } else {
        inner = darken(color, 0.6);
      }
      nodeData[i * 11 + 8] = inner[0];
      nodeData[i * 11 + 9] = inner[1];
      nodeData[i * 11 + 10] = inner[2];
    }
    
    // Update buffer
    if (!this.nodeBuffer) {
      this.nodeBuffer = createBuffer(gl, gl.ARRAY_BUFFER, nodeData, gl.DYNAMIC_DRAW);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, nodeData, gl.DYNAMIC_DRAW);
    }
    
    // Create/update VAO
    if (!this.nodeVAO) {
      this.nodeVAO = createVertexArray(gl, () => {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeBuffer);
        
        const stride = 11 * 4; // 11 floats per vertex
        
        // Position attribute
        const positionLocation = gl.getAttribLocation(this.nodeProgram, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, stride, 0);
        
        // Color attribute
        const colorLocation = gl.getAttribLocation(this.nodeProgram, 'color');
        gl.enableVertexAttribArray(colorLocation);
        gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, stride, 3 * 4);
        
        // Size attribute
        const sizeLocation = gl.getAttribLocation(this.nodeProgram, 'size');
        gl.enableVertexAttribArray(sizeLocation);
        gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, stride, 6 * 4);
        
        // Node type attribute
        const nodeTypeLocation = gl.getAttribLocation(this.nodeProgram, 'nodeType');
        gl.enableVertexAttribArray(nodeTypeLocation);
        gl.vertexAttribPointer(nodeTypeLocation, 1, gl.FLOAT, false, stride, 7 * 4);
        
        // Inner color attribute
        const innerColorLocation = gl.getAttribLocation(this.nodeProgram, 'innerColor');
        gl.enableVertexAttribArray(innerColorLocation);
        gl.vertexAttribPointer(innerColorLocation, 3, gl.FLOAT, false, stride, 8 * 4);
      });
    }
    
    // Render
    gl.useProgram(this.nodeProgram);
    gl.uniformMatrix4fv(this.nodeViewProjectionLocation, false, new Float32Array(viewProjectionMatrix));
    gl.uniform1f(this.nodePointSizeLocation, 12.0);
    
    gl.bindVertexArray(this.nodeVAO);
    gl.drawArrays(gl.POINTS, 0, nodes.length);
    gl.bindVertexArray(null);
  }

  private renderEdges(edges: Edge[], nodes: Node[], viewProjectionMatrix: any) {
    const gl = this.gl;
    
    if (edges.length === 0) return;
    
    // Create node lookup
    const nodeMap = new Map<string, Node>();
    nodes.forEach(node => nodeMap.set(node.id, node));
    
    // Prepare edge data (each edge = 2 vertices)
    const edgeData = new Float32Array(edges.length * 2 * 6); // 2 vertices * (position(3) + color(3))
    let vertexIndex = 0;
    
    // Store edge metadata for line width rendering
    const edgeMetadata: Array<{indices: [number, number], importance: number, direction: number}> = [];
    
    for (const edge of edges) {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      
      if (!sourceNode || !targetNode) continue;
      
      const color = this.getEdgeColor(edge.type);
      const importance = this.getEdgeImportance(edge.type);
      const direction = this.getEdgeDirection(edge.type);
      
      // Store indices for this edge
      edgeMetadata.push({
        indices: [vertexIndex, vertexIndex + 1],
        importance,
        direction
      });
      
      // Source vertex
      edgeData[vertexIndex * 6 + 0] = sourceNode.x;
      edgeData[vertexIndex * 6 + 1] = sourceNode.y;
      edgeData[vertexIndex * 6 + 2] = sourceNode.z;
      edgeData[vertexIndex * 6 + 3] = color[0];
      edgeData[vertexIndex * 6 + 4] = color[1];
      edgeData[vertexIndex * 6 + 5] = color[2];
      vertexIndex++;
      
      // Target vertex
      edgeData[vertexIndex * 6 + 0] = targetNode.x;
      edgeData[vertexIndex * 6 + 1] = targetNode.y;
      edgeData[vertexIndex * 6 + 2] = targetNode.z;
      edgeData[vertexIndex * 6 + 3] = color[0];
      edgeData[vertexIndex * 6 + 4] = color[1];
      edgeData[vertexIndex * 6 + 5] = color[2];
      vertexIndex++;
    }
    
    // Update buffer
    if (!this.edgeBuffer) {
      this.edgeBuffer = createBuffer(gl, gl.ARRAY_BUFFER, edgeData.slice(0, vertexIndex * 6), gl.DYNAMIC_DRAW);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, edgeData.slice(0, vertexIndex * 6), gl.DYNAMIC_DRAW);
    }
    
    // Create/update VAO
    if (!this.edgeVAO) {
      this.edgeVAO = createVertexArray(gl, () => {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeBuffer);
        
        // Position attribute
        const positionLocation = gl.getAttribLocation(this.edgeProgram, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 6 * 4, 0);
        
        // Color attribute
        const colorLocation = gl.getAttribLocation(this.edgeProgram, 'color');
        gl.enableVertexAttribArray(colorLocation);
        gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 6 * 4, 3 * 4);
      });
    }
    
    // Render edges with different thicknesses
    gl.useProgram(this.edgeProgram);
    gl.uniformMatrix4fv(this.edgeViewProjectionLocation, false, new Float32Array(viewProjectionMatrix));
    
    gl.bindVertexArray(this.edgeVAO);
    
    // Render edges in multiple passes for different line widths
    // Group edges by importance
    const edgeGroups = new Map<number, number[]>();
    edgeMetadata.forEach((meta) => {
      const width = Math.ceil(meta.importance);
      if (!edgeGroups.has(width)) {
        edgeGroups.set(width, []);
      }
      edgeGroups.get(width)!.push(meta.indices[0], meta.indices[1]);
    });
    
    // Render each group with appropriate line width
    edgeGroups.forEach((indices, width) => {
      gl.lineWidth(Math.min(width * 2, 8)); // Cap at 8px for compatibility
      
      // Draw only the edges in this group
      for (let i = 0; i < indices.length; i += 2) {
        gl.drawArrays(gl.LINES, indices[i], 2);
      }
    });
    
    gl.bindVertexArray(null);
  }

  private getNodeColor(type: string): [number, number, number] {
    // Get theme from DOM or window
    const theme = (window as any).__currentTheme;
    if (theme?.colors?.components?.[type]) {
      const color = theme.colors.components[type];
      // For 3D nodes, use the main color (text) for better visibility
      // If text color is not available, try bg color
      const colorValue = color.text || color.bg;
      if (colorValue) {
        const parsed = this.parseColor(colorValue);
        // Ensure good visibility in 3D space
        if (theme.type === 'dark') {
          // For dark themes, ensure colors are bright enough
          const brightness = (parsed[0] + parsed[1] + parsed[2]) / 3;
          if (brightness < 0.4) {
            // Lighten dark colors
            return [
              Math.min(parsed[0] * 1.5 + 0.2, 1.0),
              Math.min(parsed[1] * 1.5 + 0.2, 1.0),
              Math.min(parsed[2] * 1.5 + 0.2, 1.0)
            ];
          }
        }
        return parsed;
      }
    }

    // Fallback to hardcoded colors if theme not available
    switch (type) {
      case 'file': return [0.3, 0.8, 0.3]; // Green
      case 'class': return [0.2, 0.6, 1.0]; // Blue
      case 'function': return [1.0, 0.8, 0.0]; // Yellow
      case 'method': return [1.0, 0.6, 0.0]; // Orange
      case 'interface': return [0.8, 0.3, 1.0]; // Purple
      case 'module': return [0.6, 0.2, 0.8]; // Dark purple
      case 'variable': return [0.9, 0.2, 0.5]; // Pink
      case 'property': return [0.9, 0.3, 0.3]; // Red
      case 'component': return [0.4, 0.8, 1.0]; // Light blue
      case 'hook': return [0.5, 0.9, 0.5]; // Light green
      case 'service': return [0.3, 0.5, 1.0]; // Blue
      case 'controller': return [1.0, 0.7, 0.3]; // Orange
      case 'model': return [0.2, 0.9, 0.7]; // Teal
      case 'schema': return [0.9, 0.9, 0.3]; // Yellow
      case 'route': return [1.0, 0.4, 0.5]; // Rose
      case 'middleware': return [0.5, 0.6, 1.0]; // Light blue
      case 'test': return [0.3, 0.9, 0.6]; // Emerald
      case 'config': return [0.7, 0.5, 1.0]; // Lavender
      case 'constant': return [0.3, 0.3, 0.4]; // Dark gray
      case 'util': return [1.0, 0.9, 0.3]; // Bright yellow
      case 'helper': return [0.9, 0.9, 0.6]; // Pale yellow
      default: return [0.6, 0.6, 0.6]; // Gray
    }
  }

  private getEdgeColor(type: string): [number, number, number] {
    const theme = (window as any).__currentTheme;
    let resolved: [number, number, number] | null = null;

    // Try to get colors from theme using the correct structure
    if (theme?.colors) {
      let color: string | undefined;

      // Map relationship types to theme colors
      switch (type) {
        case 'imports':
          color = theme.colors.primary?.[500] || theme.colors.info?.[500];
          break;
        case 'extends':
          color = theme.colors.success?.[500];
          break;
        case 'implements':
          color = theme.colors.accent?.[500];
          break;
        case 'calls':
          color = theme.colors.warning?.[500];
          break;
        case 'contains':
          color = theme.colors.foreground?.tertiary || theme.colors.border?.primary;
          break;
        case 'uses':
          color = theme.colors.error?.[500];
          break;
        case 'references':
          color = theme.colors.secondary?.[500];
          break;
        default:
          color = theme.colors.foreground?.muted;
      }

      if (color && typeof color === 'string') {
        resolved = this.parseColor(color);
      }
    }

    if (!resolved) {
      switch (type) {
        case 'imports':
          resolved = [0.6, 0.6, 1.0]; // Brighter Blue
          break;
        case 'extends':
          resolved = [0.4, 1.0, 0.4]; // Brighter Green
          break;
        case 'implements':
          resolved = [1.0, 0.6, 1.0]; // Brighter Purple
          break;
        case 'calls':
          resolved = [1.0, 0.8, 0.4]; // Brighter Orange
          break;
        case 'contains':
          resolved = [0.8, 0.8, 0.8]; // Brighter Gray
          break;
        case 'uses':
          resolved = [1.0, 0.4, 0.4]; // Brighter Red
          break;
        case 'references':
          resolved = [0.6, 1.0, 1.0]; // Brighter Cyan
          break;
        default:
          resolved = [0.7, 0.7, 0.7]; // Brighter Default gray
      }
    }

    return this.ensureEdgeContrast(resolved, theme);
  }

  private parseColor(color: string): [number, number, number] {
    // Parse hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return [r, g, b];
    }

    // Parse rgba colors
    if (color.startsWith('rgba')) {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        return [
          parseInt(match[1]) / 255,
          parseInt(match[2]) / 255,
          parseInt(match[3]) / 255
        ];
      }
    }

    // Parse rgb colors
    if (color.startsWith('rgb')) {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        return [
          parseInt(match[1]) / 255,
          parseInt(match[2]) / 255,
          parseInt(match[3]) / 255
        ];
      }
    }

    // Default gray
    return [0.5, 0.5, 0.5];
  }

  private ensureEdgeContrast(color: [number, number, number], theme: any): [number, number, number] {
    const bgToken = theme?.colors?.background?.canvas || theme?.colors?.background?.surface || theme?.colors?.background?.primary;
    const background = typeof bgToken === 'string' ? this.parseColor(bgToken) : this.parseColor('#001133');

    const colorLum = this.getLuminance(color);
    const bgLum = this.getLuminance(background);
    const contrast = Math.abs(colorLum - bgLum);

    if (contrast >= 0.25) {
      return color;
    }

    if (bgLum >= 0.5) {
      return this.adjustColor(color, -0.55);
    }

    return this.adjustColor(color, 0.45);
  }

  private getLuminance([r, g, b]: [number, number, number]): number {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private adjustColor([r, g, b]: [number, number, number], amount: number): [number, number, number] {
    const adjust = (value: number) => {
      if (amount < 0) {
        return this.clamp(value * (1 + amount));
      }
      return this.clamp(value + (1 - value) * amount);
    };

    return [adjust(r), adjust(g), adjust(b)];
  }

  private clamp(value: number): number {
    if (Number.isNaN(value)) return 0;
    return Math.min(1, Math.max(0, value));
  }

  private getEdgeImportance = (type: string): number => {
    // Return importance multiplier for edge thickness
    switch (type) {
      case 'extends': return 2.0; // Inheritance is architecturally critical
      case 'implements': return 1.8; // Interface implementation is important
      case 'imports': return 1.5; // Dependencies are significant
      case 'calls': return 1.2; // Function calls show execution flow
      case 'contains': return 1.0; // Structural containment is baseline
      case 'uses': return 0.8; // Usage is less critical
      case 'references': return 0.6; // References are least critical
      default: return 1.0;
    }
  }

  private getEdgeDirection = (type: string): number => {
    // Return 1.0 for forward arrow, -1.0 for reverse, 0.0 for no arrow
    switch (type) {
      case 'extends': return 1.0; // Child extends parent (forward)
      case 'implements': return 1.0; // Class implements interface (forward)
      case 'imports': return 1.0; // Importer depends on imported (forward)
      case 'calls': return 1.0; // Caller calls callee (forward)
      case 'uses': return 1.0; // User uses used (forward)
      case 'references': return 0.0; // References can be bidirectional
      case 'contains': return 0.0; // Containment is structural, not directional
      default: return 0.0;
    }
  }

  destroy() {
    const gl = this.gl;
    disposeResources(gl, {
      programs: [this.nodeProgram, this.edgeProgram],
      buffers: [this.nodeBuffer, this.edgeBuffer].filter(b => b !== null) as WebGLBuffer[],
      vaos: [this.nodeVAO, this.edgeVAO].filter(v => v !== null) as WebGLVertexArrayObject[]
    });
  }
}
