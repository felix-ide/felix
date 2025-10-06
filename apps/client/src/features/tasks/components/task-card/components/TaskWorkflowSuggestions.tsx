import { AlertTriangle } from 'lucide-react';
import type { Theme } from '@felix/theme-system';
import type { TaskData } from '@/types/api';

interface TaskWorkflowSuggestionsProps {
  isEditing: boolean;
  task: TaskData;
  workflowId: string;
  validation: any;
  theme: Theme;
}

export function TaskWorkflowSuggestions({
  isEditing,
  task,
  workflowId,
  validation,
  theme,
}: TaskWorkflowSuggestionsProps) {
  if (isEditing) return null;
  if (!task.workflow || validation.isValid || validation.missingRequirements.length === 0) return null;

  const workflowLabel = workflowId.replace(/_/g, ' ');

  const borderColor = theme.type === 'dark'
    ? `${theme.colors.warning[400]}40`
    : theme.colors.warning[400];

  const backgroundColor = theme.type === 'dark'
    ? `${theme.colors.background.secondary}99`
    : theme.colors.warning[50];

  const headingColor = theme.type === 'dark'
    ? theme.colors.warning[300]
    : theme.colors.warning[700];

  const bulletColor = theme.type === 'dark'
    ? theme.colors.warning[400]
    : theme.colors.warning[600];

  return (
    <div
      className="mt-4 border-2 rounded-md p-3"
      style={{ borderColor, backgroundColor }}
    >
      <h4
        className="text-sm font-medium mb-2 flex items-center gap-1"
        style={{ color: headingColor }}
      >
        <AlertTriangle className="h-4 w-4" />
        Workflow Suggestions ({workflowLabel})
      </h4>
      <p className="text-xs mb-2 text-muted-foreground">
        Consider adding these to follow the {workflowLabel} workflow:
      </p>
      <ul className="space-y-1 text-xs text-foreground">
        {validation.missingRequirements.map((req: any, idx: number) => (
          <li key={idx} className="flex items-start gap-1">
            <span style={{ color: bulletColor }}>•</span>
            <span>{req.helpText || req.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
