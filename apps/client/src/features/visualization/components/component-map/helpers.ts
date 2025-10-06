import type { CSSProperties } from 'react';
import { 
  FileText,
  Box,
  Code,
  CircuitBoard,
  Layers,
  Package,
  Hash,
  Braces,
} from 'lucide-react';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { php } from '@codemirror/lang-php';

export const relationshipTypes = ['imports', 'extends', 'implements', 'calls', 'contains', 'uses', 'references'];
export const nodeTypes = ['file', 'class', 'function', 'method', 'interface', 'module', 'variable', 'property'];

export function getNodeIcon(type: string) {
  const icons: Record<string, any> = {
    file: FileText,
    class: Box,
    function: Code,
    method: CircuitBoard,
    interface: Layers,
    module: Package,
    variable: Hash,
    property: Braces,
  };
  return icons[type] || FileText;
}

export function getRelationshipColor(type: string): string {
  const theme = (window as any).__currentTheme;

  if (theme?.colors) {
    // Map relationship types to theme colors - same as WebGLRenderer
    const colorMap: Record<string, string> = {
      imports: theme.colors.primary?.[500] || theme.colors.info?.[500] || '#3b82f6',
      extends: theme.colors.success?.[500] || '#10b981',
      implements: theme.colors.accent?.[500] || '#f59e0b',
      calls: theme.colors.warning?.[500] || '#eab308',
      contains: theme.colors.foreground?.tertiary || theme.colors.border?.primary || '#a3a3a3',
      uses: theme.colors.error?.[500] || '#ef4444',
      references: theme.colors.secondary?.[500] || '#8b5cf6',
    };
    return colorMap[type] || theme.colors.foreground?.muted || '#737373';
  }

  // Fallback to CSS variables if theme not available
  const style = getComputedStyle(document.documentElement);
  const colorMap: Record<string, string> = {
    imports: style.getPropertyValue('--color-primary-500').trim() || '#3b82f6',
    extends: style.getPropertyValue('--color-success-500').trim() || '#10b981',
    implements: style.getPropertyValue('--color-accent-500').trim() || '#f59e0b',
    calls: style.getPropertyValue('--color-warning-500').trim() || '#eab308',
    contains: style.getPropertyValue('--text-muted').trim() || '#a3a3a3',
    uses: style.getPropertyValue('--color-error-500').trim() || '#ef4444',
    references: style.getPropertyValue('--color-secondary-500').trim() || '#8b5cf6',
  };
  return colorMap[type] || style.getPropertyValue('--text-muted').trim() || '#737373';
}

export function getNodeColor(type: string): string {
  const theme = (window as any).__currentTheme;

  if (theme?.colors?.components?.[type]) {
    const color = theme.colors.components[type];
    // Use text color for nodes (more vivid than bg)
    return color.text || color.bg || '#737373';
  }

  // Fallback colors matching WebGLRenderer
  const fallbackColors: Record<string, string> = {
    file: '#4ade80', // Green
    class: '#3b82f6', // Blue
    function: '#fbbf24', // Yellow
    method: '#fb923c', // Orange
    interface: '#c084fc', // Purple
    module: '#8b5cf6', // Dark purple
    variable: '#ec4899', // Pink
    property: '#f87171', // Red
    component: '#60a5fa', // Light blue
    hook: '#86efac', // Light green
    service: '#38bdf8', // Sky blue
    controller: '#fdba74', // Light orange
    model: '#2dd4bf', // Teal
    schema: '#fde047', // Bright yellow
    route: '#fb7185', // Rose
    middleware: '#93c5fd', // Light blue
    test: '#4ade80', // Emerald
    config: '#a78bfa', // Lavender
    constant: '#6b7280', // Gray
    util: '#fde68a', // Pale yellow
    helper: '#fef08a', // Light yellow
  };

  return fallbackColors[type] || '#9ca3af';
}

export function getRelationshipStyle(type: string, theme: any): CSSProperties {
  const currentTheme = (window as any).__currentTheme ?? theme;
  const colors = currentTheme?.colors?.entities?.relationship?.[type] ?? null;
  if (colors) {
    return { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border };
  }
  return {} as CSSProperties;
}

export function getRelationshipImportance(type: string): number {
  switch (type) {
    case 'extends':
      return 2.0;
    case 'implements':
      return 1.8;
    case 'imports':
      return 1.5;
    case 'calls':
      return 1.2;
    case 'contains':
      return 1.0;
    case 'uses':
      return 0.8;
    case 'references':
      return 0.6;
    default:
      return 1.0;
  }
}

export function getEdgeDirection(type: string): number {
  switch (type) {
    case 'extends':
    case 'implements':
    case 'imports':
    case 'calls':
    case 'uses':
      return 1.0;
    case 'references':
      return 0.5;
    case 'contains':
      return 0.0;
    default:
      return 0.5;
  }
}

export function getLanguageExtension(language?: string) {
  switch (language) {
    case 'javascript':
    case 'typescript':
      return javascript();
    case 'python':
      return python();
    case 'java':
      return java();
    case 'php':
      return php();
    default:
      return javascript();
  }
}
