/**
 * Plugin Registry Implementation
 * 
 * Manages plugin registration, lifecycle, and dependencies
 */

import { 
  UIPlugin, 
  PluginRegistry as IPluginRegistry,
  EventBus as IEventBus 
} from './types';

export class EventBus implements IEventBus {
  private listeners = new Map<string, Set<(data?: any) => void>>();

  emit(event: string, data?: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  on(event: string, handler: (data?: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    
    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  once(event: string, handler: (data?: any) => void): () => void {
    const wrappedHandler = (data?: any) => {
      handler(data);
      this.off(event, wrappedHandler);
    };
    return this.on(event, wrappedHandler);
  }

  off(event: string, handler?: (data?: any) => void): void {
    if (!handler) {
      // Remove all handlers for this event
      this.listeners.delete(event);
    } else {
      const handlers = this.listeners.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.listeners.delete(event);
        }
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export class PluginRegistry implements IPluginRegistry {
  private plugins = new Map<string, UIPlugin>();
  private initializationOrder: string[] = [];
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  register(plugin: UIPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already registered`);
    }

    // Validate dependencies
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(
            `Plugin ${plugin.id} depends on ${dep}, which is not registered`
          );
        }
      }
    }

    this.plugins.set(plugin.id, plugin);
    this.initializationOrder.push(plugin.id);
    
    // Emit registration event
    this.eventBus.emit('plugin:registered', { plugin });
  }

  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return;
    }

    // Check if other plugins depend on this one
    const dependents = this.getDependents(pluginId);
    if (dependents.length > 0) {
      throw new Error(
        `Cannot unregister ${pluginId}: plugins ${dependents.join(', ')} depend on it`
      );
    }

    this.plugins.delete(pluginId);
    this.initializationOrder = this.initializationOrder.filter(id => id !== pluginId);
    
    // Emit unregistration event
    this.eventBus.emit('plugin:unregistered', { pluginId });
  }

  get(pluginId: string): UIPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAll(): UIPlugin[] {
    return Array.from(this.plugins.values());
  }

  getByType<T extends UIPlugin>(type: string): T[] {
    return this.getAll().filter(p => 'type' in p && (p as any).type === type) as T[];
  }

  /**
   * Get plugins that depend on the given plugin
   */
  private getDependents(pluginId: string): string[] {
    const dependents: string[] = [];
    
    for (const [id, plugin] of this.plugins) {
      if (plugin.dependencies?.includes(pluginId)) {
        dependents.push(id);
      }
    }
    
    return dependents;
  }

  /**
   * Get initialization order respecting dependencies
   */
  getInitializationOrder(): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    
    const visit = (pluginId: string) => {
      if (visited.has(pluginId)) return;
      visited.add(pluginId);
      
      const plugin = this.plugins.get(pluginId);
      if (plugin?.dependencies) {
        for (const dep of plugin.dependencies) {
          visit(dep);
        }
      }
      
      order.push(pluginId);
    };
    
    for (const pluginId of this.initializationOrder) {
      visit(pluginId);
    }
    
    return order;
  }

  /**
   * Initialize all plugins in dependency order
   */
  async initializeAll(): Promise<void> {
    const order = this.getInitializationOrder();
    
    for (const pluginId of order) {
      const plugin = this.plugins.get(pluginId);
      if (plugin?.initialize) {
        try {
          await plugin.initialize();
          this.eventBus.emit('plugin:initialized', { pluginId });
        } catch (error) {
          this.eventBus.emit('plugin:error', { pluginId, error });
          throw new Error(`Failed to initialize plugin ${pluginId}: ${error}`);
        }
      }
    }
  }

  /**
   * Cleanup all plugins in reverse dependency order
   */
  async cleanupAll(): Promise<void> {
    const order = this.getInitializationOrder().reverse();
    
    for (const pluginId of order) {
      const plugin = this.plugins.get(pluginId);
      if (plugin?.cleanup) {
        try {
          await plugin.cleanup();
          this.eventBus.emit('plugin:cleanup', { pluginId });
        } catch (error) {
          console.error(`Failed to cleanup plugin ${pluginId}:`, error);
        }
      }
    }
  }
}