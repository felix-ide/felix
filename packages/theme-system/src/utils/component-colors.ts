import { Theme } from '../types/theme.js';

/**
 * Get component-specific colors from a theme
 * Returns CSS variable references that are defined by the theme
 */
export function getComponentColor(
  theme: Theme,
  componentType: string
): { bg: string; text: string; border: string } {
  // If theme has specific component colors, return CSS variable references
  if (theme.colors.components && componentType in theme.colors.components) {
    return {
      bg: `var(--component-${componentType}-bg)`,
      text: `var(--component-${componentType}-text)`,
      border: `var(--component-${componentType}-border)`
    };
  }

  // Fallback to semantic color variables based on component type
  // This provides reasonable defaults for themes without component colors
  const isLight = theme.type === 'light';

  // Map component types to semantic color categories
  const colorMap: Record<string, string> = {
    // Primary group
    class: 'primary',
    service: 'primary',
    test: 'primary',

    // Success group
    function: 'success',
    controller: 'success',
    config: 'success',

    // Accent group
    method: 'accent',
    model: 'accent',
    constant: 'accent',

    // Warning group
    interface: 'warning',
    schema: 'warning',
    util: 'warning',

    // Error group
    type: 'error',
    route: 'error',
    helper: 'error',

    // Info group
    variable: 'info',
    middleware: 'info',

    // Secondary group
    property: 'secondary',
    enum: 'secondary',
    module: 'secondary',
    namespace: 'secondary',
    package: 'secondary',
    import: 'secondary',
    export: 'secondary',
    file: 'secondary',
    directory: 'secondary',
    component: 'secondary',
    hook: 'secondary',
  };

  const semanticColor = colorMap[componentType] || 'primary';

  if (isLight) {
    return {
      bg: `var(--color-${semanticColor}-50, var(--bg-secondary))`,
      text: `var(--color-${semanticColor}-900, var(--text-primary))`,
      border: `var(--color-${semanticColor}-400, var(--border-primary))`,
    };
  } else {
    return {
      bg: `var(--color-${semanticColor}-100, var(--bg-secondary))`,
      text: `var(--color-${semanticColor}-400, var(--text-primary))`,
      border: `var(--color-${semanticColor}-500, var(--border-primary))`,
    };
  }
}

/**
 * Get CSS classes for a component type
 * Returns Tailwind-compatible inline styles
 */
export function getComponentClasses(
  theme: Theme,
  componentType: string
): string {
  const colors = getComponentColor(theme, componentType);

  // Return as CSS variables that can be used in components
  return `bg-[${colors.bg}] text-[${colors.text}] border-[${colors.border}]`;
}

/**
 * Get inline styles for a component type
 * Returns a style object for React components
 */
export function getComponentStyles(
  theme: Theme,
  componentType: string
): React.CSSProperties {
  const colors = getComponentColor(theme, componentType);

  return {
    backgroundColor: colors.bg,
    color: colors.text,
    borderColor: colors.border,
  };
}