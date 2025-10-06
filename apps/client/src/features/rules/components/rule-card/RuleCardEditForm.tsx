import { KeyboardEvent, MouseEvent } from 'react';
import { Plus, Tag, X as CloseIcon } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { EntityLinksSection } from '@client/shared/components/EntityLinksSection';
import type { RuleCardEditingApi } from './useRuleCardEditing';

interface RuleCardEditFormProps {
  editing: RuleCardEditingApi;
}

export function RuleCardEditForm({ editing }: RuleCardEditFormProps) {
  const { formState, newTag, setNewTag, addTag, removeTag, updateField } = editing;

  const handleAddTag = (event?: MouseEvent | KeyboardEvent) => {
    event?.stopPropagation();
    addTag(newTag);
  };

  return (
    <div className="mb-3 space-y-3" onClick={(event) => event.stopPropagation()}>
      <div>
        <div className="text-xs text-muted-foreground mb-1">Tags</div>
        {formState.stable_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {formState.stable_tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded"
              >
                <Tag className="h-2 w-2" />
                {tag}
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    removeTag(tag);
                  }}
                  className="ml-1 hover:text-destructive"
                >
                  <CloseIcon className="h-2 w-2" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-1">
          <Input
            value={newTag}
            onChange={(event) => setNewTag(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAddTag(event);
              }
            }}
            placeholder="Add tag..."
            className="flex-1 h-6 text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddTag}
            disabled={!newTag.trim()}
            className="h-6 w-6 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <EntityLinksSection
        entityLinks={formState.entity_links}
        stableLinks={formState.stable_links}
        fragileLinks={formState.fragile_links}
        onEntityLinksUpdate={(links) => updateField('entity_links', links)}
        onStableLinksUpdate={(links) => updateField('stable_links', links)}
        onFragileLinksUpdate={(links) => updateField('fragile_links', links)}
        allowedEntityTypes={['component', 'note', 'task', 'rule']}
        compact
      />
    </div>
  );
}
