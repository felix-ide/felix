/**
 * Component Plugin Creator
 * 
 * Helper for creating component plugins
 */

import { ComponentType } from 'react';
import { ComponentPlugin } from '../types';

export interface CreateComponentPluginOptions {
  id: string;
  name: string;
  description?: string;
  version?: string;
  components: Record<string, ComponentType<any>>;
  styles?: string[];
  dependencies?: string[];
  initialize?: () => Promise<void>;
  cleanup?: () => Promise<void>;
}

export function createComponentPlugin(options: CreateComponentPluginOptions): ComponentPlugin {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    version: options.version || '1.0.0',
    type: 'component',
    dependencies: options.dependencies,
    
    components: options.components,
    styles: options.styles,
    
    initialize: options.initialize,
    cleanup: options.cleanup
  };
}