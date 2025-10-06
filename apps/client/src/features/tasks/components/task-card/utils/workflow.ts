import type { TaskData } from '@/types/api';

export type WorkflowId = 'simple' | 'feature_development' | 'bugfix' | 'research';

export function getDefaultWorkflow(task: TaskData): WorkflowId {
  if (task.workflow && isRecognizedWorkflow(task.workflow)) {
    return task.workflow as WorkflowId;
  }

  switch (task.task_type) {
    case 'bug':
      return 'bugfix';
    case 'spike':
      return 'research';
    case 'epic':
    case 'story':
      return 'feature_development';
    default:
      return 'simple';
  }
}

export function normalizeWorkflow(value?: string): WorkflowId {
  if (value && isRecognizedWorkflow(value)) {
    return value as WorkflowId;
  }
  return 'simple';
}

function isRecognizedWorkflow(value: string): value is WorkflowId {
  return value === 'simple' || value === 'feature_development' || value === 'bugfix' || value === 'research';
}
