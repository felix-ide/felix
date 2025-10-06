import { Droppable } from '@hello-pangea/dnd';
import { cn } from '@/utils/cn';
import type { TaskData, TaskDependency } from '@/types/api';
import { KanbanCard } from './KanbanCard';
import { Plus } from 'lucide-react';
import { useTheme, getTaskStatusColors } from '@felix/theme-system';

interface KanbanColumnProps {
  columnId: string;
  title: string;
  tasks: TaskData[];
  dependencies: TaskDependency[];
  onAddTask?: () => void;
  onTaskClick?: (task: TaskData) => void;
}

export function KanbanColumn({
  columnId,
  title,
  tasks,
  dependencies,
  onAddTask,
  onTaskClick,
  
}: KanbanColumnProps) {
  const { theme } = useTheme();
  const statusKey = (columnId === 'review') ? 'in_progress' : columnId;
  const statusColors = getTaskStatusColors(theme, statusKey);

  return (
    <div className={cn("flex flex-col h-full bg-card/50 rounded-lg border")}
         style={{ borderColor: statusColors.border }}>
      {/* Column header */}
      <div className={cn("p-3 rounded-t-lg border-b")}
           style={{
             backgroundColor: statusColors.bg,
             color: statusColors.text,
             borderColor: statusColors.border
           }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm uppercase tracking-wider">{title}</h3>
            <span className={cn("px-2 py-1 rounded text-xs font-bold border")}
                  style={{
                    backgroundColor: statusColors.bg,
                    color: statusColors.text,
                    borderColor: statusColors.border
                  }}>
              {tasks.length}
            </span>
          </div>
          {onAddTask && (
            <button
              onClick={onAddTask}
              className="p-1 hover:bg-background/10 rounded transition-colors"
              title={`Add task to ${title}`}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={columnId} type="TASK">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 p-2 space-y-2 overflow-y-auto",
              snapshot.isDraggingOver && "bg-accent/50 ring-2 ring-primary ring-inset",
              tasks.length === 0 && "flex items-center justify-center"
            )}
          >
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No tasks</p>
                <p className="text-xs mt-1">Drop tasks here or click + to add</p>
              </div>
            ) : (
              tasks.map((task, index) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  index={index}
                  dependencies={dependencies.filter(d => 
                    d.dependent_task_id === task.id || d.dependency_task_id === task.id
                  )}
                  onClick={() => onTaskClick?.(task)}
                />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
