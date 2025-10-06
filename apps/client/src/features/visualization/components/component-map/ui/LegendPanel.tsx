import { GitBranch, Box } from 'lucide-react';
import type { ComponentEdge, ComponentNode } from '../types';
import { getNodeIcon, getNodeColor, getRelationshipImportance, getEdgeDirection, getRelationshipColor } from '../helpers';

interface LegendPanelProps {
  visible: boolean;
  relationshipTypes: string[];
  activeRelTypes: Set<string>;
  filteredRelationships: ComponentEdge[];
  nodeTypes: string[];
  activeNodeTypes: Set<string>;
  nodes: ComponentNode[];
  theme: any;
}

export function LegendPanel({
  visible,
  relationshipTypes,
  activeRelTypes,
  filteredRelationships,
  nodeTypes,
  activeNodeTypes,
  nodes,
  theme,
}: LegendPanelProps) {
  if (!visible) return null;

  return (
    <div className="absolute bottom-4 left-4 p-3 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg z-20 max-w-md max-h-[70vh] overflow-y-auto">
      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-semibold mb-2 flex items-center gap-2 uppercase tracking-wide">
            <span className="text-sm">🎮</span>
            Controls
          </h4>
          <div className="text-xs text-muted-foreground mb-2 italic">Click canvas to focus for keyboard controls</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div><kbd className="px-1 py-0.5 bg-accent text-accent-foreground rounded text-[10px]">WASD</kbd> Fly around</div>
            <div><kbd className="px-1 py-0.5 bg-accent text-accent-foreground rounded text-[10px]">Q/E</kbd> Up/Down</div>
            <div><kbd className="px-1 py-0.5 bg-accent text-accent-foreground rounded text-[10px]">Drag</kbd> Orbit view</div>
            <div><kbd className="px-1 py-0.5 bg-accent text-accent-foreground rounded text-[10px]">Shift+Drag</kbd> Pan view</div>
            <div><kbd className="px-1 py-0.5 bg-accent text-accent-foreground rounded text-[10px]">Scroll</kbd> Zoom in/out</div>
            <div><kbd className="px-1 py-0.5 bg-accent text-accent-foreground rounded text-[10px]">Click</kbd> Select node</div>
            <div><kbd className="px-1 py-0.5 bg-accent text-accent-foreground rounded text-[10px]">Double-click</kbd> Focus node</div>
            <div><kbd className="px-1 py-0.5 bg-accent text-accent-foreground rounded text-[10px]">F</kbd> Focus selected</div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold mb-2 flex items-center gap-2 uppercase tracking-wide">
            <GitBranch className="h-3 w-3" />
            Relationships
          </h4>
          <div className="grid grid-cols-1 gap-y-1 text-xs">
            {relationshipTypes.filter((type) => activeRelTypes.has(type)).map((type) => {
              const count = filteredRelationships.filter((r) => r.type === type).length;
              const importance = getRelationshipImportance(type);
              const direction = getEdgeDirection(type);

              return (
                <div key={type} className="flex items-center gap-1.5">
                  <div
                    className="w-8 flex-shrink-0 rounded-full"
                    style={{
                      opacity: direction > 0.5 ? 0.9 : 0.6,
                      height: `${Math.max(2, importance * 2)}px`,
                      backgroundColor: getRelationshipColor(type),
                    }}
                  />
                  <span className="capitalize flex-1">{type}</span>
                  <span className="text-muted-foreground">({count})</span>
                  {direction > 0.5 ? (
                    <span className="text-muted-foreground text-xs">→</span>
                  ) : direction < 0.5 ? (
                    <span className="text-muted-foreground text-xs">↔</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
            <div>Line thickness = architectural importance</div>
            <div>→ directional  ↔ bidirectional  — structural</div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold mb-2 flex items-center gap-2 uppercase tracking-wide">
            <Box className="h-3 w-3" />
            Node Types
          </h4>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {nodeTypes.filter((type) => activeNodeTypes.has(type)).map((type) => {
              const Icon = getNodeIcon(type);
              const count = nodes.filter((n) => n.type === type).length;
              if (count === 0) return null;
              const nodeColor = getNodeColor(type);
              return (
                <div key={type} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: nodeColor }}
                  />
                  <Icon className="h-3 w-3" />
                  <span className="capitalize">{type}</span>
                  <span className="text-muted-foreground">({count})</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold mb-2 flex items-center gap-2 uppercase tracking-wide">
            <span className="text-sm">🔷</span>
            Node Shapes & Colors
          </h4>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 border-2" style={{ backgroundColor: getNodeColor('file'), borderColor: getNodeColor('file') }} />
              <span className="text-muted-foreground">File (□)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 transform rotate-45" style={{ backgroundColor: getNodeColor('class') }} />
              <span className="text-muted-foreground">Class (◆)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px]" style={{ borderBottomColor: getNodeColor('function') }} />
              <span className="text-muted-foreground">Function (△)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full relative" style={{ backgroundColor: getNodeColor('method') }}>
                <div className="absolute inset-1 bg-background/50" />
              </div>
              <span className="text-muted-foreground">Method (○□)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3"
                style={{
                  backgroundColor: getNodeColor('interface'),
                  clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
                }}
              />
              <span className="text-muted-foreground">Interface (⬡)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 relative"
                style={{
                  backgroundColor: getNodeColor('module'),
                  clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
                }}
              >
                <div className="absolute inset-1.5 rounded-full bg-background/50" />
              </div>
              <span className="text-muted-foreground">Module (⬡○)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 border-2 relative" style={{ borderColor: theme?.colors?.components?.variable?.text }}>
                <div className="absolute inset-0.5 rounded-full" style={{ backgroundColor: theme?.colors?.components?.variable?.bg }} />
              </div>
              <span className="text-muted-foreground">Variable (□○)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full relative" style={{ backgroundColor: theme?.colors?.components?.property?.text }}>
                <div
                  className="absolute inset-1"
                  style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', backgroundColor: theme?.colors?.background?.primary }}
                />
              </div>
              <span className="text-muted-foreground">Property (○△)</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold mb-2 flex items-center gap-2 uppercase tracking-wide">
            <span className="text-sm">📊</span>
            Visual Encodings
          </h4>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="grid grid-cols-[auto_1fr] gap-x-2">
              <span className="font-medium">Node Size:</span>
              <span>Type importance × connection count × state</span>
            </div>
            <div className="text-xs text-muted-foreground ml-4 mb-1">
              Type importance: Module(1.5x) &gt; File(1.3x) &gt; Class(1.2x) &gt; Interface(1.1x) &gt; Function(0.9x) &gt; Method/Variable(0.8x/0.7x)
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-2">
              <span className="font-medium">Node Colors:</span>
              <span>🟡 Selected, ✨ Hovered, type-based default</span>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-2">
              <span className="font-medium">Outer Shape:</span>
              <span>Component type (□ ◆ △ ○ ⬡)</span>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-2">
              <span className="font-medium">Inner Shape:</span>
              <span>Composite types (methods/modules/variables)</span>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-2">
              <span className="font-medium">Edge Thickness:</span>
              <span>Relationship importance (extends &gt; implements &gt; imports &gt; calls &gt; contains &gt; uses &gt; references)</span>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-2">
              <span className="font-medium">Edge Direction:</span>
              <span>→ directional flow, ↔ bidirectional, — structural</span>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-2">
              <span className="font-medium">Edge Colors:</span>
              <span>Type-specific (imports=blue, extends=green, etc.)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
