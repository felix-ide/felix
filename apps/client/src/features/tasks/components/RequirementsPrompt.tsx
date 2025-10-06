import { Button } from '@client/shared/ui/Button';
import { AlertTriangle, FileText, CheckSquare, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';

interface MissingRequirement {
  type: 'architecture' | 'mockups' | 'checklist' | 'test' | 'rules';
  name: string;
  description: string;
  action: () => void;
}

interface RequirementsPromptProps {
  missingRequirements: MissingRequirement[];
  canOverride: boolean;
  onOverride: () => void;
  className?: string;
}

const REQUIREMENT_ICONS = {
  architecture: FileText,
  mockups: FileText,
  checklist: CheckSquare,
  test: CheckSquare,
  rules: FileText
};

export function RequirementsPrompt({
  missingRequirements,
  canOverride,
  onOverride,
  className
}: RequirementsPromptProps) {
  if (missingRequirements.length === 0) return null;

  return (
    <div className={cn(
      'border border-yellow-200 bg-yellow-50 rounded-md p-4',
      className
    )}>
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-yellow-800">Missing Requirements</h4>
          <p className="text-sm text-yellow-700 mt-1">
            Complete these items to meet workflow requirements:
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {missingRequirements.map((req, index) => {
          const Icon = REQUIREMENT_ICONS[req.type];
          return (
            <div key={index} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-800">{req.name}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={req.action}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Create
              </Button>
            </div>
          );
        })}
      </div>

      {canOverride && (
        <div className="mt-4 pt-3 border-t border-yellow-200">
          <Button
            size="sm"
            variant="ghost"
            onClick={onOverride}
            className="text-xs text-yellow-700 hover:text-yellow-800"
          >
            Save without meeting requirements (emergency use only)
          </Button>
        </div>
      )}
    </div>
  );
}