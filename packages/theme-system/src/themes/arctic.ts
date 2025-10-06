import { Theme } from '../types/theme.js';

export const arctic: Theme = {
  id: 'arctic',
  name: 'Arctic Ice',
  description: 'Cool, clean, and professional - inspired by glaciers and northern ice',
  author: 'AIgent Smith',
  version: '1.0.0',
  type: 'light',
  base: 'light',
  colors: {
    primary: {
      50: '#082f49',
      100: '#0c4a6e',
      200: '#075985',
      300: '#0369a1',
      400: '#0284c7',
      500: '#0ea5e9', // Sky blue primary
      600: '#38bdf8',
      700: '#7dd3fc',
      800: '#bae6fd',
      900: '#e0f2fe',
      950: '#f0f9ff'
    },
    secondary: {
      50: '#052e16',
      100: '#14532d',
      200: '#166534',
      300: '#15803d',
      400: '#16a34a',
      500: '#10b981', // Emerald secondary
      600: '#4ade80',
      700: '#86efac',
      800: '#bbf7d0',
      900: '#dcfce7',
      950: '#f0fdf4'
    },
    accent: {
      50: '#171717',
      100: '#262626',
      200: '#404040',
      300: '#525252',
      400: '#737373',
      500: '#6b7280', // Cool gray accent
      600: '#9ca3af',
      700: '#d1d5db',
      800: '#e5e7eb',
      900: '#f3f4f6',
      950: '#f9fafb'
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
      50: '#fefce8',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#facc15',
      500: '#eab308', // Amber warning
      600: '#ca8a04',
      700: '#a16207',
      800: '#854d0e',
      900: '#713f12',
      950: '#422006'
    },
    error: {
      50: '#fff1f2',
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: '#f43f5e', // Rose error
      600: '#e11d48',
      700: '#be123c',
      800: '#9f1239',
      900: '#881337',
      950: '#4c0519'
    },
    info: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9', // Sky blue info
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49'
    },
    background: {
      primary: '#ffffff', // Pure white
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      elevated: '#ffffff',
      overlay: 'rgba(255, 255, 255, 0.95)',
      inverse: '#0c4a6e'
    },
    foreground: {
      primary: '#0f172a', // Deep slate for main text
      secondary: '#334155',
      tertiary: '#475569',
      muted: '#64748b',
      inverse: '#ffffff',
      link: '#0ea5e9', // Sky blue for links
      linkHover: '#0369a1' // Darker blue on hover
    },
    border: {
      primary: 'rgba(14, 165, 233, 0.20)',
      secondary: 'rgba(16, 185, 129, 0.15)',
      tertiary: 'rgba(107, 114, 128, 0.10)',
      focus: 'rgba(14, 165, 233, 0.40)',
      error: 'rgba(239, 68, 68, 0.30)'
    },
    // Component-specific colors for Arctic theme (light mode)
    components: {
      class: { bg: 'rgba(14, 165, 233, 0.08)', text: '#0ea5e9', border: 'rgba(14, 165, 233, 0.2)' },
      function: { bg: 'rgba(16, 185, 129, 0.08)', text: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
      method: { bg: 'rgba(6, 182, 212, 0.08)', text: '#06b6d4', border: 'rgba(6, 182, 212, 0.2)' },
      interface: { bg: 'rgba(3, 105, 161, 0.08)', text: '#0369a1', border: 'rgba(3, 105, 161, 0.2)' },
      type: { bg: 'rgba(2, 132, 199, 0.08)', text: '#0284c7', border: 'rgba(2, 132, 199, 0.2)' },
      variable: { bg: 'rgba(20, 184, 166, 0.08)', text: '#14b8a6', border: 'rgba(20, 184, 166, 0.2)' },
      property: { bg: 'rgba(13, 148, 136, 0.08)', text: '#0d9488', border: 'rgba(13, 148, 136, 0.2)' },
      enum: { bg: 'rgba(15, 118, 110, 0.08)', text: '#0f766e', border: 'rgba(15, 118, 110, 0.2)' },
      module: { bg: 'rgba(22, 163, 74, 0.08)', text: '#16a34a', border: 'rgba(22, 163, 74, 0.2)' },
      namespace: { bg: 'rgba(21, 128, 61, 0.08)', text: '#15803d', border: 'rgba(21, 128, 61, 0.2)' },
      package: { bg: 'rgba(22, 101, 52, 0.08)', text: '#166534', border: 'rgba(22, 101, 52, 0.2)' },
      import: { bg: 'rgba(56, 189, 248, 0.06)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.15)' },
      export: { bg: 'rgba(125, 211, 252, 0.06)', text: '#7dd3fc', border: 'rgba(125, 211, 252, 0.15)' },
      file: { bg: 'rgba(7, 89, 133, 0.08)', text: '#075985', border: 'rgba(7, 89, 133, 0.2)' },
      directory: { bg: 'rgba(12, 74, 110, 0.08)', text: '#0c4a6e', border: 'rgba(12, 74, 110, 0.2)' },
      component: { bg: 'rgba(94, 234, 212, 0.08)', text: '#5eead4', border: 'rgba(94, 234, 212, 0.15)' },
      hook: { bg: 'rgba(153, 246, 228, 0.08)', text: '#99f6e4', border: 'rgba(153, 246, 228, 0.15)' },
      service: { bg: 'rgba(204, 251, 241, 0.08)', text: '#ccfbf1', border: 'rgba(204, 251, 241, 0.15)' },
      controller: { bg: 'rgba(45, 212, 191, 0.08)', text: '#2dd4bf', border: 'rgba(45, 212, 191, 0.15)' },
      model: { bg: 'rgba(17, 94, 89, 0.08)', text: '#115e59', border: 'rgba(17, 94, 89, 0.2)' },
      schema: { bg: 'rgba(19, 78, 74, 0.08)', text: '#134e4a', border: 'rgba(19, 78, 74, 0.2)' },
      route: { bg: 'rgba(20, 83, 45, 0.08)', text: '#14532d', border: 'rgba(20, 83, 45, 0.2)' },
      middleware: { bg: 'rgba(100, 116, 139, 0.08)', text: '#64748b', border: 'rgba(100, 116, 139, 0.2)' },
      test: { bg: 'rgba(71, 85, 105, 0.08)', text: '#475569', border: 'rgba(71, 85, 105, 0.2)' },
      config: { bg: 'rgba(51, 65, 85, 0.08)', text: '#334155', border: 'rgba(51, 65, 85, 0.2)' },
      constant: { bg: 'rgba(30, 41, 59, 0.08)', text: '#1e293b', border: 'rgba(30, 41, 59, 0.2)' },
      util: { bg: 'rgba(15, 23, 42, 0.08)', text: '#0f172a', border: 'rgba(15, 23, 42, 0.2)' },
      helper: { bg: 'rgba(148, 163, 184, 0.08)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.15)' }
    }
  }
};