import { useState, useEffect, useRef } from 'react';
import { useNotesStore } from '@client/features/notes/state/notesStore';
import { useAppStore } from '@client/features/app-shell/state/appStore';
import { useUIStore } from '@client/shared/state/uiStore';
import { useKnowledgeBaseStore } from '@client/features/knowledge-base/state/knowledgeBaseStore';
import { NoteHierarchy } from '@client/features/notes/components/NoteHierarchy';
import { KnowledgeBaseSection } from '@client/features/knowledge-base/components/KnowledgeBaseSection';
import { KBTemplateSelector } from '@client/features/knowledge-base/components/KBTemplateSelector';
import { Alert, AlertDescription } from '@client/shared/ui/Alert';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { Filter, Search, Download, Upload, FileDown, ChevronDown, CheckSquare, X, Plus, Library } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { felixService } from '@/services/felixService';
import { cn } from '@/utils/cn';
import type { NoteData } from '@/types/api';

type NotesTab = 'notes' | 'knowledge-base';

export function NotesSection() {
  const [activeTab, setActiveTab] = useState<NotesTab>('notes');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // KB state
  const {
    knowledgeBases,
    currentKBId,
    templates,
    isCreatingKB,
    setCurrentKB,
    createKB,
  } = useKnowledgeBaseStore();

  const {
    notes,
    error,
    selectedNoteId,
    selectedNoteIds,
    loadNotes,
    addNote,
    updateNote,
    deleteNote,
    selectNote,
    clearError,
    startPolling,
    stopPolling,
    clearSelection,
    selectAll,
  } = useNotesStore();

  const { autoRefresh, refreshInterval } = useAppStore();
  const { setNoteTypeFilter } = useUIStore();

  // Get unique types and entity types for filters
  const uniqueTypes = Array.from(new Set(notes.map(note => note.note_type)));
  const uniqueEntityTypes = Array.from(new Set(notes.map(note => note.entity_type).filter(Boolean)));

  // Load notes on mount and handle polling
  useEffect(() => {
    loadNotes();

    if (autoRefresh) {
      startPolling(refreshInterval);
    }

    // Listen for project restoration
    const handleProjectRestored = () => {
      console.log('Project restored, reloading notes...');
      loadNotes();
    };

    window.addEventListener('project-restored', handleProjectRestored);

    return () => {
      stopPolling();
      window.removeEventListener('project-restored', handleProjectRestored);
    };
  }, [loadNotes, autoRefresh, refreshInterval, startPolling, stopPolling]);

  // Clear selection when exiting selection mode
  useEffect(() => {
    if (!isSelectionMode) {
      clearSelection();
    }
  }, [isSelectionMode, clearSelection]);

  // Sync type filter with store
  useEffect(() => {
    setNoteTypeFilter(typeFilter);
  }, [typeFilter, setNoteTypeFilter]);

  const handleCreateNew = (parentId?: string) => {
    setIsAddingNew(true);
  };

  const handleSaveNote = async (noteData: Omit<NoteData, 'id' | 'created_at' | 'updated_at' | 'sort_order' | 'depth_level'>) => {
    try {
      await addNote(noteData);
      setIsAddingNew(false);
    } catch (error) {
      console.error('Failed to save note:', error);
      // Error is handled by the store
    }
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
    } catch (error) {
      console.error('Failed to delete note:', error);
      // Error is handled by the store
    }
  };

  const handleReorder = async (noteId: string, newParentId: string | null, newSortOrder: number) => {
    try {
      // Update the note with new parent and sort order
      await updateNote(noteId, {
        parent_id: newParentId || undefined,
        sort_order: newSortOrder
      });
    } catch (error) {
      console.error('Failed to reorder note:', error);
    }
  };

  const handleAddSubNote = (parentId: string) => {
    setEditingNote(undefined);
    setParentNoteId(parentId);
    setIsEditorOpen(true);
  };

  // Export handlers
  const handleExportAll = async () => {
    try {
      const exportData = await felixService.exportNotes({
        includeChildren: true
      });

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notes-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export notes:', error);
    }
    setShowExportMenu(false);
  };

  const handleExportSelected = async () => {
    if (selectedNoteIds.size === 0) return;

    try {
      const exportData = await felixService.exportNotes({
        noteIds: Array.from(selectedNoteIds),
        includeChildren: true
      });

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notes-selected-${selectedNoteIds.size}-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export selected notes:', error);
    }
    setShowExportMenu(false);
    setIsSelectionMode(false);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const result = await felixService.importNotes(data, {
        mergeStrategy: 'skip'
      });

      console.log('Import result:', result);

      // Reload notes to show imported ones
      window.dispatchEvent(new Event('project-restored'));
    } catch (error) {
      console.error('Failed to import notes:', error);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateKB = async (templateName: string, customName: string, kbConfig?: Record<string, any>) => {
    await createKB(templateName, customName, kbConfig);
  };

  // Get current KB for display
  const currentKB = knowledgeBases.find(kb => kb.id === currentKBId);

  return (
    <div className="h-full flex flex-col">
      {/* Unified Top Bar with Tabs and Controls */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Tab Navigation */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('notes')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded transition-colors',
                activeTab === 'notes'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab('knowledge-base')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded transition-colors',
                activeTab === 'knowledge-base'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              Knowledge Base
            </button>
          </div>

          {/* Tools - different for each tab */}
          {activeTab === 'notes' ? (
            <>
              {/* Notes Tools */}
              {/* Filters Dropdown */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Filter className="h-3 w-3 mr-1" />
                    Filters
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="bg-popover border border-border rounded-lg shadow-xl p-4 min-w-[250px] z-50" sideOffset={5} align="start">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-foreground mb-2 block">Type</label>
                        <select
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value)}
                          className="w-full text-xs border border-border bg-background text-foreground rounded px-2 py-1"
                        >
                          <option value="all">All Types</option>
                          {uniqueTypes.map(type => (
                            <option key={type} value={type}>
                              {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground mb-2 block">Entity</label>
                        <select
                          value={entityFilter}
                          onChange={(e) => setEntityFilter(e.target.value)}
                          className="w-full text-xs border border-border bg-background text-foreground rounded px-2 py-1"
                        >
                          <option value="all">All Entities</option>
                          {uniqueEntityTypes.map(type => (
                            <option key={type} value={type}>
                              {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-[400px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-sm h-8 w-full"
                />
              </div>

              {/* Spacer */}
              <div className="flex-1 min-w-0" />

              {/* Selection count */}
              {isSelectionMode && selectedNoteIds.size > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {selectedNoteIds.size} selected
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearSelection}
                    className="h-8"
                  >
                    Clear
                  </Button>
                </>
              )}

              {/* Export Menu */}
              <DropdownMenu.Root open={showExportMenu} onOpenChange={setShowExportMenu}>
                <DropdownMenu.Trigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Download className="h-3 w-3 mr-1" />
                    Export
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="bg-popover border border-border rounded-lg shadow-xl p-2 min-w-[200px] z-50" sideOffset={5} align="end">
                    {!isSelectionMode ? (
                      <>
                        <DropdownMenu.Item asChild>
                          <button
                            onClick={handleExportAll}
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                          >
                            <FileDown className="h-4 w-4" />
                            Export all notes
                          </button>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item asChild>
                          <button
                            onClick={() => {
                              setIsSelectionMode(true);
                              setShowExportMenu(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                          >
                            <CheckSquare className="h-4 w-4" />
                            Select for export
                          </button>
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="h-px bg-border my-1" />
                        <DropdownMenu.Item asChild>
                          <button
                            onClick={() => {
                              fileInputRef.current?.click();
                              setShowExportMenu(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                          >
                            <Upload className="h-4 w-4" />
                            Import notes
                          </button>
                        </DropdownMenu.Item>
                      </>
                    ) : (
                      <>
                        <DropdownMenu.Item asChild>
                          <button
                            onClick={handleExportSelected}
                            disabled={selectedNoteIds.size === 0}
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                          >
                            <FileDown className="h-4 w-4" />
                            Export {selectedNoteIds.size} selected
                          </button>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item asChild>
                          <button
                            onClick={() => selectAll()}
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                          >
                            <CheckSquare className="h-4 w-4" />
                            Select all
                          </button>
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="h-px bg-border my-1" />
                        <DropdownMenu.Item asChild>
                          <button
                            onClick={() => {
                              setIsSelectionMode(false);
                              setShowExportMenu(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                          >
                            <X className="h-4 w-4" />
                            Cancel selection
                          </button>
                        </DropdownMenu.Item>
                      </>
                    )}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              {/* Hidden file input for import */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />

              <Button onClick={() => handleCreateNew()} size="sm" className="h-8">
                <Plus className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <>
              {/* KB Tools */}
              {/* KB Selector Dropdown */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Library className="h-3 w-3 mr-1" />
                    {currentKB ? currentKB.title : 'Select KB'}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="bg-popover border border-border rounded-lg shadow-xl p-2 min-w-[250px] z-50" sideOffset={5} align="start">
                    {knowledgeBases.map(kb => (
                      <DropdownMenu.Item key={kb.id} asChild>
                        <button
                          onClick={() => setCurrentKB(kb.id)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground',
                            kb.id === currentKBId && 'bg-accent'
                          )}
                        >
                          <Library className="h-4 w-4" />
                          <span className="flex-1">{kb.title}</span>
                          {kb.is_project_kb && (
                            <span className="text-xs text-muted-foreground">Project</span>
                          )}
                        </button>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              {/* Spacer */}
              <div className="flex-1 min-w-0" />

              {/* Create KB Button */}
              <KBTemplateSelector
                templates={templates}
                onCreateKB={handleCreateKB}
                isCreating={isCreatingKB}
              />
            </>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && activeTab === 'notes' && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={clearError}
                className="text-sm underline hover:no-underline"
              >
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'notes' ? (
        <>
          {/* Notes Hierarchy - without duplicate header */}
          <div className="flex-1 min-h-0">
            <NoteHierarchy
              notes={notes}
              selectedNoteId={selectedNoteId}
              onNoteSelect={selectNote}
              onNoteUpdate={updateNote}
              onNoteDelete={handleDeleteNote}
              onCreateNew={handleCreateNew}
              onCancelAdd={handleCancelAdd}
              isAddingNew={isAddingNew}
              onNoteAdd={handleSaveNote}
              onReorder={handleReorder}
              onAddSubNote={handleAddSubNote}
              hideHeader={true}
              searchQuery={searchQuery}
              typeFilter={typeFilter}
              entityFilter={entityFilter}
              isSelectionMode={isSelectionMode}
            />
          </div>
        </>
      ) : (
        <div className="flex-1 min-h-0">
          <KnowledgeBaseSection />
        </div>
      )}
    </div>
  );
}
export default NotesSection;
