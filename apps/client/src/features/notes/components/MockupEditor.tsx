import { useState, useCallback, useEffect } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
// import type { ExcalidrawElement, AppState } from '@excalidraw/excalidraw/types/excalidraw';
import { Button } from '@client/shared/ui/Button';
import { Save, X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface MockupEditorProps {
  initialContent?: string; // JSON string of Excalidraw scene
  onSave: (content: string) => void;
  onCancel?: () => void;
  readOnly?: boolean;
  className?: string;
}

export function MockupEditor({
  initialContent,
  onSave,
  onCancel,
  readOnly = false,
  className,
}: MockupEditorProps) {
  const [excalidrawAPI] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Parse initial content
  const initialData = initialContent ? (() => {
    try {
      const parsed = JSON.parse(initialContent);
      return {
        elements: parsed.elements || [],
        appState: parsed.appState || {},
        files: parsed.files || null
      };
    } catch (e) {
      console.error('Failed to parse mockup content:', e);
      return { elements: [], appState: {} };
    }
  })() : { elements: [], appState: {} };

  const handleSave = useCallback(() => {
    if (!excalidrawAPI) return;
    
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    
    const content = JSON.stringify({
      type: "excalidraw",
      version: 2,
      source: "felix",
      elements: elements,
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        gridSize: appState.gridSize,
      }
    });
    
    onSave(content);
    setHasChanges(false);
  }, [excalidrawAPI, onSave]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  }, [handleSave, onCancel]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const containerClass = cn(
    'relative bg-background border rounded-lg overflow-hidden',
    isFullscreen ? 'fixed inset-4 z-50' : 'h-[600px]',
    className
  );

  return (
    <div className={containerClass}>
      {/* Toolbar */}
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        {!readOnly && (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSave}
              disabled={!hasChanges}
              title="Save (Ctrl+S)"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            {onCancel && (
              <Button
                size="sm"
                variant="outline"
                onClick={onCancel}
                title="Cancel (Esc)"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Excalidraw Canvas */}
      <div className="w-full h-full">
        <Excalidraw
          initialData={initialData}
          onChange={() => {
            setHasChanges(true);
          }}
          viewModeEnabled={readOnly}
          zenModeEnabled={false}
          gridModeEnabled={false}
          theme="light"
          name="mockup"
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: false,
              saveToActiveFile: false,
            },
          }}
        />
      </div>
    </div>
  );
}