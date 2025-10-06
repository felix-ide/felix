import React, { useRef, useEffect, useCallback } from 'react';

export interface WebGLCanvasProps {
  width?: number;
  height?: number;
  onContextLost?: () => void;
  onContextRestored?: () => void;
  className?: string;
  onContextReady?: (gl: WebGL2RenderingContext) => void;
}

export const WebGLCanvas: React.FC<WebGLCanvasProps> = ({
  width = 800,
  height = 600,
  onContextLost,
  onContextRestored,
  onContextReady,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);

  const handleContextLost = useCallback((event: Event) => {
    event.preventDefault();
    console.warn('WebGL context lost');
    glRef.current = null;
    onContextLost?.();
  }, [onContextLost]);

  const handleContextRestored = useCallback(() => {
    console.log('WebGL context restored');
    const canvas = canvasRef.current;
    if (canvas) {
      initializeWebGL(canvas);
    }
    onContextRestored?.();
  }, [onContextRestored]);

  const initializeWebGL = useCallback((canvas: HTMLCanvasElement) => {
    // Get WebGL2 context with optimal settings
    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    });

    if (!gl) {
      console.error('WebGL2 not supported in this browser');
      return;
    }

    // Check for required extensions
    const requiredExtensions = [
      'EXT_color_buffer_float',
      'OES_texture_float_linear'
    ];

    for (const extName of requiredExtensions) {
      const ext = gl.getExtension(extName);
      if (!ext) {
        console.warn(`WebGL extension ${extName} not available`);
      }
    }

    // Set up basic GL state
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.95, 0.95, 0.95, 1.0);

    glRef.current = gl;
    onContextReady?.(gl);
  }, [onContextReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Initialize WebGL
    initializeWebGL(canvas);

    // Add event listeners for context loss/restore
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [width, height, handleContextLost, handleContextRestored, initializeWebGL]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
};

export default WebGLCanvas;