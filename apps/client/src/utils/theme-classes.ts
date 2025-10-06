/**
 * Theme-aware class mappings for replacing hardcoded Tailwind colors
 */

// Background mappings
export const bgThemeClasses = {
  // Primary backgrounds
  'bg-background': 'bg-background',

  // Secondary backgrounds
  'bg-secondary': 'bg-secondary',

  // Tertiary/muted backgrounds
  'bg-muted': 'bg-muted',

  // Card/elevated backgrounds
  'bg-slate-500': 'bg-card',
  'bg-card': 'bg-card',

  // Interactive/accent backgrounds
  'bg-primary': 'bg-primary',
  'bg-primary/10': 'bg-primary/10',
  'bg-primary/20': 'bg-primary/20',
  'bg-primary/30': 'bg-primary/30',

  // Success backgrounds
  'bg-green-500': 'bg-success',
  'bg-green-600': 'bg-success',
  'bg-green-100': 'bg-success/10',
  'bg-green-900': 'bg-success/20',
  'bg-green-950': 'bg-success/30',

  // Error backgrounds
  'bg-destructive': 'bg-destructive',
  'bg-destructive/10': 'bg-destructive/10',
  'bg-destructive/20': 'bg-destructive/20',
  'bg-red-950': 'bg-destructive/30',

  // Warning backgrounds
  'bg-yellow-100': 'bg-warning/10',
  'bg-orange-100': 'bg-warning/10',

  // Other backgrounds
  'bg-purple-100': 'bg-accent/10',
  'bg-indigo-100': 'bg-accent/10',
  'bg-emerald-100': 'bg-success/10',
};

// Text color mappings
export const textThemeClasses = {
  // Primary text
  'text-foreground': 'text-foreground',

  // Secondary text
  'text-muted-foreground': 'text-muted-foreground',

  // Interactive text
  'text-primary': 'text-primary',
  'text-blue-800': 'text-primary',

  // Success text
  'text-green-600': 'text-success',
  'text-green-700': 'text-success',
  'text-green-800': 'text-success',
  'text-green-300': 'text-success',
  'text-green-400': 'text-success',

  // Error text
  'text-red-500': 'text-destructive',
  'text-red-600': 'text-destructive',
  'text-red-700': 'text-destructive',
  'text-red-800': 'text-destructive',
  'text-red-300': 'text-destructive',
  'text-red-400': 'text-destructive',

  // Warning text
  'text-yellow-400': 'text-warning',
  'text-yellow-600': 'text-warning',
  'text-yellow-700': 'text-warning',
  'text-orange-600': 'text-warning',
  'text-orange-700': 'text-warning',
  'text-orange-400': 'text-warning',

  // Other text colors
  'text-primary-foreground': 'text-primary-foreground',
  'text-purple-400': 'text-accent',
  'text-purple-700': 'text-accent',
  'text-purple-800': 'text-accent',
  'text-indigo-400': 'text-accent',
  'text-indigo-700': 'text-accent',
  'text-indigo-800': 'text-accent',
  'text-emerald-400': 'text-success',
  'text-emerald-700': 'text-success',
  'text-pink-600': 'text-accent',
  'text-pink-700': 'text-accent',
  'text-amber-600': 'text-warning',
};

// Border color mappings
export const borderThemeClasses = {
  'border-border': 'border-border',
  'border-primary': 'border-primary',
  'border-blue-200': 'border-primary/20',
  'border-green-200': 'border-success/20',
  'border-red-200': 'border-destructive/20',
  'border-primary-foreground': 'border-primary-foreground',
};

// Hover state mappings
export const hoverThemeClasses = {
  'hover:bg-secondary': 'hover:bg-secondary',
  'hover:bg-muted': 'hover:bg-muted',
  'hover:bg-primary/90': 'hover:bg-primary/90',
  'hover:text-muted-foreground': 'hover:text-muted-foreground',
  'hover:border-border': 'hover:border-border',
};

// Dark mode specific mappings (these should be removed as theme handles it)
export const darkModeClasses = {};

// Combined mapping for easy replacement
export const themeClassMap = {
  ...bgThemeClasses,
  ...textThemeClasses,
  ...borderThemeClasses,
  ...hoverThemeClasses,
  ...darkModeClasses,
};

// Helper function to replace classes in a className string
export function replaceThemeClasses(className: string): string {
  let result = className;
  
  // Replace each hardcoded class with theme-aware equivalent
  Object.entries(themeClassMap).forEach(([oldClass, newClass]) => {
    const regex = new RegExp(`\\b${oldClass}\\b`, 'g');
    result = result.replace(regex, newClass);
  });
  
  return result;
}
