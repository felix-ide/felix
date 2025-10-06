import { Check, X, AlertCircle, SkipForward } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface WorkflowRequirement {
  section_type: string;
  description: string;
  status: 'complete' | 'incomplete' | 'skipped' | 'conditional';
  is_conditional?: boolean;
  skip_reason?: string;
}

interface RequirementsPanelProps {
  requirements: WorkflowRequirement[];
  completionPercentage: number;
  className?: string;
}

export function RequirementsPanel({
  requirements,
  completionPercentage,
  className
}: RequirementsPanelProps) {
  const getStatusIcon = (status: WorkflowRequirement['status']) => {
    switch (status) {
      case 'complete':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'incomplete':
        return <X className="w-4 h-4 text-red-500" />;
      case 'skipped':
        return <SkipForward className="w-4 h-4 text-muted-foreground" />;
      case 'conditional':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: WorkflowRequirement['status']) => {
    switch (status) {
      case 'complete':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'incomplete':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'skipped':
        return 'text-muted-foreground bg-gray-50 border-border';
      case 'conditional':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Workflow Requirements</h3>
        <span className="text-sm text-gray-500">{Math.round(completionPercentage)}% Complete</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* Requirements list */}
      <div className="space-y-2">
        {requirements.map((req, index) => (
          <div
            key={`${req.section_type}-${index}`}
            className={cn(
              "flex items-start gap-2 p-2 rounded-md border",
              getStatusColor(req.status)
            )}
          >
            <div className="mt-0.5">{getStatusIcon(req.status)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium capitalize">
                  {req.section_type.replace(/_/g, ' ')}
                </span>
                {req.is_conditional && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                    Conditional
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5 text-muted-foreground">{req.description}</p>
              {req.skip_reason && (
                <p className="text-xs mt-1 italic text-gray-500">{req.skip_reason}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}