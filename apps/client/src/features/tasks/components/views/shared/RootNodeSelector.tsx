import { useState } from 'react';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Home, Target, Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { TaskData } from '@/types/api';

export type RootNodeType = 'all-tasks' | 'specific-task' | 'epic' | 'story' | 'root-only' | 'epics-only' | 'stories-only';

export interface RootNodeSelection {
  type: RootNodeType;
  taskId?: string;
  taskTitle?: string;
}

interface RootNodeSelectorProps {
  currentSelection: RootNodeSelection;
  onSelectionChange: (selection: RootNodeSelection) => void;
  allTasks: TaskData[];
  className?: string;
  disabled?: boolean;
}

export function RootNodeSelector({
  currentSelection,
  onSelectionChange,
  allTasks,
  className,
  disabled = false
}: RootNodeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Filter tasks for selection
  const filteredTasks = allTasks.filter(task => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      task.id.toLowerCase().includes(query) ||
      (task.description && task.description.toLowerCase().includes(query))
    );
  });

  // Get current display info
  const getCurrentDisplay = () => {
    if (currentSelection.type === 'specific-task' && currentSelection.taskTitle) {
      return {
        icon: Target,
        label: currentSelection.taskTitle,
        shortLabel: currentSelection.taskTitle.length > 20 ? currentSelection.taskTitle.substring(0, 20) + '...' : currentSelection.taskTitle
      };
    }
    if (currentSelection.type === 'epic' && currentSelection.taskTitle) {
      return {
        icon: Target,
        label: currentSelection.taskTitle,
        shortLabel: currentSelection.taskTitle.length > 20 ? currentSelection.taskTitle.substring(0, 20) + '...' : currentSelection.taskTitle
      };
    }
    if (currentSelection.type === 'story' && currentSelection.taskTitle) {
      return {
        icon: Target,
        label: currentSelection.taskTitle,
        shortLabel: currentSelection.taskTitle.length > 20 ? currentSelection.taskTitle.substring(0, 20) + '...' : currentSelection.taskTitle
      };
    }

    return {
      icon: Home,
      label: 'All Tasks',
      shortLabel: 'All Tasks'
    };
  };

  const currentDisplay = getCurrentDisplay();
  const CurrentIcon = currentDisplay.icon;

  const handleAllTasks = () => {
    onSelectionChange({ type: 'all-tasks' });
    setIsOpen(false);
  };

  const handleTaskSelection = (task: TaskData) => {
    onSelectionChange({
      type: 'specific-task',
      taskId: task.id,
      taskTitle: task.title
    });
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            'min-w-[140px] max-w-[200px] justify-between px-2',
            currentSelection.type !== 'all-tasks' && 'text-primary',
            className
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <CurrentIcon className="h-3 w-3 flex-shrink-0" />
            <span className="text-xs truncate">
              {currentDisplay.shortLabel}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0 ml-1" />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[280px] bg-popover text-popover-foreground rounded-md border border-border shadow-xl z-[100] p-1"
          sideOffset={5}
          align="start"
        >
          {/* All Tasks Option */}
          <DropdownMenu.Item asChild>
            <button
              onClick={handleAllTasks}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2 text-sm rounded cursor-pointer transition-colors hover:bg-accent',
                currentSelection.type === 'all-tasks' && 'bg-primary/10 text-primary'
              )}
            >
              <Home className="h-4 w-4" />
              <div className="flex-1 text-left">
                <div className="font-medium">All Tasks</div>
                <div className="text-xs text-muted-foreground">View complete task hierarchy</div>
              </div>
            </button>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-border my-1" />

          {/* Search Section */}
          <div className="px-3 py-2">
            <div className="text-xs font-medium text-foreground mb-2">View from specific task:</div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 text-muted-foreground -translate-y-1/2" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 text-xs h-8"
              />
            </div>
          </div>

          {/* Task List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                No tasks found
              </div>
            ) : (
              filteredTasks.slice(0, 10).map((task) => (
                <DropdownMenu.Item key={task.id} asChild>
                  <button
                    onClick={() => handleTaskSelection(task)}
                    className={cn(
                      'flex items-start gap-2 w-full px-3 py-2 text-sm rounded cursor-pointer transition-colors hover:bg-accent',
                      currentSelection.taskId === task.id && 'bg-primary/10 text-primary'
                    )}
                  >
                    <Target className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium truncate">{task.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="truncate">{task.task_type}</span>
                        <span>•</span>
                        <span className="font-mono text-xs">{task.id.slice(-6)}</span>
                      </div>
                    </div>
                  </button>
                </DropdownMenu.Item>
              ))
            )}
          </div>

          {filteredTasks.length > 10 && (
            <div className="px-3 py-1 text-xs text-muted-foreground text-center border-t border-border">
              Showing first 10 results
            </div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
