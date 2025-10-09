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
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef<string>(`mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const isFirstRender = useRef(true);
  const previousCodeRef = useRef<string>(code);

  useEffect(() => {
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

    let isMounted = true;
    const container = ref.current;

    const renderMermaid = async () => {
      try {
        setError(null);

        // Generate unique ID for this render
        const currentId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Validate syntax before rendering
        await mermaid.parse(code);

        // Render mermaid diagram
        const { svg } = await mermaid.render(currentId, code);

        // Only update DOM if component is still mounted AND we have the same container
        if (isMounted && container && ref.current === container) {
          // Don't clear - just set innerHTML which replaces content
          container.innerHTML = svg;
          idRef.current = currentId;
        } else {
          // Clean up orphaned elements if we unmounted during render
          document.querySelectorAll(`#${currentId}, #d${currentId}`).forEach(el => el.remove());
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
        console.error('[MermaidRenderer] Failed to render diagram', err);

        if (isMounted && container && ref.current === container) {
          setError(errorMessage);
          container.innerHTML = '';
        }
      }
    };

    renderMermaid();

    // Cleanup function - only runs on unmount
    return () => {
      isMounted = false;
    };
  }, [code]);

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
