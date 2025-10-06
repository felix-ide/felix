import { Theme } from '../types/theme.js';

export const monochromeGold: Theme = {
  id: 'monochrome-gold',
  name: 'Monochrome Gold',
  description: 'Luxurious and elegant with gold accents on charcoal',
  author: 'AIgent Smith',
  version: '1.0.0',
  type: 'dark',
  base: 'dark',
  colors: {
    primary: {
      50: '#fffef7',
      100: '#fffded',
      200: '#fffadb',
      300: '#fff4bf',
      400: '#ffec99',
      500: '#ffd700', // Gold primary
      600: '#e6c200',
      700: '#ccac00',
      800: '#b39700',
      900: '#998200',
      950: '#665600'
    },
    secondary: {
      50: '#fffef5',
      100: '#fffce6',
      200: '#fff9cc',
      300: '#fff4a3',
      400: '#ffed70',
      500: '#ffbf00', // Amber secondary
      600: '#e6ac00',
      700: '#cc9900',
      800: '#b38600',
      900: '#997300',
      950: '#664d00'
    },
    accent: {
      50: '#fffef9',
      100: '#fffdf3',
      200: '#fffbe7',
      300: '#fff8d4',
      400: '#fff4bb',
      500: '#f7e7ce', // Champagne accent
      600: '#decfb9',
      700: '#c5b8a4',
      800: '#aca08f',
      900: '#93897a',
      950: '#625b51'
    },
    success: {
      50: '#f7fee7',
      100: '#ecfccb',
      200: '#d9f99d',
      300: '#bef264',
      400: '#a3e635',
      500: '#84cc16', // Lime success
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
      500: '#f59e0b', // Orange warning
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
      50: '#f8f9fa',
      100: '#f1f3f5',
      200: '#e9ecef',
      300: '#dee2e6',
      400: '#ced4da',
      500: '#adb5bd', // Gray info
      600: '#868e96',
      700: '#495057',
      800: '#343a40',
      900: '#212529',
      950: '#0a0a0a'
    },
    background: {
      primary: '#1c1c1c', // Charcoal
      secondary: '#242424',
      tertiary: '#2c2c2c',
      elevated: '#343434',
      overlay: 'rgba(28, 28, 28, 0.95)',
      inverse: '#ffd700'
    },
    foreground: {
      primary: '#ffd700', // Gold for main text
      secondary: '#ffbf00',
      tertiary: '#f7e7ce',
      muted: '#9ca3af',
      inverse: '#1c1c1c',
      link: '#ffd700', // Gold for links
      linkHover: '#f7e7ce' // Champagne on hover
    },
    border: {
      primary: 'rgba(255, 215, 0, 0.15)',
      secondary: 'rgba(255, 191, 0, 0.12)',
      tertiary: 'rgba(247, 231, 206, 0.08)',
      focus: 'rgba(255, 215, 0, 0.35)',
      error: 'rgba(239, 68, 68, 0.25)'
    },
    // Component-specific colors for Monochrome Gold theme
    components: {
      class: { bg: 'rgba(255, 215, 0, 0.08)', text: '#ffd700', border: 'rgba(255, 215, 0, 0.3)' },
      function: { bg: 'rgba(255, 191, 0, 0.08)', text: '#ffbf00', border: 'rgba(255, 191, 0, 0.3)' },
      method: { bg: 'rgba(247, 231, 206, 0.08)', text: '#f7e7ce', border: 'rgba(247, 231, 206, 0.3)' },
      interface: { bg: 'rgba(230, 194, 0, 0.08)', text: '#e6c200', border: 'rgba(230, 194, 0, 0.3)' },
      type: { bg: 'rgba(204, 172, 0, 0.08)', text: '#ccac00', border: 'rgba(204, 172, 0, 0.3)' },
      variable: { bg: 'rgba(179, 151, 0, 0.08)', text: '#b39700', border: 'rgba(179, 151, 0, 0.3)' },
      property: { bg: 'rgba(153, 130, 0, 0.08)', text: '#998200', border: 'rgba(153, 130, 0, 0.3)' },
      enum: { bg: 'rgba(230, 172, 0, 0.08)', text: '#e6ac00', border: 'rgba(230, 172, 0, 0.3)' },
      module: { bg: 'rgba(204, 153, 0, 0.08)', text: '#cc9900', border: 'rgba(204, 153, 0, 0.3)' },
      namespace: { bg: 'rgba(179, 134, 0, 0.08)', text: '#b38600', border: 'rgba(179, 134, 0, 0.3)' },
      package: { bg: 'rgba(153, 115, 0, 0.08)', text: '#997300', border: 'rgba(153, 115, 0, 0.3)' },
      import: { bg: 'rgba(222, 207, 185, 0.08)', text: '#decfb9', border: 'rgba(222, 207, 185, 0.3)' },
      export: { bg: 'rgba(197, 184, 164, 0.08)', text: '#c5b8a4', border: 'rgba(197, 184, 164, 0.3)' },
      file: { bg: 'rgba(172, 160, 143, 0.08)', text: '#aca08f', border: 'rgba(172, 160, 143, 0.3)' },
      directory: { bg: 'rgba(147, 137, 122, 0.08)', text: '#93897a', border: 'rgba(147, 137, 122, 0.3)' },
      component: { bg: 'rgba(255, 250, 219, 0.08)', text: '#fffadb', border: 'rgba(255, 250, 219, 0.3)' },
      hook: { bg: 'rgba(255, 244, 191, 0.08)', text: '#fff4bf', border: 'rgba(255, 244, 191, 0.3)' },
      service: { bg: 'rgba(255, 236, 153, 0.08)', text: '#ffec99', border: 'rgba(255, 236, 153, 0.3)' },
      controller: { bg: 'rgba(255, 249, 204, 0.08)', text: '#fff9cc', border: 'rgba(255, 249, 204, 0.3)' },
      model: { bg: 'rgba(255, 244, 163, 0.08)', text: '#fff4a3', border: 'rgba(255, 244, 163, 0.3)' },
      schema: { bg: 'rgba(255, 237, 112, 0.08)', text: '#ffed70', border: 'rgba(255, 237, 112, 0.3)' },
      route: { bg: 'rgba(255, 251, 231, 0.08)', text: '#fffbe7', border: 'rgba(255, 251, 231, 0.3)' },
      middleware: { bg: 'rgba(255, 248, 212, 0.08)', text: '#fff8d4', border: 'rgba(255, 248, 212, 0.3)' },
      test: { bg: 'rgba(255, 244, 187, 0.08)', text: '#fff4bb', border: 'rgba(255, 244, 187, 0.3)' },
      config: { bg: 'rgba(156, 163, 175, 0.08)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' },
      constant: { bg: 'rgba(134, 142, 150, 0.08)', text: '#868e96', border: 'rgba(134, 142, 150, 0.3)' },
      util: { bg: 'rgba(173, 181, 189, 0.08)', text: '#adb5bd', border: 'rgba(173, 181, 189, 0.3)' },
      helper: { bg: 'rgba(206, 212, 218, 0.08)', text: '#ced4da', border: 'rgba(206, 212, 218, 0.3)' }
    }
  }
};