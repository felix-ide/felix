import type { MouseEvent } from 'react';
import type { Checklist, TaskData } from '@/types/api';
import { ChecklistManager } from '../../ChecklistManager';

interface TaskChecklistSectionProps {
  isEditing: boolean;
  task: TaskData;
  editChecklists: Checklist[];
  onEditChecklistsChange: (next: Checklist[]) => void;
  onChecklistItemToggle: (checklistName: string, itemIndex: number) => void;
  onClickPropagationBlock?: (event: MouseEvent) => void;
}

export function TaskChecklistSection({
  isEditing,
  task,
  editChecklists,
  onEditChecklistsChange,
  onChecklistItemToggle,
  onClickPropagationBlock,
}: TaskChecklistSectionProps) {
  if (isEditing) {
    return (
      <div className="mt-4" onClick={onClickPropagationBlock}>
        <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">Checklists</h4>
        <ChecklistManager checklists={editChecklists} onChange={onEditChecklistsChange} isEditing />
      </div>
    );
  }

  if (!task.checklists || task.checklists.length === 0) {
    return null;
  }

  return (
    <div className="mt-4" onClick={onClickPropagationBlock}>
      <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">Checklists</h4>
      <ChecklistManager
        checklists={task.checklists}
        onChange={() => {}}
        isEditing={false}
        onItemToggle={onChecklistItemToggle}
      />
    </div>
  );
}
