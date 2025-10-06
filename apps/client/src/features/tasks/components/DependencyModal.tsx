import { useState, useEffect } from 'react';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { X, Search, CheckSquare } from 'lucide-react';
import { felixService } from '@/services/felixService';

interface SearchResult {
  id: string;
  name: string;
  type: string;
  similarity?: number;
  filePath?: string;
  snippet?: string;
}

interface DependencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (taskId: string, type: 'blocks' | 'related' | 'follows', required: boolean) => void;
}

export function DependencyModal({ isOpen, onClose, onAdd }: DependencyModalProps) {
  const [dependencyType, setDependencyType] = useState<'blocks' | 'related' | 'follows'>('blocks');
  const [isRequired, setIsRequired] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTask, setSelectedTask] = useState<SearchResult | null>(null);

  // Search for tasks
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const searchTasks = async () => {
      setIsSearching(true);
      try {
        const response = await felixService.search(searchQuery, 20, ['task']);
        setSearchResults(response.results || []);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchTasks, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleAddDependency = () => {
    if (selectedTask) {
      onAdd(selectedTask.id, dependencyType, isRequired);
      onClose();
      // Reset form
      setSearchQuery('');
      setSelectedTask(null);
      setDependencyType('blocks');
      setIsRequired(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-background border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Task Dependency</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          {/* Dependency Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Dependency Type</label>
            <select
              value={dependencyType}
              onChange={(e) => setDependencyType(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="blocks">🚫 Blocks - This task must be completed first</option>
              <option value="related">🔗 Related - Informational link</option>
              <option value="follows">➡️ Follows - This task should start after</option>
            </select>
          </div>

          {/* Required */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="required" className="text-sm">
              Required dependency
            </label>
          </div>

          {/* Task Search */}
          <div>
            <label className="block text-sm font-medium mb-2">Search for Task</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search tasks..."
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            {searchQuery && (
              <div className="mt-2 max-h-48 overflow-y-auto border rounded-md bg-background">
                {isSearching ? (
                  <div className="p-3 text-sm text-muted-foreground">Searching...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => setSelectedTask(result)}
                      className={`w-full text-left p-3 hover:bg-muted transition-colors border-b last:border-b-0 ${
                        selectedTask?.id === result.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="font-medium text-sm">{result.name}</div>
                          {result.snippet && (
                            <div className="text-xs text-muted-foreground mt-1">{result.snippet}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground">No tasks found</div>
                )}
              </div>
            )}

            {/* Selected Task */}
            {selectedTask && (
              <div className="mt-2 p-2 bg-muted rounded border">
                <div className="text-sm font-medium">Selected: {selectedTask.name}</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddDependency}
            disabled={!selectedTask}
          >
            Add Dependency
          </Button>
        </div>
      </div>
    </div>
  );
}