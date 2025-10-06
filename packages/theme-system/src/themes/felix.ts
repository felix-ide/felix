import { Theme } from '../types/theme.js';

export const felix: Theme = {
  id: 'felix',
  name: 'Felix',
  description: 'Classic cartoon magic with a modern twist - playful black & white with vibrant pops of color',
  author: 'Felix Team',
  version: '2.0.0',
  type: 'light',
  base: 'light',
  colors: {
    primary: {
      50: '#f5f5f5',
      100: '#e5e5e5',
      200: '#d4d4d4',
      300: '#a3a3a3',
      400: '#737373',
      500: '#171717', // Classic black (Felix's fur)
      600: '#0a0a0a',
      700: '#000000',
      800: '#000000',
      900: '#000000',
      950: '#000000'
    },
    secondary: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444', // Bright cartoon red (Felix's bow/nose)
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a'
    },
    accent: {
      50: '#fefce8',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#facc15',
      500: '#f59e0b', // Golden yellow (magic bag/stars)
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03'
    },
    success: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981', // Cartoon mint green
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
      950: '#022c22'
    },
    warning: {
      50: '#fefce8',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#facc15',
      500: '#eab308', // Bright cartoon yellow
      600: '#ca8a04',
      700: '#a16207',
      800: '#854d0e',
      900: '#713f12',
      950: '#422006'
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444', // Classic cartoon red
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a'
    },
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Bright cartoon blue
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    },
    background: {
      primary: '#fffef0', // Warm vintage cartoon paper yellow
      secondary: '#fff4db', // Soft golden yellow for panels
      tertiary: '#ffe8cc', // Peachy cartoon cel color
      elevated: '#fffdf8', // Slightly tinted white for cards
      overlay: 'rgba(0, 0, 0, 0.5)', // Classic black overlay
      inverse: '#171717' // Felix black
    },
    foreground: {
      primary: '#171717', // Felix black for main text
      secondary: '#404040',
      tertiary: '#737373',
      muted: '#a3a3a3',
      inverse: '#ffffff',
      link: '#3b82f6', // Bright blue for links
      linkHover: '#ef4444' // Red on hover (like Felix's bow)
    },
    border: {
      primary: 'rgba(0, 0, 0, 0.12)', // Classic black outlines
      secondary: 'rgba(0, 0, 0, 0.08)',
      tertiary: 'rgba(0, 0, 0, 0.05)',
      focus: 'rgba(239, 68, 68, 0.50)', // Red focus (Felix's bow)
      error: 'rgba(239, 68, 68, 0.40)'
    },
    // Vibrant cartoon-inspired component colors with Felix personality
    components: {
      class: {
        bg: 'rgba(239, 68, 68, 0.25)', // Bright red background
        text: '#dc2626',
        border: 'rgba(239, 68, 68, 0.40)'
      },
      function: {
        bg: 'rgba(59, 130, 246, 0.25)', // Bright blue background
        text: '#1d4ed8',
        border: 'rgba(59, 130, 246, 0.40)'
      },
      method: {
        bg: 'rgba(250, 204, 21, 0.35)', // Bright yellow background
        text: '#a16207',
        border: 'rgba(250, 204, 21, 0.50)'
      },
      interface: {
        bg: 'rgba(16, 185, 129, 0.25)', // Bright mint background
        text: '#047857',
        border: 'rgba(16, 185, 129, 0.40)'
      },
      type: {
        bg: 'rgba(236, 72, 153, 0.25)', // Hot pink background
        text: '#be185d',
        border: 'rgba(236, 72, 153, 0.40)'
      },
      variable: {
        bg: 'rgba(251, 146, 60, 0.30)', // Orange background
        text: '#c2410c',
        border: 'rgba(251, 146, 60, 0.45)'
      },
      property: {
        bg: 'rgba(147, 197, 253, 0.30)', // Sky blue background
        text: '#0369a1',
        border: 'rgba(147, 197, 253, 0.45)'
      },
      enum: {
        bg: 'rgba(168, 85, 247, 0.25)', // Purple background
        text: '#7c3aed',
        border: 'rgba(168, 85, 247, 0.40)'
      },
      module: {
        bg: 'rgba(6, 182, 212, 0.25)', // Cyan background
        text: '#0e7490',
        border: 'rgba(6, 182, 212, 0.40)'
      },
      namespace: {
        bg: 'rgba(249, 115, 22, 0.25)', // Bright orange background
        text: '#c2410c',
        border: 'rgba(249, 115, 22, 0.40)'
      },
      package: {
        bg: 'rgba(234, 179, 8, 0.30)', // Golden yellow background
        text: '#a16207',
        border: 'rgba(234, 179, 8, 0.45)'
      },
      import: {
        bg: 'rgba(99, 102, 241, 0.30)', // Indigo background
        text: '#4f46e5',
        border: 'rgba(99, 102, 241, 0.45)'
      },
      export: {
        bg: 'rgba(34, 197, 94, 0.30)', // Green background
        text: '#16a34a',
        border: 'rgba(34, 197, 94, 0.45)'
      },
      file: {
        bg: 'rgba(156, 163, 175, 0.20)', // Grey background
        text: '#4b5563',
        border: 'rgba(156, 163, 175, 0.35)'
      },
      directory: {
        bg: 'rgba(107, 114, 128, 0.25)', // Darker grey background
        text: '#374151',
        border: 'rgba(107, 114, 128, 0.40)'
      },
      component: {
        bg: 'rgba(239, 68, 68, 0.30)', // Bright red (Felix's bow)
        text: '#dc2626',
        border: 'rgba(239, 68, 68, 0.45)'
      },
      hook: {
        bg: 'rgba(217, 70, 239, 0.30)', // Magenta background
        text: '#a21caf',
        border: 'rgba(217, 70, 239, 0.45)'
      },
      service: {
        bg: 'rgba(14, 165, 233, 0.30)', // Sky blue background
        text: '#0284c7',
        border: 'rgba(14, 165, 233, 0.45)'
      },
      controller: {
        bg: 'rgba(245, 158, 11, 0.35)', // Amber background
        text: '#d97706',
        border: 'rgba(245, 158, 11, 0.50)'
      },
      model: {
        bg: 'rgba(20, 184, 166, 0.30)', // Teal background
        text: '#0d9488',
        border: 'rgba(20, 184, 166, 0.45)'
      },
      schema: {
        bg: 'rgba(251, 191, 36, 0.35)', // Golden background
        text: '#ca8a04',
        border: 'rgba(251, 191, 36, 0.50)'
      },
      route: {
        bg: 'rgba(244, 63, 94, 0.30)', // Rose background
        text: '#e11d48',
        border: 'rgba(244, 63, 94, 0.45)'
      },
      middleware: {
        bg: 'rgba(96, 165, 250, 0.30)', // Light blue background
        text: '#2563eb',
        border: 'rgba(96, 165, 250, 0.45)'
      },
      test: {
        bg: 'rgba(52, 211, 153, 0.30)', // Emerald background
        text: '#059669',
        border: 'rgba(52, 211, 153, 0.45)'
      },
      config: {
        bg: 'rgba(192, 132, 252, 0.30)', // Lavender background
        text: '#7c3aed',
        border: 'rgba(192, 132, 252, 0.45)'
      },
      constant: {
        bg: 'rgba(31, 41, 55, 0.25)', // Dark background
        text: '#1f2937',
        border: 'rgba(31, 41, 55, 0.40)'
      },
      util: {
        bg: 'rgba(253, 224, 71, 0.35)', // Bright yellow background
        text: '#a16207',
        border: 'rgba(253, 224, 71, 0.50)'
      },
      helper: {
        bg: 'rgba(254, 240, 138, 0.40)', // Pale yellow background
        text: '#92400e',
        border: 'rgba(254, 240, 138, 0.55)'
      }
    }
  }
};