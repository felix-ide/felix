import type { KeyboardEvent, MouseEvent } from 'react';
import { MarkdownRenderer } from '@client/shared/components/MarkdownRenderer';

interface TaskDescriptionSectionProps {
  isEditing: boolean;
  description?: string | null;
  editDescription: string;
  onEditDescriptionChange: (value: string) => void;
  onDescriptionKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onClickPropagationBlock?: (event: MouseEvent) => void;
}

export function TaskDescriptionSection({
  isEditing,
  description,
  editDescription,
  onEditDescriptionChange,
  onDescriptionKeyDown,
  onClickPropagationBlock,
}: TaskDescriptionSectionProps) {
  if (isEditing) {
    return (
      <div>
        <div className="mb-1 text-xs text-muted-foreground">Description (supports markdown)</div>
        <textarea
          value={editDescription}
          onChange={(event) => onEditDescriptionChange(event.target.value)}
          onKeyDown={onDescriptionKeyDown}
          onClick={onClickPropagationBlock}
          placeholder="Add description... (supports markdown)"
          className="w-full text-sm bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-mono"
          rows={6}
        />
      </div>
    );
  }

  if (!description) {
    return null;
  }

  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">Description</h4>
      <MarkdownRenderer content={description} />
    </div>
  );
}
