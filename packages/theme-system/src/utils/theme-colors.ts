import { Theme } from '../types/theme.js';

/**
 * Get colors for task status
 */
export function getTaskStatusColors(theme: Theme, status: string) {
  if (!theme.colors.entities?.task) {
    return {
      bg: theme.colors.background.secondary,
      text: theme.colors.foreground.primary,
      border: theme.colors.border.primary,
      icon: theme.colors.foreground.secondary
    };
  }
  const statusKey = status.replace('-', '_') as keyof typeof theme.colors.entities.task;
  const colors = theme.colors.entities.task[statusKey];

  if (!colors) {
    // Fallback for unknown status
    return {
      bg: theme.colors.background.secondary,
      text: theme.colors.foreground.primary,
      border: theme.colors.border.primary,
      icon: theme.colors.foreground.secondary
    };
  }

  return ensureReadableChip(theme, colors);
}

/**
 * Get colors for task priority
 */
export function getTaskPriorityColors(theme: Theme, priority: string) {
  if (!theme.colors.entities?.task) {
    return {
      bg: theme.colors.background.secondary,
      text: theme.colors.foreground.primary,
      border: theme.colors.border.primary,
      icon: theme.colors.foreground.secondary
    };
  }
  const priorityKey = `priority_${priority}` as keyof typeof theme.colors.entities.task;
  const colors = theme.colors.entities.task[priorityKey];

  if (!colors) {
    // Fallback
    return {
      bg: theme.colors.background.secondary,
      text: theme.colors.foreground.primary,
      border: theme.colors.border.primary,
      icon: theme.colors.foreground.secondary
    };
  }

  return ensureReadableChip(theme, colors, { keepText: true });
}

/**
 * Get colors for task type
 */
export function getTaskTypeColors(theme: Theme, type: string) {
  if (!theme.colors.entities?.task) {
    return {
      bg: theme.colors.background.secondary,
      text: theme.colors.foreground.primary,
      border: theme.colors.border.primary,
      icon: theme.colors.foreground.secondary
    };
  }
  const typeKey = `type_${type}` as keyof typeof theme.colors.entities.task;
  const colors = theme.colors.entities.task[typeKey];

  if (!colors) {
    // Fallback
    return {
      bg: theme.colors.background.secondary,
      text: theme.colors.foreground.primary,
      border: theme.colors.border.primary,
      icon: theme.colors.foreground.secondary
    };
  }

  return ensureReadableChip(theme, colors);
}

/**
 * Get colors for note type
 */
export function getNoteTypeColors(theme: Theme, type: string) {
  const typeKey = type === 'note' ? 'default' : type;
  const colors = theme.colors.entities?.note?.[typeKey as keyof typeof theme.colors.entities.note];

  if (!colors) {
    // Fallback
    return {
      bg: theme.colors.background.secondary,
      text: theme.colors.foreground.primary,
      border: theme.colors.border.primary,
      icon: theme.colors.foreground.secondary
    };
  }

  return ensureReadableChip(theme, colors);
}

/**
 * Get colors for rule type
 */
export function getRuleTypeColors(theme: Theme, type: string) {
  const colors = theme.colors.entities?.rule?.[type as keyof typeof theme.colors.entities.rule];

  if (!colors) {
    // Fallback
    return {
      bg: theme.colors.background.secondary,
      text: theme.colors.foreground.primary,
      border: theme.colors.border.primary,
      icon: theme.colors.foreground.secondary
    };
  }

  return ensureReadableChip(theme, colors);
}

/**
 * Get colors for workflow status
 */
export function getWorkflowStatusColors(theme: Theme, status: string) {
  const colors = theme.colors.entities?.workflow?.[status as keyof typeof theme.colors.entities.workflow];

  if (!colors) {
    // Fallback
    return {
      bg: theme.colors.background.secondary,
      text: theme.colors.foreground.primary,
      border: theme.colors.border.primary,
      icon: theme.colors.foreground.secondary
    };
  }

  return ensureReadableChip(theme, colors);
}

/**
 * Get colors for relationship type
 */
export function getRelationshipColors(theme: Theme, type: string) {
  const colors = theme.colors.entities?.relationship?.[type as keyof typeof theme.colors.entities.relationship];

  if (!colors) {
    // Fallback
    return {
      bg: theme.colors.background.secondary,
      text: theme.colors.foreground.primary,
      border: theme.colors.border.primary,
      line: theme.colors.border.primary
    };
  }

  return ensureReadableChip(theme, colors);
}

/**
 * Get colors for spec state
 */
export function getSpecStateColors(theme: Theme, state: string) {
  const colors = theme.colors.entities?.spec_state?.[state as keyof typeof theme.colors.entities.spec_state];

  if (!colors) {
    // Fallback
    return {
      bg: theme.colors.background.secondary,
      text: theme.colors.foreground.primary,
      border: theme.colors.border.primary,
      icon: theme.colors.foreground.secondary
    };
  }

  return colors;
}

/**
 * Get badge colors
 */
export function getBadgeColors(theme: Theme, type: 'default' | 'success' | 'warning' | 'danger' | 'info') {
  const colors = theme.colors.ui?.badge?.[type];

  if (!colors) {
    // Fallback
    return {
      bg: theme.colors.background.secondary,
      text: theme.colors.foreground.primary,
      border: theme.colors.border.primary
    };
  }

  return colors;
}

/**
 * Get button colors
 */
export function getButtonColors(theme: Theme, variant: 'primary' | 'secondary' | 'ghost' | 'danger') {
  const colors = theme.colors.ui?.button?.[variant];

  if (!colors) {
    // Fallback
    return {
      bg: theme.colors.background.secondary,
      text: theme.colors.foreground.primary,
      border: theme.colors.border.primary,
      hover: theme.colors.background.tertiary
    };
  }

  return colors;
}

/**
 * Convert theme color to CSS styles
 */
export function colorsToCss(colors: { bg?: string; text?: string; border?: string; icon?: string }) {
  return {
    backgroundColor: colors.bg,
    color: colors.text || colors.icon,
    borderColor: colors.border,
  };
}

// Helpers to keep chips legible in dark themes without blinding neon
function hexToRgba(hex: string, alpha: number): string {
  try {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return `rgba(0,0,0,${alpha})`;
  }
}

function ensureReadableChip(
  theme: Theme,
  colors: { bg?: string; text?: string; border?: string; icon?: string },
  opts: { keepText?: boolean } = {}
) {
  if (theme.type === 'dark') {
    // Use a neutral dark base for chip backgrounds, no neon tinting
    const base = theme.colors.background.tertiary || theme.colors.background.secondary || '#1f2937';
    const softenedBg = hexToRgba(base, 0.45);
    return {
      bg: softenedBg,
      text: colors.text,
      border: colors.border,
      icon: colors.icon,
    };
  }
  return colors;
}

/**
 * Get inline styles for a code component type
 */
export function getCodeComponentStyles(theme: Theme, componentType: string) {
  const colors = theme.colors.components?.[componentType as keyof typeof theme.colors.components];

  if (!colors) {
    // Fallback
    return {
      backgroundColor: theme.colors.background.secondary,
      color: theme.colors.foreground.primary,
      borderColor: theme.colors.border.primary
    };
  }

  return {
    backgroundColor: colors.bg,
    color: colors.text,
    borderColor: colors.border
  };
}
