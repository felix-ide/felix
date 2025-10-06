import { Chip } from '@client/shared/ui/Chip';
import { ChecklistDisplay } from '../../ChecklistDisplay';
import type { TaskData, Checklist } from '@/types/api';
import {
  Calendar,
  Clock,
  Link2,
  ListTodo,
  Paperclip,
  Shield,
  Tag,
  User,
  ChevronRight,
} from 'lucide-react';

interface TaskCardMetadataRowProps {
  task: TaskData;
  dependencyCount: { incoming: number; outgoing: number };
  childTasksCount: number;
  completedChildTasksCount: number;
  noteCounts: {
    architecture: number;
    mockup: number;
    documentation: number;
    general: number;
  };
  rulesCount: number;
  additionalLinkCount: number;
  copyStyles: {
    estimatedEffortChip?: React.CSSProperties;
    assignedChip?: React.CSSProperties;
    dueChip?: React.CSSProperties;
    tagsChip?: React.CSSProperties;
    rulesChip?: React.CSSProperties;
    linksChip?: React.CSSProperties;
  };
  formatDate: (dateString?: string) => string | null;
  getNoteTypeStyles: (type: string) => React.CSSProperties;
  checklists: Checklist[] | undefined;
  onExpand: (event: React.MouseEvent<HTMLButtonElement>) => void;
  generalLinksTooltip: string;
}

export function TaskCardMetadataRow({
  task,
  dependencyCount,
  childTasksCount,
  completedChildTasksCount,
  noteCounts,
  rulesCount,
  additionalLinkCount,
  copyStyles,
  formatDate,
  getNoteTypeStyles,
  checklists,
  onExpand,
  generalLinksTooltip,
}: TaskCardMetadataRowProps) {
  const dueDateLabel = formatDate(task.due_date);

  return (
    <div className="flex items-center gap-2 text-xs flex-wrap mt-1">
      {task.estimated_effort && (
        <Chip variant="info" size="sm" className="gap-1">
          <Clock className="h-3 w-3" />
          {task.estimated_effort}
        </Chip>
      )}

      {task.assigned_to && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
          style={copyStyles.assignedChip}
        >
          <User className="h-3 w-3" />
          {task.assigned_to}
        </span>
      )}

      {dueDateLabel && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
          style={copyStyles.dueChip}
        >
          <Calendar className="h-3 w-3" />
          {dueDateLabel}
        </span>
      )}

      {childTasksCount > 0 && (
        <Chip variant="info" size="sm" className="gap-1">
          <ListTodo className="h-3 w-3" />
          {completedChildTasksCount}/{childTasksCount}
          <span className="text-[10px]">
            ({Math.round((completedChildTasksCount / childTasksCount) * 100)}%)
          </span>
        </Chip>
      )}

      {(dependencyCount.incoming > 0 || dependencyCount.outgoing > 0) && (
        <Chip variant="info" size="sm" className="gap-1">
          <Link2 className="h-3 w-3" />
          {dependencyCount.outgoing > 0 && <span title="This task depends on">↓{dependencyCount.outgoing}</span>}
          {dependencyCount.incoming > 0 && dependencyCount.outgoing > 0 && <span className="text-[10px]">/</span>}
          {dependencyCount.incoming > 0 && <span title="Tasks that depend on this">↑{dependencyCount.incoming}</span>}
        </Chip>
      )}

      {noteCounts.architecture > 0 && (
        <span title="Architecture diagrams">
          <Chip variant="info" size="sm" className="gap-1">
            <span className="text-xs">📐</span>
            {noteCounts.architecture}
          </Chip>
        </span>
      )}

      {noteCounts.mockup > 0 && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
          style={getNoteTypeStyles('excalidraw')}
          title="UI mockups"
        >
          <span className="text-xs">🎨</span>
          {noteCounts.mockup}
        </span>
      )}

      {noteCounts.documentation > 0 && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
          style={getNoteTypeStyles('documentation')}
          title="Documentation"
        >
          <span className="text-xs">📚</span>
          {noteCounts.documentation}
        </span>
      )}

      {noteCounts.general > 0 && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
          style={getNoteTypeStyles('note')}
          title="General notes"
        >
          <Paperclip className="h-3 w-3" />
          {noteCounts.general}
        </span>
      )}

      {task.stable_tags && task.stable_tags.length > 0 && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
          style={copyStyles.tagsChip}
        >
          <Tag className="h-3 w-3" />
          {task.stable_tags.length}
        </span>
      )}

      {rulesCount > 0 && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
          style={copyStyles.rulesChip}
          title="Applied rules"
        >
          <Shield className="h-3 w-3" />
          {rulesCount}
        </span>
      )}

      {additionalLinkCount > 0 && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
          style={copyStyles.linksChip}
          title={generalLinksTooltip}
        >
          <Link2 className="h-3 w-3" />
          {additionalLinkCount}
        </span>
      )}

      {task.actual_effort && (
        <Chip variant="info" size="sm" className="gap-1">
          <Clock className="h-3 w-3" />
          {task.actual_effort} actual
        </Chip>
      )}

      {checklists && checklists.length > 0 && <ChecklistDisplay checklists={checklists} compact />}

      <button
        onClick={onExpand}
        className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all"
      >
        <ChevronRight className="h-3 w-3" />
        <span className="hidden sm:inline text-xs">More</span>
      </button>
    </div>
  );
}
