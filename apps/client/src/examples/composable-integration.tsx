/**
 * Example: Integrating the Felix UI into another application
 * 
 * This shows how to use the plugin system to create a custom
 * Felix UI with only the features you need.
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { 
  PluginProvider, 
  ComposableApp,
  EventBus,
  PluginRegistry,
  type PluginLoaderConfig,
  type ComposableUIConfig
} from '../lib/plugin-system';

// Import only the plugins you want
import { tasksPlugin } from '../plugins/tasks-plugin';
import { notesPlugin } from '../plugins/notes-plugin';
import { searchPlugin } from '../plugins/search-plugin';

// Import your API client
import { felixService } from '../services/felixService';

// Example 1: Minimal integration with selected features
export function MinimalFelix() {
  // Configure which plugins to load
  const plugins = [
    searchPlugin,  // Only search functionality
    notesPlugin    // And notes
    // Exclude tasks, rules, etc.
  ];

  // Create plugin context
  const eventBus = new EventBus();
  const registry = new PluginRegistry(eventBus);
  
  const config: PluginLoaderConfig = {
    plugins,
    context: {
      apiClient: felixService,
      project: {
        path: '/path/to/project',
        name: 'My Project'
      },
      config: {
        apiUrl: 'http://localhost:3000/felix/api',
        wsUrl: 'ws://localhost:3000'
      },
      eventBus,
      registry
    }
  };

  return (
    <BrowserRouter>
      <PluginProvider config={config}>
        <ComposableApp />
      </PluginProvider>
    </BrowserRouter>
  );
}

// Example 2: Custom layout and theme
export function CustomThemedFelix() {
  const plugins = [searchPlugin, tasksPlugin, notesPlugin];
  
  // Custom layout component
  const CustomLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="custom-app-layout">
      <header className="custom-header">
        <h1>My Custom Felix</h1>
      </header>
      <main className="custom-main">
        {children}
      </main>
    </div>
  );
  
  const uiConfig: ComposableUIConfig = {
    // Control section order
    sectionOrder: ['search', 'tasks', 'notes'],
    
    // Custom theme
    theme: {
      variables: {
        '--primary-color': '#007bff',
        '--secondary-color': '#6c757d'
      },
      globalStyles: `
        .custom-app-layout {
          background: var(--primary-color);
        }
      `
    },
    
    // Use custom layout
    layout: {
      headerComponent: CustomLayout as any
    }
  };
  
  const config: PluginLoaderConfig = {
    plugins,
    context: {
      apiClient: felixService,
      config: {
        apiUrl: process.env.REACT_APP_API_URL || '/api'
      },
      eventBus: new EventBus(),
      registry: new PluginRegistry(new EventBus())
    }
  };

  return (
    <BrowserRouter>
      <PluginProvider config={config}>
        <ComposableApp config={uiConfig} />
      </PluginProvider>
    </BrowserRouter>
  );
}

// Example 3: Adding custom plugins
import { createSectionPlugin } from '../lib/plugin-system';
import { Zap } from 'lucide-react';

const CustomMetricsSection: React.FC = () => (
  <div>
    <h2>Custom Metrics Dashboard</h2>
    {/* Your custom component */}
  </div>
);

const customMetricsPlugin = createSectionPlugin({
  id: 'metrics',
  name: 'Metrics',
  icon: Zap,
  path: '/metrics',
  component: CustomMetricsSection,
  navigation: [
    { id: 'metrics-overview', label: 'Overview', path: '/metrics' },
    { id: 'metrics-performance', label: 'Performance', path: '/metrics/performance' }
  ]
});

export function ExtendedFelix() {
  const plugins = [
    searchPlugin,
    tasksPlugin,
    notesPlugin,
    customMetricsPlugin  // Add your custom plugin
  ];
  
  const config: PluginLoaderConfig = {
    plugins,
    context: {
      apiClient: felixService,
      config: {
        apiUrl: '/api'
      },
      eventBus: new EventBus(),
      registry: new PluginRegistry(new EventBus())
    },
    onError: (error, plugin) => {
      console.error(`Plugin ${plugin.id} failed:`, error);
    },
    onProgress: (loaded, total) => {
      console.log(`Loading plugins: ${loaded}/${total}`);
    }
  };

  return (
    <BrowserRouter>
      <PluginProvider config={config}>
        <ComposableApp />
      </PluginProvider>
    </BrowserRouter>
  );
}

// Example 4: Standalone component usage
export function StandaloneSearchComponent() {
  // You can also use individual components without the full app
  return (
    <div className="standalone-search">
      {/* Import and use ExploreSection directly */}
      {/* <ExploreSection /> */}
    </div>
  );
}
