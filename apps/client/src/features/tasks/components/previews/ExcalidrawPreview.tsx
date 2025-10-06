import { useEffect, useState } from 'react';
import { MockupViewer } from '@client/features/notes/components/MockupViewer';
import { cn } from '@/utils/cn';
import { AlertCircle } from 'lucide-react';

interface ExcalidrawPreviewProps {
  content: string;
  className?: string;
  size?: 'thumbnail' | 'expanded' | 'fullscreen';
  showZoomControls?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export function ExcalidrawPreview({
  content,
  className,
  size = 'thumbnail',
  showZoomControls: _showZoomControls = false,
  onLoad,
  onError
}: ExcalidrawPreviewProps) {
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Validate the content is valid JSON
    try {
      const parsed = JSON.parse(content);
      if (!parsed.elements || !Array.isArray(parsed.elements)) {
        throw new Error('Invalid Excalidraw data: missing elements array');
      }
      setIsValid(true);
      setError(null);
      // Call onLoad after a brief delay to ensure component is ready
      setTimeout(() => onLoad?.(), 50);
    } catch (err) {
      console.error('Invalid Excalidraw content:', err);
      setIsValid(false);
      setError(err instanceof Error ? err.message : 'Invalid Excalidraw data');
      onError?.(err instanceof Error ? err : new Error('Invalid Excalidraw data'));
    }
  }, [content, onLoad, onError]);

  const getHeightForSize = () => {
    switch (size) {
      case 'thumbnail':
        return undefined; // Let it fill the container for thumbnails
      case 'expanded':
        return undefined; // Let it fill the container
      case 'fullscreen':
        return undefined; // Let it fill the container
      default:
        return 300;
    }
  };

  if (!isValid || error) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center p-4 bg-muted rounded-lg',
        className
      )}>
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-center text-muted-foreground">
          Failed to load Excalidraw diagram
        </p>
        {error && (
          <p className="text-xs text-center text-muted-foreground mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (size === 'thumbnail') {
    // For thumbnails, create a static preview to avoid interaction issues
    return (
      <div className={cn(
        'excalidraw-preview relative w-full h-full bg-background  overflow-hidden',
        className
      )}>
        {/* MockupViewer in the background */}
        <div className="absolute inset-0">
          <MockupViewer
            content={content}
            height={getHeightForSize()}
            minHeight={100}
            maxHeight={200}
            className="w-full h-full"
            isThumbnail={true}
          />
        </div>
        {/* Invisible overlay to block interactions with excalidraw */}
        <div className="absolute inset-0 z-10" />
      </div>
    );
  }

  return (
    <div className={cn(
      'excalidraw-preview w-full h-full bg-background ',
      size === 'fullscreen' && 'absolute inset-0',
      className
    )}>
      <MockupViewer
        content={content}
        height={getHeightForSize()}
        minHeight={size === 'expanded' ? 300 : 400}
        maxHeight={size === 'fullscreen' ? undefined : 600}
        className={cn(
          'w-full h-full',
          size === 'fullscreen' && 'h-full'
        )}
      />
    </div>
  );
}
