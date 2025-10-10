import { Edit2, CheckCircle, Settings2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { WorkflowsTab } from './hooks/useWorkflowsSectionState';

interface WorkflowsSectionHeaderProps {
  tab: WorkflowsTab;
  onTabChange: (tab: WorkflowsTab) => void;
}

export function WorkflowsSectionHeader({ tab, onTabChange }: WorkflowsSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/95 backdrop-blur">
      <div>
        <h2 className="text-2xl font-semibold">Workflows</h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg bg-card border border-border p-1">
          <button
            onClick={() => onTabChange('edit')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              tab === 'edit'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-2">
              <Edit2 className="h-4 w-4" />
              Edit
            </div>
          </button>
          <button
            onClick={() => onTabChange('validate')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              tab === 'validate'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Validate
            </div>
          </button>
          <button
            onClick={() => onTabChange('mapping')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              tab === 'mapping'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Configure
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
