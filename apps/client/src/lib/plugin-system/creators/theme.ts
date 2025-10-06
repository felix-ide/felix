/**
 * Theme Plugin Creator
 * 
 * Helper for creating theme plugins
 */

import { ThemePlugin } from '../types';

export interface CreateThemePluginOptions {
  id: string;
  name: string;
  description?: string;
  version?: string;
  theme: {
    variables?: Record<string, string>;
    components?: Record<string, any>;
    globalStyles?: string;
  };
  dependencies?: string[];
  initialize?: () => Promise<void>;
  cleanup?: () => Promise<void>;
}

export function createThemePlugin(options: CreateThemePluginOptions): ThemePlugin {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    version: options.version || '1.0.0',
    type: 'theme',
    dependencies: options.dependencies,
    
    theme: options.theme,
    
    initialize: options.initialize,
    cleanup: options.cleanup
  };
}