import { Theme } from '../types/theme.js';

export const mars: Theme = {
  id: 'mars',
  name: 'Mars Rust',
  description: 'Warm, earthy tones inspired by the red planet and industrial aesthetics',
  author: 'AIgent Smith',
  version: '1.0.0',
  type: 'light',
  base: 'light',
  colors: {
    primary: {
      50: '#521a00',
      100: '#7a2600',
      200: '#8f2d00',
      300: '#a33300',
      400: '#b84400',
      500: '#dc2626', // Red primary
      600: '#ef4444',
      700: '#f87171',
      800: '#fca5a5',
      900: '#fecaca',
      950: '#fee2e2'
    },
    secondary: {
      50: '#3e140d',
      100: '#732e21',
      200: '#8d3423',
      300: '#af3e25',
      400: '#d24e2f',
      500: '#ea580c', // Orange secondary
      600: '#f97316',
      700: '#fb923c',
      800: '#fdba74',
      900: '#fed7aa',
      950: '#ffedd5'
    },
    accent: {
      50: '#3d201d',
      100: '#714139',
      200: '#884b42',
      300: '#a55b4c',
      400: '#c7775d',
      500: '#f59e0b', // Amber accent
      600: '#fbbf24',
      700: '#fcd34d',
      800: '#fde68a',
      900: '#fef3c7',
      950: '#fffbeb'
    },
    success: {
      50: '#f7fee7',
      100: '#ecfccb',
      200: '#d9f99d',
      300: '#bef264',
      400: '#a3e635',
      500: '#84cc16', // Olive green success
      600: '#65a30d',
      700: '#4d7c0f',
      800: '#3f6212',
      900: '#365314',
      950: '#1a2e05'
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b', // Amber warning
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03'
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444', // Red error
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a'
    },
    info: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7', // Purple info
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
      950: '#3b0764'
    },
    background: {
      primary: '#fffbf5', // Warm cream
      secondary: '#fef6ee',
      tertiary: '#fef3e7',
      elevated: '#ffffff',
      overlay: 'rgba(255, 251, 245, 0.95)',
      inverse: '#7a2600'
    },
    foreground: {
      primary: '#451a03', // Deep brown for main text
      secondary: '#78350f',
      tertiary: '#92400e',
      muted: '#b45309',
      inverse: '#fffbf5',
      link: '#dc2626', // Red for links
      linkHover: '#b91c1c' // Darker red on hover
    },
    border: {
      primary: 'rgba(220, 38, 38, 0.20)',
      secondary: 'rgba(234, 88, 12, 0.15)',
      tertiary: 'rgba(245, 158, 11, 0.10)',
      focus: 'rgba(220, 38, 38, 0.40)',
      error: 'rgba(185, 28, 28, 0.30)'
    },
    // Component-specific colors for Mars theme (light mode)
    components: {
      class: { bg: 'rgba(220, 38, 38, 0.08)', text: '#dc2626', border: 'rgba(220, 38, 38, 0.2)' },
      function: { bg: 'rgba(234, 88, 12, 0.08)', text: '#ea580c', border: 'rgba(234, 88, 12, 0.2)' },
      method: { bg: 'rgba(245, 158, 11, 0.08)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
      interface: { bg: 'rgba(239, 68, 68, 0.08)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' },
      type: { bg: 'rgba(249, 115, 22, 0.08)', text: '#f97316', border: 'rgba(249, 115, 22, 0.2)' },
      variable: { bg: 'rgba(251, 146, 60, 0.08)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.15)' },
      property: { bg: 'rgba(253, 186, 116, 0.08)', text: '#fdba74', border: 'rgba(253, 186, 116, 0.15)' },
      enum: { bg: 'rgba(254, 215, 170, 0.08)', text: '#fed7aa', border: 'rgba(254, 215, 170, 0.15)' },
      module: { bg: 'rgba(185, 28, 28, 0.08)', text: '#b91c1c', border: 'rgba(185, 28, 28, 0.2)' },
      namespace: { bg: 'rgba(153, 27, 27, 0.08)', text: '#991b1b', border: 'rgba(153, 27, 27, 0.2)' },
      package: { bg: 'rgba(127, 29, 29, 0.08)', text: '#7f1d1d', border: 'rgba(127, 29, 29, 0.2)' },
      import: { bg: 'rgba(217, 119, 6, 0.08)', text: '#d97706', border: 'rgba(217, 119, 6, 0.15)' },
      export: { bg: 'rgba(180, 83, 9, 0.08)', text: '#b45309', border: 'rgba(180, 83, 9, 0.15)' },
      file: { bg: 'rgba(146, 64, 14, 0.08)', text: '#92400e', border: 'rgba(146, 64, 14, 0.2)' },
      directory: { bg: 'rgba(120, 53, 15, 0.08)', text: '#78350f', border: 'rgba(120, 53, 15, 0.2)' },
      component: { bg: 'rgba(69, 26, 3, 0.08)', text: '#451a03', border: 'rgba(69, 26, 3, 0.2)' },
      hook: { bg: 'rgba(251, 191, 36, 0.08)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.15)' },
      service: { bg: 'rgba(252, 211, 77, 0.08)', text: '#fcd34d', border: 'rgba(252, 211, 77, 0.15)' },
      controller: { bg: 'rgba(253, 230, 138, 0.08)', text: '#fde68a', border: 'rgba(253, 230, 138, 0.15)' },
      model: { bg: 'rgba(254, 243, 199, 0.08)', text: '#fef3c7', border: 'rgba(254, 243, 199, 0.15)' },
      schema: { bg: 'rgba(184, 68, 0, 0.08)', text: '#b84400', border: 'rgba(184, 68, 0, 0.2)' },
      route: { bg: 'rgba(163, 51, 0, 0.08)', text: '#a33300', border: 'rgba(163, 51, 0, 0.2)' },
      middleware: { bg: 'rgba(143, 45, 0, 0.08)', text: '#8f2d00', border: 'rgba(143, 45, 0, 0.2)' },
      test: { bg: 'rgba(122, 38, 0, 0.08)', text: '#7a2600', border: 'rgba(122, 38, 0, 0.2)' },
      config: { bg: 'rgba(82, 26, 0, 0.08)', text: '#521a00', border: 'rgba(82, 26, 0, 0.2)' },
      constant: { bg: 'rgba(62, 20, 13, 0.08)', text: '#3e140d', border: 'rgba(62, 20, 13, 0.2)' },
      util: { bg: 'rgba(115, 46, 33, 0.08)', text: '#732e21', border: 'rgba(115, 46, 33, 0.2)' },
      helper: { bg: 'rgba(141, 52, 35, 0.08)', text: '#8d3423', border: 'rgba(141, 52, 35, 0.2)' }
    }
  }
};