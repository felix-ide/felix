import type { MouseEvent } from 'react';
import { MarkdownRenderer } from '@client/shared/components/MarkdownRenderer';
import { MarkdownEditor } from '@client/shared/components/MarkdownEditor';

interface TaskDescriptionSectionProps {
  isEditing: boolean;
  description?: string | null;
  editDescription: string;
  onEditDescriptionChange: (value: string) => void;
  onClickPropagationBlock?: (event: MouseEvent) => void;
}

export function TaskDescriptionSection({
  isEditing,
  description,
  editDescription,
  onEditDescriptionChange,
  onClickPropagationBlock,
}: TaskDescriptionSectionProps) {
  if (isEditing) {
    return (
      <div onClick={onClickPropagationBlock}>
        <div className="mb-1 text-xs text-muted-foreground">Description (supports markdown)</div>
        <MarkdownEditor
          value={editDescription}
          onChange={onEditDescriptionChange}
          placeholder="Add description... (supports markdown)"
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
