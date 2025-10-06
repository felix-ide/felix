import { useCallback, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { Network, Maximize2, Minimize2, X, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ComponentDetails, ComponentEdge, ComponentNode } from '../types';
import { getLanguageExtension, getNodeIcon, getRelationshipStyle } from '../helpers';

interface ComponentDetailsPanelProps {
  visible: boolean;
  selectedNode: ComponentNode | null;
  detailsPanelDocked: boolean;
  onDockToggle: () => void;
  onClose: () => void;
  onFocusRelationships: () => void;
  relationships: ComponentEdge[];
  nodes: ComponentNode[];
  nodeDetails: ComponentDetails | null;
  theme: any;
  onSelectNode: (node: ComponentNode) => void;
  loadNodeDetails: (node: ComponentNode) => Promise<void>;
  focusOnNode: (nodeId: string) => void;
}

export function ComponentDetailsPanel({
  visible,
  selectedNode,
  detailsPanelDocked,
  onDockToggle,
  onClose,
  onFocusRelationships,
  relationships,
  nodes,
  nodeDetails,
  theme,
  onSelectNode,
  loadNodeDetails,
  focusOnNode,
}: ComponentDetailsPanelProps) {
  const handleRelationshipClick = useCallback(
    async (otherNode: ComponentNode | undefined, otherNodeId: string) => {
      if (!otherNode) return;
      onSelectNode(otherNode);
      await loadNodeDetails(otherNode);
      focusOnNode(otherNodeId);
    },
    [focusOnNode, loadNodeDetails, onSelectNode]
  );

  // Determine the code editor theme based on the current theme type
  const editorTheme = useMemo(() => {
    return theme?.type === 'dark' ? oneDark : undefined; // Use default light theme when not dark
  }, [theme]);

  if (!visible || !selectedNode) return null;

  const Icon = getNodeIcon(selectedNode.type);

  return (
    <div
      className={cn(
        'absolute bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-xl overflow-hidden z-40 transition-all duration-200',
        detailsPanelDocked ? 'top-20 right-4 w-96 h-[calc(100%-6rem)]' : 'inset-4'
      )}
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <h3 className="font-semibold">{selectedNode.name}</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onFocusRelationships}
              className="w-8 h-8 flex items-center justify-center hover:bg-accent rounded"
              title="Focus on Relationships"
            >
              <Network className="h-4 w-4" />
            </button>
            <button
              onClick={onDockToggle}
              className="w-8 h-8 flex items-center justify-center hover:bg-accent rounded"
              title={detailsPanelDocked ? 'Expand' : 'Dock'}
            >
              {detailsPanelDocked ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-accent rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-0.5 rounded bg-accent">{selectedNode.type}</span>
          {selectedNode.language && (
            <span className="px-2 py-0.5 rounded bg-accent">{selectedNode.language}</span>
          )}
        </div>
      </div>

      <div className="overflow-auto h-[calc(100%-5rem)]">
        {nodeDetails ? (
          <div>
            <div className="p-4 space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">File Path</span>
                <p className="text-sm break-all">{nodeDetails.filePath}</p>
              </div>

              {nodeDetails.startLine && (
                <div className="flex gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Start Line</span>
                    <p className="text-sm">{nodeDetails.startLine}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">End Line</span>
                    <p className="text-sm">{nodeDetails.endLine}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border p-4">
              <h4 className="text-sm font-medium mb-2">Relationships</h4>
              <div className="space-y-2">
                {relationships
                  .filter((rel) => rel.source === selectedNode.id || rel.target === selectedNode.id)
                  .map((rel) => {
                    const isSource = rel.source === selectedNode.id;
                    const otherNodeId = isSource ? rel.target : rel.source;
                    const otherNode = nodes.find((n) => n.id === otherNodeId);
                    return (
                      <div key={rel.id} className="flex items-center gap-2 text-xs">
                        <span className={cn('px-2 py-0.5 rounded border')} style={getRelationshipStyle(rel.type, theme)}>
                          {rel.type}
                        </span>
                        <span className="text-muted-foreground">{isSource ? '→' : '←'}</span>
                        <button
                          onClick={() => handleRelationshipClick(otherNode, otherNodeId)}
                          className="hover:text-primary text-left"
                        >
                          {otherNode?.name || otherNodeId}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>

            {nodeDetails.source && (
              <div className="border-t border-border p-4">
                <h4 className="text-sm font-medium mb-2">Source Code</h4>
                <div className="rounded overflow-hidden max-w-full min-w-0">
                  <CodeMirror
                    value={nodeDetails.source}
                    height="200px"
                    theme={editorTheme}
                    extensions={[getLanguageExtension(selectedNode.language), EditorView.lineWrapping]}
                    editable={false}
                    style={{ width: '100%' }}
                    basicSetup={{
                      foldGutter: false,
                      dropCursor: false,
                      allowMultipleSelections: false,
                      indentOnInput: false,
                      bracketMatching: true,
                      closeBrackets: false,
                      autocompletion: false,
                      rectangularSelection: false,
                      crosshairCursor: false,
                      highlightSelectionMatches: false,
                      searchKeymap: false,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
            Loading details...
          </div>
        )}
      </div>
    </div>
  );
}
