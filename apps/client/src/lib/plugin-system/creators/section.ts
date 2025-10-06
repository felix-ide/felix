/**
 * Section Plugin Creator
 * 
 * Helper for creating section plugins with proper typing
 */

import { ComponentType } from 'react';
import { LucideIcon } from 'lucide-react';
import { SectionPlugin, NavigationItem } from '../types';
import { StoreApi } from 'zustand';

export interface CreateSectionPluginOptions {
  id: string;
  name: string;
  description?: string;
  version?: string;
  icon: LucideIcon | ComponentType;
  path: string;
  component: ComponentType;
  store?: StoreApi<any>;
  navigation?: NavigationItem[];
  layout?: {
    showHeader?: boolean;
    showSidebar?: boolean;
    fullWidth?: boolean;
  };
  dependencies?: string[];
  initialize?: () => Promise<void>;
  cleanup?: () => Promise<void>;
}

export function createSectionPlugin(options: CreateSectionPluginOptions): SectionPlugin {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    version: options.version || '1.0.0',
    type: 'section',
    dependencies: options.dependencies,
    
    section: {
      icon: options.icon,
      path: options.path,
      component: options.component,
      layout: options.layout
    },
    
    store: options.store,
    navigation: options.navigation,
    
    initialize: options.initialize,
    cleanup: options.cleanup
  };
}