/**
 * Felix UI - Minimal Library Export
 * 
 * Exports only the core components needed for integration
 */

// Plugin System Core
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

// Core Section Components (main working ones)
export { TasksSection } from './features/tasks/components/TasksSection';
export { NotesSection } from './features/notes/components/NotesSection';

// Stores (working)
export { useProjectStore } from './features/projects/state/projectStore';
export { useTasksStore } from './features/tasks/state/tasksStore';
export { useNotesStore } from './features/notes/state/notesStore';
export { useVisualizationStore } from './features/visualization/state/visualizationStore';

// Services (working)  
export { felixService } from './services/felixService';

// Theme System
export { FelixThemeProvider, CodeIndexerThemeProvider } from './themes/CodeIndexerThemeProvider';

// Core UI Components (simple ones)
export { Button } from './shared/ui/Button';
export { Card, CardHeader, CardTitle, CardContent, CardFooter } from './shared/ui/Card';
export { Input } from './shared/ui/Input';

// Types
export type * from './types/api';
