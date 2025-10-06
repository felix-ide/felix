import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { cn } from '@/utils/cn';
import { AlertCircle, Loader2 } from 'lucide-react';

interface MermaidPreviewProps {
  content: string;
  className?: string;
  size?: 'thumbnail' | 'expanded' | 'fullscreen';
  showZoomControls?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

// Initialize mermaid with default config
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  themeVariables: {
    primaryColor: '#6366f1',
    primaryTextColor: '#fff',
    primaryBorderColor: '#4f46e5',
    lineColor: '#e5e7eb',
    secondaryColor: '#f3f4f6',
    tertiaryColor: '#fff'
  },
  flowchart: {
    htmlLabels: true,
    curve: 'basis'
  },
  securityLevel: 'loose',
  maxEdges: 2000
});

export function MermaidPreview({
  content,
  className,
  size = 'thumbnail',
  showZoomControls = false,
  onLoad,
  onError
}: MermaidPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    renderDiagram();
  }, [content]);

  const renderDiagram = async () => {
    if (!containerRef.current || !content) return;

    setIsLoading(true);
    setError(null);

    try {
      // Generate unique ID for this diagram
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Clear previous content
      containerRef.current.innerHTML = '';
      
      // For thumbnails, add a small delay to ensure container is ready
      if (size === 'thumbnail') {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Create a div for the diagram
      const diagramDiv = document.createElement('div');
      diagramDiv.id = id;
      diagramDiv.style.width = '100%';
      diagramDiv.style.height = '100%';
      diagramDiv.style.display = 'flex';
      diagramDiv.style.alignItems = 'center';
      diagramDiv.style.justifyContent = 'center';
      containerRef.current.appendChild(diagramDiv);

      // Render the mermaid diagram
      const { svg } = await mermaid.render(id, content);
      diagramDiv.innerHTML = svg;

      // Apply styling based on size
      const svgElement = diagramDiv.querySelector('svg');
      if (svgElement) {
        // Set consistent styling for all sizes
        svgElement.style.maxWidth = '100%';
        svgElement.style.maxHeight = '100%';
        svgElement.style.width = 'auto';
        svgElement.style.height = 'auto';
        svgElement.style.display = 'block';
        
        if (size === 'thumbnail') {
          // For thumbnails, ensure it fits nicely
          svgElement.style.transform = 'scale(0.9)';
          svgElement.style.transformOrigin = 'center center';
        }
        
        if (size === 'fullscreen' && showZoomControls) {
          svgElement.style.transform = `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`;
          svgElement.style.transformOrigin = 'center center';
          svgElement.style.transition = isDragging ? 'none' : 'transform 0.2s ease';
        }
      }

      setIsLoading(false);
      // Call onLoad after ensuring the DOM is updated
      setTimeout(() => onLoad?.(), 100);
    } catch (err) {
      console.error('Mermaid render error:', err);
      setError(err instanceof Error ? err.message : 'Failed to render diagram');
      setIsLoading(false);
      onError?.(err instanceof Error ? err : new Error('Failed to render diagram'));
    }
  };

  // Handle zoom changes
  useEffect(() => {
    if (size === 'fullscreen' && showZoomControls && containerRef.current) {
      const svgElement = containerRef.current.querySelector('svg');
      if (svgElement) {
        svgElement.style.transform = `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`;
      }
    }
  }, [zoom, panOffset, size, showZoomControls]);

  // Mouse handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (size === 'fullscreen' && showZoomControls) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && size === 'fullscreen' && showZoomControls) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (size === 'fullscreen' && showZoomControls && e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
    }
  };

  const sizeClasses = {
    thumbnail: 'h-full w-full',
    expanded: 'h-full w-full',
    fullscreen: 'h-full w-full overflow-hidden'
  };

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-4', className, sizeClasses[size])}>
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-center text-muted-foreground">
          Failed to render diagram
        </p>
        <p className="text-xs text-center text-muted-foreground mt-1">
          {error}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center', className, sizeClasses[size])}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'mermaid-preview flex items-center justify-center',
        size === 'fullscreen' && showZoomControls && 'cursor-move',
        className,
        sizeClasses[size]
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{
        userSelect: isDragging ? 'none' : 'auto'
      }}
    />
  );
}