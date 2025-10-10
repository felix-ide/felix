import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { MermaidPreview } from './MermaidPreview';
import { MarkdownRenderer } from '@client/shared/components/MarkdownRenderer';
import { MockupViewer } from '@client/features/notes/components/MockupViewer';
import { cn } from '@/utils/cn';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  type: 'mermaid' | 'excalidraw' | 'image' | 'document';
  title?: string;
  metadata?: {
    fileName?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export function PreviewModal({
  isOpen,
  onClose,
  content,
  type,
  title,
  // metadata
}: PreviewModalProps) {
  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // (optional) download handler could be added when UI includes a button

  const renderContent = () => {
    switch (type) {
      case 'mermaid':
        return (
          <MermaidPreview 
            content={content} 
            size="fullscreen"
            showZoomControls
          />
        );
      case 'excalidraw':
        return (
          <div className="w-full h-full">
            <MockupViewer 
              content={content}
              className="w-full h-full"
              height={window.innerHeight - 100} // Account for modal padding
            />
          </div>
        );
      case 'image':
        return (
          <div className="w-full h-full flex items-center justify-center p-8">
            <img 
              src={content} 
              alt={title || 'Image preview'} 
              className="max-w-full max-h-full object-contain"
            />
          </div>
        );
      case 'document':
        return (
          <div className="w-full h-full overflow-auto">
            <div className="max-w-4xl mx-auto p-8">
              <MarkdownRenderer content={content} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200",
        !isOpen && "hidden"
      )}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      {/* Modal Container */}
      <div className="fixed inset-4 flex flex-col bg-background rounded-lg shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Content - full screen */}
        <div className="relative flex-1 overflow-hidden">
          {renderContent()}
          
          {/* Floating close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm shadow-md hover:bg-background"
            title="Close (ESC)"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
