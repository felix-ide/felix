import { Theme } from '../types/theme.js';

export const forest: Theme = {
  id: 'forest',
  name: 'Forest',
  description: 'Nature-inspired green theme',
  author: 'AIgent Smith',
  version: '1.0.0',
  type: 'dark',
  base: 'dark',
  colors: {
    primary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16'
    },
    secondary: {
      50: '#f7fee7',
      100: '#ecfccb',
      200: '#d9f99d',
      300: '#bef264',
      400: '#a3e635',
      500: '#84cc16',
      600: '#65a30d',
      700: '#4d7c0f',
      800: '#3f6212',
      900: '#365314',
      950: '#1a2e05'
    },
    accent: {
      50: '#fefce8',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#facc15',
      500: '#eab308',
      600: '#ca8a04',
      700: '#a16207',
      800: '#854d0e',
      900: '#713f12',
      950: '#422006'
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
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
      500: '#f59e0b',
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
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a'
    },
    info: {
      50: '#ecfeff',
      100: '#cffafe',
      200: '#a5f3fc',
      300: '#67e8f9',
      400: '#22d3ee',
      500: '#06b6d4',
      600: '#0891b2',
      700: '#0e7490',
      800: '#155e75',
      900: '#164e63',
      950: '#083344'
    },
    background: {
      primary: '#0a0f0a',
      secondary: '#14532d',
      tertiary: '#166534',
      elevated: '#14532d',
      overlay: 'rgba(0, 0, 0, 0.75)',
      inverse: '#f0fdf4'
    },
    foreground: {
      primary: '#f0fdf4',
      secondary: '#bbf7d0',
      tertiary: '#86efac',
      muted: '#4ade80',
      inverse: '#0a0f0a',
      link: '#86efac',
      linkHover: '#bbf7d0'
    },
    border: {
      primary: 'rgba(22, 101, 52, 0.4)',
      secondary: 'rgba(20, 83, 45, 0.4)',
      tertiary: 'rgba(5, 46, 22, 0.4)',
      focus: '#22c55e',
      error: '#ef4444'
    },
    // Component colors for Forest — widen beyond greens (teal/cyan/amber/terra)
    components: {
      class:      { bg: 'rgba(34, 197, 94, 0.10)',  text: '#4ade80', border: 'rgba(34, 197, 94, 0.35)' },
      interface:  { bg: 'rgba(217, 119, 6, 0.12)',  text: '#d97706', border: 'rgba(217, 119, 6, 0.40)' },
      enum:       { bg: 'rgba(180, 83, 9, 0.12)',   text: '#b45309', border: 'rgba(180, 83, 9, 0.40)' },
      type:       { bg: 'rgba(2, 132, 199, 0.12)',  text: '#0284c7', border: 'rgba(2, 132, 199, 0.40)' }, // Cyan

      function:   { bg: 'rgba(6, 182, 212, 0.12)',  text: '#06b6d4', border: 'rgba(6, 182, 212, 0.40)' }, // Teal
      method:     { bg: 'rgba(234, 179, 8, 0.14)',  text: '#facc15', border: 'rgba(234, 179, 8, 0.45)' }, // Amber
      hook:       { bg: 'rgba(251, 146, 60, 0.14)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.45)' }, // Orange

      variable:   { bg: 'rgba(113, 63, 18, 0.14)',  text: '#713f12', border: 'rgba(113, 63, 18, 0.45)' }, // Terra
      property:   { bg: 'rgba(14, 165, 233, 0.12)', text: '#0ea5e9', border: 'rgba(14, 165, 233, 0.40)' }, // Sky
      constant:   { bg: 'rgba(217, 70, 239, 0.12)', text: '#a21caf', border: 'rgba(217, 70, 239, 0.40)' }, // Fuchsia (accent)

      module:     { bg: 'rgba(21, 128, 61, 0.12)',  text: '#15803d', border: 'rgba(21, 128, 61, 0.40)' },
      namespace:  { bg: 'rgba(22, 101, 52, 0.12)',  text: '#166534', border: 'rgba(22, 101, 52, 0.40)' },
      package:    { bg: 'rgba(20, 83, 45, 0.12)',   text: '#14532d', border: 'rgba(20, 83, 45, 0.40)' },

      import:     { bg: 'rgba(251, 146, 60, 0.14)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.45)' },
      export:     { bg: 'rgba(254, 240, 138, 0.14)',text: '#fef08a', border: 'rgba(254, 240, 138, 0.45)' },

      file:       { bg: 'rgba(120, 53, 15, 0.12)',  text: '#78350f', border: 'rgba(120, 53, 15, 0.45)' },
      directory:  { bg: 'rgba(69, 26, 3, 0.12)',    text: '#451a03', border: 'rgba(69, 26, 3, 0.45)' },

      component:  { bg: 'rgba(250, 204, 21, 0.14)', text: '#facc15', border: 'rgba(250, 204, 21, 0.45)' },
      service:    { bg: 'rgba(52, 211, 153, 0.12)', text: '#34d399', border: 'rgba(52, 211, 153, 0.40)' },
      controller: { bg: 'rgba(74, 222, 128, 0.12)', text: '#4ade80', border: 'rgba(74, 222, 128, 0.40)' },
      model:      { bg: 'rgba(161, 98, 7, 0.12)',   text: '#a16207', border: 'rgba(161, 98, 7, 0.45)' },
      schema:     { bg: 'rgba(202, 138, 4, 0.12)',  text: '#ca8a04', border: 'rgba(202, 138, 4, 0.45)' },
      route:      { bg: 'rgba(133, 77, 14, 0.12)',  text: '#854d0e', border: 'rgba(133, 77, 14, 0.45)' },
      middleware: { bg: 'rgba(22, 163, 74, 0.12)',  text: '#16a34a', border: 'rgba(22, 163, 74, 0.45)' },
      test:       { bg: 'rgba(14, 165, 233, 0.12)', text: '#67e8f9', border: 'rgba(14, 165, 233, 0.45)' },
      config:     { bg: 'rgba(2, 132, 199, 0.12)',  text: '#0284c7', border: 'rgba(2, 132, 199, 0.45)' },
      util:       { bg: 'rgba(217, 249, 157, 0.12)',text: '#d9f99d', border: 'rgba(217, 249, 157, 0.45)' },
      helper:     { bg: 'rgba(254, 249, 195, 0.12)',text: '#fef9c3', border: 'rgba(254, 249, 195, 0.45)' }
    }
  }
};
