/**
 * Service Plugin Creator
 * 
 * Helper for creating service plugins
 */

import { ServicePlugin } from '../types';

export interface CreateServicePluginOptions {
  id: string;
  name: string;
  description?: string;
  version?: string;
  services: Record<string, any>;
  dependencies?: string[];
  initialize?: () => Promise<void>;
  cleanup?: () => Promise<void>;
}

export function createServicePlugin(options: CreateServicePluginOptions): ServicePlugin {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    version: options.version || '1.0.0',
    type: 'service',
    dependencies: options.dependencies,
    
    services: options.services,
    
    initialize: options.initialize,
    cleanup: options.cleanup
  };
}