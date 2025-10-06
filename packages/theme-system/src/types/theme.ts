/**
 * Core theme type definitions
 */

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950?: string;
  [key: string]: string | undefined;
}

export interface SurfaceScale {
  primary: string;
  secondary: string;
  tertiary: string;
  elevated: string;
  overlay: string;
  inverse: string;
  [key: string]: string;
}

export interface TextScale {
  primary: string;
  secondary: string;
  tertiary: string;
  muted: string;
  inverse: string;
  link: string;
  linkHover: string;
  [key: string]: string;
}

export interface BorderScale {
  primary: string;
  secondary: string;
  tertiary: string;
  focus: string;
  error: string;
  [key: string]: string;
}

export interface ComponentColors {
  // Code component types
  class: { bg: string; text: string; border: string; };
  function: { bg: string; text: string; border: string; };
  method: { bg: string; text: string; border: string; };
  interface: { bg: string; text: string; border: string; };
  type: { bg: string; text: string; border: string; };
  variable: { bg: string; text: string; border: string; };
  property: { bg: string; text: string; border: string; };
  enum: { bg: string; text: string; border: string; };
  module: { bg: string; text: string; border: string; };
  namespace: { bg: string; text: string; border: string; };
  package: { bg: string; text: string; border: string; };
  import: { bg: string; text: string; border: string; };
  export: { bg: string; text: string; border: string; };
  file: { bg: string; text: string; border: string; };
  directory: { bg: string; text: string; border: string; };
  component: { bg: string; text: string; border: string; };
  hook: { bg: string; text: string; border: string; };
  service: { bg: string; text: string; border: string; };
  controller: { bg: string; text: string; border: string; };
  model: { bg: string; text: string; border: string; };
  schema: { bg: string; text: string; border: string; };
  route: { bg: string; text: string; border: string; };
  middleware: { bg: string; text: string; border: string; };
  test: { bg: string; text: string; border: string; };
  config: { bg: string; text: string; border: string; };
  constant: { bg: string; text: string; border: string; };
  util: { bg: string; text: string; border: string; };
  helper: { bg: string; text: string; border: string; };
}

export interface UIElements {
  // Sidebar
  sidebar: {
    bg: string;
    border: string;
    hover: string;
    active: string;
    text: string;
    icon: string;
  };
  // Top navigation
  navbar: {
    bg: string;
    border: string;
    text: string;
    icon: string;
  };
  // Buttons
  button: {
    primary: { bg: string; text: string; border: string; hover: string; };
    secondary: { bg: string; text: string; border: string; hover: string; };
    ghost: { bg: string; text: string; border: string; hover: string; };
    danger: { bg: string; text: string; border: string; hover: string; };
  };
  // Cards
  card: {
    bg: string;
    border: string;
    header: string;
    shadow: string;
  };
  // Inputs
  input: {
    bg: string;
    border: string;
    focus: string;
    placeholder: string;
    text: string;
  };
  // Badges/Tags
  badge: {
    default: { bg: string; text: string; border: string; };
    success: { bg: string; text: string; border: string; };
    warning: { bg: string; text: string; border: string; };
    danger: { bg: string; text: string; border: string; };
    info: { bg: string; text: string; border: string; };
  };
  // Tooltips
  tooltip: {
    bg: string;
    text: string;
    border: string;
  };
  // Modals
  modal: {
    bg: string;
    overlay: string;
    border: string;
    header: string;
  };
  // Tables
  table: {
    header: string;
    row: string;
    rowHover: string;
    border: string;
  };
}

export interface EntityColors {
  // Tasks
  task: {
    // Status
    todo: { bg: string; text: string; border: string; icon: string; };
    in_progress: { bg: string; text: string; border: string; icon: string; };
    blocked: { bg: string; text: string; border: string; icon: string; };
    done: { bg: string; text: string; border: string; icon: string; };
    cancelled: { bg: string; text: string; border: string; icon: string; };
    // Priorities
    priority_low: { bg: string; text: string; border: string; icon: string; };
    priority_medium: { bg: string; text: string; border: string; icon: string; };
    priority_high: { bg: string; text: string; border: string; icon: string; };
    priority_critical: { bg: string; text: string; border: string; icon: string; };
    // Types
    type_task: { bg: string; text: string; border: string; icon: string; };
    type_bug: { bg: string; text: string; border: string; icon: string; };
    type_feature: { bg: string; text: string; border: string; icon: string; };
    type_epic: { bg: string; text: string; border: string; icon: string; };
    type_story: { bg: string; text: string; border: string; icon: string; };
    type_spike: { bg: string; text: string; border: string; icon: string; };
    [key: string]: { bg: string; text: string; border: string; icon: string; };
  };
  // Notes
  note: {
    default: { bg: string; text: string; border: string; icon: string; };
    warning: { bg: string; text: string; border: string; icon: string; };
    documentation: { bg: string; text: string; border: string; icon: string; };
    excalidraw: { bg: string; text: string; border: string; icon: string; };
    mermaid: { bg: string; text: string; border: string; icon: string; };
    [key: string]: { bg: string; text: string; border: string; icon: string; };
  };
  // Rules
  rule: {
    pattern: { bg: string; text: string; border: string; icon: string; };
    constraint: { bg: string; text: string; border: string; icon: string; };
    semantic: { bg: string; text: string; border: string; icon: string; };
    automation: { bg: string; text: string; border: string; icon: string; };
    [key: string]: { bg: string; text: string; border: string; icon: string; };
  };
  // Workflows
  workflow: {
    active: { bg: string; text: string; border: string; icon: string; };
    inactive: { bg: string; text: string; border: string; icon: string; };
    draft: { bg: string; text: string; border: string; icon: string; };
    [key: string]: { bg: string; text: string; border: string; icon: string; };
  };
  // Relationships
  relationship: {
    calls: { bg: string; text: string; border: string; line: string; };
    imports: { bg: string; text: string; border: string; line: string; };
    exports: { bg: string; text: string; border: string; line: string; };
    extends: { bg: string; text: string; border: string; line: string; };
    implements: { bg: string; text: string; border: string; line: string; };
    uses: { bg: string; text: string; border: string; line: string; };
    references: { bg: string; text: string; border: string; line: string; };
    contains: { bg: string; text: string; border: string; line: string; };
    depends: { bg: string; text: string; border: string; line: string; };
    composed: { bg: string; text: string; border: string; line: string; };
    [key: string]: { bg: string; text: string; border: string; line: string; };
  };
  // Spec state
  spec_state: {
    draft: { bg: string; text: string; border: string; icon: string; };
    spec_in_progress: { bg: string; text: string; border: string; icon: string; };
    spec_ready: { bg: string; text: string; border: string; icon: string; };
    [key: string]: { bg: string; text: string; border: string; icon: string; };
  };
}

export interface ThemeColors {
  // Base colors with full scales
  primary: ColorScale;
  secondary: ColorScale;
  accent: ColorScale;

  // Semantic colors
  success: ColorScale;
  warning: ColorScale;
  error: ColorScale;
  info: ColorScale;

  // Surface colors
  background: SurfaceScale;
  foreground: TextScale;
  border: BorderScale;

  // Component-specific colors
  components?: ComponentColors;

  // UI element colors
  ui?: UIElements;

  // Entity colors (tasks, notes, rules, workflows)
  entities?: EntityColors;
}

export interface ThemeTypography {
  fontFamily: {
    sans: string;
    serif: string;
    mono: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
  };
  fontWeight: {
    thin: number;
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
  };
  lineHeight: {
    none: number;
    tight: number;
    snug: number;
    normal: number;
    relaxed: number;
    loose: number;
  };
}

export interface ThemeSpacing {
  0: string;
  px: string;
  0.5: string;
  1: string;
  1.5: string;
  2: string;
  2.5: string;
  3: string;
  3.5: string;
  4: string;
  5: string;
  6: string;
  7: string;
  8: string;
  9: string;
  10: string;
  11: string;
  12: string;
  14: string;
  16: string;
  20: string;
  24: string;
  28: string;
  32: string;
  36: string;
  40: string;
  44: string;
  48: string;
  52: string;
  56: string;
  60: string;
  64: string;
  72: string;
  80: string;
  96: string;
}

export interface ThemeEffects {
  borderRadius: {
    none: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    full: string;
  };
  boxShadow: {
    xs: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    inner: string;
    none: string;
  };
  opacity: {
    0: string;
    5: string;
    10: string;
    20: string;
    25: string;
    30: string;
    40: string;
    50: string;
    60: string;
    70: string;
    75: string;
    80: string;
    90: string;
    95: string;
    100: string;
  };
  transition: {
    none: string;
    all: string;
    colors: string;
    opacity: string;
    shadow: string;
    transform: string;
  };
  animation: {
    none: string;
    spin: string;
    ping: string;
    pulse: string;
    bounce: string;
  };
}

export interface Theme {
  id: string;
  name: string;
  description?: string;
  author?: string;
  version: string;
  type: 'light' | 'dark' | 'custom';
  base?: 'light' | 'dark'; // For custom themes, which base to inherit from
  colors: ThemeColors;
  typography?: Partial<ThemeTypography>;
  spacing?: Partial<ThemeSpacing>;
  effects?: Partial<ThemeEffects>;
  customProperties?: Record<string, string>; // For any custom CSS properties
}

export interface ThemeMetadata {
  id: string;
  name: string;
  description?: string;
  author?: string;
  version: string;
  type: 'light' | 'dark' | 'custom';
  preview?: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
  };
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}