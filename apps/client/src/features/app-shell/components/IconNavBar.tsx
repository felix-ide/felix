import {
  Server,
  Search,
  CheckSquare,
  Shield,
  GitBranch,
  Activity,
  BookOpen,
  FolderOpen,
  RefreshCw
} from 'lucide-react';
import { useAppStore } from '@client/features/app-shell/state/appStore';
import { cn } from '@/utils/cn';
import type { Section } from '@/types/components';

interface NavItem {
  id: Section;
  icon: React.ElementType;
  label: string;
  tooltip: string;
}

const navItems: NavItem[] = [
  {
    id: 'server-log',
    icon: Server,
    label: 'Server Log',
    tooltip: 'View server logs and status',
  },
  {
    id: 'explore',
    icon: Search,
    label: 'Explore',
    tooltip: 'Search and explore codebase',
  },
  {
    id: 'notes',
    icon: BookOpen,
    label: 'Notes',
    tooltip: 'Manage notes and annotations',
  },
  {
    id: 'tasks',
    icon: CheckSquare,
    label: 'Tasks',
    tooltip: 'Task management and tracking',
  },
  {
    id: 'rules',
    icon: Shield,
    label: 'Rules',
    tooltip: 'Configure coding rules and patterns',
  },
  {
    id: 'workflows',
    icon: GitBranch,
    label: 'Workflows',
    tooltip: 'Define and edit task workflows',
  },
  {
    id: 'activity',
    icon: Activity,
    label: 'Activity',
    tooltip: 'View recent activity and changes',
  },
];

export function IconNavBar(): JSX.Element {
  const { currentSection, setCurrentSection, setProjectSelected, autoRefresh, setAutoRefresh } = useAppStore();

  const handleProjectSwitch = () => {
    setProjectSelected(false);
  };

  return (
    <nav className="sidebar w-12 bg-background border-r border-border flex flex-col">
      {/* Project Switcher */}
      <div className="p-2 border-b border-border">
        <button
          onClick={handleProjectSwitch}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Switch Project"
        >
          <FolderOpen size={16} />
        </button>
      </div>
      
      {/* Navigation Items */}
      <div className="flex-1 py-2">
        {navItems
          .map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentSection(item.id)}
                className={cn(
                  'w-full h-12 flex items-center justify-center transition-colors relative group',
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
                title={item.tooltip}
              >
                <Icon className="h-5 w-5" />
                
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-r-full" />
                )}
                
                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-secondary text-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {item.tooltip}
                </div>
              </button>
            );
          })}
      </div>
      
      {/* Bottom section - auto-refresh toggle and status */}
      <div className="p-2 border-t border-border space-y-2">
        {/* Auto-refresh toggle */}
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={cn(
            'w-8 h-8 flex items-center justify-center rounded transition-colors',
            autoRefresh 
              ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
              : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
          title={autoRefresh ? 'Auto-refresh ON (5s)' : 'Auto-refresh OFF'}
        >
          <RefreshCw size={16} className={cn(autoRefresh && 'animate-spin')} />
        </button>
        
        {/* Connection status (dot only; remove empty icon box) */}
        <div className="w-8 h-4 flex items-center justify-center">
          <span className="inline-block w-2 h-2 bg-success rounded-full" aria-label="Connected" title="Connected" />
        </div>
      </div>
    </nav>
  );
}
