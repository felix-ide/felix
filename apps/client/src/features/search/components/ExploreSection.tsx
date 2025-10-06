/* eslint-disable no-useless-escape */
import { Button } from '@client/shared/ui/Button';
import { Search, BarChart3, Code, FileText, CheckSquare, Loader2, AlertCircle, X, RefreshCw, Settings, Copy } from 'lucide-react';
import { cn } from '@/utils/cn';
import { EntitySearchModal } from '@client/shared/components/EntitySearchModal';
import { useEntitySearchModal } from '@client/shared/hooks/useEntitySearchModal';
import { FileExplorerView } from '@client/features/files/components/FileExplorerView';
import { ComponentMapView, ComponentMapViewControls } from '@client/features/visualization/components/ComponentMapView';
import { EnhancedContextDisplay } from '@client/features/search/components/EnhancedContextDisplay';
import { useThemeStore, getCodeComponentStyles, getTaskStatusColors, getNoteTypeColors, getRuleTypeColors } from '@felix/theme-system';
import { useVisualizationStore } from '@client/features/visualization/state/visualizationStore';
import { useExploreSectionState } from './explore-section/hooks/useExploreSectionState';
import { ExploreSidebar } from './explore-section/ExploreSidebar';
import { ExploreSearchOverlay } from './explore-section/ExploreSearchOverlay';
import type { ContextOptions } from './explore-section/types';

type ReactCSSProperties = import('react').CSSProperties;

export function ExploreSection() {
  const theme = useThemeStore((state) => state.currentTheme ?? state.getEffectiveTheme());
  const {
    activeView,
    setActiveView,
    activeWorkingSetItem,
    setActiveWorkingSetItem,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchError,
    showAdvancedFilters,
    setShowAdvancedFilters,
    showSearchOverlay,
    setShowSearchOverlay,
    totalResults,
    searchGuardrails,
    searchFilters,
    setSearchFilters,
    contextData,
    parsedContext,
    isLoadingContext,
    contextError,
    workingSet,
    addToWorkingSet,
    removeFromWorkingSet,
    clearWorkingSet,
    closeActiveWorkingSetItem,
    showCompFilters,
    setShowCompFilters,
    showCompStats,
    setShowCompStats,
    showCompLegend,
    setShowCompLegend,
    focusedComponentId,
    showContextOptions,
    setShowContextOptions,
    contextOptions,
    setContextOptions,
    contextPopoverRef,
    contextSettingsBtnRef,
    handleSearch,
    loadContext,
    handleKeyDown,
    normalizeFilePath,
    projectPath,
    projectSettings,
  } = useExploreSectionState();
  const updateSearchSettings = useVisualizationStore((state) => state.updateSearchSettings);
  
  // Entity search modal for advanced search
  const entitySearchModal = useEntitySearchModal((entity) => {
    console.log('Selected entity:', entity);
    // Handle entity selection - could navigate or show details
  });

  // Render context data as structured UI blocks
  const renderContextBlocks = () => {
    if (!parsedContext) return null;

    const focusId = parsedContext?.components?.[0]?.id;
    const containerId = parsedContext?.component_detail?.container?.id;

    const displayMode = projectSettings?.search?.contextDisplayMode || 'focus';
    const savedViewport = projectSettings?.search?.contextAllViewport || null;
    const layoutDirection = projectSettings?.search?.contextGraphLayout || 'LR';
    return (
      <EnhancedContextDisplay 
        parsedContext={parsedContext} 
        contextData={contextData} 
        focusComponentId={focusId}
        containerId={containerId}
        displayMode={displayMode}
        savedAllViewport={savedViewport}
        onChangeDisplayMode={(mode) => {
          if (!projectPath) return;
          updateSearchSettings(projectPath, { contextDisplayMode: mode });
        }}
        onSaveAllViewport={(vp) => {
          if (!projectPath) return;
          updateSearchSettings(projectPath, { contextAllViewport: vp });
        }}
        layoutDirection={layoutDirection}
        onChangeLayout={(dir) => {
          if (!projectPath) return;
          updateSearchSettings(projectPath, { contextGraphLayout: dir });
        }}
      />
    );
  };

  // Old implementation removed to prevent JSX parsing issues and duplication


  const getItemIcon = (type: string) => {
    switch (type) {
      case 'task':
        return CheckSquare;
      case 'note':
        return FileText;
      case 'rule':
        return Settings;
      default:
        return Code;
    }
  };
  
  const getItemTypeColor = (type: string): ReactCSSProperties => {
    // For component types
    if (type !== 'task' && type !== 'note' && type !== 'rule') {
      const styles = getCodeComponentStyles(theme, type);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderColor: styles.borderColor
      };
    }

    // For other entity types
    switch (type) {
      case 'task': {
        const colors = getTaskStatusColors(theme, 'todo');
        return {
          backgroundColor: colors.bg,
          color: colors.text
        };
      }
      case 'note': {
        const colors = getNoteTypeColors(theme, 'note');
        return {
          backgroundColor: colors.bg,
          color: colors.text
        };
      }
      case 'rule': {
        const colors = getRuleTypeColors(theme, 'pattern');
        return {
          backgroundColor: colors.bg,
          color: colors.text
        };
      }
      default: {
        const styles = getCodeComponentStyles(theme, type);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color
        };
      }
    }
  };

  // Component id -> type mapping for coloring source/target chips in relationships
  const viewOptions = [
    { id: 'search' as const, label: 'Search', icon: Search },
    { id: 'components' as const, label: 'Components', icon: BarChart3 },
    { id: 'file-view' as const, label: 'File View', icon: Code },
  ];

  const renderMainContent = () => {
    // Different layouts for different views
    if (activeView === 'components') {
      return <ComponentMapView 
        focusedComponentId={focusedComponentId || undefined}
        showFilters={showCompFilters}
        showStats={showCompStats}
        showLegend={showCompLegend}
      />;
    }
    
    
    if (activeView === 'file-view') {
      return <FileExplorerView />;
    }
    
    // Search view - show working set item context
    if (activeWorkingSetItem) {
      const activeItem = workingSet.find(item => item.id === activeWorkingSetItem);
      if (activeItem) {
        return (
          <div className="h-full relative overflow-y-auto overflow-x-hidden" style={{ overscrollBehaviorX: 'contain' }}>
            {/* Search Overlay rendered globally below */}
            
            {/* Header */}
            <div className="p-4 border-b border-border relative">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-md"
                  style={getItemTypeColor(activeItem.type)}
                >
                  {(() => {
                    const ItemIcon = getItemIcon(activeItem.type);
                    return <ItemIcon className="h-5 w-5" />;
                  })()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{activeItem.name}</h2>
                    <span className="text-sm text-muted-foreground">({activeItem.type})</span>
                    <button
                      title="Copy ID"
                      onClick={() => navigator.clipboard.writeText(activeItem.id).catch(()=>{})}
                      className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border text-xs hover:bg-accent"
                    >
                      <Copy className="h-3 w-3" />
                      Copy ID
                    </button>
                  </div>
                  {/* Context Stats inline */}
                  {(contextData || parsedContext?.component_detail) && (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {/* Counts as compact badges */}
                      {contextData && (
                        <>
                          {(() => {
                            const chipStyle = getItemTypeColor(activeItem.type);
                            return (
                              <>
                                <span className="inline-flex items-center px-2 py-0.5 rounded border text-[11px]" style={chipStyle} title="Estimated tokens in generated context">
                                  {contextData.tokenCount} tokens
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded border text-[11px]" style={chipStyle} title="Number of components included">
                                  {contextData.stats?.totalComponents || 0} components
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded border text-[11px]" style={chipStyle} title="Number of relationships included">
                                  {contextData.stats?.totalRelationships || 0} relationships
                                </span>
                              </>
                            );
                          })()}
                        </>
                      )}
                      {/* Focused component detail (core-provided) */}
                      {parsedContext?.component_detail?.container && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-accent/20 text-[11px]" title="Container (enclosing class/module)">
                          <span className="opacity-70">in</span>
                          <span className="font-medium">{parsedContext.component_detail.container.name}</span>
                          <span className="ml-1 text-[10px] px-1 rounded bg-accent/40">
                            {parsedContext.component_detail.container.type}
                          </span>
                        </span>
                      )}
                      {parsedContext?.component_detail?.signature && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded border border-border bg-muted/30 text-[11px] font-mono" title="Signature">
                          {parsedContext.component_detail.signature}
                        </span>
                      )}
                      {parsedContext?.component_detail?.filePath && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded border border-border bg-accent/10 text-[10px] font-mono" title={parsedContext.component_detail.filePath}>
                          {normalizeFilePath(parsedContext.component_detail.filePath)}
                        </span>
                      )}
                      {parsedContext?.component_detail?.relationshipCounts && (
                        (() => {
                          const relChip = getItemTypeColor(activeItem.type);
                          return (
                            <span className="inline-flex items-center gap-2 text-[10px] px-2 py-0.5 rounded border" style={relChip} title="Incoming/outgoing links for this component">
                              <span className="opacity-70">links</span>
                              <span className="px-1 rounded" style={relChip}>in {parsedContext.component_detail.relationshipCounts.incoming}</span>
                              <span className="px-1 rounded" style={relChip}>out {parsedContext.component_detail.relationshipCounts.outgoing}</span>
                            </span>
                          );
                        })()
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => loadContext(activeItem.id)}
                    disabled={isLoadingContext}
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2"
                    title="Refresh context"
                  >
                    {isLoadingContext ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>

                  

                  <Button
                    onClick={() => setShowContextOptions(!showContextOptions)}
                    size="sm"
                    variant="outline"
                    className="h-8 px-2"
                    title="Context options"
                    ref={contextSettingsBtnRef}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={closeActiveWorkingSetItem}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </div>
              </div>

              {/* Context Options Popover */}
              {showContextOptions && (
                <div ref={contextPopoverRef} className="absolute right-4 top-full mt-2 z-30 w-[560px] rounded-md border border-border bg-popover shadow-lg">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <div className="text-sm font-medium">Context Options</div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => setShowContextOptions(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4 bg-accent/5">
                    <div>
                      <label className="text-xs text-muted-foreground">Output Format</label>
                      <select 
                        value={contextOptions.outputFormat}
                        onChange={(e) => {
                          const format = e.target.value as ContextOptions['outputFormat'];
                          setContextOptions({ ...contextOptions, outputFormat: format });
                        }}
                        className="w-full mt-1 px-2 py-1 text-sm border border-border rounded bg-background"
                      >
                        <option value="ui">Nice UI (Default)</option>
                        <optgroup label="JSON Formats">
                          <option value="json">JSON</option>
                          <option value="json-compressed">JSON Compressed</option>
                        </optgroup>
                        <optgroup label="Markdown Formats">
                          <option value="markdown">Markdown</option>
                          <option value="markdown-compressed">Markdown Compressed</option>
                        </optgroup>
                        <optgroup label="AICCL Formats">
                          <option value="aiccl">AICCL Compressed</option>
                          <option value="aiccl-expand">AICCL Expanded</option>
                        </optgroup>
                        <option value="text">Plain Text</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Depth</label>
                      <select 
                        value={contextOptions.depth}
                        onChange={(e) =>
                          setContextOptions({ ...contextOptions, depth: parseInt(e.target.value) })
                        }
                        className="w-full mt-1 px-2 py-1 text-sm border border-border rounded bg-background"
                      >
                        <option value="1">1 (Direct only)</option>
                        <option value="2">2</option>
                        <option value="3">3 (Default)</option>
                        <option value="5">5 (Deep)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Token Limit</label>
                      <select 
                        value={String(contextOptions.targetTokens)}
                        onChange={(e) =>
                          setContextOptions({ ...contextOptions, targetTokens: parseInt(e.target.value) })
                        }
                        className="w-full mt-1 px-2 py-1 text-sm border border-border rounded bg-background"
                      >
                        <option value="4000">4K</option>
                        <option value="8000">8K</option>
                        <option value="16000">16K</option>
                        <option value="32000">32K</option>
                        <option value="64000">64K</option>
                        <option value="128000">128K</option>
                        <option value="1000000">Unlimited (Default)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 gap-2 content-start">
                      <label className="flex items-center gap-2 text-xs">
                        <input 
                          type="checkbox" 
                          checked={contextOptions.includeSource}
                          onChange={(e) =>
                            setContextOptions({ ...contextOptions, includeSource: e.target.checked })
                          }
                        />
                        Include Source
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input 
                          type="checkbox" 
                          checked={contextOptions.includeMetadata}
                          onChange={(e) =>
                            setContextOptions({ ...contextOptions, includeMetadata: e.target.checked })
                          }
                        />
                        Include Metadata
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input 
                          type="checkbox" 
                          checked={contextOptions.includeRelationships}
                          onChange={(e) =>
                            setContextOptions({
                              ...contextOptions,
                              includeRelationships: e.target.checked,
                            })
                          }
                        />
                        Include Relationships
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input 
                          type="checkbox" 
                          checked={contextOptions.includeDocumentation}
                          onChange={(e) =>
                            setContextOptions({
                              ...contextOptions,
                              includeDocumentation: e.target.checked,
                            })
                          }
                        />
                        Include Documentation
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={contextOptions.includeNotes}
                          onChange={(e) =>
                            setContextOptions({
                              ...contextOptions,
                              includeNotes: e.target.checked,
                            })
                          }
                        />
                        Include Notes
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={contextOptions.includeRules}
                          onChange={(e) =>
                            setContextOptions({
                              ...contextOptions,
                              includeRules: e.target.checked,
                            })
                          }
                        />
                        Include Rules
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={contextOptions.includeTasks}
                          onChange={(e) =>
                            setContextOptions({
                              ...contextOptions,
                              includeTasks: e.target.checked,
                            })
                          }
                        />
                        Include Tasks
                      </label>
                    </div>
                  </div>
                  <div className="p-3 border-t border-border flex items-center justify-end bg-card">
                    <Button
                      size="sm"
                      onClick={() => {
                        setShowContextOptions(false);
                        if (activeItem?.id) loadContext(activeItem.id);
                      }}
                    >
                      Apply & Refresh
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Context Content */}
            <div className="p-6 min-w-0">
              {isLoadingContext ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mb-4" />
                  <p className="text-muted-foreground">Loading context...</p>
                </div>
              ) : contextError ? (
                <div className="flex items-center gap-2 p-4 text-destructive bg-destructive/10 rounded-md">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{contextError}</span>
                </div>
              ) : contextData ? (
                <div className="space-y-6 min-w-0">
                  {contextOptions.outputFormat === 'ui' && parsedContext ? (
                    <>
                      {renderContextBlocks()}
                      
                      {/* Warnings */}
                      {contextData.warnings.length > 0 && (
                        <div className="p-4 bg-yellow-50 /20 rounded-md">
                          <h4 className="text-sm font-medium text-yellow-800  mb-2">
                            Warnings
                          </h4>
                          <ul className="text-sm text-yellow-700  space-y-1">
                            {contextData.warnings.map((warning, index) => (
                              <li key={index}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-4">
                      {/* Format Info Header */}
                      <div className="p-3 bg-blue-50 /20/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-blue-800 ">
                              {contextOptions.outputFormat.toUpperCase()} Output
                            </h4>
                            <p className="text-xs text-primary  mt-1">
                              {contextOptions.outputFormat === 'aiccl' && 'Ultra-compressed AI format (~75% token reduction)'}
                              {contextOptions.outputFormat === 'aiccl-expand' && 'AICCL format expanded to readable markdown'}
                              {contextOptions.outputFormat === 'json-compressed' && 'Minified JSON with abbreviated keys'}
                              {contextOptions.outputFormat === 'markdown-compressed' && 'Compact markdown with minimal whitespace'}
                              {contextOptions.outputFormat === 'text' && 'Plain text format for simple reading'}
                              {!contextOptions.outputFormat.includes('compressed') && !contextOptions.outputFormat.includes('aiccl') && !contextOptions.outputFormat.includes('text') && 'Standard format output'}
                            </p>
                          </div>
                          <div className="text-right text-xs text-primary ">
                            <div>{contextData.tokenCount} tokens</div>
                            {contextOptions.outputFormat === 'aiccl' && (
                              <div className="text-green-600 ">~{Math.round(contextData.tokenCount * 0.25)} est. original</div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Content Display */}
                      <pre className="p-4 bg-muted  rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-words">
                        <code>{(() => {
                          // Handle different formats for display
                          if (contextOptions.outputFormat === 'json' || contextOptions.outputFormat === 'json-compressed') {
                            try {
                              return JSON.stringify(JSON.parse(contextData.content), null, 2);
                            } catch {
                              return contextData.content;
                            }
                          }
                          return contextData.content;
                        })()}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Code className="h-12 w-12 mb-4 opacity-50" />
                  <p>Click the refresh icon to load context</p>
                </div>
              )}
            </div>
          </div>
        );
      }
    }
    
    // Default search view without active item
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground relative">
        <ExploreSearchOverlay
          visible={showSearchOverlay}
          onClose={() => setShowSearchOverlay(false)}
          searchResults={searchResults}
          searchError={searchError}
          isSearching={isSearching}
          totalResults={totalResults}
          guardrailInfo={searchGuardrails}
          getItemIcon={getItemIcon}
          getItemTypeColor={getItemTypeColor}
          addToWorkingSet={addToWorkingSet}
        />
        
        <div className="text-center">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Search for components, tasks, notes, or rules</p>
          <p className="text-sm mt-2">Select an item from the working set to view its context</p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex overflow-hidden">
      {activeView === 'search' && (
        <ExploreSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          viewOptions={viewOptions}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearch={() => { void handleSearch(); }}
          isSearching={isSearching}
          showAdvancedFilters={showAdvancedFilters}
          onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
          showSearchOverlay={showSearchOverlay}
          onToggleSearchOverlay={() => setShowSearchOverlay(!showSearchOverlay)}
          onHideSearchOverlay={() => setShowSearchOverlay(false)}
          searchResults={searchResults}
          searchFilters={searchFilters}
          onUpdateFilters={setSearchFilters}
          workingSet={workingSet}
          activeWorkingSetItem={activeWorkingSetItem}
          onSelectWorkingSetItem={setActiveWorkingSetItem}
          onLoadContext={(id) => { void loadContext(id); }}
          removeFromWorkingSet={removeFromWorkingSet}
          clearWorkingSet={clearWorkingSet}
          getItemIcon={getItemIcon}
          getItemTypeColor={getItemTypeColor}
          onSearchInputKeyDown={handleKeyDown}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 bg-background min-h-0 min-w-0 flex flex-col overflow-hidden">
        {/* View Icons for non-search views */}
        {activeView !== 'search' && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {viewOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setActiveView(option.id)}
                      className={cn(
                        "p-2 rounded-md transition-colors",
                        activeView === option.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                      title={option.label}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
              
              {/* View-specific controls */}
              {activeView === 'components' && (
                <ComponentMapViewControls
                  onToggleFilters={() => setShowCompFilters(!showCompFilters)}
                  onToggleStats={() => setShowCompStats(!showCompStats)}
                  onToggleLegend={() => setShowCompLegend(!showCompLegend)}
                />
              )}
            </div>
          </div>
        )}
        
        {renderMainContent()}
      </div>

      {/* Entity Search Modal */}
      <EntitySearchModal {...entitySearchModal.modalProps} />
    </div>
  );
}
