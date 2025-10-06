import { Select } from '@client/shared/ui/Select';
import { Info } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface WorkflowDefinition {
  name: string;
  display_name: string;
  description: string;
  use_cases?: string[];
}

interface WorkflowSelectorProps {
  selectedWorkflow: string;
  onWorkflowChange: (workflow: string) => void;
  availableWorkflows: WorkflowDefinition[];
  showUseDefault?: boolean;
  className?: string;
}

export function WorkflowSelector({
  selectedWorkflow,
  onWorkflowChange,
  availableWorkflows,
  showUseDefault = true,
  className
}: WorkflowSelectorProps) {
  const currentWorkflow = availableWorkflows.find(w => w.name === selectedWorkflow);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Workflow Type</label>
        <Info className="w-4 h-4 text-muted-foreground" />
      </div>

      <Select
        value={selectedWorkflow}
        onChange={(e) => onWorkflowChange((e.target as HTMLSelectElement).value)}
        className="w-full"
      >
        {showUseDefault && (
          <option value="_default">Use Default (project mapping)</option>
        )}
        {availableWorkflows.map(w => (
          <option key={w.name} value={w.name}>{w.display_name}</option>
        ))}
      </Select>

      {currentWorkflow && currentWorkflow.use_cases && currentWorkflow.use_cases.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Best for:</span> {currentWorkflow.use_cases.join(', ')}
        </div>
      )}
    </div>
  );
}
