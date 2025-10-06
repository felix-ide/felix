import { Theme, ColorScale, SurfaceScale, TextScale, BorderScale } from '../types/theme.js';

/**
 * Generate CSS variables from a theme object
 */
export function generateCSSVariables(theme: Theme): string {
  const variables: string[] = [];
  
  // Helper to add a CSS variable
  const addVar = (name: string, value: string) => {
    variables.push(`--${name}: ${value};`);
  };
  
  // Process color scales
  const processColorScale = (name: string, scale: ColorScale) => {
    Object.entries(scale).forEach(([key, value]) => {
      if (value !== undefined) {
        addVar(`color-${name}-${key}`, value);
      }
    });
  };
  
  // Process surface scale
  const processSurfaceScale = (scale: SurfaceScale) => {
    Object.entries(scale).forEach(([key, value]) => {
      addVar(`bg-${key}`, value);
    });
  };
  
  // Process text scale
  const processTextScale = (scale: TextScale) => {
    Object.entries(scale).forEach(([key, value]) => {
      // Convert camelCase to kebab-case
      const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      addVar(`text-${kebabKey}`, value);
    });
  };
  
  // Process border scale
  const processBorderScale = (scale: BorderScale) => {
    Object.entries(scale).forEach(([key, value]) => {
      addVar(`border-${key}`, value);
    });
  };
  
  // Process theme colors
  const { colors } = theme;
  
  // Base color scales
  processColorScale('primary', colors.primary);
  processColorScale('secondary', colors.secondary);
  processColorScale('accent', colors.accent);
  
  // Semantic color scales
  processColorScale('success', colors.success);
  processColorScale('warning', colors.warning);
  processColorScale('error', colors.error);
  processColorScale('info', colors.info);
  
  // Surface colors
  processSurfaceScale(colors.background);
  processTextScale(colors.foreground);
  processBorderScale(colors.border);
  
  // Add common semantic mappings for backwards compatibility
  addVar('theme-bg-primary', colors.background.primary);
  addVar('theme-bg-secondary', colors.background.secondary);
  addVar('theme-bg-tertiary', colors.background.tertiary);
  addVar('theme-bg-elevated', colors.background.elevated);
  addVar('theme-bg-overlay', colors.background.overlay);
  
  addVar('theme-text-primary', colors.foreground.primary);
  addVar('theme-text-secondary', colors.foreground.secondary);
  addVar('theme-text-tertiary', colors.foreground.tertiary);
  addVar('theme-text-muted', colors.foreground.muted);
  
  addVar('theme-border-primary', colors.border.primary);
  addVar('theme-border-secondary', colors.border.secondary);
  addVar('theme-border-focus', colors.border.focus);
  
  // Process typography if provided
  if (theme.typography) {
    const { typography } = theme;
    
    if (typography.fontFamily) {
      Object.entries(typography.fontFamily).forEach(([key, value]) => {
        addVar(`font-${key}`, value);
      });
    }
    
    if (typography.fontSize) {
      Object.entries(typography.fontSize).forEach(([key, value]) => {
        addVar(`text-${key}`, value);
      });
    }
    
    if (typography.fontWeight) {
      Object.entries(typography.fontWeight).forEach(([key, value]) => {
        addVar(`font-${key}`, value.toString());
      });
    }
    
    if (typography.lineHeight) {
      Object.entries(typography.lineHeight).forEach(([key, value]) => {
        addVar(`leading-${key}`, value.toString());
      });
    }
  }
  
  // Process spacing if provided
  if (theme.spacing) {
    Object.entries(theme.spacing).forEach(([key, value]) => {
      // Handle numeric keys with dots
      const safeKey = key.replace('.', '-');
      addVar(`space-${safeKey}`, value);
    });
  }
  
  // Process effects if provided
  if (theme.effects) {
    const { effects } = theme;
    
    if (effects.borderRadius) {
      Object.entries(effects.borderRadius).forEach(([key, value]) => {
        addVar(`radius-${key}`, value);
      });
    }
    
    if (effects.boxShadow) {
      Object.entries(effects.boxShadow).forEach(([key, value]) => {
        addVar(`shadow-${key}`, value);
      });
    }
    
    if (effects.opacity) {
      Object.entries(effects.opacity).forEach(([key, value]) => {
        addVar(`opacity-${key}`, value);
      });
    }
    
    if (effects.transition) {
      Object.entries(effects.transition).forEach(([key, value]) => {
        addVar(`transition-${key}`, value);
      });
    }
    
    if (effects.animation) {
      Object.entries(effects.animation).forEach(([key, value]) => {
        addVar(`animate-${key}`, value);
      });
    }
  }
  
  // Process component colors if provided
  if (theme.colors.components) {
    Object.entries(theme.colors.components).forEach(([componentType, colors]) => {
      if (colors && typeof colors === 'object') {
        // Add CSS variables for each component type's colors
        addVar(`component-${componentType}-bg`, colors.bg);
        addVar(`component-${componentType}-text`, colors.text);
        addVar(`component-${componentType}-border`, colors.border);
        if (colors.icon) {
          addVar(`component-${componentType}-icon`, colors.icon);
        }
      }
    });
  }

  // Process custom properties if provided
  if (theme.customProperties) {
    Object.entries(theme.customProperties).forEach(([key, value]) => {
      addVar(key, value);
    });
  }

  return variables.join('\n  ');
}

/**
 * Get a specific color from the theme
 */
export function getThemeColor(theme: Theme, path: string): string | undefined {
  const parts = path.split('.');
  let current: any = theme.colors;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  
  return typeof current === 'string' ? current : undefined;
}

/**
 * Generate a color palette from a base color
 */
export function generateColorScale(baseColor: string): ColorScale {
  // This is a simplified version - in production, you'd use a proper color manipulation library
  // For now, we'll return a basic scale
  return {
    50: baseColor + '14', // 8% opacity
    100: baseColor + '29', // 16% opacity
    200: baseColor + '3D', // 24% opacity
    300: baseColor + '52', // 32% opacity
    400: baseColor + '66', // 40% opacity
    500: baseColor, // Base color
    600: baseColor + 'E6', // 90% opacity
    700: baseColor + 'D9', // 85% opacity
    800: baseColor + 'CC', // 80% opacity
    900: baseColor + 'BF', // 75% opacity
    950: baseColor + 'B3', // 70% opacity
  };
}