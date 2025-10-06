import type { KeyboardEvent } from 'react';
import { Input } from '@client/shared/ui/Input';
import { Button } from '@client/shared/ui/Button';
import { Search, Filter, Plus, X, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ExploreView } from '@/types/components';
import type { ExploreSearchFilters, SearchResult } from './types';
type ReactCSSProperties = import('react').CSSProperties;

interface ViewOption {
  id: ExploreView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ExploreSidebarProps {
  activeView: ExploreView;
  onViewChange: (view: ExploreView) => void;
  viewOptions: ViewOption[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  showAdvancedFilters: boolean;
  onToggleAdvancedFilters: () => void;
  showSearchOverlay: boolean;
  onToggleSearchOverlay: () => void;
  onHideSearchOverlay: () => void;
  searchResults: SearchResult[];
  searchFilters: ExploreSearchFilters;
  onUpdateFilters: (filters: ExploreSearchFilters) => void;
  workingSet: SearchResult[];
  activeWorkingSetItem: string | null;
  onSelectWorkingSetItem: (id: string) => void;
  onLoadContext: (id: string) => void;
  removeFromWorkingSet: (id: string) => void;
  clearWorkingSet: () => void;
  getItemIcon: (type: string) => React.ComponentType<{ className?: string }>;
  getItemTypeColor: (type: string) => ReactCSSProperties;
  onSearchInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export function ExploreSidebar({
  activeView,
  onViewChange,
  viewOptions,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  isSearching,
  showAdvancedFilters,
  onToggleAdvancedFilters,
  showSearchOverlay,
  onToggleSearchOverlay,
  onHideSearchOverlay,
  searchResults,
  searchFilters,
  onUpdateFilters,
  workingSet,
  activeWorkingSetItem,
  onSelectWorkingSetItem,
  onLoadContext,
  removeFromWorkingSet,
  clearWorkingSet,
  getItemIcon,
  getItemTypeColor,
  onSearchInputKeyDown,
}: ExploreSidebarProps) {
  const handleEntityTypeToggle = (value: string, checked: boolean) => {
    if (checked) {
      onUpdateFilters({
        ...searchFilters,
        entityTypes: [...searchFilters.entityTypes, value],
      });
      return;
    }

    onUpdateFilters({
      ...searchFilters,
      entityTypes: searchFilters.entityTypes.filter((type) => type !== value),
    });
  };

  const handleComponentTypeToggle = (value: string, checked: boolean) => {
    if (checked) {
      onUpdateFilters({
        ...searchFilters,
        componentTypes: [...searchFilters.componentTypes, value],
      });
      return;
    }

    onUpdateFilters({
      ...searchFilters,
      componentTypes: searchFilters.componentTypes.filter((type) => type !== value),
    });
  };

  return (
    <div className="w-80 border-r border-border bg-background p-4 h-full min-h-0 flex flex-col space-y-6">
      <div className="flex gap-1">
        {viewOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              onClick={() => onViewChange(option.id)}
              className={cn(
                'p-2 rounded-md transition-colors',
                activeView === option.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground',
              )}
              title={option.label}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Search</label>
          <div className="flex gap-1">
            {searchResults.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSearchOverlay}
                className="h-7 px-2 text-xs"
              >
                {showSearchOverlay ? 'Hide' : 'Show'} Results
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleAdvancedFilters}
              className="h-7 px-2 text-xs"
            >
              <Filter className="h-3 w-3 mr-1" />
              Filters
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Search components, tasks, notes..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            onKeyDown={onSearchInputKeyDown}
            className="flex-1"
            disabled={isSearching}
          />
          <Button onClick={onSearch} disabled={isSearching || !searchQuery.trim()} size="sm">
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {showAdvancedFilters && (
          <div className="space-y-3 p-3 border border-border rounded-md bg-accent/20">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Entity Types</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  { value: 'component', label: 'Components' },
                  { value: 'task', label: 'Tasks' },
                  { value: 'note', label: 'Notes' },
                  { value: 'rule', label: 'Rules' },
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center space-x-2 text-xs">
                    <input
                      type="checkbox"
                      checked={searchFilters.entityTypes.includes(value)}
                      onChange={(event) => handleEntityTypeToggle(value, event.target.checked)}
                      className="rounded"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {searchFilters.entityTypes.includes('component') && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Component Types</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    { value: 'file', label: 'Files' },
                    { value: 'class', label: 'Classes' },
                    { value: 'function', label: 'Functions' },
                    { value: 'interface', label: 'Interfaces' },
                    { value: 'method', label: 'Methods' },
                    { value: 'section', label: 'Sections' },
                  ].map(({ value, label }) => (
                    <label key={value} className="flex items-center space-x-2 text-xs">
                      <input
                        type="checkbox"
                        checked={searchFilters.componentTypes.includes(value)}
                        onChange={(event) => handleComponentTypeToggle(value, event.target.checked)}
                        className="rounded"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground">Options</label>
              <div className="space-y-1 mt-1">
                <label className="flex items-center space-x-2 text-xs">
                  <input
                    type="checkbox"
                    checked={searchFilters.includeCode}
                    onChange={(event) =>
                      onUpdateFilters({ ...searchFilters, includeCode: event.target.checked })
                    }
                    className="rounded"
                  />
                  <span>Include code snippets</span>
                </label>
                <label className="flex items-center space-x-2 text-xs">
                  <input
                    type="checkbox"
                    checked={searchFilters.expandTerms}
                    onChange={(event) =>
                      onUpdateFilters({ ...searchFilters, expandTerms: event.target.checked })
                    }
                    className="rounded"
                  />
                  <span>Expand search terms</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between flex-shrink-0">
          <label className="text-sm font-medium">Working Set</label>
          {workingSet.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearWorkingSet}>
              Clear
            </Button>
          )}
        </div>

        {workingSet.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground flex-1 flex flex-col items-center justify-center gap-2">
            <Plus className="h-8 w-8 opacity-40" />
            <p className="text-sm">No items selected</p>
          </div>
        ) : (
          <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
            {workingSet.map((item) => {
              const ItemIcon = getItemIcon(item.type);
              const isActive = activeWorkingSetItem === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectWorkingSetItem(item.id);
                    onLoadContext(item.id);
                    onHideSearchOverlay();
                  }}
                  className={cn(
                    'p-3 border rounded-md cursor-pointer transition-colors',
                    isActive ? 'bg-primary/10 border-primary/50' : 'hover:bg-accent/50 border-border',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-sm" style={getItemTypeColor(item.type)}>
                      <ItemIcon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.type}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeFromWorkingSet(item.id);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
