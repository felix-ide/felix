import React, { useEffect, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';

interface ExcalidrawRendererProps {
  content: string;
  options?: {
    theme?: 'light' | 'dark';
    viewModeEnabled?: boolean;
    minHeight?: number;
    maxHeight?: number;
  };
}

export const ExcalidrawRenderer: React.FC<ExcalidrawRendererProps> = ({ 
  content, 
  options = {} 
}) => {
  const [sceneData, setSceneData] = useState<any>(null);
  const [dimensions, setDimensions] = useState({ height: options.minHeight || 300 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const parsed = JSON.parse(content);
      
      // Calculate content bounds for proper sizing
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

        const contentHeight = bounds.maxY + 150; // padding from origin for consistent sizing
        let finalHeight = Math.max(contentHeight, options.minHeight || 300);
        if (options.maxHeight && finalHeight > options.maxHeight) {
          finalHeight = options.maxHeight;
        }
        
        setDimensions({ height: finalHeight });
      }
      
      setSceneData({
        elements: parsed.elements || [],
        appState: {
          ...parsed.appState,
          zoom: parsed.appState?.zoom || { value: 1 }
        },
        files: parsed.files || null
      });
      setError(null);
    } catch (e) {
      console.error('Failed to parse Excalidraw content:', e);
      setError('Invalid Excalidraw JSON content');
      setSceneData(null);
    }
  }, [content, options.minHeight, options.maxHeight]);

  if (error) {
    return (
      <div className="text-red-500 p-2 border border-red-200 rounded text-xs my-2">
        <strong>Excalidraw Error:</strong> {error}
      </div>
    );
  }

  if (!sceneData) {
    return (
      <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-4"
           style={{ height: dimensions.height }}>
        <p className="text-gray-500 dark:text-gray-400">Loading Excalidraw...</p>
      </div>
    );
  }

  return (
    <div className="my-2 excalidraw-embed">
      <style>{`
        .excalidraw-embed .App-menu__left,
        .excalidraw-embed .App-toolbar__extra-tools-trigger,
        .excalidraw-embed .App-toolbar,
        .excalidraw-embed .Island,
        .excalidraw-embed .main-menu-trigger {
          display: none !important;
        }
      `}</style>
      <div 
        className="relative w-full overflow-hidden border rounded-lg bg-white dark:bg-gray-900"
        style={{ height: dimensions.height }}
      >
        <Excalidraw
          initialData={{
            elements: sceneData.elements,
            appState: {
              ...sceneData.appState,
              viewBackgroundColor: options.theme === 'dark' ? '#1a1a1a' : '#ffffff',
              zenModeEnabled: false,
              gridSize: null,
            },
            files: sceneData.files,
            scrollToContent: true
          }}
          viewModeEnabled={options.viewModeEnabled !== false}
          zenModeEnabled={false}
          gridModeEnabled={false}
          theme={options.theme || 'light'}
          name="excalidraw-viewer"
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: false,
              saveToActiveFile: false,
              clearCanvas: false,
              changeViewBackgroundColor: false,
            },
          }}
        />
      </div>
    </div>
  );
};
