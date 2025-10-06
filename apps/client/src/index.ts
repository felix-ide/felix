/**
 * Felix UI - Main Export File
 * 
 * Exports all components and utilities needed for integrating 
 * the Felix interface into other applications
 */

// Core App Components
export { App } from './features/app-shell/components/App';

// Plugin System
export {
  PluginProvider,
  usePluginContext,
  usePlugin,
  usePluginsByType,
  usePluginEvent
} from './lib/plugin-system/PluginProvider';

export {
  ComposableApp,
  usePluginNavigation,
  type ComposableAppProps
} from './lib/plugin-system/ComposableApp';

export {
  PluginRegistry,
  EventBus
} from './lib/plugin-system/PluginRegistry';

// Plugin System Types
export type {
  UIPlugin,
  SectionPlugin,
  ComponentPlugin,
  ServicePlugin,
  ThemePlugin,
  PluginContext,
  PluginLoaderConfig,
  ComposableUIConfig,
  NavigationItem,
  UsePluginResult
} from './lib/plugin-system/types';

// Individual Section Components (for selective integration)
export { TasksSection } from './features/tasks/components/TasksSection';
export { NotesSection } from './features/notes/components/NotesSection';
export { ExploreSection } from './features/search/components/ExploreSection';
// DocumentSection removed

// Stores (for external state management)
export { useProjectStore } from './features/projects/state/projectStore';
export { useTasksStore } from './features/tasks/state/tasksStore';
export { useNotesStore } from './features/notes/state/notesStore';
export { useVisualizationStore } from './features/visualization/state/visualizationStore';

// Services (for external API integration)
export { felixService } from './services/felixService';

// Theme System
export { FelixThemeProvider, CodeIndexerThemeProvider } from './themes/CodeIndexerThemeProvider';

// Core Views (for custom layouts)
export { ComponentMapView } from './features/visualization/components/ComponentMapView';
export { FileExplorerView } from './features/files/components/FileExplorerView';

// Utility Components
export { Button } from './shared/ui/Button';
export { Card, CardHeader, CardTitle, CardContent, CardFooter } from './shared/ui/Card';
export { Input } from './shared/ui/Input';

// Types
export type * from './types/api';
