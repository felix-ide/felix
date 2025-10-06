#version 300 es
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
}