import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@client/shared/ui/Card';
import { Button } from '@client/shared/ui/Button';
import { EntityPicker, EntityPickerResult } from './EntityPicker';

export function EntityPickerDemo() {
  const [singleSelection, setSingleSelection] = useState<EntityPickerResult | undefined>();
  const [multiSelection, setMultiSelection] = useState<EntityPickerResult[]>([]);
  const [taskSelection, setTaskSelection] = useState<EntityPickerResult | undefined>();
  const [noteSelection, setNoteSelection] = useState<EntityPickerResult[]>([]);

  return (
    <div className="space-y-6 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">EntityPicker Component Demo</h2>
        <p className="text-muted-foreground">
          Lightweight inline entity selection component for quick entity picking scenarios.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Single Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Single Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <EntityPicker
              value={singleSelection}
              onSelect={(entity) => setSingleSelection(entity as EntityPickerResult)}
              placeholder="Select a single entity..."
              showType={true}
            />
            <div className="text-sm">
              <strong>Selected:</strong> {singleSelection ? singleSelection.name : 'None'}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSingleSelection(undefined)}
            >
              Clear Selection
            </Button>
          </CardContent>
        </Card>

        {/* Multi Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Multi Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <EntityPicker
              value={multiSelection}
              onSelect={(entities) => setMultiSelection(entities as EntityPickerResult[])}
              placeholder="Select multiple entities..."
              multiSelect={true}
              maxSelections={3}
              showType={true}
            />
            <div className="text-sm">
              <strong>Selected:</strong> {multiSelection.length} entities
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMultiSelection([])}
            >
              Clear All
            </Button>
          </CardContent>
        </Card>

        {/* Tasks Only */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks Only (Small Size)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <EntityPicker
              value={taskSelection}
              onSelect={(entity) => setTaskSelection(entity as EntityPickerResult)}
              placeholder="Select a task..."
              allowedEntityTypes={['task']}
              size="sm"
              showType={false}
              showSnippet={true}
            />
            <div className="text-sm">
              <strong>Selected Task:</strong> {taskSelection ? taskSelection.name : 'None'}
            </div>
          </CardContent>
        </Card>

        {/* Notes Multi-Select */}
        <Card>
          <CardHeader>
            <CardTitle>Notes Multi-Select (Large Size)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <EntityPicker
              value={noteSelection}
              onSelect={(entities) => setNoteSelection(entities as EntityPickerResult[])}
              placeholder="Select notes..."
              allowedEntityTypes={['note']}
              multiSelect={true}
              maxSelections={5}
              size="lg"
              showType={false}
              showSnippet={true}
            />
            <div className="text-sm">
              <strong>Selected Notes:</strong> {noteSelection.length} notes
              {noteSelection.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {noteSelection.map((note) => (
                    <li key={note.id} className="text-xs text-muted-foreground">
                      • {note.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Basic Single Selection:</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`<EntityPicker
  value={selectedEntity}
  onSelect={(entity) => setSelectedEntity(entity)}
  placeholder="Select an entity..."
/>`}
              </pre>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Multi-Select with Type Filter:</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`<EntityPicker
  value={selectedEntities}
  onSelect={(entities) => setSelectedEntities(entities)}
  placeholder="Select tasks..."
  allowedEntityTypes={['task']}
  multiSelect={true}
  maxSelections={5}
  showSnippet={true}
/>`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">Compact Version:</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`<EntityPicker
  value={selectedEntity}
  onSelect={handleSelect}
  size="sm"
  showType={false}
  allowedEntityTypes={['component', 'rule']}
/>`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}