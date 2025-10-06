import {
  Theme,
  getTaskStatusColors,
  getTaskPriorityColors,
  getTaskTypeColors,
  getNoteTypeColors,
  getRuleTypeColors,
  getSpecStateColors
} from '@felix/theme-system';

/**
 * Get styles for task status badge
 */
export function getStatusStyles(theme: Theme, status: string) {
  const colors = getTaskStatusColors(theme, status);
  return {
    backgroundColor: colors.bg,
    color: colors.text,
    borderColor: colors.border
  };
}

/**
 * Get styles for task priority badge
 */
export function getPriorityStyles(theme: Theme, priority: string) {
  const colors = getTaskPriorityColors(theme, priority);
  return {
    color: colors.text
  };
}

/**
 * Get styles for task type badge
 */
export function getTypeStyles(theme: Theme, type: string) {
  const colors = getTaskTypeColors(theme, type);
  return {
    backgroundColor: colors.bg,
    color: colors.text,
    borderColor: colors.border
  };
}

/**
 * Get styles for spec state badge
 */
export function getSpecStateStyles(theme: Theme, state: string) {
  const colors = getSpecStateColors(theme, state);
  return {
    backgroundColor: colors.bg,
    color: colors.text,
    borderColor: colors.border
  };
}

/**
 * Get styles for note type indicator
 */
export function getNoteTypeStyles(theme: Theme, type: string) {
  const colors = getNoteTypeColors(theme, type);
  return {
    backgroundColor: colors.bg,
    color: colors.text,
    borderColor: colors.border
  };
}

/**
 * Get styles for rule type indicator
 */
export function getRuleTypeStyles(theme: Theme, type: string) {
  const colors = getRuleTypeColors(theme, type);
  return {
    backgroundColor: colors.bg,
    color: colors.text,
    borderColor: colors.border
  };
}

/**
 * Get validation state styles
 */
export function getValidationStyles(theme: Theme, isValid: boolean) {
  if (isValid) {
    return {
      backgroundColor: theme.colors.success[50],
      color: theme.colors.success[700],
      borderColor: theme.colors.success[200]
    };
  }
  return {
    backgroundColor: theme.colors.error[50],
    color: theme.colors.error[700],
    borderColor: theme.colors.error[200]
  };
}

/**
 * Get workflow status styles
 */
export function getWorkflowStyles(theme: Theme, workflow: string) {
  const typeMap: Record<string, string> = {
    'feature_development': 'epic',
    'bugfix': 'bug',
    'research': 'spike',
    'simple': 'task'
  };

  const mappedType = typeMap[workflow] || 'task';
  return getTypeStyles(theme, mappedType);
}