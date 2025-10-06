#version 300 es
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
}