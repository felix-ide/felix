import { Theme } from '../types/theme.js';

export const midnight: Theme = {
  id: 'midnight',
  name: 'Midnight',
  description: 'Deep blue and purple dark theme',
  author: 'AIgent Smith',
  version: '1.0.0',
  type: 'dark',
  base: 'dark',
  colors: {
    primary: {
      50: '#f3f1ff',
      100: '#ebe5ff',
      200: '#d9d2ff',
      300: '#bfb0ff',
      400: '#a084ff',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
      950: '#2e1065'
    },
    secondary: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
      950: '#2e1065'
    },
    accent: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49'
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
      primary: '#14131c', // Slightly lighter for better visibility
      secondary: '#1f1b2e',
      tertiary: '#2a2541',
      elevated: '#1f1b2e',
      overlay: 'rgba(0, 0, 0, 0.85)',
      inverse: '#f3f1ff'
    },
  foreground: {
      primary: '#f3f1ff',
      secondary: '#d9d2ff',
      tertiary: '#a78bfa',
      // Softer muted for dark backgrounds (reduced eye strain)
      muted: '#b6a8f5',
      inverse: '#0f0e17',
      link: '#a78bfa',
      linkHover: '#c4b5fd'
    },
    border: {
      primary: 'rgba(37, 33, 59, 0.4)',
      secondary: 'rgba(46, 16, 101, 0.4)',
      tertiary: 'rgba(26, 22, 37, 0.4)',
      focus: '#8b5cf6',
      error: '#ef4444'
    },
    // UI elements (gentler contrasts for dark)
    ui: {
      sidebar: {
        bg: 'rgba(26, 22, 37, 0.95)',
        border: 'rgba(46, 16, 101, 0.35)',
        hover: 'rgba(46, 16, 101, 0.25)',
        active: 'rgba(139, 92, 246, 0.18)',
        text: '#d9d2ff',
        icon: '#a78bfa'
      },
      navbar: {
        bg: 'rgba(26, 22, 37, 0.98)',
        border: 'rgba(46, 16, 101, 0.3)',
        text: '#f3f1ff',
        icon: '#d9d2ff'
      },
      button: {
        primary: { bg: '#8b5cf6', text: '#ffffff', border: 'transparent', hover: '#7c3aed' },
        secondary: { bg: 'rgba(46, 16, 101, 0.35)', text: '#d9d2ff', border: 'rgba(46, 16, 101, 0.5)', hover: 'rgba(46, 16, 101, 0.5)' },
        ghost: { bg: 'transparent', text: '#a78bfa', border: 'transparent', hover: 'rgba(46, 16, 101, 0.25)' },
        danger: { bg: '#dc2626', text: '#ffffff', border: 'transparent', hover: '#b91c1c' }
      },
      card: {
        bg: 'rgba(26, 22, 37, 0.55)',
        border: 'rgba(46, 16, 101, 0.35)',
        header: 'rgba(37, 33, 59, 0.55)',
        shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.35)'
      },
      input: {
        bg: 'rgba(15, 14, 23, 0.6)',
        border: 'rgba(46, 16, 101, 0.35)',
        focus: '#8b5cf6',
        placeholder: '#a78bfa',
        text: '#f3f1ff'
      },
      badge: {
        default: { bg: 'rgba(139, 92, 246, 0.08)', text: '#c4b5fd', border: 'rgba(139, 92, 246, 0.25)' },
        success: { bg: 'rgba(34, 197, 94, 0.12)', text: '#86efac', border: 'rgba(34, 197, 94, 0.25)' },
        warning: { bg: 'rgba(245, 158, 11, 0.12)', text: '#facc15', border: 'rgba(245, 158, 11, 0.25)' },
        danger: { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.25)' },
        info: { bg: 'rgba(14, 165, 233, 0.12)', text: '#67e8f9', border: 'rgba(14, 165, 233, 0.25)' }
      },
      tooltip: {
        bg: 'rgba(15, 14, 23, 0.95)',
        text: '#f3f1ff',
        border: 'rgba(46, 16, 101, 0.35)'
      },
      modal: {
        bg: '#1a1625',
        overlay: 'rgba(0, 0, 0, 0.75)',
        border: 'rgba(46, 16, 101, 0.35)',
        header: 'rgba(37, 33, 59, 0.55)'
      },
      table: {
        header: 'rgba(37, 33, 59, 0.55)',
        row: 'transparent',
        rowHover: 'rgba(46, 16, 101, 0.25)',
        border: 'rgba(46, 16, 101, 0.3)'
      }
    },

    // Component colors for Midnight — widen palette beyond violets (cyan/amber/rose/lime/teal)
    components: {
      class:      { bg: 'rgba(96, 165, 250, 0.14)',  text: '#93c5fd', border: 'rgba(96, 165, 250, 0.4)' },
      interface:  { bg: 'rgba(129, 140, 248, 0.14)', text: '#a5b4fc', border: 'rgba(129, 140, 248, 0.4)' },
      enum:       { bg: 'rgba(192, 132, 252, 0.14)', text: '#d8b4fe', border: 'rgba(192, 132, 252, 0.4)' },
      type:       { bg: 'rgba(244, 63, 94, 0.14)',  text: '#fb7185', border: 'rgba(244, 63, 94, 0.4)' },

      function:   { bg: 'rgba(14, 165, 233, 0.14)', text: '#67e8f9', border: 'rgba(14, 165, 233, 0.4)' },
      method:     { bg: 'rgba(20, 184, 166, 0.14)', text: '#5eead4', border: 'rgba(20, 184, 166, 0.4)' },
      hook:       { bg: 'rgba(163, 230, 53, 0.14)', text: '#bef264', border: 'rgba(163, 230, 53, 0.4)' },

      variable:   { bg: 'rgba(234, 179, 8, 0.14)', text: '#fde68a', border: 'rgba(234, 179, 8, 0.4)' },
      property:   { bg: 'rgba(236, 72, 153, 0.14)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.4)' },
      constant:   { bg: 'rgba(99, 102, 241, 0.14)', text: '#c7d2fe', border: 'rgba(99, 102, 241, 0.4)' },

      module:     { bg: 'rgba(56, 189, 248, 0.14)', text: '#7dd3fc', border: 'rgba(56, 189, 248, 0.4)' },
      namespace:  { bg: 'rgba(6, 182, 212, 0.14)',  text: '#67e8f9', border: 'rgba(6, 182, 212, 0.4)' },
      package:    { bg: 'rgba(8, 145, 178, 0.14)',  text: '#22d3ee', border: 'rgba(8, 145, 178, 0.4)' },

      import:     { bg: 'rgba(234, 88, 12, 0.14)',  text: '#fdba74', border: 'rgba(234, 88, 12, 0.4)' },
      export:     { bg: 'rgba(139, 92, 246, 0.14)',  text: '#c4b5fd', border: 'rgba(139, 92, 246, 0.4)' },
      file:       { bg: 'rgba(148, 163, 184, 0.14)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.4)' },
      directory:  { bg: 'rgba(71, 85, 105, 0.14)',   text: '#e2e8f0', border: 'rgba(71, 85, 105, 0.4)' },
      component:  { bg: 'rgba(30, 64, 175, 0.14)',   text: '#93c5fd', border: 'rgba(30, 64, 175, 0.4)' },

      service:    { bg: 'rgba(2, 132, 199, 0.14)',   text: '#7dd3fc', border: 'rgba(2, 132, 199, 0.4)' },
      controller: { bg: 'rgba(3, 105, 161, 0.14)',   text: '#7dd3fc', border: 'rgba(3, 105, 161, 0.4)' },
      model:      { bg: 'rgba(168, 85, 247, 0.14)',  text: '#c084fc', border: 'rgba(168, 85, 247, 0.4)' },
      schema:     { bg: 'rgba(147, 51, 234, 0.14)',  text: '#a78bfa', border: 'rgba(147, 51, 234, 0.4)' },
      route:      { bg: 'rgba(244, 63, 94, 0.14)',   text: '#fb7185', border: 'rgba(244, 63, 94, 0.4)' },
      middleware: { bg: 'rgba(99, 102, 241, 0.14)',  text: '#c7d2fe', border: 'rgba(99, 102, 241, 0.4)' },
      test:       { bg: 'rgba(34, 197, 94, 0.14)',   text: '#86efac', border: 'rgba(34, 197, 94, 0.4)' },
      config:     { bg: 'rgba(234, 179, 8, 0.14)',   text: '#fde68a', border: 'rgba(234, 179, 8, 0.4)' },
      util:       { bg: 'rgba(14, 165, 233, 0.14)',  text: '#7dd3fc', border: 'rgba(14, 165, 233, 0.4)' },
      helper:     { bg: 'rgba(20, 184, 166, 0.14)',  text: '#5eead4', border: 'rgba(20, 184, 166, 0.4)' }
    },

    // Entity colors for tasks, notes, rules, workflows, relationships
    entities: {
      task: {
        // Status
        todo: { bg: 'rgba(139, 92, 246, 0.12)', text: '#c4b5fd', border: 'rgba(139, 92, 246, 0.35)', icon: '#a78bfa' },
        in_progress: { bg: 'rgba(14, 165, 233, 0.14)', text: '#67e8f9', border: 'rgba(14, 165, 233, 0.35)', icon: '#0ea5e9' },
        blocked: { bg: 'rgba(239, 68, 68, 0.14)', text: '#f87171', border: 'rgba(239, 68, 68, 0.35)', icon: '#ef4444' },
        done: { bg: 'rgba(34, 197, 94, 0.14)', text: '#86efac', border: 'rgba(34, 197, 94, 0.35)', icon: '#22c55e' },
        cancelled: { bg: 'rgba(37, 33, 59, 0.35)', text: '#d9d2ff', border: 'rgba(37, 33, 59, 0.45)', icon: '#a78bfa' },
        // Priority
        priority_low: { bg: 'rgba(34, 197, 94, 0.12)', text: '#86efac', border: 'rgba(34, 197, 94, 0.3)', icon: '#22c55e' },
        priority_medium: { bg: 'rgba(245, 158, 11, 0.12)', text: '#facc15', border: 'rgba(245, 158, 11, 0.3)', icon: '#f59e0b' },
        priority_high: { bg: 'rgba(251, 146, 60, 0.14)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.35)', icon: '#f97316' },
        priority_critical: { bg: 'rgba(239, 68, 68, 0.16)', text: '#f87171', border: 'rgba(239, 68, 68, 0.4)', icon: '#ef4444' },
        // Types
        type_task: { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.35)', icon: '#8b5cf6' },
        type_bug: { bg: 'rgba(236, 72, 153, 0.14)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.35)', icon: '#ec4899' },
        type_feature: { bg: 'rgba(34, 197, 94, 0.12)', text: '#86efac', border: 'rgba(34, 197, 94, 0.35)', icon: '#22c55e' },
        type_epic: { bg: 'rgba(168, 85, 247, 0.12)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.35)', icon: '#a855f7' },
        type_story: { bg: 'rgba(14, 165, 233, 0.12)', text: '#67e8f9', border: 'rgba(14, 165, 233, 0.35)', icon: '#0ea5e9' },
        type_spike: { bg: 'rgba(251, 191, 36, 0.12)', text: '#fde68a', border: 'rgba(251, 191, 36, 0.35)', icon: '#f59e0b' },
      },
      note: {
        default: { bg: 'rgba(139, 92, 246, 0.10)', text: '#c4b5fd', border: 'rgba(139, 92, 246, 0.3)', icon: '#a78bfa' },
        warning: { bg: 'rgba(245, 158, 11, 0.12)', text: '#facc15', border: 'rgba(245, 158, 11, 0.3)', icon: '#d97706' },
        documentation: { bg: 'rgba(14, 165, 233, 0.12)', text: '#67e8f9', border: 'rgba(14, 165, 233, 0.3)', icon: '#0ea5e9' },
        excalidraw: { bg: 'rgba(236, 72, 153, 0.12)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)', icon: '#ec4899' },
        mermaid: { bg: 'rgba(56, 189, 248, 0.12)', text: '#7dd3fc', border: 'rgba(56, 189, 248, 0.3)', icon: '#38bdf8' }
      },
      rule: {
        pattern: { bg: 'rgba(139, 92, 246, 0.12)', text: '#c4b5fd', border: 'rgba(139, 92, 246, 0.3)', icon: '#8b5cf6' },
        constraint: { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)', icon: '#ef4444' },
        semantic: { bg: 'rgba(34, 197, 94, 0.12)', text: '#86efac', border: 'rgba(34, 197, 94, 0.3)', icon: '#22c55e' },
        automation: { bg: 'rgba(168, 85, 247, 0.12)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)', icon: '#a855f7' }
      },
      workflow: {
        active: { bg: 'rgba(34, 197, 94, 0.12)', text: '#86efac', border: 'rgba(34, 197, 94, 0.3)', icon: '#22c55e' },
        inactive: { bg: 'rgba(37, 33, 59, 0.35)', text: '#d9d2ff', border: 'rgba(37, 33, 59, 0.45)', icon: '#a78bfa' },
        draft: { bg: 'rgba(251, 191, 36, 0.12)', text: '#fde68a', border: 'rgba(251, 191, 36, 0.3)', icon: '#f59e0b' }
      },
      relationship: {
        calls: { bg: 'rgba(34, 197, 94, 0.12)', text: '#86efac', border: 'rgba(34, 197, 94, 0.3)', line: '#22c55e' },
        imports: { bg: 'rgba(168, 85, 247, 0.12)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)', line: '#a855f7' },
        exports: { bg: 'rgba(56, 189, 248, 0.12)', text: '#7dd3fc', border: 'rgba(56, 189, 248, 0.3)', line: '#38bdf8' },
        extends: { bg: 'rgba(251, 191, 36, 0.12)', text: '#fde68a', border: 'rgba(251, 191, 36, 0.3)', line: '#f59e0b' },
        implements: { bg: 'rgba(14, 165, 233, 0.12)', text: '#67e8f9', border: 'rgba(14, 165, 233, 0.3)', line: '#0ea5e9' },
        uses: { bg: 'rgba(236, 72, 153, 0.12)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)', line: '#db2777' },
        references: { bg: 'rgba(139, 92, 246, 0.10)', text: '#c4b5fd', border: 'rgba(139, 92, 246, 0.25)', line: '#a78bfa' },
        contains: { bg: 'rgba(20, 184, 166, 0.12)', text: '#5eead4', border: 'rgba(20, 184, 166, 0.3)', line: '#14b8a6' },
        depends: { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)', line: '#ef4444' },
        composed: { bg: 'rgba(99, 102, 241, 0.12)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.3)', line: '#6366f1' }
      },
      spec_state: {
        draft: { bg: 'rgba(37, 33, 59, 0.35)', text: '#d9d2ff', border: 'rgba(37, 33, 59, 0.45)', icon: '#a78bfa' },
        spec_in_progress: { bg: 'rgba(251, 191, 36, 0.12)', text: '#fde68a', border: 'rgba(251, 191, 36, 0.3)', icon: '#f59e0b' },
        spec_ready: { bg: 'rgba(34, 197, 94, 0.12)', text: '#86efac', border: 'rgba(34, 197, 94, 0.3)', icon: '#22c55e' }
      }
    }
  }
};
