import { KanbanBoard } from './KanbanBoard';
import { useTaskData } from '../shared/TaskDataProvider';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { TaskData } from '@/types/api';

interface KanbanViewProps {
  onTaskClick?: (task: TaskData) => void;
}

export function KanbanView({ onTaskClick }: KanbanViewProps) {
  const { isLoading, error, filteredTasks } = useTaskData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">Error loading tasks</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (filteredTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">No tasks found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or create a new task
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <KanbanBoard onTaskClick={onTaskClick} />
    </div>
  );
}
