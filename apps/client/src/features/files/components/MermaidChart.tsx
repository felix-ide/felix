import { useEffect, useState } from 'react';
import type { MouseEvent, WheelEvent } from 'react';
import { ChevronsDown, ChevronsUp, Home, Maximize2, Network, ZoomIn, ZoomOut } from 'lucide-react';
import mermaid from 'mermaid';
import type { FileExplorerComponent } from './fileExplorerData';

interface MermaidChartProps {
  chart: string;
  themeKey: string;
  components: FileExplorerComponent[];
  onSelectComponent: (componentId: string) => void;
}

export function MermaidChart({ chart, themeKey, components, onSelectComponent }: MermaidChartProps) {
  const [svg, setSvg] = useState<string>('');
  const [isRendering, setIsRendering] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!chart) {
      setSvg('');
      return;
    }

    const renderChart = async () => {
      setIsRendering(true);
      try {
        const renderId = `mermaid-chart-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(renderId, chart);
        setSvg(svg);
      } catch (error) {
        console.error('Failed to render mermaid chart:', error);
        setSvg('');
      } finally {
        setIsRendering(false);
      }
    };

    void renderChart();
  }, [chart, themeKey]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 20));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 0.1));
  const handleZoomReset = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: event.clientX - panX, y: event.clientY - panY });
  };

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      setPanX(event.clientX - dragStart.x);
      setPanY(event.clientY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.8 : 1.25;
    setZoom(prev => Math.max(0.1, Math.min(20, prev * delta)));
  };

  const handleNodeClick = (event: MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;

    const target = event.target as Element;
    const node = target.closest('[id^="comp_"]');
    if (node) {
      const rawId = node.id.replace('comp_', '');
      const possibleMatches = components.filter(component => {
        const normalized = component.id.replace(/[^a-zA-Z0-9]/g, '_');
        return normalized === rawId || rawId.includes(normalized);
      });
      if (possibleMatches.length > 0) {
        onSelectComponent(possibleMatches[0].id);
      }
    }
  };

  if (isRendering) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Network className="h-16 w-16 mb-4 mx-auto opacity-50" />
          <p>No chart data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 bg-card rounded-lg shadow-lg border p-2">
        <button
          type="button"
          onClick={() => setZoom(prev => Math.min(prev * 2, 20))}
          className="w-10 h-8 flex items-center justify-center border border-border rounded hover:bg-accent transition-colors"
          title="Zoom In (2x)"
        >
          <ChevronsUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-10 h-8 flex items-center justify-center border border-border rounded hover:bg-accent transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-10 h-8 flex items-center justify-center border border-border rounded hover:bg-accent transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(prev => Math.max(prev / 2, 0.1))}
          className="w-10 h-8 flex items-center justify-center border border-border rounded hover:bg-accent transition-colors"
          title="Zoom Out (2x)"
        >
          <ChevronsDown className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(0.1)}
          className="w-10 h-8 flex items-center justify-center border border-border rounded hover:bg-accent transition-colors"
          title="Fit to Screen"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomReset}
          className="w-10 h-8 flex items-center justify-center border border-border rounded hover:bg-accent transition-colors"
          title="Reset"
        >
          <Home className="h-4 w-4" />
        </button>
        <div className="text-xs text-center text-muted-foreground mt-1">
          {zoom >= 1 ? Math.round(zoom * 100) : Math.round(zoom * 1000) / 10}%
        </div>
      </div>

      <div
        className="w-full h-full overflow-hidden bg-background rounded-lg border border-border cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ minHeight: '400px' }}
      >
        <div
          className="origin-top-left transition-transform duration-75"
          style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, cursor: isDragging ? 'grabbing' : 'grab' }}
          onClick={handleNodeClick}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      <div className="absolute bottom-4 left-4 bg-card rounded-lg shadow-lg border border-border p-3 text-xs text-muted-foreground">
        <div className="font-medium mb-1 text-foreground">Chart Controls:</div>
        <div className="flex items-center gap-2"><span className="text-primary">•</span> Scroll to zoom</div>
        <div className="flex items-center gap-2"><span className="text-primary">•</span> Drag to pan</div>
        <div className="flex items-center gap-2"><span className="text-primary">•</span> Click nodes to navigate</div>
      </div>
    </div>
  );
}
