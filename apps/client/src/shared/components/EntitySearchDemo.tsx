import { useState } from 'react';
import { Button } from '@client/shared/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@client/shared/ui/Card';
import { Search, X, Plus } from 'lucide-react';
import { EntitySearchModal } from './EntitySearchModal';
import { useEntitySearchModal } from '@client/shared/hooks/useEntitySearchModal';

interface SearchResult {
  id: string;
  name: string;
  type: string;
  similarity?: number;
  filePath?: string;
  snippet?: string;
  metadata?: any;
}

export function EntitySearchDemo() {
  const [selectedEntity, setSelectedEntity] = useState<SearchResult | null>(null);
  const [linkedEntities, setLinkedEntities] = useState<SearchResult[]>([]);

  // Single select modal
  const singleSelectModal = useEntitySearchModal((entity) => {
    setSelectedEntity(entity as SearchResult);
  });

  // Multi select modal
  const multiSelectModal = useEntitySearchModal((entities) => {
    setLinkedEntities(entities as SearchResult[]);
  });

  const removeLinkedEntity = (entityId: string) => {
    setLinkedEntities(prev => prev.filter(e => e.id !== entityId));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>EntitySearchModal Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Single Select Demo */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Single Entity Selection</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => singleSelectModal.openModal({
                  title: "Select an Entity",
                  placeholder: "Search for components, tasks, notes, or rules...",
                  allowedEntityTypes: ['component', 'task', 'note', 'rule']
                })}
                variant="outline"
              >
                <Search className="h-4 w-4 mr-2" />
                Select Entity
              </Button>
              {selectedEntity && (
                <Button
                  onClick={() => setSelectedEntity(null)}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            
            {selectedEntity && (
              <div className="p-3 border border-border rounded-lg bg-accent/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-muted">
                    {selectedEntity.type}
                  </span>
                  <span className="font-medium">{selectedEntity.name}</span>
                  {selectedEntity.similarity && (
                    <span className="text-xs text-muted-foreground">
                      ({(selectedEntity.similarity * 100).toFixed(0)}% match)
                    </span>
                  )}
                </div>
                {selectedEntity.filePath && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedEntity.filePath}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Multi Select Demo */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Multi-Entity Selection</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => multiSelectModal.openModal({
                  title: "Link Multiple Entities",
                  placeholder: "Search and select multiple entities...",
                  multiSelect: true,
                  maxSelections: 5,
                  showFilters: true
                })}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Linked Entities
              </Button>
              {linkedEntities.length > 0 && (
                <Button
                  onClick={() => setLinkedEntities([])}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All ({linkedEntities.length})
                </Button>
              )}
            </div>
            
            {linkedEntities.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Linked entities ({linkedEntities.length}):
                </p>
                <div className="space-y-2">
                  {linkedEntities.map((entity) => (
                    <div key={entity.id} className="flex items-center gap-2 p-2 border border-border rounded-lg bg-accent/10">
                      <span className="text-xs px-2 py-1 rounded bg-muted">
                        {entity.type}
                      </span>
                      <span className="font-medium flex-1">{entity.name}</span>
                      <Button
                        onClick={() => removeLinkedEntity(entity.id)}
                        variant="ghost"
                        size="sm"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter Demo */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Filtered Search (Components Only)</h3>
            <Button
              onClick={() => singleSelectModal.openModal({
                title: "Select a Component",
                placeholder: "Search for code components...",
                allowedEntityTypes: ['component'],
                showFilters: false
              })}
              variant="outline"
            >
              <Search className="h-4 w-4 mr-2" />
              Search Components Only
            </Button>
          </div>

        </CardContent>
      </Card>

      {/* Render the modals */}
      <EntitySearchModal {...singleSelectModal.modalProps} />
      <EntitySearchModal {...multiSelectModal.modalProps} />
    </div>
  );
}