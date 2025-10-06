import { Theme } from '../types/theme.js';

export const retroLight: Theme = {
  id: 'retro-light',
  name: 'Retro Light',
  description: '80s/90s Miami Vice aesthetic - bright neon on light backgrounds',
  author: 'AIgent Smith',
  version: '1.0.0',
  type: 'light',
  base: 'light',
  colors: {
    primary: {
      50: '#ffe6f7',
      100: '#ffccee',
      200: '#ff99dd',
      300: '#ff66cc',
      400: '#ff33bb',
      500: '#ff00aa', // Hot pink
      600: '#e60099',
      700: '#cc0088',
      800: '#b30077',
      900: '#990066',
      950: '#660044'
    },
    secondary: {
      50: '#e6f9ff',
      100: '#ccf2ff',
      200: '#99e6ff',
      300: '#66d9ff',
      400: '#33ccff',
      500: '#00bfff', // Deep sky blue
      600: '#00ace6',
      700: '#0099cc',
      800: '#0086b3',
      900: '#007399',
      950: '#004d66'
    },
    accent: {
      50: '#f5e6ff',
      100: '#ebccff',
      200: '#d799ff',
      300: '#c366ff',
      400: '#af33ff',
      500: '#9b00ff', // Electric violet
      600: '#8c00e6',
      700: '#7c00cc',
      800: '#6d00b3',
      900: '#5d0099',
      950: '#3e0066'
    },
    success: {
      50: '#e6ffe6',
      100: '#ccffcc',
      200: '#99ff99',
      300: '#66ff66',
      400: '#33ff33',
      500: '#00ff00', // Pure neon green
      600: '#00e600',
      700: '#00cc00',
      800: '#00b300',
      900: '#009900',
      950: '#006600'
    },
    warning: {
      50: '#fff9e6',
      100: '#fff2cc',
      200: '#ffe699',
      300: '#ffd966',
      400: '#ffcc33',
      500: '#ffbf00', // Gold
      600: '#e6ac00',
      700: '#cc9900',
      800: '#b38600',
      900: '#997300',
      950: '#664d00'
    },
    error: {
      50: '#ffe6e6',
      100: '#ffcccc',
      200: '#ff9999',
      300: '#ff6666',
      400: '#ff3333',
      500: '#ff0040', // Hot red
      600: '#e6003a',
      700: '#cc0033',
      800: '#b3002d',
      900: '#990026',
      950: '#66001a'
    },
    info: {
      50: '#e6e6ff',
      100: '#ccccff',
      200: '#9999ff',
      300: '#6666ff',
      400: '#3333ff',
      500: '#0000ff', // Pure blue
      600: '#0000e6',
      700: '#0000cc',
      800: '#0000b3',
      900: '#000099',
      950: '#000066'
    },
    background: {
      primary: '#ffffff', // Pure white
      secondary: '#f8f0ff', // Very light purple tint
      tertiary: '#f0e6ff', // Light purple
      elevated: '#ffffff',
      overlay: 'rgba(255, 255, 255, 0.95)',
      inverse: '#ff00aa'
    },
    foreground: {
      primary: '#1a1a1a', // Almost black for better readability
      secondary: '#4a4a4a', // Dark gray
      tertiary: '#6b6b6b', // Medium gray
      muted: '#8c8c8c', // Muted gray
      inverse: '#ffffff',
      link: '#ff00aa', // Hot pink links
      linkHover: '#00bfff' // Blue hover
    },
    border: {
      primary: 'rgba(255, 0, 170, 0.2)', // Semi-transparent pink
      secondary: 'rgba(0, 191, 255, 0.2)', // Semi-transparent blue
      tertiary: 'rgba(155, 0, 255, 0.15)', // Semi-transparent violet
      focus: 'rgba(0, 191, 255, 0.4)', // Blue focus
      error: 'rgba(255, 0, 64, 0.3)' // Red error
    },
    // Component colors for retro light — 80/90's neon variety (no greens)
    // Use hot pinks, electric violets, cyan/aqua, blues, and coral/amber for separation
    components: {
      // Core OOP
      class:      { bg: 'rgba(255, 77, 191, 0.10)', text: '#a81e77', border: 'rgba(255, 77, 191, 0.38)' },   // hot pink
      interface:  { bg: 'rgba(171, 0, 255, 0.10)', text: '#5e17a9', border: 'rgba(171, 0, 255, 0.38)' },     // electric violet
      enum:       { bg: 'rgba(0, 191, 255, 0.10)', text: '#005b7a', border: 'rgba(0, 191, 255, 0.38)' },     // electric blue
      type:       { bg: 'rgba(255, 51, 102, 0.10)', text: '#a11739', border: 'rgba(255, 51, 102, 0.38)' },   // neon coral

      // Functions & Methods
      function:   { bg: 'rgba(0, 245, 255, 0.10)', text: '#006b73', border: 'rgba(0, 245, 255, 0.38)' },     // aqua
      method:     { bg: 'rgba(255, 153, 0, 0.12)', text: '#7a4a00', border: 'rgba(255, 153, 0, 0.38)' },     // amber/orange
      hook:       { bg: 'rgba(51, 197, 255, 0.10)', text: '#0b5f8c', border: 'rgba(51, 197, 255, 0.38)' },   // sky cyan

      // Data & State — separated without green
      variable:   { bg: 'rgba(255, 128, 0, 0.12)', text: '#7a3e00', border: 'rgba(255, 128, 0, 0.38)' },     // vivid orange
      property:   { bg: 'rgba(34, 211, 238, 0.10)', text: '#0b7482', border: 'rgba(34, 211, 238, 0.38)' },   // cyan
      constant:   { bg: 'rgba(230, 0, 255, 0.10)', text: '#7a007a', border: 'rgba(230, 0, 255, 0.38)' },     // magenta

      // Modules & Packages
      module:     { bg: 'rgba(0, 255, 255, 0.10)', text: '#007a7a', border: 'rgba(0, 255, 255, 0.38)' },     // cyan
      namespace:  { bg: 'rgba(155, 0, 255, 0.10)', text: '#5a0a99', border: 'rgba(155, 0, 255, 0.38)' },     // deep violet
      package:    { bg: 'rgba(255, 122, 89, 0.12)', text: '#8c2a1a', border: 'rgba(255, 122, 89, 0.38)' },   // neon coral/peach

      // Import/Export
      import:     { bg: 'rgba(255, 116, 0, 0.12)', text: '#783207', border: 'rgba(255, 116, 0, 0.38)' },     // dark orange
      export:     { bg: 'rgba(175, 51, 255, 0.10)', text: '#6d00b3', border: 'rgba(175, 51, 255, 0.38)' },   // indigo/violet

      // Files & Structure
      file:       { bg: 'rgba(30, 58, 138, 0.12)', text: '#1f3a8a', border: 'rgba(30, 58, 138, 0.38)' },     // deep blue
      directory:  { bg: 'rgba(255, 0, 255, 0.10)', text: '#7a007a', border: 'rgba(255, 0, 255, 0.38)' },     // magenta

      // Components & UI
      component:  { bg: 'rgba(0, 191, 255, 0.10)', text: '#005b7a', border: 'rgba(0, 191, 255, 0.38)' },     // electric blue

      // Services & Architecture
      service:    { bg: 'rgba(14, 165, 233, 0.10)', text: '#0b6aa0', border: 'rgba(14, 165, 233, 0.38)' },   // sky
      controller: { bg: 'rgba(99, 102, 241, 0.10)', text: '#3b33b4', border: 'rgba(99, 102, 241, 0.38)' },   // indigo
      middleware: { bg: 'rgba(0, 255, 209, 0.10)', text: '#006b62', border: 'rgba(0, 255, 209, 0.38)' },     // aqua-teal

      // Data Models
      model:      { bg: 'rgba(171, 0, 255, 0.10)', text: '#5e17a9', border: 'rgba(171, 0, 255, 0.38)' },
      schema:     { bg: 'rgba(255, 170, 0, 0.12)', text: '#7a4a00', border: 'rgba(255, 170, 0, 0.38)' },     // amber

      // Routes & Tests
      route:      { bg: 'rgba(255, 51, 102, 0.10)', text: '#a11739', border: 'rgba(255, 51, 102, 0.38)' },   // coral red
      test:       { bg: 'rgba(255, 0, 179, 0.10)', text: '#7a0060', border: 'rgba(255, 0, 179, 0.38)' },     // hot pink

      // Config & Utils
      config:     { bg: 'rgba(255, 136, 0, 0.12)', text: '#7a4a00', border: 'rgba(255, 136, 0, 0.38)' },     // orange
      util:       { bg: 'rgba(0, 204, 255, 0.10)', text: '#0b5f8c', border: 'rgba(0, 204, 255, 0.38)' },     // bright cyan
      helper:     { bg: 'rgba(51, 204, 255, 0.10)', text: '#0b5f8c', border: 'rgba(51, 204, 255, 0.38)' }    // sky cyan
    }
  }
};
