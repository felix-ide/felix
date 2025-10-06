/**
 * Felix UI Plugin System Types
 * 
 * Defines the contracts for creating modular, composable UI components
 * that can be integrated into other applications.
 */

import { ComponentType } from 'react';
import { StoreApi } from 'zustand';
import { LucideIcon } from 'lucide-react';

/**
 * Core plugin definition
 */
export interface UIPlugin {
  /**
   * Unique identifier for the plugin
   */
  id: string;
  
  /**
   * Display name
   */
  name: string;
  
  /**
   * Optional description
   */
  description?: string;
  
  /**
   * Version following semver
   */
  version: string;
  
  /**
   * Dependencies on other plugins
   */
  dependencies?: string[];
  
  /**
   * Plugin initialization
   */
  initialize?: () => Promise<void>;
  
  /**
   * Plugin cleanup
   */
  cleanup?: () => Promise<void>;
}

/**
 * Section plugin - adds a new section to the app
 */
export interface SectionPlugin extends UIPlugin {
  type: 'section';
  
  /**
   * Section configuration
   */
  section: {
    /**
     * Icon component
     */
    icon: LucideIcon | ComponentType;
    
    /**
     * Route path (e.g., '/tasks', '/notes')
     */
    path: string;
    
    /**
     * Main component to render
     */
    component: ComponentType;
    
    /**
     * Optional layout configuration
     */
    layout?: {
      showHeader?: boolean;
      showSidebar?: boolean;
      fullWidth?: boolean;
    };
  };
  
  /**
   * Optional state store
   */
  store?: StoreApi<any>;
  
  /**
   * Optional navigation items for this section
   */
  navigation?: NavigationItem[];
}

/**
 * Component plugin - provides reusable components
 */
export interface ComponentPlugin extends UIPlugin {
  type: 'component';
  
  /**
   * Exported components
   */
  components: Record<string, ComponentType<any>>;
  
  /**
   * Optional style sheets
   */
  styles?: string[];
}

/**
 * Service plugin - provides services/utilities
 */
export interface ServicePlugin extends UIPlugin {
  type: 'service';
  
  /**
   * Exported services
   */
  services: Record<string, any>;
}

/**
 * Theme plugin - provides theme customization
 */
export interface ThemePlugin extends UIPlugin {
  type: 'theme';
  
  /**
   * Theme configuration
   */
  theme: {
    /**
     * CSS variables
     */
    variables?: Record<string, string>;
    
    /**
     * Component overrides
     */
    components?: Record<string, any>;
    
    /**
     * Global styles
     */
    globalStyles?: string;
  };
}

/**
 * Navigation item definition
 */
export interface NavigationItem {
  id: string;
  label: string;
  icon?: LucideIcon | ComponentType;
  path?: string;
  action?: () => void;
  children?: NavigationItem[];
  badge?: string | number;
  visible?: boolean | (() => boolean);
}

/**
 * Plugin context provided to all plugins
 */
export interface PluginContext {
  /**
   * API client for felix backend
   */
  apiClient: any;
  
  /**
   * Current project info
   */
  project?: {
    path: string;
    name: string;
  };
  
  /**
   * App configuration
   */
  config: {
    apiUrl: string;
    wsUrl?: string;
    basePath?: string;
  };
  
  /**
   * Event bus for inter-plugin communication
   */
  eventBus: EventBus;
  
  /**
   * Registry of all loaded plugins
   */
  registry: PluginRegistry;
}

/**
 * Event bus for plugin communication
 */
export interface EventBus {
  emit(event: string, data?: any): void;
  on(event: string, handler: (data?: any) => void): () => void;
  once(event: string, handler: (data?: any) => void): () => void;
  off(event: string, handler?: (data?: any) => void): void;
  clear(): void;
}

/**
 * Plugin registry interface
 */
export interface PluginRegistry {
  register(plugin: UIPlugin): void;
  unregister(pluginId: string): void;
  get(pluginId: string): UIPlugin | undefined;
  getAll(): UIPlugin[];
  getByType<T extends UIPlugin>(type: string): T[];
  initializeAll(): Promise<void>;
  cleanupAll(): Promise<void>;
}

/**
 * Plugin loader configuration
 */
export interface PluginLoaderConfig {
  /**
   * Plugins to load
   */
  plugins: UIPlugin[];
  
  /**
   * Plugin context
   */
  context: PluginContext;
  
  /**
   * Error handler
   */
  onError?: (error: Error, plugin: UIPlugin) => void;
  
  /**
   * Loading progress callback
   */
  onProgress?: (loaded: number, total: number) => void;
}

/**
 * Composable UI configuration
 */
export interface ComposableUIConfig {
  /**
   * Enabled sections (by plugin ID)
   */
  enabledSections?: string[];
  
  /**
   * Disabled sections (by plugin ID)
   */
  disabledSections?: string[];
  
  /**
   * Custom section order
   */
  sectionOrder?: string[];
  
  /**
   * Theme overrides
   */
  theme?: Partial<ThemePlugin['theme']>;
  
  /**
   * Custom navigation structure
   */
  navigation?: NavigationItem[];
  
  /**
   * Layout configuration
   */
  layout?: {
    headerComponent?: ComponentType;
    sidebarComponent?: ComponentType;
    footerComponent?: ComponentType;
  };
}

/**
 * Hook result for using plugins
 */
export interface UsePluginResult<T extends UIPlugin = UIPlugin> {
  plugin: T | undefined;
  loading: boolean;
  error: Error | undefined;
}

/**
 * Type guards
 */
export const isPluginType = {
  section: (plugin: UIPlugin): plugin is SectionPlugin => 
    'type' in plugin && plugin.type === 'section',
  component: (plugin: UIPlugin): plugin is ComponentPlugin => 
    'type' in plugin && plugin.type === 'component',
  service: (plugin: UIPlugin): plugin is ServicePlugin => 
    'type' in plugin && plugin.type === 'service',
  theme: (plugin: UIPlugin): plugin is ThemePlugin => 
    'type' in plugin && plugin.type === 'theme'
};
