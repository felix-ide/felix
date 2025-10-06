/* eslint-disable no-empty, no-useless-escape */
import { useState, useMemo, useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';
import { Button } from '@client/shared/ui/Button';
import { useTheme } from '@felix/theme-system';
import { GitBranch, Layers, ChevronDown, ChevronRight } from 'lucide-react';
import { useEnhancedContextData } from './hooks/useEnhancedContextData';
import { MermaidGraphView } from './context-display/MermaidGraphView';
import { ContextComponentsSection } from './context-display/ContextComponentsSection';
import { ContextRelationshipsSection } from './context-display/ContextRelationshipsSection';
import { FocusComponentSection } from './context-display/FocusComponentSection';
import { ContextMetadataSection } from './context-display/ContextMetadataSection';
import { ContextStatsFooter } from './context-display/ContextStatsFooter';
import { formatTypeLabel } from '@/utils/relationship-format';

interface EnhancedContextDisplayProps {
  parsedContext: any;
  contextData: any;
  className?: string;
  focusComponentId?: string;
  containerId?: string;
  layoutDirection?: 'LR' | 'TB';
  onChangeLayout?: (dir: 'LR' | 'TB') => void;
}

function EnhancedContextDisplayInner({ parsedContext, contextData, className, focusComponentId, containerId, layoutDirection = 'LR', onChangeLayout }: EnhancedContextDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['incoming', 'outgoing', 'relationships', 'components']));
  const [selectedTab, setSelectedTab] = useState<'overview' | 'components' | 'relationships' | 'graph'>('overview');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [graphShowAll, setGraphShowAll] = useState(false); // false = direct only, true = all
  const { theme } = useTheme();

  const relationshipsMemo = useMemo(() => (
    Array.isArray(parsedContext?.relationships) ? parsedContext.relationships : []
  ), [parsedContext?.relationships]);

  const focusId = useMemo(() => (
    focusComponentId ||
    parsedContext?.component?.id ||
    parsedContext?.components?.[0]?.id ||
    null
  ), [focusComponentId, parsedContext?.component?.id, parsedContext?.components]);

  // Generic relationship grouping - NO type-specific logic
  const { incomingRels, outgoingRels } = useMemo(() => {
    const incoming: any[] = [];
    const outgoing: any[] = [];

    relationshipsMemo.forEach((rel) => {
      if (rel.targetId === focusId) {
        incoming.push(rel);
      } else if (rel.sourceId === focusId) {
        outgoing.push(rel);
      }
    });

    return { incomingRels: incoming, outgoingRels: outgoing };
  }, [relationshipsMemo, focusId]);

  const {
    componentTypeById,
    filteredRelationships,
    groupedRelationships,
    cardComponents,
    groupedCardComponents,
    allComponents,
  } = useEnhancedContextData({
    parsedContext,
    displayMode: 'all', // Always show all data
    focusId,
  });

  // Filter relationships for graph based on depth toggle
  const graphRelationships = useMemo(() => {
    if (graphShowAll) {
      return relationshipsMemo; // Show all relationships
    }
    // Show only direct relationships (1-hop from focus)
    return relationshipsMemo.filter((rel) =>
      rel.sourceId === focusId || rel.targetId === focusId
    );
  }, [relationshipsMemo, focusId, graphShowAll]);

  // Filter components for graph - only show those involved in filtered relationships
  const graphComponents = useMemo(() => {
    if (graphShowAll) {
      return allComponents; // Show all components
    }
    // Show only focus component and directly connected components
    const connectedIds = new Set<string>();
    connectedIds.add(focusId || '');
    graphRelationships.forEach((rel) => {
      connectedIds.add(rel.sourceId);
      connectedIds.add(rel.targetId);
    });
    return allComponents.filter((c) => connectedIds.has(c.id));
  }, [allComponents, graphRelationships, focusId, graphShowAll]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  
  
  

  // Find focus component
  const focusComponent = allComponents.find((c) => c.id === focusId);

  // Group incoming relationships by type
  const groupedIncoming = useMemo(() => {
    const groups: Record<string, any[]> = {};
    incomingRels.forEach((rel) => {
      const type = String(rel.type || 'unknown');
      if (!groups[type]) groups[type] = [];
      groups[type].push(rel);
    });
    return groups;
  }, [incomingRels]);

  // Group outgoing relationships by type
  const groupedOutgoing = useMemo(() => {
    const groups: Record<string, any[]> = {};
    outgoingRels.forEach((rel) => {
      const type = String(rel.type || 'unknown');
      if (!groups[type]) groups[type] = [];
      groups[type].push(rel);
    });
    return groups;
  }, [outgoingRels]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 p-2 bg-card/50 backdrop-blur border-2 border-border/50 rounded-lg shadow-sm">
        <Button
          variant={selectedTab === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('overview')}
          className="h-8"
        >
          Overview
        </Button>
        <Button
          variant={selectedTab === 'components' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('components')}
          className="h-8"
        >
          <Layers className="h-4 w-4 mr-1" />
          Components
        </Button>
        <Button
          variant={selectedTab === 'relationships' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('relationships')}
          className="h-8"
        >
          <GitBranch className="h-4 w-4 mr-1" />
          Relationships
        </Button>
        <Button
          variant={selectedTab === 'graph' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('graph')}
          className="h-8"
        >
          <GitBranch className="h-4 w-4 mr-1" />
          Graph
        </Button>
      </div>

      {/* Overview Tab - Data-Driven */}
      {selectedTab === 'overview' && (
        <div className="space-y-3">
          {/* Focus Component with source - ALWAYS SHOW */}
          {focusComponent && (
            <FocusComponentSection
              component={focusComponent}
              visible={true}
            />
          )}

          {/* Dependencies & Dependents - 2 Column Grid */}
          {(incomingRels.length > 0 || outgoingRels.length > 0) && (
            <div className="grid grid-cols-2 gap-3 min-w-0">
              {/* Dependencies (Incoming) */}
              {incomingRels.length > 0 && (
                <div className="border border-border/70 rounded-lg overflow-hidden shadow-md bg-background/50 backdrop-blur min-w-0">
                  <button
                    onClick={() => toggleSection('incoming')}
                    className="w-full flex items-center justify-between p-3 bg-card hover:bg-accent/20 transition-colors min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {expandedSections.has('incoming') ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                      <GitBranch className="h-4 w-4 text-primary flex-shrink-0" />
                      <h3 className="text-sm font-semibold truncate">Dependencies</h3>
                      <span className="text-xs text-muted-foreground flex-shrink-0">({incomingRels.length})</span>
                    </div>
                  </button>
                  {expandedSections.has('incoming') && (
                    <div className="p-3 border-t border-border/40 min-w-0">
                      <div className="space-y-3">
                        {Object.entries(groupedIncoming).map(([type, rels]) => (
                          <div key={type} className="min-w-0">
                            <div className="text-xs font-semibold text-muted-foreground mb-1">
                              {formatTypeLabel(type)} ({rels.length})
                            </div>
                            <div className="space-y-1">
                              {rels.map((rel, idx) => {
                                const source = allComponents.find((c) => c.id === rel.sourceId);
                                return (
                                  <div key={idx} className="text-sm p-2 bg-card/50 rounded border border-border/30 min-w-0">
                                    <div className="font-medium truncate" title={source?.name || rel.sourceName}>{source?.name || rel.sourceName}</div>
                                    <div className="text-xs text-muted-foreground truncate" title={source?.filePath || rel.sourceFilePath}>{source?.filePath || rel.sourceFilePath}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Dependents (Outgoing) */}
              {outgoingRels.length > 0 && (
                <div className="border border-border/70 rounded-lg overflow-hidden shadow-md bg-background/50 backdrop-blur min-w-0">
                  <button
                    onClick={() => toggleSection('outgoing')}
                    className="w-full flex items-center justify-between p-3 bg-card hover:bg-accent/20 transition-colors min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {expandedSections.has('outgoing') ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                      <GitBranch className="h-4 w-4 text-primary flex-shrink-0" />
                      <h3 className="text-sm font-semibold truncate">Dependents</h3>
                      <span className="text-xs text-muted-foreground flex-shrink-0">({outgoingRels.length})</span>
                    </div>
                  </button>
                  {expandedSections.has('outgoing') && (
                    <div className="p-3 border-t border-border/40 min-w-0">
                      <div className="space-y-3">
                        {Object.entries(groupedOutgoing).map(([type, rels]) => (
                          <div key={type} className="min-w-0">
                            <div className="text-xs font-semibold text-muted-foreground mb-1">
                              {formatTypeLabel(type)} ({rels.length})
                            </div>
                            <div className="space-y-1">
                              {rels.map((rel, idx) => {
                                const target = allComponents.find((c) => c.id === rel.targetId);
                                return (
                                  <div key={idx} className="text-sm p-2 bg-card/50 rounded border border-border/30 min-w-0">
                                    <div className="font-medium truncate" title={target?.name || rel.targetName}>{target?.name || rel.targetName}</div>
                                    <div className="text-xs text-muted-foreground truncate" title={target?.filePath || rel.targetFilePath}>{target?.filePath || rel.targetFilePath}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Components Tab */}
      {selectedTab === 'components' && (
        <ContextComponentsSection
          components={cardComponents}
          groupedComponents={groupedCardComponents}
          expandedSections={expandedSections}
          onToggleSection={toggleSection}
          expandedCards={expandedCards}
          onToggleCard={toggleCard}
          displayMode="all"
          allComponents={allComponents}
          visible={true}
        />
      )}

      {/* Relationships Tab */}
      {selectedTab === 'relationships' && (
        <ContextRelationshipsSection
          groupedRelationships={groupedRelationships}
          filteredRelationships={filteredRelationships}
          componentTypeById={componentTypeById}
          expandedSections={expandedSections}
          onToggleSection={toggleSection}
          displayMode="all"
          totalRelationships={parsedContext?.relationships?.length}
        />
      )}

      {/* Graph Tab */}
      {selectedTab === 'graph' && (
        <div className="space-y-3">
          {/* Graph Controls */}
          <div className="flex items-center justify-between p-2 bg-card/50 backdrop-blur border border-border/50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Depth:</span>
              <Button
                variant={!graphShowAll ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setGraphShowAll(false)}
                className="h-7"
              >
                Direct Only ({graphComponents.length} components, {graphRelationships.length} relationships)
              </Button>
              <Button
                variant={graphShowAll ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setGraphShowAll(true)}
                className="h-7"
              >
                Show All ({allComponents.length} components, {relationshipsMemo.length} relationships)
              </Button>
            </div>
          </div>

          <MermaidGraphView
            components={graphComponents}
            relationships={graphRelationships}
            focusId={focusId}
            direction={layoutDirection}
          />
        </div>
      )}

      <ContextMetadataSection metadata={parsedContext?.metadata} />

      {/* Statistics Footer */}
      <ContextStatsFooter
        componentCount={allComponents.length}
        relationshipCount={filteredRelationships.length}
        tokenCount={contextData?.tokenCount || 0}
        metadataCount={(parsedContext?.metadata?.tasks?.length || 0) +
                       (parsedContext?.metadata?.notes?.length || 0) +
                       (parsedContext?.metadata?.rules?.length || 0)}
        totalRelationships={filteredRelationships.length}
        displayMode="all"
      />
    </div>
  );
}

// Export component directly (no ReactFlow wrapper needed)
export function EnhancedContextDisplay(props: EnhancedContextDisplayProps) {
  return <EnhancedContextDisplayInner {...props} />;
}
