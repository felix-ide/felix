import { Theme } from '../types/theme.js';

export const felixNeon: Theme = {
  id: 'felix-neon',
  name: 'Felix Neon (Legacy)',
  description: 'Radical 80s cyberpunk neon theme from the original Felix neon era',
  author: 'AIgent Smith',
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
      500: '#ff00b9', // Hot neon magenta
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
      500: '#00ffff', // Electric cyan
      600: '#00e6e6',
      700: '#00cccc',
      800: '#00b3b3',
      900: '#009999',
      950: '#006666'
    },
    accent: {
      50: '#f0ffe0',
      100: '#e0ffb8',
      200: '#c8ff8a',
      300: '#b0ff5c',
      400: '#98ff2f',
      500: '#80ff00', // Neon green (Matrix style)
      600: '#73e600',
      700: '#66cc00',
      800: '#5ab300',
      900: '#4d9900',
      950: '#336600'
    },
    success: {
      50: '#f0ffe0',
      100: '#e0ffb8',
      200: '#c8ff8a',
      300: '#b0ff5c',
      400: '#98ff2f',
      500: '#80ff00', // Neon green
      600: '#73e600',
      700: '#66cc00',
      800: '#5ab300',
      900: '#4d9900',
      950: '#336600'
    },
    warning: {
      50: '#ffe0f0',
      100: '#ffb8d9',
      200: '#ff8ac0',
      300: '#ff5ca6',
      400: '#ff2f8d',
      500: '#ff0073', // Hot pink
      600: '#e60066',
      700: '#cc005a',
      800: '#b3004d',
      900: '#990040',
      950: '#66002b'
    },
    error: {
      50: '#ffebe6',
      100: '#ffcfc4',
      200: '#ffb39f',
      300: '#ff977a',
      400: '#ff7b55',
      500: '#ff5f30', // Neon orange-red
      600: '#e6562b',
      700: '#cc4d26',
      800: '#b34321',
      900: '#993a1c',
      950: '#663117'
    },
    info: {
      50: '#f0e6ff',
      100: '#d9c4ff',
      200: '#c29fff',
      300: '#ab7aff',
      400: '#9455ff',
      500: '#7d30ff', // Electric purple
      600: '#712be6',
      700: '#6526cc',
      800: '#5921b3',
      900: '#4d1c99',
      950: '#3a1773'
    },
    background: {
      primary: '#0a0012', // Deep purple-black
      secondary: '#1a0026', // Dark purple
      tertiary: '#2a0039',
      elevated: '#3a004d',
      overlay: 'rgba(10, 0, 18, 0.9)',
      inverse: '#ff00b9'
    },
    foreground: {
      primary: '#00ffff', // Cyan text
      secondary: '#80ff00', // Neon green
      tertiary: '#ff00b9', // Magenta
      muted: '#9955ff', // Purple
      inverse: '#0a0012',
      link: '#00ffff', // Cyan links
      linkHover: '#80ff00' // Green hover
    },
    border: {
      primary: 'rgba(255, 0, 185, 0.2)', // Subtle neon magenta
      secondary: 'rgba(0, 255, 255, 0.2)', // Subtle cyan
      tertiary: 'rgba(128, 255, 0, 0.2)', // Subtle green
      focus: '#00ffff', // Cyan focus (kept bright)
      error: '#ff5f30' // Orange-red error (kept bright)
    },
    // Component colors for Felix
    components: {
      class: { bg: 'rgba(59, 130, 246, 0.1)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
      function: { bg: 'rgba(34, 197, 94, 0.1)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' },
      method: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a78bfa', border: 'rgba(168, 85, 247, 0.3)' },
      interface: { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' },
      type: { bg: 'rgba(239, 68, 68, 0.1)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
      variable: { bg: 'rgba(236, 72, 153, 0.1)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
      property: { bg: 'rgba(139, 92, 246, 0.1)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
      enum: { bg: 'rgba(99, 102, 241, 0.1)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' },
      module: { bg: 'rgba(6, 182, 212, 0.1)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)' },
      namespace: { bg: 'rgba(34, 197, 94, 0.1)', text: '#34d399', border: 'rgba(34, 197, 94, 0.3)' },
      package: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
      import: { bg: 'rgba(251, 146, 60, 0.1)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.3)' },
      export: { bg: 'rgba(217, 70, 239, 0.1)', text: '#e879f9', border: 'rgba(217, 70, 239, 0.3)' },
      file: { bg: 'rgba(124, 58, 237, 0.1)', text: '#8b5cf6', border: 'rgba(124, 58, 237, 0.3)' },
      directory: { bg: 'rgba(244, 63, 94, 0.1)', text: '#fb7185', border: 'rgba(244, 63, 94, 0.3)' },
      component: { bg: 'rgba(250, 204, 21, 0.1)', text: '#fde047', border: 'rgba(250, 204, 21, 0.3)' },
      hook: { bg: 'rgba(132, 204, 22, 0.1)', text: '#a3e635', border: 'rgba(132, 204, 22, 0.3)' },
      service: { bg: 'rgba(14, 165, 233, 0.1)', text: '#38bdf8', border: 'rgba(14, 165, 233, 0.3)' },
      controller: { bg: 'rgba(20, 184, 166, 0.1)', text: '#2dd4bf', border: 'rgba(20, 184, 166, 0.3)' },
      model: { bg: 'rgba(147, 51, 234, 0.1)', text: '#a855f7', border: 'rgba(147, 51, 234, 0.3)' },
      schema: { bg: 'rgba(234, 179, 8, 0.1)', text: '#facc15', border: 'rgba(234, 179, 8, 0.3)' },
      route: { bg: 'rgba(251, 113, 133, 0.1)', text: '#fda4af', border: 'rgba(251, 113, 133, 0.3)' },
      middleware: { bg: 'rgba(37, 99, 235, 0.1)', text: '#3b82f6', border: 'rgba(37, 99, 235, 0.3)' },
      test: { bg: 'rgba(244, 114, 182, 0.1)', text: '#f9a8d4', border: 'rgba(244, 114, 182, 0.3)' },
      config: { bg: 'rgba(192, 132, 252, 0.1)', text: '#c4b5fd', border: 'rgba(192, 132, 252, 0.3)' },
      constant: { bg: 'rgba(74, 222, 128, 0.1)', text: '#86efac', border: 'rgba(74, 222, 128, 0.3)' },
      util: { bg: 'rgba(96, 165, 250, 0.1)', text: '#93c5fd', border: 'rgba(96, 165, 250, 0.3)' },
      helper: { bg: 'rgba(253, 224, 71, 0.1)', text: '#fef08a', border: 'rgba(253, 224, 71, 0.3)' }
    }
  }
};
