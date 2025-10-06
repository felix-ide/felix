import { Theme } from '../types/theme.js';

export const felixGrid: Theme = {
  id: 'felix-grid',
  name: 'Felix Grid',
  description: 'High-contrast grid-inspired theme with synthwave accents',
  author: 'Felix Team',
  version: '2.0.0',
  type: 'dark',
  base: 'dark',
  colors: {
    primary: {
      50: '#ffe0f7',
      100: '#ffb8ed',
      200: '#ff8ae0',
      300: '#ff5cd3',
      400: '#ff2fc6',
      500: '#ff00b9',
      600: '#e600a6',
      700: '#cc0093',
      800: '#b30080',
      900: '#99006d',
      950: '#660048'
    },
    secondary: {
      50: '#e0ffff',
      100: '#b8ffff',
      200: '#8affff',
      300: '#5cffff',
      400: '#2fffff',
      500: '#00ffff',
      600: '#00e6e6',
      700: '#00cccc',
      800: '#00b3b3',
      900: '#009999',
      950: '#006666'
    },
    accent: {
      50: '#f0ffe0',
      100: '#e0ffb8',
      200: '#d0ff8a',
      300: '#c0ff5c',
      400: '#b0ff2f',
      500: '#a0ff00',
      600: '#90e600',
      700: '#80cc00',
      800: '#70b300',
      900: '#609900',
      950: '#406600'
    },
    success: {
      50: '#052e16',
      100: '#14532d',
      200: '#166534',
      300: '#15803d',
      400: '#16a34a',
      500: '#22c55e',
      600: '#4ade80',
      700: '#86efac',
      800: '#bbf7d0',
      900: '#dcfce7',
      950: '#f0fdf4'
    },
    warning: {
      50: '#431407',
      100: '#7c2d12',
      200: '#9a3412',
      300: '#c2410c',
      400: '#ea580c',
      500: '#f59e0b',
      600: '#fbbf24',
      700: '#fcd34d',
      800: '#fde68a',
      900: '#fef3c7',
      950: '#fffbeb'
    },
    error: {
      50: '#450a0a',
      100: '#7f1d1d',
      200: '#991b1b',
      300: '#b91c1c',
      400: '#dc2626',
      500: '#ef4444',
      600: '#f87171',
      700: '#fca5a5',
      800: '#fecaca',
      900: '#fee2e2',
      950: '#fef2f2'
    },
    info: {
      50: '#1e1b4b',
      100: '#312e81',
      200: '#3730a3',
      300: '#4c1d95',
      400: '#5b21b6',
      500: '#7c3aed',
      600: '#a78bfa',
      700: '#c4b5fd',
      800: '#ddd6fe',
      900: '#ede9fe',
      950: '#f5f3ff'
    },
    background: {
      primary: '#050510',
      secondary: '#0a0a1a',
      tertiary: '#101024',
      elevated: '#151530',
      overlay: 'rgba(10, 10, 20, 0.9)',
      inverse: '#f3f4f6'
    },
    foreground: {
      primary: '#e2e8f0',
      secondary: '#cbd5f5',
      tertiary: '#94a3b8',
      muted: '#64748b',
      inverse: '#050510',
      link: '#00ffff',
      linkHover: '#2fffff'
    },
    border: {
      primary: 'rgba(0, 255, 255, 0.25)',
      secondary: 'rgba(255, 0, 185, 0.2)',
      tertiary: 'rgba(160, 255, 0, 0.2)',
      focus: 'rgba(255, 0, 185, 0.4)',
      error: 'rgba(239, 68, 68, 0.4)'
    },
    components: (() => {
      const neon = (bg: string, text: string, border: string) => ({ bg, text, border });
      const pink = neon('rgba(255, 0, 185, 0.12)', '#ff5cd3', 'rgba(255, 0, 185, 0.25)');
      const cyan = neon('rgba(0, 255, 255, 0.12)', '#5cffff', 'rgba(0, 255, 255, 0.25)');
      const lime = neon('rgba(160, 255, 0, 0.12)', '#b0ff2f', 'rgba(160, 255, 0, 0.25)');
      const teal = neon('rgba(94, 234, 212, 0.12)', '#5eead4', 'rgba(94, 234, 212, 0.25)');
      const indigo = neon('rgba(129, 140, 248, 0.12)', '#818cf8', 'rgba(129, 140, 248, 0.25)');
      const gold = neon('rgba(250, 204, 21, 0.12)', '#eab308', 'rgba(250, 204, 21, 0.25)');
      const sky = neon('rgba(56, 189, 248, 0.12)', '#38bdf8', 'rgba(56, 189, 248, 0.25)');
      const rose = neon('rgba(244, 114, 182, 0.12)', '#f472b6', 'rgba(244, 114, 182, 0.25)');

      return {
        class: pink,
        function: cyan,
        method: lime,
        interface: teal,
        type: indigo,
        variable: gold,
        property: sky,
        enum: rose,
        module: pink,
        namespace: cyan,
        package: lime,
        import: teal,
        export: indigo,
        file: sky,
        directory: gold,
        component: rose,
        hook: sky,
        service: cyan,
        controller: pink,
        model: lime,
        schema: teal,
        route: indigo,
        middleware: sky,
        test: rose,
        config: cyan,
        constant: lime,
        util: indigo,
        helper: sky
      };
    })()
  }
};
