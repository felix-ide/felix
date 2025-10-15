import { useState, useEffect, useRef } from 'react';
import { Filter, Search, Download, Upload, FileDown, ChevronDown, CheckSquare, X, Plus } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { NoteCard } from './NoteCard';
import { DragDropHierarchy } from '@client/shared/components/DragDropHierarchy';
import { useUIStore } from '@client/shared/state/uiStore';
import { useNotesStore } from '@client/features/notes/state/notesStore';
import { felixService } from '@/services/felixService';
import { cn } from '@/utils/cn';
import type { NoteData } from '@/types/api';

interface NoteHierarchyProps {
  notes: NoteData[];
  selectedNoteId?: string;
  onNoteSelect?: (noteId: string) => void;
  onNoteUpdate?: (noteId: string, updates: Partial<NoteData>) => void;
  onNoteDelete?: (noteId: string) => void;
  onCreateNew?: (parentId?: string) => void;
  onCancelAdd?: () => void;
  isAddingNew?: boolean;
  onNoteAdd?: (note: Omit<NoteData, 'id' | 'created_at' | 'updated_at' | 'sort_order' | 'depth_level'>) => Promise<void>;
  onReorder?: (noteId: string, newParentId: string | null, newSortOrder: number) => void;
  onAddSubNote?: (noteId: string) => void;
  hideHeader?: boolean;
  searchQuery?: string;
  typeFilter?: string;
  entityFilter?: string;
  isSelectionMode?: boolean;
  className?: string;
}

export function NoteHierarchy({
  notes,
  selectedNoteId,
  onNoteSelect,
  onNoteUpdate,
  onNoteDelete,
  onCreateNew,
  onCancelAdd,
  isAddingNew = false,
  onNoteAdd,
  onReorder,
  onAddSubNote,
  hideHeader = false,
  searchQuery: externalSearchQuery,
  typeFilter: externalTypeFilter,
  entityFilter: externalEntityFilter,
  isSelectionMode: externalIsSelectionMode,
  className,
}: NoteHierarchyProps) {
  const {
    expandedNotes,
    noteTypeFilter,
    toggleNoteExpanded,
    setNoteTypeFilter
  } = useUIStore();

  const {
    selectedNoteIds,
    toggleNoteSelection,
    clearSelection,
    selectAll
  } = useNotesStore();

  const [localTypeFilter, setLocalTypeFilter] = useState(noteTypeFilter);
  const [localEntityFilter, setLocalEntityFilter] = useState<string>('all');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [localIsSelectionMode, setLocalIsSelectionMode] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Use external values if provided, otherwise use local state
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const typeFilter = externalTypeFilter !== undefined ? externalTypeFilter : localTypeFilter;
  const entityFilter = externalEntityFilter !== undefined ? externalEntityFilter : localEntityFilter;
  const isSelectionMode = externalIsSelectionMode !== undefined ? externalIsSelectionMode : localIsSelectionMode;

  // Sync local state with store
  useEffect(() => {
    if (externalTypeFilter === undefined) {
      setNoteTypeFilter(localTypeFilter);
    }
  }, [localTypeFilter, externalTypeFilter, setNoteTypeFilter]);

  // Handle click outside for export menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  // Clear selection when exiting selection mode (only for local mode)
  useEffect(() => {
    if (externalIsSelectionMode === undefined && !localIsSelectionMode) {
      clearSelection();
    }
  }, [localIsSelectionMode, externalIsSelectionMode, clearSelection]);

  // Filter notes
  const filterNote = (note: NoteData): boolean => {
    // Search filter - check all relevant fields
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      
      // Check for exact ID match first (handles partial IDs like "note_1748925815526" or full IDs)
      if (note.id && note.id.toLowerCase().includes(query)) {
        return true;
      }
      
      const searchableText = [
        note.title,
        note.content,
        note.note_type,
        note.entity_type,
        // note.entity_id, // This property doesn't exist on NoteData
        ...(note.stable_tags || [])
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) {
        return false;
      }
    }
    
    if (localTypeFilter !== 'all' && note.note_type !== localTypeFilter) {
      return false;
    }
    if (entityFilter !== 'all' && note.entity_type !== entityFilter) {
      return false;
    }
    return true;
  };


  // Sort notes by sort_order and creation date
  const sortNotes = (noteList: NoteData[]) => {
    return noteList.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  };

  // Render note card
  const renderNoteCard = (note: NoteData, dragHandleProps: any) => (
    <NoteCard
      note={note}
      isSelected={note.id === selectedNoteId}
      isChecked={selectedNoteIds.has(note.id)}
      onSelect={() => onNoteSelect?.(note.id)}
      onToggleCheck={isSelectionMode ? () => toggleNoteSelection(note.id) : undefined}
      onUpdate={onNoteUpdate}
      onDelete={() => onNoteDelete?.(note.id)}
      onAddSubNote={() => onAddSubNote?.(note.id)}
      dragHandleProps={dragHandleProps}
    />
  );

  // Handler for saving new note
  const handleSaveNewNote = async (updates: Partial<NoteData>) => {
    if (onNoteAdd && onCancelAdd) {
      try {
        await onNoteAdd(updates as any);
        onCancelAdd(); // Close the add card
      } catch (error) {
        console.error('Failed to create note:', error);
      }
    }
  };

  const uniqueTypes = Array.from(new Set(notes.map(note => note.note_type)));
  const uniqueEntityTypes = Array.from(new Set(notes.map(note => note.entity_type).filter(Boolean)));

  const handleExportAll = async () => {
    try {
      const exportData = await felixService.exportNotes({
        includeChildren: true
      });

      // Convert to JSON and create download
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

      // Convert to JSON and create download
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
        mergeStrategy: 'skip' // Don't overwrite existing notes
      });

      console.log('Import result:', result);
      
      // Reload notes to show imported ones
      window.dispatchEvent(new Event('project-restored'));
    } catch (error) {
      console.error('Failed to import notes:', error);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header with filters and actions */}
      {!hideHeader && (
      <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <h2 className="text-lg font-semibold">Notes</h2>
          
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-8"
            />
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={localTypeFilter}
              onChange={(e) => setLocalTypeFilter(e.target.value)}
              className="text-sm bg-background border border-border rounded px-2 py-1"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>
                  {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown'}
                </option>
              ))}
            </select>
            
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="text-sm bg-background border border-border rounded px-2 py-1"
            >
              <option value="all">All Entities</option>
              {uniqueEntityTypes.map(type => (
                <option key={type} value={type}>
                  {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown'}
                </option>
              ))}
            </select>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {notes.length} notes
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isSelectionMode && selectedNoteIds.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedNoteIds.size} selected
              </span>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={clearSelection}
              >
                Clear
              </Button>
            </>
          )}
          
          {/* Export Menu */}
          <div className="relative" ref={exportMenuRef}>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="Export/Import options"
            >
              <Download className="h-4 w-4" />
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
            
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-md border bg-popover p-1 shadow-md">
                {!isSelectionMode ? (
                  <>
                    <button
                      onClick={handleExportAll}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <FileDown className="h-4 w-4" />
                      Export all notes
                    </button>
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
                    <div className="my-1 h-px bg-border" />
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
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleExportSelected}
                      disabled={selectedNoteIds.size === 0}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                        selectedNoteIds.size === 0 
                          ? "opacity-50 cursor-not-allowed" 
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <FileDown className="h-4 w-4" />
                      Export {selectedNoteIds.size} selected
                    </button>
                    <button
                      onClick={() => selectAll()}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <CheckSquare className="h-4 w-4" />
                      Select all
                    </button>
                    <div className="my-1 h-px bg-border" />
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
                  </>
                )}
              </div>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          
          <Button size="sm" onClick={() => onCreateNew?.()}>
            <Plus className="h-4 w-4 mr-1" />
            New Note
          </Button>
        </div>
      </div>
      )}

      {/* Hierarchy */}
      <div className="flex-1 overflow-auto p-4 min-h-0">
        {/* New Note Card - inline add */}
        {isAddingNew && (
          <div className="mb-4">
            <NoteCard
              note={{
                id: 'temp-new-note',
                title: '',
                content: '',
                note_type: 'note',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                sort_order: 0,
                depth_level: 0,
                entity_type: 'note'
              }}
              isEditing={true}
              onUpdate={handleSaveNewNote}
              onCancelEdit={onCancelAdd}
            />
          </div>
        )}

        <DragDropHierarchy
          items={notes}
          onReorder={onReorder || (() => {})}
          renderCard={renderNoteCard}
          filterItem={filterNote}
          sortItems={sortNotes}
          expandedIds={expandedNotes}
          onToggleExpanded={toggleNoteExpanded}
          itemType="NOTE"
        />
      </div>
    </div>
  );
}