import { useEffect, useState } from 'react';
import { useKnowledgeBaseStore } from '../state/knowledgeBaseStore';
import { useRulesStore } from '@client/features/rules/state/rulesStore';
import { KBDocumentView } from './KBDocumentView';
import { KBToc } from './KBToc';
import { KBTemplateSelector } from './KBTemplateSelector';
import { Alert, AlertDescription } from '@client/shared/ui/Alert';
import { Loader2, Library } from 'lucide-react';
import { cn } from '@/utils/cn';

export function KnowledgeBaseSection() {
  const {
    knowledgeBases,
    currentKB,
    currentKBId,
    templates,
    isLoading,
    error,
    isCreatingKB,
    loadKnowledgeBases,
    loadTemplates,
    createKB,
    setCurrentKB,
    clearError
  } = useKnowledgeBaseStore();

  const { loadRules } = useRulesStore();

  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default 256px (w-64)
  const [isResizing, setIsResizing] = useState(false);

  // Load KBs and templates on mount
  useEffect(() => {
    loadKnowledgeBases();
    loadTemplates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load rules when a KB is selected
  useEffect(() => {
    if (currentKBId) {
      loadRules();
    }
  }, [currentKBId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select project KB (or first KB if no project KB exists)
  useEffect(() => {
    if (knowledgeBases.length > 0 && !currentKBId) {
      // Find the project KB (marked with is_project_kb: true)
      const projectKB = knowledgeBases.find(kb => kb.is_project_kb === true);
      // Fall back to first KB if no project KB exists
      const selectedKB = projectKB || knowledgeBases[0];
      setCurrentKB(selectedKB!.id);
    }
  }, [knowledgeBases, currentKBId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateKB = async (templateName: string, customName: string, kbConfig?: Record<string, any>) => {
    await createKB(templateName, customName, kbConfig);
  };

  // Handle sidebar resize
  const handleMouseDown = () => {
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Loading state
  if (isLoading && !currentKB) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading knowledge bases...</span>
        </div>
      </div>
    );
  }

  // No KBs exist - show empty state
  if (knowledgeBases.length === 0 && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Library className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-2">No Knowledge Base</h2>
            <p className="text-muted-foreground mb-6">
              Create a structured knowledge base to document your project's architecture, standards, and procedures.
            </p>
          </div>
          {error && (
            <Alert variant="destructive" className="text-left">
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <button onClick={clearError} className="text-sm underline hover:no-underline">
                  Dismiss
                </button>
              </AlertDescription>
            </Alert>
          )}
          <KBTemplateSelector
            templates={templates}
            onCreateKB={handleCreateKB}
            isCreating={isCreatingKB}
          />
        </div>
      </div>
    );
  }

  // KB selected - show document view
  if (currentKB) {
    // Find the template for this KB to get the config schema
    const kbTemplate = templates.find(t => t.name === currentKB.metadata?.kb_type);
    const configSchema = kbTemplate?.config_schema || [];

    return (
      <div className="h-full flex">
        {/* Error Display */}
        {error && (
          <div className="absolute top-0 left-0 right-0 px-6 pt-4 z-10">
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <button onClick={clearError} className="text-sm underline hover:no-underline">
                  Dismiss
                </button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Main Content: TOC + Document */}
        <div className="flex-1 flex min-h-0">
          {/* TOC Sidebar - Resizable */}
          <div
            style={{ width: `${sidebarWidth}px` }}
            className="border-r border-border flex-shrink-0 relative h-full"
          >
            <div className="h-full overflow-hidden">
              <KBToc
                rootNode={currentKB}
                activeNodeId={activeNodeId || undefined}
                onNodeClick={setActiveNodeId}
              />
            </div>

            {/* Resize Handle */}
            <div
              onMouseDown={handleMouseDown}
              className={cn(
                'absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors',
                isResizing && 'bg-primary/40'
              )}
            />
          </div>

          {/* Document View - Full width */}
          <div className="flex-1 overflow-y-auto">
            <KBDocumentView
              rootNode={currentKB}
              configSchema={configSchema}
              onSectionClick={setActiveNodeId}
            />
          </div>
        </div>
      </div>
    );
  }

  // Fallback: should not reach here
  return null;
}
