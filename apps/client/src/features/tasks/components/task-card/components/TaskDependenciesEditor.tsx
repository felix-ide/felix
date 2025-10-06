import type { MouseEvent } from 'react';
import { Button } from '@client/shared/ui/Button';
import { Link2, X } from 'lucide-react';

interface TaskDependenciesEditorProps {
  dependencies: Array<{
    id?: string;
    taskId: string;
    taskName: string;
    type: 'blocks' | 'related' | 'follows';
    required: boolean;
    isNew?: boolean;
  }>;
  onUpdateDependency: (index: number, updates: Partial<TaskDependenciesEditorProps['dependencies'][number]>) => void;
  onRemoveDependency: (index: number) => void;
  onAddDependency: () => void;
  onClickPropagationBlock?: (event: MouseEvent) => void;
}

export function TaskDependenciesEditor({
  dependencies,
  onUpdateDependency,
  onRemoveDependency,
  onAddDependency,
  onClickPropagationBlock,
}: TaskDependenciesEditorProps) {
  return (
    <div className="w-full" onClick={onClickPropagationBlock}>
      <div className="text-xs text-muted-foreground mb-1">Dependencies</div>
      {dependencies.length > 0 && (
        <div className="space-y-2 mb-2">
          {dependencies.map((dependency, index) => (
            <div key={dependency.taskId + index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <select
                value={dependency.type}
                onChange={(event) => onUpdateDependency(index, { type: event.target.value as any })}
                className="text-xs bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="blocks">🚫 Blocks</option>
                <option value="related">🔗 Related</option>
                <option value="follows">➡️ Follows</option>
              </select>
              <span className="text-xs flex-1 truncate" title={dependency.taskName}>
                {dependency.taskName}
              </span>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={dependency.required}
                  onChange={(event) => onUpdateDependency(index, { required: event.target.checked })}
                  className="w-3 h-3"
                />
                Required
              </label>
              <button
                onClick={() => onRemoveDependency(index)}
                className="text-destructive hover:opacity-80 p-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          onAddDependency();
        }}
        className="h-6 w-full text-xs"
      >
        <Link2 className="h-3 w-3 mr-1" />
        Add Dependency
      </Button>
    </div>
  );
}
