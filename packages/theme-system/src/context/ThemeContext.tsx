import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Theme, ThemeMetadata } from '../types/theme.js';
import { themes as ALL_THEMES } from '../themes/index.js';
import { generateCSSVariables } from '../utils/css-generator.js';

interface ThemeStore {
  // Current active theme
  currentThemeId: string;
  currentTheme: Theme;
  
  // Available themes
  builtInThemes: Record<string, Theme>;
  customThemes: Record<string, Theme>;
  
  // Theme mode
  themeMode: 'light' | 'dark' | 'system';
  systemPreference: 'light' | 'dark';
  
  // Actions
  setTheme: (themeId: string) => void;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  addCustomTheme: (theme: Theme) => void;
  updateCustomTheme: (themeId: string, updates: Partial<Theme>) => void;
  deleteCustomTheme: (themeId: string) => void;
  importTheme: (themeData: string | Theme) => void;
  exportTheme: (themeId: string) => string;
  
  // Utilities
  getTheme: (themeId: string) => Theme | undefined;
  getAllThemes: () => ThemeMetadata[];
  getEffectiveTheme: () => Theme;
}

// Built-in themes
const BUILT_IN_THEMES: Record<string, Theme> = ALL_THEMES;

// Create Zustand store with persistence
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      currentThemeId: 'classic-dark',
      currentTheme: BUILT_IN_THEMES['classic-dark'],
      builtInThemes: BUILT_IN_THEMES,
      customThemes: {},
      themeMode: 'system',
      systemPreference: 'dark',
      
      setTheme: (themeId: string) => {
        console.log('[ThemeContext] setTheme called with:', themeId);
        const theme = get().getTheme(themeId);
        console.log('[ThemeContext] Found theme:', theme?.id, theme?.type);
        if (theme) {
          set({ currentThemeId: themeId, currentTheme: theme });
          applyThemeToDOM(theme);
        } else {
          console.error('[ThemeContext] Theme not found:', themeId);
        }
      },
      
      setThemeMode: (mode: 'light' | 'dark' | 'system') => {
        set({ themeMode: mode });
        const effectiveTheme = get().getEffectiveTheme();
        applyThemeToDOM(effectiveTheme);
      },
      
      addCustomTheme: (theme: Theme) => {
        set((state) => ({
          customThemes: { ...state.customThemes, [theme.id]: theme }
        }));
      },
      
      updateCustomTheme: (themeId: string, updates: Partial<Theme>) => {
        set((state) => {
          const theme = state.customThemes[themeId];
          if (theme) {
            const updatedTheme = { ...theme, ...updates };
            return {
              customThemes: { ...state.customThemes, [themeId]: updatedTheme }
            };
          }
          return state;
        });
      },
      
      deleteCustomTheme: (themeId: string) => {
        set((state) => {
          const { [themeId]: deleted, ...rest } = state.customThemes;
          return { customThemes: rest };
        });
      },
      
      importTheme: (themeData: string | Theme) => {
        try {
          const theme = typeof themeData === 'string' ? JSON.parse(themeData) : themeData;
          if (theme && theme.id && theme.colors) {
            get().addCustomTheme(theme);
          }
        } catch (error) {
          console.error('Failed to import theme:', error);
        }
      },
      
      exportTheme: (themeId: string) => {
        const theme = get().getTheme(themeId);
        return theme ? JSON.stringify(theme, null, 2) : '';
      },
      
      getTheme: (themeId: string) => {
        const { builtInThemes, customThemes } = get();
        return builtInThemes[themeId] || customThemes[themeId];
      },
      
      getAllThemes: () => {
        const { builtInThemes, customThemes } = get();
        const allThemes = { ...builtInThemes, ...customThemes };
        
        return Object.values(allThemes).map((theme) => ({
          id: theme.id,
          name: theme.name,
          description: theme.description,
          author: theme.author,
          version: theme.version,
          type: theme.type,
          preview: {
            primary: theme.colors.primary[500],
            secondary: theme.colors.secondary[500],
            background: theme.colors.background.primary,
            foreground: theme.colors.foreground.primary,
          },
        }));
      },
      
      getEffectiveTheme: () => {
        const { currentTheme, themeMode, systemPreference } = get();
        
        if (themeMode === 'system') {
          const prefersDark = systemPreference === 'dark';
          return (prefersDark ? get().getTheme('classic-dark') : get().getTheme('classic-light'))
                 || BUILT_IN_THEMES[prefersDark ? 'classic-dark' : 'classic-light'];
        }
        if (themeMode === 'light' && currentTheme.type === 'dark') {
          return get().getTheme('classic-light') || BUILT_IN_THEMES['classic-light'];
        }
        if (themeMode === 'dark' && currentTheme.type === 'light') {
          return get().getTheme('classic-dark') || BUILT_IN_THEMES['classic-dark'];
        }
        
        return currentTheme;
      },
    }),
    {
      name: 'aigent-smith-theme',
      partialize: (state) => ({
        currentThemeId: state.currentThemeId,
        customThemes: state.customThemes,
        themeMode: state.themeMode,
      }),
    }
  )
);

// Apply theme to DOM
function toHslTuple(color: string): string | null {
  try {
    if (!color) return null;
    const c = color.trim();
    // Already HSL/HSLA
    const hslMatch = c.match(/hsla?\(([^)]+)\)/i);
    if (hslMatch) {
      const parts = hslMatch[1].split(',').map(p => p.trim());
      if (parts.length >= 3) {
        const H = Math.round(parseFloat(parts[0]));
        const S = Math.round(parseFloat(parts[1]));
        const L = Math.round(parseFloat(parts[2]));
        return `${H} ${S}% ${L}%`;
      }
    }
    // RGB/RGBA
    const rgbMatch = c.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10) / 255;
      const g = parseInt(rgbMatch[2], 10) / 255;
      const b = parseInt(rgbMatch[3], 10) / 255;
      const max = Math.max(r,g,b), min = Math.min(r,g,b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      const H = Math.round(h * 360);
      const S = Math.round(s * 100);
      const L = Math.round(l * 100);
      return `${H} ${S}% ${L}%`;
    }
    // HEX (#RGB or #RRGGBB)
    const expand = (h: string) => h.length === 4 ? '#' + [...h.slice(1)].map(c => c + c).join('') : h;
    const hex = expand(c).replace('#','');
    if (!/^([0-9a-fA-F]{6})$/.test(hex)) return null;
    const r = parseInt(hex.slice(0,2), 16) / 255;
    const g = parseInt(hex.slice(2,4), 16) / 255;
    const b = parseInt(hex.slice(4,6), 16) / 255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    const H = Math.round(h * 360);
    const S = Math.round(s * 100);
    const L = Math.round(l * 100);
    return `${H} ${S}% ${L}%`;
  } catch { return null; }
}

function safeHsl(color: string | undefined, fallback: string): string {
  const v = color && toHslTuple(color);
  return v || fallback;
}

function buildShadcnTokenCss(theme: Theme): string {
  // Map theme-system colors to shadcn/tailwind tokens used by Felix UI
  const bg = theme.colors.background;
  const fg = theme.colors.foreground;
  const border = theme.colors.border;
  const prim = theme.colors.primary;
  const acc = theme.colors.accent;
  const ui = theme.colors.ui || {} as any;

  // For dark themes, use low-contrast borders derived from background surfaces
  const borderTriple = theme.type === 'dark'
    ? safeHsl(bg?.tertiary || bg?.secondary || '#1f2937', '215 14% 22%')
    : safeHsl(border?.primary, '214.3 31.8% 91.4%');

  const pairs: Record<string,string> = {
    // base surfaces
    '--background': safeHsl(bg?.primary, '0 0% 100%'),
    '--foreground': safeHsl(fg?.primary, '222.2 84% 4.9%'),
    // cards / popovers
    '--card': safeHsl(ui.card?.bg || bg?.elevated || bg?.secondary, '0 0% 100%'),
    '--card-foreground': safeHsl(fg?.primary, '222.2 84% 4.9%'),
    '--popover': safeHsl(bg?.elevated || bg?.secondary, '0 0% 100%'),
    '--popover-foreground': safeHsl(fg?.primary, '222.2 84% 4.9%'),
    // primary/secondary/accent
    '--primary': safeHsl(prim?.[500], '222.2 47.4% 11.2%'),
    '--primary-foreground': safeHsl(fg?.inverse || '#ffffff', '210 40% 98%'),
    '--secondary': safeHsl(bg?.secondary, '210 40% 96.1%'),
    '--secondary-foreground': safeHsl(fg?.primary, '222.2 47.4% 11.2%'),
    '--accent': safeHsl(acc?.[500] || bg?.secondary, '210 40% 96.1%'),
    '--accent-foreground': safeHsl(fg?.primary, '222.2 47.4% 11.2%'),
    // muted
    '--muted': safeHsl(bg?.secondary, '210 40% 96.1%'),
    '--muted-foreground': safeHsl(fg?.muted || fg?.tertiary, '215.4 16.3% 46.9%'),
    // destructive (map to error)
    '--destructive': safeHsl(theme.colors.error?.[500], '0 100% 50%'),
    '--destructive-foreground': safeHsl('#ffffff', '210 40% 98%'),
    // semantic helpers
    '--success': safeHsl(theme.colors.success?.[500], '142 71% 45%'),
    '--success-foreground': safeHsl('#ffffff', '0 0% 100%'),
    '--warning': safeHsl(theme.colors.warning?.[500], '38 92% 50%'),
    '--warning-foreground': safeHsl('#000000', '0 0% 10%'),
    '--info': safeHsl(theme.colors.info?.[500], '199 89% 48%'),
    '--info-foreground': safeHsl('#ffffff', '0 0% 100%'),
    // borders / inputs / rings
    '--border': borderTriple,
    '--input': safeHsl(ui.input?.bg || bg?.primary, '0 0% 100%'),
    '--ring': safeHsl(border?.focus || prim?.[500], '222.2 84% 4.9%'),
    // radius
    '--radius': (theme.effects?.borderRadius?.md) || '0.5rem',
    // Chip variables (consistent dark-friendly backgrounds across the app)
    // Primary chip (triple values only; use hsl(var(--...)) in CSS)
    '--chip-bg-primary': theme.type === 'dark'
      ? safeHsl(bg?.tertiary || bg?.secondary || '#1f2937', '222 10% 20%')
      : safeHsl(prim?.[100] || prim?.[200] || prim?.[50], '222 47% 90%'),
    '--chip-text-primary': theme.type === 'dark'
      ? safeHsl(prim?.[300] || prim?.[400], '222 47% 70%')
      : safeHsl(prim?.[700] || prim?.[600], '222 47% 35%'),
    '--chip-border-primary': theme.type === 'dark'
      ? safeHsl(border?.primary, '222 10% 30%')
      : safeHsl(prim?.[200] || border?.primary, '222 20% 70%'),

    // Success chip
    '--chip-bg-success': theme.type === 'dark'
      ? safeHsl(bg?.tertiary || bg?.secondary || '#1f2937', '222 10% 20%')
      : safeHsl(theme.colors.success?.[100] || theme.colors.success?.[200], '142 40% 90%'),
    '--chip-text-success': theme.type === 'dark'
      ? safeHsl(theme.colors.success?.[300], '142 40% 70%')
      : safeHsl(theme.colors.success?.[700], '142 71% 35%'),
    '--chip-border-success': theme.type === 'dark'
      ? safeHsl(border?.primary, '222 10% 30%')
      : safeHsl(theme.colors.success?.[200] || border?.primary, '142 30% 70%'),

    // Warning chip
    '--chip-bg-warning': theme.type === 'dark'
      ? safeHsl(bg?.tertiary || bg?.secondary || '#1f2937', '222 10% 20%')
      : safeHsl(theme.colors.warning?.[100] || theme.colors.warning?.[200], '38 40% 90%'),
    '--chip-text-warning': theme.type === 'dark'
      ? safeHsl(theme.colors.warning?.[400] || theme.colors.warning?.[500], '38 92% 55%')
      : safeHsl(theme.colors.warning?.[700] || theme.colors.warning?.[600], '38 92% 35%'),
    '--chip-border-warning': theme.type === 'dark'
      ? safeHsl(border?.primary, '222 10% 30%')
      : safeHsl(theme.colors.warning?.[200] || border?.primary, '38 30% 70%'),

    // Info chip
    '--chip-bg-info': theme.type === 'dark'
      ? safeHsl(bg?.tertiary || bg?.secondary || '#1f2937', '222 10% 20%')
      : safeHsl(theme.colors.info?.[100] || theme.colors.info?.[200], '199 40% 90%'),
    '--chip-text-info': theme.type === 'dark'
      ? safeHsl(theme.colors.info?.[300] || theme.colors.info?.[400], '199 89% 70%')
      : safeHsl(theme.colors.info?.[700] || theme.colors.info?.[600], '199 89% 35%'),
    '--chip-border-info': theme.type === 'dark'
      ? safeHsl(border?.primary, '222 10% 30%')
      : safeHsl(theme.colors.info?.[200] || border?.primary, '199 30% 70%'),

    // Destructive chip
    '--chip-bg-destructive': theme.type === 'dark'
      ? safeHsl(bg?.tertiary || bg?.secondary || '#1f2937', '222 10% 20%')
      : safeHsl(theme.colors.error?.[100] || theme.colors.error?.[200], '0 60% 92%'),
    '--chip-text-destructive': theme.type === 'dark'
      ? safeHsl(theme.colors.error?.[300] || theme.colors.error?.[400], '0 80% 70%')
      : safeHsl(theme.colors.error?.[700] || theme.colors.error?.[600], '0 80% 40%'),
    '--chip-border-destructive': theme.type === 'dark'
      ? safeHsl(border?.primary, '222 10% 30%')
      : safeHsl(theme.colors.error?.[200] || border?.primary, '0 30% 70%'),
  };

  return Object.entries(pairs).map(([k,v]) => `${k}: ${v};`).join('\n  ');
}

function applyThemeToDOM(theme: Theme) {
  console.log('[ThemeSystem] Applying theme to DOM:', theme.id, theme.name);
  const root = document.documentElement;
  
  // Set theme type attribute
  root.setAttribute('data-theme', theme.type);
  root.setAttribute('data-theme-id', theme.id);
  
  // Generate and apply CSS variables
  const cssVariables = generateCSSVariables(theme);
  console.log('[ThemeSystem] Generated CSS variables:', cssVariables.substring(0, 200) + '...');
  
  // Create or update style element
  let styleElement = document.getElementById('theme-system-variables');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'theme-system-variables';
    document.head.appendChild(styleElement);
  }
  
  const shadcnVars = buildShadcnTokenCss(theme);
  styleElement.textContent = `:root {\n  ${cssVariables}\n}\n:root {\n  ${shadcnVars}\n}`;
  
  // Ensure our variables are the final authority in <head>
  try {
    // Remove legacy adapter block if present
    const adapter = document.getElementById('theme-adapter-variables');
    if (adapter && adapter.parentElement) {
      adapter.parentElement.removeChild(adapter);
    }
    // Re-append our style tag at the end to guarantee precedence
    if (styleElement.parentElement !== document.head) {
      document.head.appendChild(styleElement);
    } else if (document.head.lastChild !== styleElement) {
      document.head.removeChild(styleElement);
      document.head.appendChild(styleElement);
    }
  } catch (e) {
    console.warn('[ThemeSystem] Could not enforce style order:', e);
  }
  console.log('[ThemeSystem] Applied CSS variables to DOM');
  
  // Don't broadcast here - this causes infinite loops
  // Broadcasting should only happen from the app module when settings are saved
}

// Theme Context
interface ThemeContextValue {
  theme: Theme;
  themeId: string;
  themeMode: 'light' | 'dark' | 'system';
  setTheme: (themeId: string) => void;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  themes: ThemeMetadata[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: string;
  defaultMode?: 'light' | 'dark' | 'system';
}

export function ThemeProvider({ 
  children, 
  defaultTheme = 'classic-dark',
  defaultMode = 'system' 
}: ThemeProviderProps) {
  const store = useThemeStore();
  
  // Subscribe to theme changes: always apply the currently selected theme
  useEffect(() => {
    const unsubscribe = useThemeStore.subscribe((s) => {
      applyThemeToDOM(s.currentTheme);
    });
    return unsubscribe;
  }, []);
  
  // Initialize theme on mount
  useEffect(() => {
    // Set defaults if needed
    if (store.currentThemeId !== defaultTheme && !store.customThemes[store.currentThemeId]) {
      store.setTheme(defaultTheme);
    }
    
    if (store.themeMode !== defaultMode) {
      store.setThemeMode(defaultMode);
    }
    
    // Apply initial theme
    const selected = store.currentTheme;
    applyThemeToDOM(selected);
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      useThemeStore.setState({ systemPreference: e.matches ? 'dark' : 'light' });
      if (store.themeMode === 'system') {
        const newTheme = store.getEffectiveTheme();
        applyThemeToDOM(newTheme);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    // Set initial system preference
    useThemeStore.setState({ systemPreference: mediaQuery.matches ? 'dark' : 'light' });
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  
  const value: ThemeContextValue = {
    theme: store.currentTheme,
    themeId: store.currentThemeId,
    themeMode: store.themeMode,
    setTheme: store.setTheme,
    setThemeMode: store.setThemeMode,
    themes: store.getAllThemes(),
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useThemeColors() {
  const { theme } = useTheme();
  return theme.colors;
}
