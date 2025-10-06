import { Tag, X, Plus, Clock, User, Calendar } from 'lucide-react';
import type { FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { EntityLinksSection, type EntityLink } from '@client/shared/components/EntityLinksSection';
import type { EditableDependency } from '../hooks/useTaskCardData';
import { TaskDependenciesEditor } from './TaskDependenciesEditor';

interface TaskCardEditMetadataSectionProps {
  estimatedEffort: string;
  onEstimatedEffortChange: (value: string) => void;
  assignedTo: string;
  onAssignedToChange: (value: string) => void;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  tags: string[];
  onRemoveTag: (tag: string) => void;
  onAddTag: () => void;
  newTag: string;
  onNewTagChange: (value: string) => void;
  entityLinks: EntityLink[];
  onEntityLinksChange: (links: EntityLink[]) => void;
  stableLinks: Record<string, any>;
  onStableLinksChange: (links: Record<string, any>) => void;
  fragileLinks: Record<string, any>;
  onFragileLinksChange: (links: Record<string, any>) => void;
  dependencies: EditableDependency[];
  onUpdateDependency: (index: number, updates: Partial<EditableDependency>) => void;
  onRemoveDependency: (index: number) => void;
  onAddDependency: () => void;
}

export function TaskCardEditMetadataSection({
  estimatedEffort,
  onEstimatedEffortChange,
  assignedTo,
  onAssignedToChange,
  dueDate,
  onDueDateChange,
  tags,
  onRemoveTag,
  onAddTag,
  newTag,
  onNewTagChange,
  entityLinks,
  onEntityLinksChange,
  stableLinks,
  onStableLinksChange,
  fragileLinks,
  onFragileLinksChange,
  dependencies,
  onUpdateDependency,
  onRemoveDependency,
  onAddDependency,
}: TaskCardEditMetadataSectionProps) {
  const stopPropagation = (event: MouseEvent | KeyboardEvent | FocusEvent) => {
    event.stopPropagation();
  };
  const handleDependencyInteraction = (event: MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div className="flex items-center gap-2 flex-wrap mt-2" onClick={stopPropagation}>
      <div className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        <input
          type="text"
          value={estimatedEffort}
          onChange={(event) => onEstimatedEffortChange(event.target.value)}
          onClick={stopPropagation}
          placeholder="2h, 3d, 1w"
          className="w-16 bg-background border border-border rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>
      <div className="flex items-center gap-1">
        <User className="h-3 w-3" />
        <input
          type="text"
          value={assignedTo}
          onChange={(event) => onAssignedToChange(event.target.value)}
          onClick={stopPropagation}
          placeholder="Person/team"
          className="w-20 bg-background border border-border rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>
      <div className="flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        <input
          type="date"
          value={dueDate}
          onChange={(event) => onDueDateChange(event.target.value)}
          onClick={stopPropagation}
          className="bg-background border border-border rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>

      <div className="w-full" onClick={stopPropagation}>
        <div className="text-xs text-muted-foreground mb-1">Tags</div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded">
                <Tag className="h-2 w-2" />
                {tag}
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveTag(tag);
                  }}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-2 w-2" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-1">
          <Input
            value={newTag}
            onChange={(event) => onNewTagChange(event.target.value)}
            onClick={stopPropagation}
            onKeyDown={(event) => {
              stopPropagation(event);
              if (event.key === 'Enter') {
                event.preventDefault();
                onAddTag();
              }
            }}
            placeholder="Add tag..."
            className="flex-1 h-6 text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddTag()}
            disabled={!newTag.trim()}
            className="h-6 w-6 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="w-full" onClick={stopPropagation}>
        <EntityLinksSection
          entityLinks={entityLinks}
          stableLinks={stableLinks}
          fragileLinks={fragileLinks}
          onEntityLinksUpdate={onEntityLinksChange}
          onStableLinksUpdate={onStableLinksChange}
          onFragileLinksUpdate={onFragileLinksChange}
          allowedEntityTypes={['component', 'note', 'rule', 'task']}
          compact
        />
      </div>

      <TaskDependenciesEditor
        dependencies={dependencies}
        onUpdateDependency={onUpdateDependency}
        onRemoveDependency={onRemoveDependency}
        onAddDependency={onAddDependency}
        onClickPropagationBlock={handleDependencyInteraction}
      />
    </div>
  );
}
