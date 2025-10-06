import { useState, useEffect } from 'react';
import { Search, SortAsc, SortDesc, Plus } from 'lucide-react';
import { Input } from '@client/shared/ui/Input';
import { Button } from '@client/shared/ui/Button';
import { NoteCard } from './NoteCard';
import { felixService } from '@/services/felixService';
import { cn } from '@/utils/cn';
import type { NoteData } from '@/types/api';

interface NotesListProps {
  notes: NoteData[];
  loading?: boolean;
  selectedNoteId?: string;
  searchQuery?: string;
  onNoteSelect?: (noteId: string) => void;
  onNoteEdit?: (note: NoteData) => void;
  onNoteDelete?: (noteId: string) => void;
  onSearch?: (query: string) => void;
  onCreateNew?: () => void;
  className?: string;
}

type SortField = 'created_at' | 'updated_at' | 'title';
type SortDirection = 'asc' | 'desc';

export function NotesList({
  notes,
  loading = false,
  selectedNoteId,
  searchQuery = '',
  onNoteSelect,
  onNoteEdit,
  onNoteDelete,
  // onSearch, // unused parameter
  onCreateNew,
  className,
}: NotesListProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced NLP search
  useEffect(() => {
    const performSearch = async () => {
      if (!localSearchQuery.trim()) {
        setSearchResults([]);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);
      try {
        const response = await felixService.search(localSearchQuery, 50, ['note']);
        const results = response.results || [];
        console.log('Note search results:', results);
        
        // Extract note IDs from search results
        const noteIds = results.map(r => r.id).filter(Boolean);
        setSearchResults(noteIds);
        
        // If we have results and can select, select the first one
        if (noteIds.length > 0 && onNoteSelect) {
          onNoteSelect(noteIds[0]);
        }
      } catch (error) {
        console.error('Failed to search notes:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [localSearchQuery, onNoteSelect]);

  // Sort and filter notes
  const filteredAndSortedNotes = notes
    .filter((note) => {
      // If we're searching, only show notes that match search results
      if (localSearchQuery.trim() && hasSearched) {
        if (!searchResults.includes(note.id)) {
          return false;
        }
      }
      
      // Type filter
      if (typeFilter !== 'all' && note.note_type !== typeFilter) {
        return false;
      }
      
      // Entity filter
      if (entityFilter !== 'all') {
        if (entityFilter === 'linked' && !note.entity_type) {
          return false;
        }
        if (entityFilter === 'unlinked' && note.entity_type) {
          return false;
        }
        if (entityFilter !== 'linked' && entityFilter !== 'unlinked' && note.entity_type !== entityFilter) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      let aValue: string | undefined;
      let bValue: string | undefined;
      
      switch (sortField) {
        case 'title':
          aValue = a.title || '';
          bValue = b.title || '';
          break;
        case 'created_at':
          aValue = a.created_at;
          bValue = b.created_at;
          break;
        case 'updated_at':
          aValue = a.updated_at;
          bValue = b.updated_at;
          break;
      }
      
      const comparison = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // const handleTagClick = (tag: string) => {
  //   setLocalSearchQuery(tag);
  // };

  const handleDeleteNote = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${note.title || 'Untitled note'}"?`
    );
    
    if (confirmed) {
      onNoteDelete?.(noteId);
    }
  };

  // Get unique entity types for filter
  const entityTypes = [...new Set(notes.map(note => note.entity_type).filter(Boolean))];

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b border-border space-y-4">
        {/* Search and Create */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes by name, ID, or content..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              className="pl-9 pr-10"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}
          </div>
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Sort */}
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">Sort:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSort('updated_at')}
              className={cn(
                'h-7 px-2',
                sortField === 'updated_at' && 'bg-accent'
              )}
            >
              Updated
              {sortField === 'updated_at' && (
                sortDirection === 'asc' ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSort('created_at')}
              className={cn(
                'h-7 px-2',
                sortField === 'created_at' && 'bg-accent'
              )}
            >
              Created
              {sortField === 'created_at' && (
                sortDirection === 'asc' ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSort('title')}
              className={cn(
                'h-7 px-2',
                sortField === 'title' && 'bg-accent'
              )}
            >
              Title
              {sortField === 'title' && (
                sortDirection === 'asc' ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />
              )}
            </Button>
          </div>

          <div className="w-px h-4 bg-border" />

          {/* Type Filter */}
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-sm bg-background border border-border rounded px-2 py-1"
            >
              <option value="all">All</option>
              <option value="note">Note</option>
              <option value="warning">Warning</option>
              <option value="documentation">Documentation</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">Link:</span>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="text-sm bg-background border border-border rounded px-2 py-1"
            >
              <option value="all">All</option>
              <option value="linked">Linked</option>
              <option value="unlinked">Unlinked</option>
              {entityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          {loading ? (
            'Loading...'
          ) : (
            `${filteredAndSortedNotes.length} of ${notes.length} notes`
          )}
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading notes...
          </div>
        ) : filteredAndSortedNotes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {notes.length === 0 ? (
              <div>
                <div className="text-lg mb-2">No notes yet</div>
                <div className="text-sm">Create your first note to get started</div>
              </div>
            ) : (
              <div>
                <div className="text-lg mb-2">No notes match your filters</div>
                <div className="text-sm">Try adjusting your search or filters</div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedNotes.map((note, index) => (
              <NoteCard
                key={note.id || `note-${index}`}
                note={note}
                isSelected={note.id === selectedNoteId}
                onSelect={() => onNoteSelect?.(note.id)}
                onEdit={() => onNoteEdit?.(note)}
                onDelete={() => handleDeleteNote(note.id)}
                // onTagClick={handleTagClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}