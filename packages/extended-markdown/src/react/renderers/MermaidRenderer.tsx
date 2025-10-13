import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  code: string;
  options?: {
    theme?: 'default' | 'dark' | 'forest' | 'neutral';
    themeVariables?: Record<string, string>;
    securityLevel?: 'strict' | 'loose';
  };
}

// Always initialize on mount; mermaid.initialize is idempotent and cheap
const initializeMermaid = (options: MermaidRendererProps['options'] = {}) => {
  mermaid.initialize({
    startOnLoad: false,
    theme: options.theme || 'dark',
    themeVariables: options.themeVariables || {
      primaryColor: '#3b82f6',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#1e40af',
      lineColor: '#6b7280',
      sectionBkgColor: '#1f2937',
      altSectionBkgColor: '#374151',
      gridColor: '#4b5563',
      secondaryColor: '#f59e0b',
      tertiaryColor: '#8b5cf6',
    },
    securityLevel: options.securityLevel || 'loose',
    maxEdges: 2000, // Increase edge limit for large graphs
  });
};

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code, options }) => {
  console.log('[MermaidRenderer] COMPONENT CALLED, code length:', code?.length);
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef<string>(`mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const isFirstRender = useRef(true);
  const previousCodeRef = useRef<string>(code);
  const isMountedRef = useRef(true);

  useEffect(() => {
    console.log('[MermaidRenderer useEffect 1] Initializing, options:', options);
    console.log('[MermaidRenderer useEffect 1] mermaid object:', typeof mermaid, mermaid);
    initializeMermaid(options);
  }, [options]);

  useEffect(() => {
    if (!ref.current) return;

    // Only re-render if code value actually changed (compare by value, not reference)
    if (previousCodeRef.current === code && !isFirstRender.current) {
      return;
    }
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    previousCodeRef.current = code;

    const container = ref.current;

    const renderMermaid = async () => {
      console.log('[MermaidRenderer] Starting render, code:', code.substring(0, 100));
      try {
        setError(null);

        // Generate unique ID for this render
        const currentId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log('[MermaidRenderer] Generated ID:', currentId);

        // Validate syntax before rendering
        console.log('[MermaidRenderer] Parsing...');
        await mermaid.parse(code);
        console.log('[MermaidRenderer] Parse success');

        // Render mermaid diagram
        console.log('[MermaidRenderer] Rendering...');
        const { svg } = await mermaid.render(currentId, code);
        console.log('[MermaidRenderer] Render success, SVG length:', svg.length);

        // Only update DOM if ref still exists - don't check isMounted because React strict mode breaks it
        if (ref.current) {
          console.log('[MermaidRenderer] Setting innerHTML');
          ref.current.innerHTML = svg;
          idRef.current = currentId;
          console.log('[MermaidRenderer] Done');
        } else {
          console.log('[MermaidRenderer] Ref is null, cleaning up');
          document.querySelectorAll(`#${currentId}, #d${currentId}`).forEach(el => el.remove());
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
        console.error('[MermaidRenderer] Failed to render diagram', err);

        if (isMountedRef.current && container && ref.current === container) {
          setError(errorMessage);
          container.innerHTML = '';
        }
      }
    };

    renderMermaid();
  }, [code]);

  // Cleanup on unmount
  useEffect(() => {
    console.log('[MermaidRenderer useEffect unmount tracker] Mounted, setting isMountedRef to true');
    isMountedRef.current = true;
    return () => {
      console.log('[MermaidRenderer useEffect unmount tracker] CLEANUP RUNNING, setting isMountedRef to false');
      isMountedRef.current = false;
    };
  }, []);

  return (
    <div ref={ref} className="my-2 overflow-x-auto mermaid-diagram">
      {error && (
        <div className="space-y-2">
          <div className="text-xs text-destructive">
            <strong>Mermaid Render Error:</strong> {error}
          </div>
          <pre className="overflow-x-auto text-xs bg-card/40 border border-border/40 rounded-md p-3">
{code}
          </pre>
        </div>
      )}
    </div>
  );
};
