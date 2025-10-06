import { useState, useEffect, useCallback } from 'react';
import { Search, X, Loader2, AlertCircle, CheckSquare, FileText, Code, Filter, Settings } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { cn } from '@/utils/cn';
import { API_BASE, buildUrl, fetchJson } from '@client/shared/api/http';

interface SearchResult {
  id: string;
  name: string;
  type: string;
  similarity?: number;
  filePath?: string;
  snippet?: string;
  metadata?: any;
}

interface EntitySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (entity: SearchResult | SearchResult[]) => void;
  title?: string;
  placeholder?: string;
  allowedEntityTypes?: ('component' | 'task' | 'note' | 'rule')[];
  multiSelect?: boolean;
  maxSelections?: number;
  showFilters?: boolean;
  autoFocus?: boolean;
}

export function EntitySearchModal({
  isOpen,
  onClose,
  onSelect,
  title = "Search Entities",
  placeholder = "Search components, tasks, notes, rules...",
  allowedEntityTypes,
  multiSelect = false,
  maxSelections,
  showFilters = true,
  autoFocus = true
}: EntitySearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeEntityTypes, setActiveEntityTypes] = useState<Set<string>>(
    new Set(allowedEntityTypes || ['component', 'task', 'note', 'rule'])
  );

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedEntities([]);
      setSearchError(null);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeEntityTypes]);

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      // Use enhanced search API with entity type filtering
      const queryParams: Record<string, string> = {
        query: searchQuery.trim(),
        max_results: '50',
      };

      if (allowedEntityTypes && allowedEntityTypes.length > 0) {
        queryParams.entity_type = Array.from(activeEntityTypes).join(',');
      }

      const url = buildUrl(API_BASE, 'search', queryParams);
      const data = await fetchJson<{ results?: SearchResult[] }>(url, undefined, 'Search failed');
      setSearchResults(data.results ?? []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError(error instanceof Error ? error.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, activeEntityTypes, allowedEntityTypes]);

  const handleEntitySelect = (entity: SearchResult) => {
    if (multiSelect) {
      const isSelected = selectedEntities.some(e => e.id === entity.id);
      
      if (isSelected) {
        // Remove from selection
        setSelectedEntities(prev => prev.filter(e => e.id !== entity.id));
      } else {
        // Add to selection (check max limit)
        if (!maxSelections || selectedEntities.length < maxSelections) {
          setSelectedEntities(prev => [...prev, entity]);
        }
      }
    } else {
      // Single select - close modal and return result
      onSelect?.(entity);
      onClose();
    }
  };

  const handleConfirmSelection = () => {
    if (multiSelect && selectedEntities.length > 0) {
      onSelect?.(selectedEntities);
      onClose();
    }
  };

  const toggleEntityType = (type: string) => {
    const newTypes = new Set(activeEntityTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setActiveEntityTypes(newTypes);
  };

  const getEntityIcon = (type: string) => {
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

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'text-primary bg-primary/10  /20/20';
      case 'note':
        return 'text-purple-600 bg-purple-100  /20';
      case 'rule':
        return 'text-green-600 bg-green-100  /20';
      default:
        return 'text-orange-600 bg-orange-100  /20';
    }
  };

  const entityTypeOptions = [
    { id: 'component', label: 'Components', icon: Code },
    { id: 'task', label: 'Tasks', icon: CheckSquare },
    { id: 'note', label: 'Notes', icon: FileText },
    { id: 'rule', label: 'Rules', icon: Settings },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background border border-border rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Input */}
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus={autoFocus}
              />
            </div>
          </div>

          {/* Entity Type Filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Filter className="h-3 w-3" />
                Filters:
              </div>
              {entityTypeOptions
                .filter(option => !allowedEntityTypes || allowedEntityTypes.includes(option.id as any))
                .map((option) => {
                  const Icon = option.icon;
                  const isActive = activeEntityTypes.has(option.id);
                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleEntityType(option.id)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors',
                        isActive 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted hover:bg-muted-foreground/10'
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {option.label}
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto">
          {searchError ? (
            <div className="p-4">
              <div className="flex items-center gap-2 p-4 text-destructive bg-destructive/10 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{searchError}</span>
              </div>
            </div>
          ) : isSearching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Searching...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="p-4 space-y-2">
              {searchResults.map((result) => {
                const EntityIcon = getEntityIcon(result.type);
                const isSelected = multiSelect && selectedEntities.some(e => e.id === result.id);
                const canSelect = !multiSelect || !maxSelections || selectedEntities.length < maxSelections || isSelected;

                return (
                  <div
                    key={result.id}
                    onClick={() => canSelect && handleEntitySelect(result)}
                    className={cn(
                      'p-3 border border-border rounded-lg transition-colors cursor-pointer',
                      'hover:bg-accent/50',
                      isSelected && 'bg-accent border-primary',
                      !canSelect && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'p-2 rounded-md flex-shrink-0',
                        getEntityTypeColor(result.type)
                      )}>
                        <EntityIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{result.name}</h4>
                          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {result.type}
                          </span>
                          {result.similarity !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              {(result.similarity * 100).toFixed(0)}% match
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground">
                              Selected
                            </span>
                          )}
                        </div>
                        {result.filePath && (
                          <p className="text-xs text-muted-foreground mb-1">
                            {result.filePath}
                          </p>
                        )}
                        {result.snippet && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {result.snippet}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : searchQuery ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mb-4 opacity-50" />
              <p>No results found for "{searchQuery}"</p>
              <p className="text-sm mt-2">Try adjusting your search terms or filters</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mb-4 opacity-50" />
              <p>Start typing to search entities</p>
              <p className="text-sm mt-2">Search across components, tasks, notes, and rules</p>
            </div>
          )}
        </div>

        {/* Footer for multi-select */}
        {multiSelect && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedEntities.length} selected
              {maxSelections && ` (max ${maxSelections})`}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmSelection}
                disabled={selectedEntities.length === 0}
              >
                Add Selected ({selectedEntities.length})
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
