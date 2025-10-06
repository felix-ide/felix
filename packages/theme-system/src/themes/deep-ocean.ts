import { Theme } from '../types/theme.js';

export const deepOcean: Theme = {
  id: 'deep-ocean',
  name: 'Deep Ocean',
  description: 'Mysterious underwater depths with bioluminescent accents',
  author: 'AIgent Smith',
  version: '1.0.0',
  type: 'dark',
  base: 'dark',
  colors: {
    primary: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#008b8b', // Teal primary
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
      950: '#042f2e'
    },
    secondary: {
      50: '#f0fdf9',
      100: '#ccfbef',
      200: '#99f6df',
      300: '#5eead0',
      400: '#34d39a',
      500: '#7fffd4', // Aquamarine secondary
      600: '#0d9470',
      700: '#0f765a',
      800: '#115e4c',
      900: '#134e40',
      950: '#042f25'
    },
    accent: {
      50: '#fff1f3',
      100: '#ffe4e9',
      200: '#fecdd6',
      300: '#fda4b8',
      400: '#fb7194',
      500: '#ff7f50', // Coral accent
      600: '#f43f5e',
      700: '#e11d49',
      800: '#be123e',
      900: '#9f1239',
      950: '#500515'
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e', // Green success
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16'
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
      primary: '#0a1e3d', // Slightly lighter midnight blue
      secondary: '#0f2847',
      tertiary: '#143251',
      elevated: '#193c5b',
      overlay: 'rgba(5, 25, 55, 0.95)',
      inverse: '#7fffd4'
    },
    foreground: {
      primary: '#b0e0e6', // Powder blue for main text
      secondary: '#87ceeb',
      tertiary: '#5f9ea0',
      muted: '#4682b4',
      inverse: '#051937',
      link: '#7fffd4', // Aquamarine for links
      linkHover: '#ff7f50' // Coral on hover
    },
    border: {
      primary: 'rgba(0, 139, 139, 0.15)',
      secondary: 'rgba(127, 255, 212, 0.12)',
      tertiary: 'rgba(255, 127, 80, 0.08)',
      focus: 'rgba(127, 255, 212, 0.30)',
      error: 'rgba(239, 68, 68, 0.25)'
    },
    // Component-specific colors for Deep Ocean theme
    components: {
      class: { bg: 'rgba(0, 139, 139, 0.08)', text: '#008b8b', border: 'rgba(0, 139, 139, 0.3)' },
      function: { bg: 'rgba(127, 255, 212, 0.08)', text: '#7fffd4', border: 'rgba(127, 255, 212, 0.3)' },
      method: { bg: 'rgba(255, 127, 80, 0.08)', text: '#ff7f50', border: 'rgba(255, 127, 80, 0.3)' },
      interface: { bg: 'rgba(176, 224, 230, 0.08)', text: '#b0e0e6', border: 'rgba(176, 224, 230, 0.3)' },
      type: { bg: 'rgba(135, 206, 235, 0.08)', text: '#87ceeb', border: 'rgba(135, 206, 235, 0.3)' },
      variable: { bg: 'rgba(95, 158, 160, 0.08)', text: '#5f9ea0', border: 'rgba(95, 158, 160, 0.3)' },
      property: { bg: 'rgba(70, 130, 180, 0.08)', text: '#4682b4', border: 'rgba(70, 130, 180, 0.3)' },
      enum: { bg: 'rgba(100, 149, 237, 0.08)', text: '#6495ed', border: 'rgba(100, 149, 237, 0.3)' },
      module: { bg: 'rgba(0, 191, 255, 0.08)', text: '#00bfff', border: 'rgba(0, 191, 255, 0.3)' },
      namespace: { bg: 'rgba(30, 144, 255, 0.08)', text: '#1e90ff', border: 'rgba(30, 144, 255, 0.3)' },
      package: { bg: 'rgba(65, 105, 225, 0.08)', text: '#4169e1', border: 'rgba(65, 105, 225, 0.3)' },
      import: { bg: 'rgba(106, 90, 205, 0.08)', text: '#6a5acd', border: 'rgba(106, 90, 205, 0.3)' },
      export: { bg: 'rgba(123, 104, 238, 0.08)', text: '#7b68ee', border: 'rgba(123, 104, 238, 0.3)' },
      file: { bg: 'rgba(72, 61, 139, 0.08)', text: '#483d8b', border: 'rgba(72, 61, 139, 0.3)' },
      directory: { bg: 'rgba(75, 0, 130, 0.08)', text: '#4b0082', border: 'rgba(75, 0, 130, 0.3)' },
      component: { bg: 'rgba(64, 224, 208, 0.08)', text: '#40e0d0', border: 'rgba(64, 224, 208, 0.3)' },
      hook: { bg: 'rgba(72, 209, 204, 0.08)', text: '#48d1cc', border: 'rgba(72, 209, 204, 0.3)' },
      service: { bg: 'rgba(175, 238, 238, 0.08)', text: '#afeeee', border: 'rgba(175, 238, 238, 0.3)' },
      controller: { bg: 'rgba(224, 255, 255, 0.08)', text: '#e0ffff', border: 'rgba(224, 255, 255, 0.3)' },
      model: { bg: 'rgba(176, 196, 222, 0.08)', text: '#b0c4de', border: 'rgba(176, 196, 222, 0.3)' },
      schema: { bg: 'rgba(173, 216, 230, 0.08)', text: '#add8e6', border: 'rgba(173, 216, 230, 0.3)' },
      route: { bg: 'rgba(135, 206, 250, 0.08)', text: '#87cefa', border: 'rgba(135, 206, 250, 0.3)' },
      middleware: { bg: 'rgba(119, 136, 153, 0.08)', text: '#778899', border: 'rgba(119, 136, 153, 0.3)' },
      test: { bg: 'rgba(112, 128, 144, 0.08)', text: '#708090', border: 'rgba(112, 128, 144, 0.3)' },
      config: { bg: 'rgba(95, 158, 160, 0.08)', text: '#5f9ea0', border: 'rgba(95, 158, 160, 0.3)' },
      constant: { bg: 'rgba(70, 130, 180, 0.08)', text: '#4682b4', border: 'rgba(70, 130, 180, 0.3)' },
      util: { bg: 'rgba(65, 105, 225, 0.08)', text: '#4169e1', border: 'rgba(65, 105, 225, 0.3)' },
      helper: { bg: 'rgba(100, 149, 237, 0.08)', text: '#6495ed', border: 'rgba(100, 149, 237, 0.3)' }
    }
  }
};