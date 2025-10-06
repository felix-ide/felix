/**
 * Plugin System Provider
 * 
 * Provides plugin context and manages plugin lifecycle
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  PluginContext, 
  PluginLoaderConfig, 
  UIPlugin,
  UsePluginResult 
} from './types';
import { PluginRegistry, EventBus } from './PluginRegistry';

const PluginContextReact = createContext<PluginContext | null>(null);

export interface PluginProviderProps {
  children: ReactNode;
  config: PluginLoaderConfig;
}

export function PluginProvider({ children, config }: PluginProviderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [context] = useState<PluginContext>(() => {
    // Create event bus and registry if not provided
    const eventBus = config.context.eventBus instanceof EventBus ? config.context.eventBus : new EventBus();
    const registry = config.context.registry || new PluginRegistry(eventBus);
    
    return {
      ...config.context,
      eventBus,
      registry
    };
  });

  useEffect(() => {
    const loadPlugins = async () => {
      try {
        setLoading(true);
        const { plugins, onProgress, onError } = config;
        
        // Register all plugins
        for (let i = 0; i < plugins.length; i++) {
          const plugin = plugins[i];
          try {
            context.registry.register(plugin);
            onProgress?.(i + 1, plugins.length);
          } catch (error) {
            const err = error as Error;
            onError?.(err, plugin);
            throw err;
          }
        }
        
        // Initialize all plugins
        await context.registry.initializeAll();
        
        setLoading(false);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    };

    loadPlugins();

    // Cleanup on unmount
    return () => {
      context.registry.cleanupAll().catch(console.error);
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">
            Plugin System Error
          </h2>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading plugins...</p>
        </div>
      </div>
    );
  }

  return (
    <PluginContextReact.Provider value={context}>
      {children}
    </PluginContextReact.Provider>
  );
}

/**
 * Hook to access plugin context
 */
export function usePluginContext(): PluginContext {
  const context = useContext(PluginContextReact);
  if (!context) {
    throw new Error('usePluginContext must be used within PluginProvider');
  }
  return context;
}

/**
 * Hook to get a specific plugin
 */
export function usePlugin<T extends UIPlugin = UIPlugin>(
  pluginId: string
): UsePluginResult<T> {
  const context = usePluginContext();
  const [state, setState] = useState<UsePluginResult<T>>({
    plugin: undefined,
    loading: true,
    error: undefined
  });

  useEffect(() => {
    try {
      const plugin = context.registry.get(pluginId) as T | undefined;
      setState({
        plugin,
        loading: false,
        error: plugin ? undefined : new Error(`Plugin ${pluginId} not found`)
      });
    } catch (error) {
      setState({
        plugin: undefined,
        loading: false,
        error: error as Error
      });
    }
  }, [pluginId, context.registry]);

  return state;
}

/**
 * Hook to get all plugins of a specific type
 */
export function usePluginsByType<T extends UIPlugin>(type: string): T[] {
  const context = usePluginContext();
  const [plugins, setPlugins] = useState<T[]>([]);

  useEffect(() => {
    const foundPlugins = context.registry.getByType<T>(type);
    setPlugins(foundPlugins);
    
    // Listen for plugin registration/unregistration
    const unsubscribeReg = context.eventBus.on('plugin:registered', () => {
      setPlugins(context.registry.getByType<T>(type));
    });
    
    const unsubscribeUnreg = context.eventBus.on('plugin:unregistered', () => {
      setPlugins(context.registry.getByType<T>(type));
    });
    
    return () => {
      unsubscribeReg();
      unsubscribeUnreg();
    };
  }, [type, context]);

  return plugins;
}

/**
 * Hook to subscribe to plugin events
 */
export function usePluginEvent(
  event: string,
  handler: (data?: any) => void,
  deps: any[] = []
): void {
  const context = usePluginContext();

  useEffect(() => {
    const unsubscribe = context.eventBus.on(event, handler);
    return unsubscribe;
  }, [event, ...deps]);
}
