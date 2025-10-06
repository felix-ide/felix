import { useEffect, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { cn } from '@/utils/cn';
import '@excalidraw/excalidraw/index.css';

interface MockupViewerProps {
  content: string; // JSON string of Excalidraw scene
  className?: string;
  height?: number;
  minHeight?: number;
  maxHeight?: number;
  isThumbnail?: boolean;
}

export function MockupViewer({
  content,
  className,
  height,
  minHeight = 300,
  maxHeight,
  isThumbnail = false,
}: MockupViewerProps) {
  const [sceneData, setSceneData] = useState<any>(null);
  const [dimensions, setDimensions] = useState({ height: minHeight });
  // excalidrawRef no longer needed; Excalidraw renders read-only

  useEffect(() => {
    // Check if content is actually JSON before parsing
    if (!content || !content.trim().startsWith('{')) {
      setSceneData(null);
      return;
    }
    
    try {
      const parsed = JSON.parse(content);
      
      // Calculate content bounds for centering
      let bounds = {
        minX: 0,
        minY: 0,
        maxX: 100,
        maxY: 100
      };
      
      if (parsed.elements && parsed.elements.length > 0) {
        bounds = {
          minX: Infinity,
          minY: Infinity,
          maxX: -Infinity,
          maxY: -Infinity
        };

        parsed.elements.forEach((element: any) => {
          if (element.isDeleted) return;
          
          bounds.minX = Math.min(bounds.minX, element.x || 0);
          bounds.minY = Math.min(bounds.minY, element.y || 0);
          bounds.maxX = Math.max(bounds.maxX, (element.x || 0) + (element.width || 0));
          bounds.maxY = Math.max(bounds.maxY, (element.y || 0) + (element.height || 0));
        });

        const contentHeight = bounds.maxY - bounds.minY + 150; // padding
        let finalHeight = Math.max(contentHeight, minHeight);
        if (maxHeight && finalHeight > maxHeight) {
          finalHeight = maxHeight;
        }
        
        setDimensions({ height: height || finalHeight });
      }
      
      // For thumbnails, override zoom and center the view
      // For expanded, use original appState or default to reasonable zoom
      // For thumbnails, calculate proper centering
      const zoom = 0.2;
      const viewportSize = 128; // thumbnail size
      const visibleContentSize = viewportSize / zoom; // 640px of content visible at 0.2 zoom
      
      // Calculate center of content
      const contentCenterX = (bounds.minX + bounds.maxX) / 2;
      const contentCenterY = (bounds.minY + bounds.maxY) / 2;
      
      const appState = isThumbnail 
        ? { 
            zoom: { value: zoom },
            // Position so content center aligns with viewport center
            scrollX: -(contentCenterX - visibleContentSize / 2) * zoom,
            scrollY: -(contentCenterY - visibleContentSize / 2) * zoom,
          }
        : {
            ...parsed.appState,
            // If no zoom in saved state, default to reasonable zoom
            zoom: parsed.appState?.zoom || { value: 1 }
          };
      
      setSceneData({
        elements: parsed.elements || [],
        appState: appState,
        files: parsed.files || null
      });
    } catch (e) {
      console.error('Failed to parse mockup content:', e);
      setSceneData(null);
    }
  }, [content, height, minHeight, maxHeight, isThumbnail]);

  if (!sceneData) {
    return (
      <div className={cn('flex items-center justify-center bg-muted rounded-lg', className)}
           style={{ height: dimensions.height }}>
        <p className="text-muted-foreground">Invalid mockup data</p>
      </div>
    );
  }

  return (
    <div 
      className={cn('relative w-full overflow-hidden border rounded-lg bg-card', className)}
      style={{ height: dimensions.height }}
    >
      <style>{`
        .mockup-viewer .scroll-back-to-content,
        .mockup-viewer .App-menu__left,
        .mockup-viewer .App-toolbar__extra-tools-trigger,
        .mockup-viewer .App-toolbar,
        .mockup-viewer .Island,
        .mockup-viewer .main-menu-trigger {
          display: none !important;
        }
      `}</style>
      <div className="absolute inset-0 mockup-viewer">
        <Excalidraw
          initialData={{
            elements: sceneData.elements,
            appState: {
              ...sceneData.appState,
              viewBackgroundColor: "#ffffff",
              zenModeEnabled: false,
              gridSize: null,
              scrolledOutside: true,
            },
            files: sceneData.files,
            scrollToContent: !isThumbnail // Use scrollToContent for expanded view only
          }}
          viewModeEnabled={true}
          zenModeEnabled={false}
          gridModeEnabled={false}
          theme="light"
          name="mockup-viewer"
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: false,
              saveToActiveFile: false,
              clearCanvas: false,
              changeViewBackgroundColor: false,
            },
          }}
          langCode="en"
          renderTopRightUI={() => null}
        />
      </div>
    </div>
  );
}
