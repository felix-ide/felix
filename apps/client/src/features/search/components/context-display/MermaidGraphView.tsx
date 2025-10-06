import { useRef, useEffect, useState } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useTheme } from '@felix/theme-system';

interface MermaidGraphViewProps {
  components: any[];
  relationships: any[];
  focusId?: string | null;
  direction?: 'LR' | 'TB';
}

export function MermaidGraphView({ components, relationships, focusId, direction = 'LR' }: MermaidGraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();

  // Handle zoom with mouse wheel
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Handle panning
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
        container.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        setTranslate({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      if (container) container.style.cursor = 'grab';
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, panStart, translate]);

  const handleZoomIn = () => setScale(prev => Math.min(10, prev * 1.2));
  const handleZoomOut = () => setScale(prev => Math.max(0.1, prev * 0.8));
  const handleReset = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!svgRef.current || components.length === 0) return;

    const isDark = theme === 'dark';

    // Initialize mermaid with theme-aware colors
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      flowchart: {
        nodeSpacing: 60,
        rankSpacing: 80,
        padding: 20,
        useMaxWidth: false,  // Render at natural size
        htmlLabels: true,
      },
      themeVariables: {
        primaryColor: isDark ? '#1e293b' : '#e2e8f0',
        primaryTextColor: isDark ? '#f1f5f9' : '#1e293b',
        primaryBorderColor: isDark ? '#475569' : '#94a3b8',
        lineColor: isDark ? '#475569' : '#94a3b8',
        secondaryColor: isDark ? '#334155' : '#cbd5e1',
        tertiaryColor: isDark ? '#475569' : '#94a3b8',
        background: isDark ? '#0f172a' : '#ffffff',
        mainBkg: isDark ? '#1e293b' : '#f1f5f9',
        secondBkg: isDark ? '#334155' : '#e2e8f0',
        tertiaryTextColor: isDark ? '#f1f5f9' : '#1e293b',
        fontSize: '14px',
      },
      maxTextSize: 900000,
      maxEdges: 5000,
    });

    const lines: string[] = [`graph ${direction}`];

    // Create a map of component IDs to simplified names and assign unique IDs
    const componentMap = new Map<string, { nodeId: string; name: string; type: string }>();
    components.forEach((comp, idx) => {
      const simpleName = comp.name || comp.id.split('|').pop() || 'unknown';
      const type = String(comp.type || 'component').toLowerCase();
      const nodeId = `N${idx}`; // Simple numeric ID
      componentMap.set(comp.id, { nodeId, name: simpleName, type });
    });

    // Add nodes - simple syntax with quoted labels
    components.forEach((comp) => {
      const info = componentMap.get(comp.id);
      if (!info) return;

      // Clean the name
      const cleanName = info.name.replace(/["']/g, '').substring(0, 40);
      const isFocus = comp.id === focusId;
      const styleClass = isFocus ? 'focusNode' : `type${info.type}`;

      // Simple rectangular node syntax
      lines.push(`  ${info.nodeId}["${cleanName}"]:::${styleClass}`);
    });

    // Add edges
    relationships.forEach((rel) => {
      const source = componentMap.get(rel.sourceId);
      const target = componentMap.get(rel.targetId);
      if (!source || !target) return;

      const relType = String(rel.type || 'relates').substring(0, 15);

      // Simple arrow
      lines.push(`  ${source.nodeId} --> |${relType}| ${target.nodeId}`);
    });

    // Add theme-aware styling with hardcoded colors
    const nodeStyles = isDark ? {
      // Dark theme - darker backgrounds with light text
      focus: 'fill:#facc15,stroke:#eab308,stroke-width:3px,color:#000',
      class: 'fill:#1e293b,stroke:#475569,stroke-width:2px,color:#f1f5f9',
      interface: 'fill:#312e81,stroke:#4c1d95,stroke-width:2px,color:#e0e7ff',
      function: 'fill:#064e3b,stroke:#047857,stroke-width:2px,color:#d1fae5',
      method: 'fill:#14532d,stroke:#15803d,stroke-width:2px,color:#dcfce7',
      component: 'fill:#1f2937,stroke:#4b5563,stroke-width:2px,color:#e5e7eb',
    } : {
      // Light theme - lighter backgrounds with dark text
      focus: 'fill:#fde047,stroke:#facc15,stroke-width:3px,color:#000',
      class: 'fill:#dbeafe,stroke:#60a5fa,stroke-width:2px,color:#1e3a8a',
      interface: 'fill:#e9d5ff,stroke:#a78bfa,stroke-width:2px,color:#4c1d95',
      function: 'fill:#d1fae5,stroke:#34d399,stroke-width:2px,color:#064e3b',
      method: 'fill:#dcfce7,stroke:#4ade80,stroke-width:2px,color:#14532d',
      component: 'fill:#e5e7eb,stroke:#9ca3af,stroke-width:2px,color:#1f2937',
    };

    lines.push('');
    lines.push(`  classDef focusNode ${nodeStyles.focus}`);
    lines.push(`  classDef typeclass ${nodeStyles.class}`);
    lines.push(`  classDef typeinterface ${nodeStyles.interface}`);
    lines.push(`  classDef typefunction ${nodeStyles.function}`);
    lines.push(`  classDef typemethod ${nodeStyles.method}`);
    lines.push(`  classDef typecomponent ${nodeStyles.component}`);

    const mermaidCode = lines.join('\n');

    // Render mermaid directly
    const render = async () => {
      try {
        setIsLoading(true);
        renderIdRef.current++;
        const id = `mermaid-graph-${renderIdRef.current}`;

        // Create a temporary container for rendering
        const tempDiv = document.createElement('div');
        tempDiv.id = id;
        tempDiv.style.cssText = 'position: absolute; top: -10000px; left: -10000px;';
        document.body.appendChild(tempDiv);

        let svg;
        try {
          // Render mermaid
          const result = await mermaid.render(id, mermaidCode);
          svg = result.svg;
        } finally {
          // Always try to clean up the temp div
          try {
            const element = document.getElementById(id);
            if (element && element.parentNode) {
              element.parentNode.removeChild(element);
            }
          } catch (e) {
            // Ignore cleanup errors
          }
        }

        if (svgRef.current) {
          svgRef.current.innerHTML = svg;
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Mermaid render error:', err);
        if (svgRef.current) {
          svgRef.current.innerHTML = `<div class="text-red-500 text-sm">Failed to render graph: ${err instanceof Error ? err.message : 'Unknown error'}</div>`;
        }
        setIsLoading(false);
      }
    };

    render();
  }, [components, relationships, focusId, direction, theme]);

  return (
    <div className="relative border border-border/20 rounded-lg bg-background/50">
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-background/80 backdrop-blur border border-border rounded hover:bg-accent transition-colors"
          title="Zoom In (Ctrl+Scroll)"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-background/80 backdrop-blur border border-border rounded hover:bg-accent transition-colors"
          title="Zoom Out (Ctrl+Scroll)"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-background/80 backdrop-blur border border-border rounded hover:bg-accent transition-colors"
          title="Reset View"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <div className="px-2 py-2 bg-background/80 backdrop-blur border border-border rounded text-xs">
          {Math.round(scale * 100)}%
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 text-xs text-muted-foreground bg-background/80 backdrop-blur px-2 py-1 rounded">
        Drag to pan • Ctrl+Scroll to zoom
      </div>

      {/* Graph Container */}
      <div
        ref={containerRef}
        className="relative"
        style={{
          minHeight: '600px',
          height: '80vh',
          overflow: 'hidden',
          cursor: isPanning ? 'grabbing' : 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <div className="text-sm text-muted-foreground">Loading graph...</div>
          </div>
        )}
        <div
          ref={svgRef}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.2s',
            opacity: isLoading ? 0 : 1,
            position: 'absolute',
            maxWidth: 'none',
            maxHeight: 'none'
          }}
        />
      </div>
    </div>
  );
}
