import { cn } from '@/utils/cn';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface WorkflowRequirement {
  name: string;
  required: boolean;
  met: boolean;
  conditional?: boolean;
  helpText?: string;
}

interface WorkflowStatusProps {
  workflow: string;
  requirements: WorkflowRequirement[];
  completionPercentage: number;
  validationStatus: 'valid' | 'incomplete' | 'invalid';
  className?: string;
}

const WORKFLOW_LABELS = {
  simple: 'Simple Task',
  feature_development: 'Feature Development',
  bugfix: 'Bug Fix',
  research: 'Research'
};

export function WorkflowStatus({
  workflow,
  requirements,
  completionPercentage,
  validationStatus,
  className
}: WorkflowStatusProps) {
  const statusIcon = {
    valid: <CheckCircle className="h-4 w-4 text-green-500" />,
    incomplete: <AlertCircle className="h-4 w-4 text-yellow-500" />,
    invalid: <XCircle className="h-4 w-4 text-red-500" />
  };

  const statusColor = {
    valid: 'text-green-600',
    incomplete: 'text-yellow-600',
    invalid: 'text-red-600'
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Workflow:</span>
          <span className="text-sm">{WORKFLOW_LABELS[workflow as keyof typeof WORKFLOW_LABELS] || workflow}</span>
        </div>
        <div className={cn('flex items-center gap-1', statusColor[validationStatus])}>
          {statusIcon[validationStatus]}
          <span className="text-sm font-medium">{Math.round(completionPercentage)}% complete</span>
        </div>
      </div>

      {requirements.length > 0 && (
        <div className="space-y-1.5">
          {requirements.map((req, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5">
                {req.met ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                ) : req.required ? (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </span>
              <div className="flex-1">
                <span className={cn(
                  req.met ? 'text-muted-foreground' : req.required ? 'text-red-600' : 'text-gray-500'
                )}>
                  {req.name}
                  {req.conditional && <span className="text-xs ml-1">(conditional)</span>}
                </span>
                {!req.met && req.helpText && (
                  <p className="text-xs text-gray-500 mt-0.5">{req.helpText}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}