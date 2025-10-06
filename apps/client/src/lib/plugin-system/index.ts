/**
 * Felix Plugin System
 * 
 * Export all plugin system components for easy integration
 */

// Core types
export * from './types';

// Registry and event bus
export { PluginRegistry, EventBus } from './PluginRegistry';

// React components and hooks
export { 
  PluginProvider, 
  usePluginContext, 
  usePlugin, 
  usePluginsByType,
  usePluginEvent 
} from './PluginProvider';

// Composable app components
export { 
  ComposableApp, 
  usePluginNavigation,
  type ComposableAppProps 
} from './ComposableApp';

// Plugin creators (helpers for creating plugins)
export { createSectionPlugin } from './creators/section';
export { createComponentPlugin } from './creators/component';
export { createServicePlugin } from './creators/service';
export { createThemePlugin } from './creators/theme';
