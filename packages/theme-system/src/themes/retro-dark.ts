import { Theme } from '../types/theme.js';

export const retroDark: Theme = {
  id: 'retro-dark',
  name: 'Retro Dark',
  description: '80s/90s cyberpunk aesthetic - Hackers movie vibes with softer neon',
  author: 'AIgent Smith',
  version: '1.0.0',
  type: 'dark',
  base: 'dark',
  colors: {
    primary: {
      50: '#ffeef9',
      100: '#ffdcf2',
      200: '#ffb8e5',
      300: '#ff94d9',
      400: '#ff70cc',
      500: '#ff4dbf', // Softer hot pink
      600: '#e644ac',
      700: '#cc3d99',
      800: '#b33586',
      900: '#992e73',
      950: '#66 1e4d'
    },
    secondary: {
      50: '#f0fcff',
      100: '#e0f8ff',
      200: '#c0f0ff',
      300: '#94e4ff',
      400: '#5cd4ff',
      500: '#29c4ff', // Softer electric blue
      600: '#0aa8f0',
      700: '#0085cc',
      800: '#0069a6',
      900: '#005689',
      950: '#003859'
    },
    accent: {
      50: '#fcf4ff',
      100: '#f8e6ff',
      200: '#f0ccff',
      300: '#e5a3ff',
      400: '#d966ff',
      500: '#cc33ff', // Electric purple
      600: '#b300f0',
      700: '#9900cc',
      800: '#7a00a3',
      900: '#660086',
      950: '#440059'
    },
    success: {
      50: '#f0fff4',
      100: '#e0ffe8',
      200: '#b8ffd0',
      300: '#7affaa',
      400: '#33ff77',
      500: '#00f050', // Softer neon green
      600: '#00cc44',
      700: '#00a638',
      800: '#008530',
      900: '#006b28',
      950: '#00451a'
    },
    warning: {
      50: '#fffbf0',
      100: '#fff5d9',
      200: '#ffe8b3',
      300: '#ffd47a',
      400: '#ffbb33',
      500: '#ffa500', // Amber orange
      600: '#e69400',
      700: '#cc8400',
      800: '#a66a00',
      900: '#865600',
      950: '#593800'
    },
    error: {
      50: '#fff5f5',
      100: '#ffe0e0',
      200: '#ffb8b8',
      300: '#ff8080',
      400: '#ff4747',
      500: '#ff1744', // Softer red
      600: '#e6143d',
      700: '#cc1136',
      800: '#a60e2e',
      900: '#8a0c26',
      950: '#5c081a'
    },
    info: {
      50: '#f7f0ff',
      100: '#ede0ff',
      200: '#dcc0ff',
      300: '#c299ff',
      400: '#a366ff',
      500: '#8533ff', // Softer purple
      600: '#7300e6',
      700: '#6200cc',
      800: '#5000a6',
      900: '#420086',
      950: '#2d0059'
    },
    background: {
      primary: '#0d0014', // Deep purple-black
      secondary: '#14001f', // Darker purple
      tertiary: '#1a0026',
      elevated: '#22002e',
      overlay: 'rgba(13, 0, 20, 0.9)',
      inverse: '#ff4dbf'
    },
    foreground: {
      primary: '#e0d0ff', // Soft lavender text
      secondary: '#b8a3ff', // Softer purple
      tertiary: '#8a70cc', // Muted purple
      muted: '#6b5a99', // Darker muted
      inverse: '#0d0014',
      link: '#29c4ff', // Blue links
      linkHover: '#ff4dbf' // Pink hover
    },
    border: {
      primary: 'rgba(255, 77, 191, 0.025)',
      secondary: 'rgba(41, 196, 255, 0.015)',
      tertiary: 'rgba(204, 51, 255, 0.008)',
      focus: 'rgba(41, 196, 255, 0.20)',
      error: 'rgba(255, 23, 68, 0.18)'
    },
    // Component colors for retro dark — add subtle fills for readability
    components: {
      class:      { bg: 'rgba(255, 77, 191, 0.10)', text: '#ff4dbf', border: 'rgba(255, 77, 191, 0.45)' },
      function:   { bg: 'rgba(41, 196, 255, 0.10)', text: '#29c4ff', border: 'rgba(41, 196, 255, 0.45)' },
      method:     { bg: 'rgba(204, 51, 255, 0.10)', text: '#cc33ff', border: 'rgba(204, 51, 255, 0.45)' },
      interface:  { bg: 'rgba(255, 205, 0, 0.10)', text: '#ffcd00', border: 'rgba(255, 205, 0, 0.45)' },
      type:       { bg: 'rgba(255, 23, 68, 0.10)', text: '#ff1744', border: 'rgba(255, 23, 68, 0.45)' },
      // Improve separation: variable = amber, property = teal
      variable:   { bg: 'rgba(234, 179, 8, 0.10)', text: '#fde68a', border: 'rgba(234, 179, 8, 0.45)' },
      property:   { bg: 'rgba(20, 184, 166, 0.10)', text: '#5eead4', border: 'rgba(20, 184, 166, 0.45)' },
      enum:       { bg: 'rgba(179, 0, 255, 0.10)', text: '#b300ff', border: 'rgba(179, 0, 255, 0.45)' },
      module:     { bg: 'rgba(0, 255, 255, 0.10)', text: '#00ffff', border: 'rgba(0, 255, 255, 0.45)' },
      namespace:  { bg: 'rgba(179, 255, 0, 0.10)', text: '#b3ff00', border: 'rgba(179, 255, 0, 0.45)' },
      package:    { bg: 'rgba(0, 255, 102, 0.10)', text: '#00ff66', border: 'rgba(0, 255, 102, 0.45)' },
      import:     { bg: 'rgba(255, 153, 0, 0.10)', text: '#ff9900', border: 'rgba(255, 153, 0, 0.45)' },
      export:     { bg: 'rgba(230, 0, 255, 0.10)', text: '#e600ff', border: 'rgba(230, 0, 255, 0.45)' },
      file:       { bg: 'rgba(77, 77, 255, 0.10)', text: '#4d4dff', border: 'rgba(77, 77, 255, 0.45)' },
      directory:  { bg: 'rgba(255, 0, 255, 0.10)', text: '#ff00ff', border: 'rgba(255, 0, 255, 0.45)' },
      component:  { bg: 'rgba(255, 255, 0, 0.10)', text: '#ffff00', border: 'rgba(255, 255, 0, 0.45)' },
      hook:       { bg: 'rgba(204, 255, 0, 0.10)', text: '#ccff00', border: 'rgba(204, 255, 0, 0.45)' },
      service:    { bg: 'rgba(0, 179, 255, 0.10)', text: '#00b3ff', border: 'rgba(0, 179, 255, 0.45)' },
      controller: { bg: 'rgba(0, 255, 179, 0.10)', text: '#00ffb3', border: 'rgba(0, 255, 179, 0.45)' },
      model:      { bg: 'rgba(204, 0, 255, 0.10)', text: '#cc00ff', border: 'rgba(204, 0, 255, 0.45)' },
      schema:     { bg: 'rgba(255, 230, 0, 0.10)', text: '#ffe600', border: 'rgba(255, 230, 0, 0.45)' },
      route:      { bg: 'rgba(255, 51, 102, 0.10)', text: '#ff3366', border: 'rgba(255, 51, 102, 0.45)' },
      middleware: { bg: 'rgba(51, 102, 255, 0.10)', text: '#3366ff', border: 'rgba(51, 102, 255, 0.45)' },
      test:       { bg: 'rgba(255, 0, 179, 0.10)', text: '#ff00b3', border: 'rgba(255, 0, 179, 0.45)' },
      config:     { bg: 'rgba(153, 0, 255, 0.10)', text: '#9900ff', border: 'rgba(153, 0, 255, 0.45)' },
      constant:   { bg: 'rgba(0, 255, 153, 0.10)', text: '#00ff99', border: 'rgba(0, 255, 153, 0.45)' },
      util:       { bg: 'rgba(0, 204, 255, 0.10)', text: '#00ccff', border: 'rgba(0, 204, 255, 0.45)' },
      helper:     { bg: 'rgba(230, 255, 0, 0.10)', text: '#e6ff00', border: 'rgba(230, 255, 0, 0.45)' }
    }
  }
};
