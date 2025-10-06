#version 300 es
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
}