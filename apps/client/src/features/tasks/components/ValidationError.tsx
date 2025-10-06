import { AlertTriangle, ExternalLink, FileText } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { cn } from '@/utils/cn';

export interface ValidationErrorData {
  error: string;
  missing_requirements: string[];
  workflow_used: string;
  can_override: boolean;
  suggestions?: string[];
}

interface ValidationErrorProps {
  error: ValidationErrorData;
  onCreateMissingItem?: (itemType: string) => void;
  onOverrideValidation?: () => void;
  className?: string;
}

export function ValidationError({
  error,
  onCreateMissingItem,
  onOverrideValidation,
  className
}: ValidationErrorProps) {
  const getItemTypeFromRequirement = (requirement: string): string => {
    if (requirement.includes('architecture')) return 'architecture_note';
    if (requirement.includes('mockups')) return 'mockup_note';
    if (requirement.includes('checklist')) return 'checklist';
    if (requirement.includes('rules')) return 'rule';
    return 'item';
  };

  const getActionIcon = (requirement: string) => {
    if (requirement.includes('note')) return <FileText className="w-4 h-4" />;
    return <ExternalLink className="w-4 h-4" />;
  };

  return (
    <div className={cn("rounded-lg border border-red-200 bg-red-50 p-4", className)}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
        <div className="flex-1 space-y-3">
          <div>
            <h4 className="font-medium text-red-900">{error.error}</h4>
            <p className="text-sm text-red-700 mt-1">
              Using workflow: <span className="font-medium">{error.workflow_used}</span>
            </p>
          </div>

          {/* Missing requirements */}
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-red-900">Missing Requirements:</h5>
            <ul className="space-y-1">
              {error.missing_requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-red-700">
                  <span className="text-red-400 mt-0.5">•</span>
                  <div className="flex-1">
                    <span>{req}</span>
                    {onCreateMissingItem && (
                      <button
                        onClick={() => onCreateMissingItem(getItemTypeFromRequirement(req))}
                        className="ml-2 inline-flex items-center gap-1 text-red-600 hover:text-red-700 underline text-xs"
                      >
                        {getActionIcon(req)}
                        Create
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Suggestions */}
          {error.suggestions && error.suggestions.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-red-900">Suggestions:</h5>
              <ul className="space-y-1">
                {error.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-red-700">
                    <span className="text-red-400 mt-0.5">💡</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Override option */}
          {error.can_override && onOverrideValidation && (
            <div className="pt-2 border-t border-red-200">
              <div className="flex items-center justify-between">
                <p className="text-xs text-red-600">
                  Need to skip validation for this task?
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOverrideValidation}
                  className="text-red-600 border-red-300 hover:bg-destructive/10"
                >
                  Override Validation
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}