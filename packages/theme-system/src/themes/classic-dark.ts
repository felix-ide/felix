import { Theme } from '../types/theme.js';

export const classicDark: Theme = {
  id: 'classic-dark',
  name: 'Classic Dark',
  description: 'Modern dark theme for reduced eye strain',
  author: 'AIgent Smith',
  version: '1.0.0',
  type: 'dark',
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    },
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617'
    },
    // Accent follows primary for cohesive classic blue dark theme
    accent: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
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
      primary: '#111827', // Slightly lighter, more neutral
      secondary: '#1f2937', // More visible secondary
      tertiary: '#374151', // Better contrast tertiary
      elevated: '#1f2937',
      overlay: 'rgba(0, 0, 0, 0.8)',
      inverse: '#f8fafc'
    },
    foreground: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      tertiary: '#94a3b8',
      muted: '#64748b',
      inverse: '#0f172a',
      link: '#60a5fa',
      linkHover: '#93c5fd'
    },
    border: {
      primary: 'rgba(51, 65, 85, 0.5)',
      secondary: 'rgba(71, 85, 105, 0.5)',
      tertiary: 'rgba(30, 41, 59, 0.5)',
      focus: '#3b82f6',
      error: '#ef4444'
    },
    // UI Elements - comprehensive theming
    ui: {
      sidebar: {
        bg: 'rgba(15, 23, 42, 0.95)',
        border: 'rgba(51, 65, 85, 0.5)',
        hover: 'rgba(30, 41, 59, 1)',
        active: 'rgba(37, 99, 235, 0.2)',
        text: '#cbd5e1',
        icon: '#94a3b8'
      },
      navbar: {
        bg: 'rgba(15, 23, 42, 0.98)',
        border: 'rgba(51, 65, 85, 0.3)',
        text: '#f8fafc',
        icon: '#cbd5e1'
      },
      button: {
        primary: { bg: '#3b82f6', text: '#ffffff', border: 'transparent', hover: '#2563eb' },
        secondary: { bg: 'rgba(51, 65, 85, 0.3)', text: '#cbd5e1', border: 'rgba(71, 85, 105, 0.5)', hover: 'rgba(71, 85, 105, 0.5)' },
        ghost: { bg: 'transparent', text: '#94a3b8', border: 'transparent', hover: 'rgba(51, 65, 85, 0.3)' },
        danger: { bg: '#dc2626', text: '#ffffff', border: 'transparent', hover: '#b91c1c' }
      },
      card: {
        bg: 'rgba(31, 41, 55, 0.6)', // Slightly brighter card background
        border: 'rgba(55, 65, 81, 0.5)',
        header: 'rgba(30, 58, 138, 0.25)', // Softer header
        shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.35)'
      },
      input: {
        bg: 'rgba(15, 23, 42, 0.5)',
        border: 'rgba(51, 65, 85, 0.5)',
        focus: '#3b82f6',
        placeholder: '#64748b',
        text: '#f8fafc'
      },
      badge: {
        default: { bg: 'rgba(59, 130, 246, 0.18)', text: '#93c5fd', border: 'rgba(59, 130, 246, 0.35)' },
        success: { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.4)' },
        warning: { bg: 'rgba(251, 146, 60, 0.22)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.45)' },
        danger: { bg: 'rgba(239, 68, 68, 0.22)', text: '#f87171', border: 'rgba(239, 68, 68, 0.45)' },
        info: { bg: 'rgba(59, 130, 246, 0.22)', text: '#93c5fd', border: 'rgba(59, 130, 246, 0.45)' }
      },
      tooltip: {
        bg: 'rgba(15, 23, 42, 0.95)',
        text: '#f8fafc',
        border: 'rgba(51, 65, 85, 0.5)'
      },
      modal: {
        bg: '#1e293b',
        overlay: 'rgba(0, 0, 0, 0.7)',
        border: 'rgba(51, 65, 85, 0.5)',
        header: 'rgba(15, 23, 42, 0.5)'
      },
      table: {
        header: 'rgba(30, 41, 59, 0.5)',
        row: 'transparent',
        rowHover: 'rgba(51, 65, 85, 0.2)',
        border: 'rgba(51, 65, 85, 0.3)'
      }
    },
    // Entity colors for tasks, notes, rules, workflows
    entities: {
      task: {
        todo: { bg: 'rgba(100, 116, 139, 0.1)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)', icon: '#64748b' },
        in_progress: { bg: 'rgba(59, 130, 246, 0.1)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)', icon: '#3b82f6' },
        blocked: { bg: 'rgba(239, 68, 68, 0.1)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)', icon: '#ef4444' },
        done: { bg: 'rgba(34, 197, 94, 0.1)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)', icon: '#22c55e' },
        cancelled: { bg: 'rgba(75, 85, 99, 0.1)', text: '#6b7280', border: 'rgba(75, 85, 99, 0.3)', icon: '#4b5563' },
        // Task priorities
        priority_low: { bg: 'rgba(34, 197, 94, 0.1)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)', icon: '#22c55e' },
        priority_medium: { bg: 'rgba(250, 204, 21, 0.1)', text: '#facc15', border: 'rgba(250, 204, 21, 0.3)', icon: '#eab308' },
        priority_high: { bg: 'rgba(251, 146, 60, 0.1)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.3)', icon: '#f97316' },
        priority_critical: { bg: 'rgba(239, 68, 68, 0.1)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)', icon: '#ef4444' },
        // Task types
        type_task: { bg: 'rgba(59, 130, 246, 0.1)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)', icon: '#3b82f6' },
        type_bug: { bg: 'rgba(239, 68, 68, 0.1)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)', icon: '#ef4444' },
        // Avoid green for classic themes — use indigo for feature work
        type_feature: { bg: 'rgba(129, 140, 248, 0.15)', text: '#a5b4fc', border: 'rgba(129, 140, 248, 0.4)', icon: '#818cf8' },
        type_epic: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a78bfa', border: 'rgba(168, 85, 247, 0.3)', icon: '#a855f7' },
        type_story: { bg: 'rgba(14, 165, 233, 0.1)', text: '#38bdf8', border: 'rgba(14, 165, 233, 0.3)', icon: '#0ea5e9' },
        type_spike: { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)', icon: '#f59e0b' }
      },
      note: {
        default: { bg: 'rgba(100, 116, 139, 0.1)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)', icon: '#64748b' },
        warning: { bg: 'rgba(251, 146, 60, 0.1)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.3)', icon: '#f97316' },
        documentation: { bg: 'rgba(59, 130, 246, 0.1)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)', icon: '#3b82f6' },
        excalidraw: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a78bfa', border: 'rgba(168, 85, 247, 0.3)', icon: '#a855f7' },
        mermaid: { bg: 'rgba(14, 165, 233, 0.1)', text: '#38bdf8', border: 'rgba(14, 165, 233, 0.3)', icon: '#0ea5e9' }
      },
      rule: {
        pattern: { bg: 'rgba(59, 130, 246, 0.1)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)', icon: '#3b82f6' },
        constraint: { bg: 'rgba(239, 68, 68, 0.1)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)', icon: '#ef4444' },
        semantic: { bg: 'rgba(34, 197, 94, 0.1)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)', icon: '#22c55e' },
        automation: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a78bfa', border: 'rgba(168, 85, 247, 0.3)', icon: '#a855f7' }
      },
      workflow: {
        active: { bg: 'rgba(34, 197, 94, 0.1)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)', icon: '#22c55e' },
        inactive: { bg: 'rgba(100, 116, 139, 0.1)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)', icon: '#64748b' },
        draft: { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)', icon: '#f59e0b' }
      },
      relationship: {
        calls: { bg: 'rgba(59, 130, 246, 0.1)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)', line: '#3b82f6' },
        imports: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a78bfa', border: 'rgba(168, 85, 247, 0.3)', line: '#a855f7' },
        exports: { bg: 'rgba(34, 197, 94, 0.1)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)', line: '#22c55e' },
        extends: { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)', line: '#f59e0b' },
        implements: { bg: 'rgba(14, 165, 233, 0.1)', text: '#38bdf8', border: 'rgba(14, 165, 233, 0.3)', line: '#0ea5e9' },
        uses: { bg: 'rgba(236, 72, 153, 0.1)', text: '#ec4899', border: 'rgba(236, 72, 153, 0.3)', line: '#db2777' },
        references: { bg: 'rgba(100, 116, 139, 0.1)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)', line: '#64748b' },
        contains: { bg: 'rgba(20, 184, 166, 0.1)', text: '#14b8a6', border: 'rgba(20, 184, 166, 0.3)', line: '#0d9488' },
        depends: { bg: 'rgba(239, 68, 68, 0.1)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)', line: '#ef4444' },
        composed: { bg: 'rgba(99, 102, 241, 0.1)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.3)', line: '#6366f1' }
      },
      spec_state: {
        draft: { bg: 'rgba(100, 116, 139, 0.1)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)', icon: '#64748b' },
        spec_in_progress: { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)', icon: '#f59e0b' },
        spec_ready: { bg: 'rgba(34, 197, 94, 0.1)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)', icon: '#22c55e' }
      }
    },
    // Component colors for classic dark — broaden separation (no greens)
    components: {
      class:      { bg: 'rgba(59, 130, 246, 0.16)',  text: '#93c5fd', border: 'rgba(59, 130, 246, 0.45)' },
      interface:  { bg: 'rgba(99, 102, 241, 0.16)',  text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.45)' },
      enum:       { bg: 'rgba(147, 51, 234, 0.16)',  text: '#d8b4fe', border: 'rgba(147, 51, 234, 0.45)' },
      type:       { bg: 'rgba(244, 63, 94, 0.16)',   text: '#fb7185', border: 'rgba(244, 63, 94, 0.45)' },

      function:   { bg: 'rgba(14, 165, 233, 0.16)',  text: '#67e8f9', border: 'rgba(14, 165, 233, 0.45)' },
      method:     { bg: 'rgba(249, 115, 22, 0.18)',  text: '#fdba74', border: 'rgba(249, 115, 22, 0.50)' },
      hook:       { bg: 'rgba(245, 158, 11, 0.18)',  text: '#facc15', border: 'rgba(245, 158, 11, 0.50)' },

      variable:   { bg: 'rgba(8, 145, 178, 0.16)',   text: '#7dd3fc', border: 'rgba(8, 145, 178, 0.45)' }, // Cyan
      property:   { bg: 'rgba(236, 72, 153, 0.18)',  text: '#f472b6', border: 'rgba(236, 72, 153, 0.50)' }, // Pink
      constant:   { bg: 'rgba(217, 70, 239, 0.16)',  text: '#e879f9', border: 'rgba(217, 70, 239, 0.45)' },

      module:     { bg: 'rgba(6, 182, 212, 0.16)',   text: '#7dd3fc', border: 'rgba(6, 182, 212, 0.45)' },
      namespace:  { bg: 'rgba(2, 132, 199, 0.16)',   text: '#93c5fd', border: 'rgba(2, 132, 199, 0.45)' },
      package:    { bg: 'rgba(2, 132, 199, 0.18)',   text: '#bae6fd', border: 'rgba(2, 132, 199, 0.50)' },

      import:     { bg: 'rgba(251, 146, 60, 0.18)',  text: '#fdba74', border: 'rgba(251, 146, 60, 0.50)' },
      export:     { bg: 'rgba(234, 179, 8, 0.18)',   text: '#fde68a', border: 'rgba(234, 179, 8, 0.50)' },

      file:       { bg: 'rgba(148, 163, 184, 0.16)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.45)' },
      directory:  { bg: 'rgba(100, 116, 139, 0.16)', text: '#e2e8f0', border: 'rgba(100, 116, 139, 0.45)' },

      component:  { bg: 'rgba(219, 39, 119, 0.16)',  text: '#f472b6', border: 'rgba(219, 39, 119, 0.45)' },

      service:    { bg: 'rgba(56, 189, 248, 0.16)',  text: '#93c5fd', border: 'rgba(56, 189, 248, 0.45)' },
      controller: { bg: 'rgba(59, 130, 246, 0.16)',  text: '#93c5fd', border: 'rgba(59, 130, 246, 0.45)' },
      middleware: { bg: 'rgba(14, 165, 233, 0.16)',  text: '#7dd3fc', border: 'rgba(14, 165, 233, 0.45)' },

      model:      { bg: 'rgba(99, 102, 241, 0.16)',  text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.45)' },
      schema:     { bg: 'rgba(79, 70, 229, 0.16)',   text: '#a78bfa', border: 'rgba(79, 70, 229, 0.45)' },

      route:      { bg: 'rgba(239, 68, 68, 0.18)',   text: '#f87171', border: 'rgba(239, 68, 68, 0.50)' },
      test:       { bg: 'rgba(20, 184, 166, 0.16)',  text: '#5eead4', border: 'rgba(20, 184, 166, 0.45)' },

      config:     { bg: 'rgba(250, 204, 21, 0.18)',  text: '#fde68a', border: 'rgba(250, 204, 21, 0.50)' },
      util:       { bg: 'rgba(253, 224, 71, 0.18)',  text: '#fef08a', border: 'rgba(253, 224, 71, 0.50)' },
      helper:     { bg: 'rgba(254, 240, 138, 0.18)', text: '#fef9c3', border: 'rgba(254, 240, 138, 0.50)' }
    }
  }
};
