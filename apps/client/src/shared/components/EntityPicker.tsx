import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check, Hash, FileText, CheckSquare, Code, Settings } from 'lucide-react';
import { Input } from '@client/shared/ui/Input';
import { cn } from '@/utils/cn';
import { felixService } from '@/services/felixService';

export interface EntityPickerResult {
  id: string;
  name: string;
  type: string;
  similarity?: number;
  filePath?: string;
  snippet?: string;
  metadata?: any;
}

interface EntityPickerProps {
  value?: EntityPickerResult | EntityPickerResult[];
  onSelect: (entity: EntityPickerResult | EntityPickerResult[]) => void;
  placeholder?: string;
  allowedEntityTypes?: ('component' | 'task' | 'note' | 'rule')[];
  multiSelect?: boolean;
  maxSelections?: number;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showType?: boolean;
  showSnippet?: boolean;
}

export function EntityPicker({
  value,
  onSelect,
  placeholder = "Search and select entities...",
  allowedEntityTypes = ['component', 'task', 'note', 'rule'],
  multiSelect = false,
  maxSelections = 5,
  disabled = false,
  className,
  size = 'md',
  showType = true,
  showSnippet = false
}: EntityPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EntityPickerResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const selectedEntities = Array.isArray(value) ? value : value ? [value] : [];

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim() || !isOpen) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await felixService.search(
          searchQuery.trim(), 
          20, 
          allowedEntityTypes
        );
        
        const results = (response.results || []).map((result: any) => ({
          id: result.id,
          name: result.name,
          type: result.type,
          similarity: result.score || result.similarity,
          filePath: result.filePath,
          snippet: result.snippet,
          metadata: result.metadata
        }));
        
        setSearchResults(results);
        setHighlightedIndex(-1);
      } catch (error) {
        console.error('Entity search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, isOpen, allowedEntityTypes]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && searchResults[highlightedIndex]) {
          handleSelectEntity(searchResults[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectEntity = (entity: EntityPickerResult) => {
    if (multiSelect) {
      const isSelected = selectedEntities.some(e => e.id === entity.id);
      let newSelection: EntityPickerResult[];
      
      if (isSelected) {
        newSelection = selectedEntities.filter(e => e.id !== entity.id);
      } else {
        if (maxSelections && selectedEntities.length >= maxSelections) {
          return; // Don't allow more selections
        }
        newSelection = [...selectedEntities, entity];
      }
      
      onSelect(newSelection);
    } else {
      onSelect(entity);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const handleRemoveEntity = (entityId: string) => {
    if (multiSelect) {
      const newSelection = selectedEntities.filter(e => e.id !== entityId);
      onSelect(newSelection);
    } else {
      onSelect([] as any); // Clear single selection
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'task': return CheckSquare;
      case 'note': return FileText;
      case 'rule': return Settings;
      default: return Code;
    }
  };

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case 'task': return 'text-primary bg-primary/10  /20/20';
      case 'note': return 'text-purple-600 bg-purple-100  /20';
      case 'rule': return 'text-green-600 bg-green-100  /20';
      default: return 'text-orange-600 bg-orange-100  /20';
    }
  };

  const getShortId = (id: string) => {
    const parts = id.split('_');
    return parts[parts.length - 1] || id.substring(0, 8);
  };

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const inputSizeClasses = {
    sm: 'h-8 px-2 text-xs',
    md: 'h-10 px-3 text-sm',
    lg: 'h-12 px-4 text-base'
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Selected entities display (for multi-select) */}
      {multiSelect && selectedEntities.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedEntities.map((entity) => {
            const EntityIcon = getEntityIcon(entity.type);
            return (
              <div
                key={entity.id}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded border',
                  getEntityTypeColor(entity.type),
                  sizeClasses[size]
                )}
              >
                <EntityIcon className="h-3 w-3" />
                <span className="truncate max-w-32">{entity.name}</span>
                {showType && (
                  <span className="text-xs opacity-75">{entity.type}</span>
                )}
                <button
                  onClick={() => handleRemoveEntity(entity.id)}
                  className="hover:bg-background/50 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Single selection display */}
      {!multiSelect && value && !Array.isArray(value) && (
        <div className="mb-2">
          <div className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded border bg-muted/50',
            sizeClasses[size]
          )}>
            {(() => {
              const EntityIcon = getEntityIcon(value.type);
              return <EntityIcon className="h-4 w-4" />;
            })()}
            <span className="font-medium">{value.name}</span>
            {showType && (
              <span className={cn(
                'px-1.5 py-0.5 rounded text-xs',
                getEntityTypeColor(value.type)
              )}>
                {value.type}
              </span>
            )}
            <Hash className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground">
              {getShortId(value.id)}
            </span>
            <button
              onClick={() => handleRemoveEntity(value.id)}
              className="hover:bg-background/50 rounded p-1"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input field */}
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            inputSizeClasses[size],
            'pr-10'
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isSearching && <Search className="h-4 w-4 animate-spin" />}
          <ChevronDown className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Search className="h-4 w-4 animate-spin mx-auto mb-2" />
              Searching...
            </div>
          ) : searchResults.length > 0 ? (
            <div className="p-1">
              {searchResults.map((result, index) => {
                const EntityIcon = getEntityIcon(result.type);
                const isSelected = selectedEntities.some(e => e.id === result.id);
                const isHighlighted = index === highlightedIndex;
                
                return (
                  <div
                    key={result.id}
                    onClick={() => handleSelectEntity(result)}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded cursor-pointer transition-colors',
                      isHighlighted && 'bg-accent',
                      isSelected && 'bg-primary/10',
                      'hover:bg-accent'
                    )}
                  >
                    {multiSelect && (
                      <div className={cn(
                        'w-4 h-4 border rounded flex items-center justify-center',
                        isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    )}
                    
                    <div className={cn(
                      'p-1 rounded',
                      getEntityTypeColor(result.type)
                    )}>
                      <EntityIcon className="h-3 w-3" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium truncate text-sm">{result.name}</span>
                        {showType && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {result.type}
                          </span>
                        )}
                        <span className="text-xs font-mono text-muted-foreground">
                          #{getShortId(result.id)}
                        </span>
                      </div>
                      {result.filePath && (
                        <div className="text-xs text-muted-foreground truncate">
                          {result.filePath}
                        </div>
                      )}
                      {showSnippet && result.snippet && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {result.snippet}
                        </div>
                      )}
                    </div>
                    
                    {result.similarity !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        {Math.round(result.similarity * 100)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : searchQuery.trim() ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No entities found for "{searchQuery}"
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Start typing to search for entities...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
