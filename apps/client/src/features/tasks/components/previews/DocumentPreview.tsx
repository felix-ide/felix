import { useState } from 'react';
import { Maximize2, Expand, AlertCircle, Loader2, Minimize2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { MermaidPreview } from './MermaidPreview';
import { ExcalidrawPreview } from './ExcalidrawPreview';
import { PreviewModal } from './PreviewModal';
import { MarkdownRenderer } from '@client/shared/components/MarkdownRenderer';
import { MockupViewer } from '@client/features/notes/components/MockupViewer';
import { Button } from '@client/shared/ui/Button';

interface DocumentPreviewProps {
  content: string;
  type: 'mermaid' | 'excalidraw' | 'image' | 'document';
  title?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showExpandButton?: boolean;
  showOverlayButton?: boolean;
  onExpand?: () => void;
  metadata?: {
    fileName?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export function DocumentPreview({
  content,
  type,
  title,
  className,
  showExpandButton = true,
  showOverlayButton = true,
  onExpand,
  metadata
}: DocumentPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleExpand = () => {
    if (onExpand) {
      onExpand();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Size classes are managed by parent containers

  const renderPreviewContent = () => {
    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <span className="text-sm text-muted-foreground">Failed to load preview</span>
        </div>
      );
    }

    // Only show loading for types that have async loading
    if (isLoading && (type === 'mermaid' || type === 'image')) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    switch (type) {
      case 'mermaid':
        return (
          <MermaidPreview 
            content={content} 
            size={isExpanded ? 'expanded' : 'thumbnail'}
            onLoad={handleLoad}
            onError={handleError}
          />
        );
      case 'excalidraw':
        if (isExpanded) {
          // For expanded view, render MockupViewer directly for full interaction
          return (
            <MockupViewer 
              content={content}
              className="w-full h-full"
              minHeight={400}
            />
          );
        } else {
          // For thumbnail, use ExcalidrawPreview with overlay
          return (
            <ExcalidrawPreview 
              content={content}
              size="thumbnail"
              onLoad={handleLoad}
              onError={handleError}
            />
          );
        }
      case 'image':
        return (
          <img 
            src={content} 
            alt={title || 'Preview'} 
            className="w-full h-full object-contain"
            onLoad={handleLoad}
            onError={handleError}
          />
        );
      case 'document':
        // Always render full markdown content properly
        if (isExpanded) {
          return (
            <div className="h-full overflow-auto p-4">
              <MarkdownRenderer content={content} />
            </div>
          );
        } else {
          // For thumbnail, render full content in scrollable container
          return (
            <div className="flex flex-col h-full">
              <div className="text-xs font-medium px-2 pt-2 pb-1 border-b border-border">
                {title || metadata?.fileName || 'Document'}
              </div>
              <div className="flex-1 overflow-auto p-2">
                <MarkdownRenderer content={content} />
              </div>
            </div>
          );
        }
      default:
        return null;
    }
  };

  return (
    <>
      <style>{`
        .excalidraw-preview .excalidraw-button,
        .excalidraw-preview .scroll-back-to-content,
        .excalidraw-preview .excalidraw-tooltip,
        .excalidraw-preview .App-menu,
        .excalidraw-preview .App-toolbar,
        .excalidraw-preview .undo-redo-buttons,
        .excalidraw-preview .zoom-actions,
        .excalidraw-preview .App-mobile-menu,
        .excalidraw-preview .layer-ui__wrapper,
        .excalidraw-preview .App-menu__left,
        .excalidraw-preview .App-menu__right,
        .excalidraw-preview .island,
        .excalidraw-preview [aria-label="Scroll back to content"] {
          display: none !important;
        }
        .excalidraw-preview .excalidraw-container {
          pointer-events: none !important;
        }
      `}</style>
      <div 
        className={cn(
          'relative bg-background border border-border rounded-lg overflow-hidden transition-all duration-200',
          'hover:shadow-md hover:border-primary/50',
          className
        )}
      >
        {/* Hover detection area - matches the preview size */}
        <div 
          className="relative group w-full h-full"
        >
          {/* Preview Content - contained in relative div */}
          <div className="relative w-full h-full">
            {renderPreviewContent()}
          </div>

          {/* Control Buttons - positioned together in top left */}
          <div className="absolute top-2 left-2 z-20 flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
            {showExpandButton && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 bg-background/90 hover:bg-background border border-border shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExpand();
                }}
              >
                {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Expand className="h-3 w-3" />}
              </Button>
            )}
            {showOverlayButton && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 bg-background/90 hover:bg-background border border-border shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModalOpen(true);
                }}
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Title Badge */}
          {title && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 via-background/60 to-transparent p-2 pointer-events-none">
              <span className="text-xs text-foreground font-medium line-clamp-1 drop-shadow-sm">
                {title}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Full Screen Modal */}
      <PreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        content={content}
        type={type}
        title={title}
        metadata={metadata}
      />
    </>
  );
}
