// Application constants

export const APP_NAME = 'Felix';
export const APP_VERSION = '1.0.0';

// Port Configuration
export const WEB_UI_PORT = 5101;

// UI Constants
export const SIDEBAR_WIDTH = 48; // pixels
export const MIN_PANEL_WIDTH = 200;
export const DEFAULT_PANEL_WIDTH = 300;

// File handling
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'php',
  'markdown',
  'json',
  'yaml',
  'html',
  'css',
  'scss',
  'sql',
] as const;

// Graph visualization
export const GRAPH_DEFAULT_NODE_SIZE = 8;
export const GRAPH_MAX_NODES = 10000;
export const GRAPH_FORCE_STRENGTH = -300;
export const GRAPH_LINK_DISTANCE = 30;

// Search
export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_MIN_QUERY_LENGTH = 2;
export const SEARCH_MAX_RESULTS = 100;

// Local storage keys
export const STORAGE_KEYS = {
  PROJECT_PATH: 'felix-project-path',
  THEME: 'felix-theme',
  SIDEBAR_COLLAPSED: 'felix-sidebar-collapsed',
  PANEL_WIDTHS: 'felix-panel-widths',
  DOCUMENT_TABS: 'felix-document-tabs',
  RECENT_PROJECTS: 'felix-recent-projects',
} as const;

// Document tabs
export const MAX_OPEN_TABS = 10;
export const DEFAULT_DOCUMENT_CONTENT = '# New Document\n\nStart writing...\n';

// Activity feed
export const ACTIVITY_MAX_ITEMS = 1000;
export const ACTIVITY_CLEANUP_INTERVAL = 60000; // 1 minute

// Notifications
export const NOTIFICATION_DEFAULT_DURATION = 5000;
export const NOTIFICATION_MAX_ITEMS = 10;

// WebSocket events
export const WS_EVENTS = {
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  NOTE_ADDED: 'note_added',
  DEPENDENCY_ADDED: 'dependency_added',
  DOCUMENT_CHANGED: 'document_changed',
  DOCUMENT_CURSOR: 'document_cursor',
  PROJECT_CHANGED: 'project_changed',
  INDEX_UPDATED: 'index_updated',
} as const;

// CSS class names for dynamic styling
export const CSS_CLASSES = {
  SECTION_ACTIVE: 'bg-accent text-accent-foreground',
  SECTION_INACTIVE: 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
  TAB_ACTIVE: 'bg-background border-border',
  TAB_INACTIVE: 'bg-muted hover:bg-accent/50',
  GRAPH_NODE: 'cursor-pointer hover:stroke-primary',
  GRAPH_EDGE: 'stroke-muted-foreground',
} as const;
