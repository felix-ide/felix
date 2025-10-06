import { Theme } from '../types/theme.js';

export const northernLights: Theme = {
  id: 'northern-lights',
  name: 'Northern Lights',
  description: 'Ethereal aurora borealis colors dancing across the night sky',
  author: 'AIgent Smith',
  version: '1.0.0',
  type: 'dark',
  base: 'dark',
  colors: {
    primary: {
      50: '#f0fdf5',
      100: '#dcfce8',
      200: '#bbf7d1',
      300: '#86efac',
      400: '#4ade7f',
      500: '#50c878', // Aurora green primary
      600: '#22c55e',
      700: '#16a34a',
      800: '#15803d',
      900: '#14532d',
      950: '#052e16'
    },
    secondary: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#8b7ab8', // Violet secondary
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
      950: '#3b0764'
    },
    accent: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#ff69b4', // Pink accent
      600: '#ec4899',
      700: '#db2777',
      800: '#be185d',
      900: '#9f1239',
      950: '#500724'
    },
    success: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6', // Teal success
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
      950: '#042f2e'
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
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Blue info
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    },
    background: {
      primary: '#0b0b0d', // Deep space black
      secondary: '#131317',
      tertiary: '#1b1b21',
      elevated: '#23232b',
      overlay: 'rgba(11, 11, 13, 0.95)',
      inverse: '#50c878'
    },
    foreground: {
      primary: '#a7f3d0', // Light aurora green for main text
      secondary: '#c4b5fd',
      tertiary: '#f9a8d4',
      muted: '#6b7280',
      inverse: '#0b0b0d',
      link: '#ff69b4', // Pink for links
      linkHover: '#8b7ab8' // Violet on hover
    },
    border: {
      primary: 'rgba(80, 200, 120, 0.15)',
      secondary: 'rgba(139, 122, 184, 0.12)',
      tertiary: 'rgba(255, 105, 180, 0.08)',
      focus: 'rgba(80, 200, 120, 0.30)',
      error: 'rgba(239, 68, 68, 0.25)'
    },
    // Component-specific colors for Northern Lights theme
    components: {
      class: { bg: 'rgba(80, 200, 120, 0.08)', text: '#50c878', border: 'rgba(80, 200, 120, 0.3)' },
      function: { bg: 'rgba(139, 122, 184, 0.08)', text: '#8b7ab8', border: 'rgba(139, 122, 184, 0.3)' },
      method: { bg: 'rgba(255, 105, 180, 0.08)', text: '#ff69b4', border: 'rgba(255, 105, 180, 0.3)' },
      interface: { bg: 'rgba(167, 243, 208, 0.08)', text: '#a7f3d0', border: 'rgba(167, 243, 208, 0.3)' },
      type: { bg: 'rgba(196, 181, 253, 0.08)', text: '#c4b5fd', border: 'rgba(196, 181, 253, 0.3)' },
      variable: { bg: 'rgba(249, 168, 212, 0.08)', text: '#f9a8d4', border: 'rgba(249, 168, 212, 0.3)' },
      property: { bg: 'rgba(34, 197, 94, 0.08)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
      enum: { bg: 'rgba(147, 51, 234, 0.08)', text: '#9333ea', border: 'rgba(147, 51, 234, 0.3)' },
      module: { bg: 'rgba(236, 72, 153, 0.08)', text: '#ec4899', border: 'rgba(236, 72, 153, 0.3)' },
      namespace: { bg: 'rgba(126, 34, 206, 0.08)', text: '#7e22ce', border: 'rgba(126, 34, 206, 0.3)' },
      package: { bg: 'rgba(219, 39, 119, 0.08)', text: '#db2777', border: 'rgba(219, 39, 119, 0.3)' },
      import: { bg: 'rgba(190, 24, 93, 0.08)', text: '#be185d', border: 'rgba(190, 24, 93, 0.3)' },
      export: { bg: 'rgba(159, 18, 57, 0.08)', text: '#9f1239', border: 'rgba(159, 18, 57, 0.3)' },
      file: { bg: 'rgba(22, 163, 74, 0.08)', text: '#16a34a', border: 'rgba(22, 163, 74, 0.3)' },
      directory: { bg: 'rgba(21, 128, 61, 0.08)', text: '#15803d', border: 'rgba(21, 128, 61, 0.3)' },
      component: { bg: 'rgba(74, 222, 128, 0.08)', text: '#4ade80', border: 'rgba(74, 222, 128, 0.3)' },
      hook: { bg: 'rgba(134, 239, 172, 0.08)', text: '#86efac', border: 'rgba(134, 239, 172, 0.3)' },
      service: { bg: 'rgba(187, 247, 208, 0.08)', text: '#bbf7d0', border: 'rgba(187, 247, 208, 0.3)' },
      controller: { bg: 'rgba(220, 252, 231, 0.08)', text: '#dcfce7', border: 'rgba(220, 252, 231, 0.3)' },
      model: { bg: 'rgba(240, 253, 244, 0.08)', text: '#f0fdf4', border: 'rgba(240, 253, 244, 0.3)' },
      schema: { bg: 'rgba(192, 132, 252, 0.08)', text: '#c084fc', border: 'rgba(192, 132, 252, 0.3)' },
      route: { bg: 'rgba(216, 180, 254, 0.08)', text: '#d8b4fe', border: 'rgba(216, 180, 254, 0.3)' },
      middleware: { bg: 'rgba(233, 213, 255, 0.08)', text: '#e9d5ff', border: 'rgba(233, 213, 255, 0.3)' },
      test: { bg: 'rgba(243, 232, 255, 0.08)', text: '#f3e8ff', border: 'rgba(243, 232, 255, 0.3)' },
      config: { bg: 'rgba(250, 245, 255, 0.08)', text: '#faf5ff', border: 'rgba(250, 245, 255, 0.3)' },
      constant: { bg: 'rgba(244, 114, 182, 0.08)', text: '#f472b6', border: 'rgba(244, 114, 182, 0.3)' },
      util: { bg: 'rgba(251, 207, 232, 0.08)', text: '#fbcfe8', border: 'rgba(251, 207, 232, 0.3)' },
      helper: { bg: 'rgba(252, 231, 243, 0.08)', text: '#fce7f3', border: 'rgba(252, 231, 243, 0.3)' }
    }
  }
};