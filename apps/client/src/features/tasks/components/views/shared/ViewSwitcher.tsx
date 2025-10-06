import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Button } from '@client/shared/ui/Button';
import { ChevronDown, Calendar, Kanban, BarChart3, GitBranch, TrendingDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ViewType = 'gantt' | 'timeline' | 'dependency' | 'burndown' | 'kanban';

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  className?: string;
  disabled?: boolean;
}

const viewConfig = {
  gantt: {
    label: 'Gantt Chart',
    icon: BarChart3,
    description: 'Timeline with dependencies'
  },
  timeline: {
    label: 'Timeline',
    icon: Calendar,
    description: 'Linear time view'
  },
  dependency: {
    label: 'Dependency Graph',
    icon: GitBranch, 
    description: 'Task relationships'
  },
  burndown: {
    label: 'Analytics',
    icon: TrendingDown,
    description: 'Burndown & metrics'
  },
  kanban: {
    label: 'Kanban Board',
    icon: Kanban,
    description: 'Status-based columns'
  }
} as const;

export function ViewSwitcher({
  currentView,
  onViewChange,
  className,
  disabled = false
}: ViewSwitcherProps) {
  const CurrentIcon = viewConfig[currentView].icon;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            'min-w-[140px] justify-between',
            className
          )}
        >
          <div className="flex items-center gap-2">
            <CurrentIcon className="h-4 w-4" />
            <span>{viewConfig[currentView].label}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[200px] bg-popover border border-border rounded-md shadow-md z-50 p-1"
          sideOffset={4}
          align="start"
        >
          {Object.entries(viewConfig).map(([viewKey, config]) => {
            const Icon = config.icon;
            const isSelected = viewKey === currentView;
            
            return (
              <DropdownMenu.Item
                key={viewKey}
                onClick={() => onViewChange(viewKey as ViewType)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm rounded-sm cursor-pointer outline-none transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus:bg-accent focus:text-accent-foreground',
                  isSelected && 'bg-accent text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">{config.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {config.description}
                  </span>
                </div>
                {isSelected && (
                  <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
                )}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
