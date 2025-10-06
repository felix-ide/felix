import { Theme } from '../types/theme.js';

export const classicLight: Theme = {
  id: 'classic-light',
  name: 'Classic Light',
  description: 'Clean light theme for daytime work',
  author: 'AIgent Smith',
  version: '1.0.0',
  type: 'light',
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
    // Accent follows primary for a classic blue look
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
      primary: '#fafbfc', // Slight hint of color
      secondary: '#f3f4f6', // More visible secondary
      tertiary: '#e5e7eb', // Better contrast tertiary
      elevated: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.5)',
      inverse: '#0f172a'
    },
    foreground: {
      primary: '#0f172a',
      secondary: '#334155',
      tertiary: '#64748b',
      muted: '#94a3b8',
      inverse: '#f8fafc',
      link: '#2563eb',
      linkHover: '#1d4ed8'
    },
    border: {
      primary: 'rgba(226, 232, 240, 1)',
      secondary: 'rgba(203, 213, 225, 1)',
      tertiary: 'rgba(241, 245, 249, 1)',
      focus: '#3b82f6',
      error: '#ef4444'
    },
    // UI Elements - comprehensive theming
    ui: {
      sidebar: {
        bg: 'rgba(248, 250, 252, 0.95)',
        border: 'rgba(226, 232, 240, 1)',
        hover: 'rgba(241, 245, 249, 1)',
        active: 'rgba(37, 99, 235, 0.1)',
        text: '#334155',
        icon: '#64748b'
      },
      navbar: {
        bg: 'rgba(255, 255, 255, 0.98)',
        border: 'rgba(219, 234, 254, 0.8)', // blue-100 tint
        text: '#0f172a',
        icon: '#334155'
      },
      button: {
        primary: { bg: '#3b82f6', text: '#ffffff', border: 'transparent', hover: '#2563eb' },
        secondary: { bg: 'rgba(241, 245, 249, 1)', text: '#334155', border: 'rgba(226, 232, 240, 1)', hover: 'rgba(226, 232, 240, 1)' },
        ghost: { bg: 'transparent', text: '#64748b', border: 'transparent', hover: 'rgba(241, 245, 249, 0.5)' },
        danger: { bg: '#dc2626', text: '#ffffff', border: 'transparent', hover: '#b91c1c' }
      },
      card: {
        bg: '#ffffff',
        border: 'rgba(209, 213, 219, 1)', // Slightly stronger border
        header: '#f0f9ff', // Visible blue tint header
        shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      },
      input: {
        bg: '#ffffff',
        border: 'rgba(226, 232, 240, 1)',
        focus: '#3b82f6',
        placeholder: '#94a3b8',
        text: '#0f172a'
      },
      badge: {
        default: { bg: 'rgba(59, 130, 246, 0.08)', text: '#1d4ed8', border: 'rgba(59, 130, 246, 0.25)' },
        success: { bg: 'rgba(34, 197, 94, 0.1)', text: '#16a34a', border: 'rgba(34, 197, 94, 0.3)' },
        warning: { bg: 'rgba(251, 146, 60, 0.12)', text: '#b45309', border: 'rgba(251, 146, 60, 0.3)' },
        danger: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.3)' },
        info: { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.3)' }
      },
      tooltip: {
        bg: 'rgba(15, 23, 42, 0.9)',
        text: '#f8fafc',
        border: 'rgba(30, 41, 59, 1)'
      },
      modal: {
        bg: '#ffffff',
        overlay: 'rgba(0, 0, 0, 0.3)',
        border: 'rgba(226, 232, 240, 1)',
        header: 'rgba(248, 250, 252, 1)'
      },
      table: {
        header: 'rgba(248, 250, 252, 1)',
        row: '#ffffff',
        rowHover: 'rgba(248, 250, 252, 0.5)',
        border: 'rgba(226, 232, 240, 1)'
      }
    },
    // Entity colors for tasks, notes, rules, workflows
    entities: {
      task: {
        todo: { bg: 'rgba(100, 116, 139, 0.05)', text: '#475569', border: 'rgba(100, 116, 139, 0.2)', icon: '#64748b' },
        in_progress: { bg: 'rgba(59, 130, 246, 0.05)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.2)', icon: '#3b82f6' },
        blocked: { bg: 'rgba(239, 68, 68, 0.05)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.2)', icon: '#ef4444' },
        done: { bg: 'rgba(34, 197, 94, 0.05)', text: '#16a34a', border: 'rgba(34, 197, 94, 0.2)', icon: '#22c55e' },
        cancelled: { bg: 'rgba(75, 85, 99, 0.05)', text: '#4b5563', border: 'rgba(75, 85, 99, 0.2)', icon: '#6b7280' },
        // Task priorities
        priority_low: { bg: 'rgba(34, 197, 94, 0.05)', text: '#16a34a', border: 'rgba(34, 197, 94, 0.2)', icon: '#22c55e' },
        priority_medium: { bg: 'rgba(250, 204, 21, 0.05)', text: '#ca8a04', border: 'rgba(250, 204, 21, 0.2)', icon: '#eab308' },
        priority_high: { bg: 'rgba(251, 146, 60, 0.05)', text: '#ea580c', border: 'rgba(251, 146, 60, 0.2)', icon: '#f97316' },
        priority_critical: { bg: 'rgba(239, 68, 68, 0.05)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.2)', icon: '#ef4444' },
        // Task types
        type_task: { bg: 'rgba(59, 130, 246, 0.05)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.2)', icon: '#3b82f6' },
        type_bug: { bg: 'rgba(239, 68, 68, 0.05)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.2)', icon: '#ef4444' },
        // Avoid green for classic themes — use indigo for feature work
        type_feature: { bg: 'rgba(129, 140, 248, 0.08)', text: '#4f46e5', border: 'rgba(129, 140, 248, 0.25)', icon: '#6366f1' },
        type_epic: { bg: 'rgba(168, 85, 247, 0.05)', text: '#9333ea', border: 'rgba(168, 85, 247, 0.2)', icon: '#a855f7' },
        type_story: { bg: 'rgba(14, 165, 233, 0.05)', text: '#0284c7', border: 'rgba(14, 165, 233, 0.2)', icon: '#0ea5e9' },
        type_spike: { bg: 'rgba(251, 191, 36, 0.05)', text: '#d97706', border: 'rgba(251, 191, 36, 0.2)', icon: '#f59e0b' }
      },
      note: {
        default: { bg: 'rgba(100, 116, 139, 0.05)', text: '#475569', border: 'rgba(100, 116, 139, 0.2)', icon: '#64748b' },
        warning: { bg: 'rgba(251, 146, 60, 0.05)', text: '#ea580c', border: 'rgba(251, 146, 60, 0.2)', icon: '#f97316' },
        documentation: { bg: 'rgba(59, 130, 246, 0.05)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.2)', icon: '#3b82f6' },
        excalidraw: { bg: 'rgba(168, 85, 247, 0.05)', text: '#9333ea', border: 'rgba(168, 85, 247, 0.2)', icon: '#a855f7' },
        mermaid: { bg: 'rgba(14, 165, 233, 0.05)', text: '#0284c7', border: 'rgba(14, 165, 233, 0.2)', icon: '#0ea5e9' }
      },
      rule: {
        pattern: { bg: 'rgba(59, 130, 246, 0.05)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.2)', icon: '#3b82f6' },
        constraint: { bg: 'rgba(239, 68, 68, 0.05)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.2)', icon: '#ef4444' },
        semantic: { bg: 'rgba(34, 197, 94, 0.05)', text: '#16a34a', border: 'rgba(34, 197, 94, 0.2)', icon: '#22c55e' },
        automation: { bg: 'rgba(168, 85, 247, 0.05)', text: '#9333ea', border: 'rgba(168, 85, 247, 0.2)', icon: '#a855f7' }
      },
      workflow: {
        active: { bg: 'rgba(34, 197, 94, 0.05)', text: '#16a34a', border: 'rgba(34, 197, 94, 0.2)', icon: '#22c55e' },
        inactive: { bg: 'rgba(100, 116, 139, 0.05)', text: '#475569', border: 'rgba(100, 116, 139, 0.2)', icon: '#64748b' },
        draft: { bg: 'rgba(251, 191, 36, 0.05)', text: '#d97706', border: 'rgba(251, 191, 36, 0.2)', icon: '#f59e0b' }
      },
      relationship: {
        calls: { bg: 'rgba(59, 130, 246, 0.05)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.2)', line: '#3b82f6' },
        imports: { bg: 'rgba(168, 85, 247, 0.05)', text: '#9333ea', border: 'rgba(168, 85, 247, 0.2)', line: '#a855f7' },
        exports: { bg: 'rgba(34, 197, 94, 0.05)', text: '#16a34a', border: 'rgba(34, 197, 94, 0.2)', line: '#22c55e' },
        extends: { bg: 'rgba(251, 191, 36, 0.05)', text: '#d97706', border: 'rgba(251, 191, 36, 0.2)', line: '#f59e0b' },
        implements: { bg: 'rgba(14, 165, 233, 0.05)', text: '#0284c7', border: 'rgba(14, 165, 233, 0.2)', line: '#0ea5e9' },
        uses: { bg: 'rgba(236, 72, 153, 0.05)', text: '#be185d', border: 'rgba(236, 72, 153, 0.2)', line: '#db2777' },
        references: { bg: 'rgba(100, 116, 139, 0.05)', text: '#475569', border: 'rgba(100, 116, 139, 0.2)', line: '#64748b' },
        contains: { bg: 'rgba(20, 184, 166, 0.05)', text: '#0f766e', border: 'rgba(20, 184, 166, 0.2)', line: '#0d9488' },
        depends: { bg: 'rgba(239, 68, 68, 0.05)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.2)', line: '#ef4444' },
        composed: { bg: 'rgba(99, 102, 241, 0.05)', text: '#4f46e5', border: 'rgba(99, 102, 241, 0.2)', line: '#6366f1' }
      },
      spec_state: {
        draft: { bg: 'rgba(100, 116, 139, 0.05)', text: '#475569', border: 'rgba(100, 116, 139, 0.2)', icon: '#64748b' },
        spec_in_progress: { bg: 'rgba(251, 191, 36, 0.05)', text: '#d97706', border: 'rgba(251, 191, 36, 0.2)', icon: '#f59e0b' },
        spec_ready: { bg: 'rgba(34, 197, 94, 0.05)', text: '#16a34a', border: 'rgba(34, 197, 94, 0.2)', icon: '#22c55e' }
      }
    },
    // Component colors for classic light — increase separation across families (avoid greens)
    components: {
      class:      { bg: 'rgba(59, 130, 246, 0.10)',  text: '#1d4ed8', border: 'rgba(59, 130, 246, 0.30)' }, // Blue
      interface:  { bg: 'rgba(99, 102, 241, 0.10)',  text: '#4338ca', border: 'rgba(99, 102, 241, 0.30)' }, // Indigo
      enum:       { bg: 'rgba(147, 51, 234, 0.10)',  text: '#7e22ce', border: 'rgba(147, 51, 234, 0.30)' }, // Purple
      type:       { bg: 'rgba(244, 63, 94, 0.10)',   text: '#be123c', border: 'rgba(244, 63, 94, 0.30)' }, // Rose

      function:   { bg: 'rgba(14, 165, 233, 0.10)',  text: '#0284c7', border: 'rgba(14, 165, 233, 0.30)' }, // Sky
      method:     { bg: 'rgba(249, 115, 22, 0.12)',  text: '#c2410c', border: 'rgba(249, 115, 22, 0.35)' }, // Orange
      hook:       { bg: 'rgba(245, 158, 11, 0.12)',  text: '#b45309', border: 'rgba(245, 158, 11, 0.35)' }, // Amber

      variable:   { bg: 'rgba(8, 145, 178, 0.10)',   text: '#0c4a6e', border: 'rgba(8, 145, 178, 0.30)' }, // Cyan
      property:   { bg: 'rgba(236, 72, 153, 0.12)',  text: '#9d174d', border: 'rgba(236, 72, 153, 0.35)' }, // Pink
      constant:   { bg: 'rgba(217, 70, 239, 0.10)',  text: '#a21caf', border: 'rgba(217, 70, 239, 0.30)' }, // Fuchsia

      module:     { bg: 'rgba(6, 182, 212, 0.10)',   text: '#0e7490', border: 'rgba(6, 182, 212, 0.30)' }, // Cyan
      namespace:  { bg: 'rgba(2, 132, 199, 0.10)',   text: '#075985', border: 'rgba(2, 132, 199, 0.30)' }, // Dark sky
      package:    { bg: 'rgba(2, 132, 199, 0.12)',   text: '#0369a1', border: 'rgba(2, 132, 199, 0.35)' },

      import:     { bg: 'rgba(251, 146, 60, 0.12)',  text: '#c2410c', border: 'rgba(251, 146, 60, 0.35)' }, // Orange
      export:     { bg: 'rgba(234, 179, 8, 0.12)',   text: '#a16207', border: 'rgba(234, 179, 8, 0.35)' }, // Amber

      file:       { bg: 'rgba(107, 114, 128, 0.10)', text: '#374151', border: 'rgba(107, 114, 128, 0.30)' }, // Slate
      directory:  { bg: 'rgba(75, 85, 99, 0.10)',    text: '#334155', border: 'rgba(75, 85, 99, 0.30)' },

      component:  { bg: 'rgba(219, 39, 119, 0.10)',  text: '#be185d', border: 'rgba(219, 39, 119, 0.30)' }, // Rose-pink

      service:    { bg: 'rgba(56, 189, 248, 0.10)',  text: '#0369a1', border: 'rgba(56, 189, 248, 0.30)' }, // Light sky
      controller: { bg: 'rgba(59, 130, 246, 0.10)',  text: '#1d4ed8', border: 'rgba(59, 130, 246, 0.30)' }, // Blue
      middleware: { bg: 'rgba(14, 165, 233, 0.10)',  text: '#0ea5e9', border: 'rgba(14, 165, 233, 0.30)' },

      model:      { bg: 'rgba(99, 102, 241, 0.10)',  text: '#4f46e5', border: 'rgba(99, 102, 241, 0.30)' }, // Indigo
      schema:     { bg: 'rgba(79, 70, 229, 0.10)',   text: '#4338ca', border: 'rgba(79, 70, 229, 0.30)' },

      route:      { bg: 'rgba(239, 68, 68, 0.12)',   text: '#b91c1c', border: 'rgba(239, 68, 68, 0.35)' }, // Red
      test:       { bg: 'rgba(20, 184, 166, 0.10)',  text: '#0f766e', border: 'rgba(20, 184, 166, 0.30)' }, // Teal (edge case)

      config:     { bg: 'rgba(250, 204, 21, 0.12)',  text: '#a16207', border: 'rgba(250, 204, 21, 0.35)' },
      util:       { bg: 'rgba(253, 224, 71, 0.12)',  text: '#ca8a04', border: 'rgba(253, 224, 71, 0.35)' },
      helper:     { bg: 'rgba(254, 240, 138, 0.12)', text: '#a16207', border: 'rgba(254, 240, 138, 0.35)' }
    }
  }
};
