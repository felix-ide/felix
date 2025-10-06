/**
 * Composable App Component
 * 
 * Renders the application based on loaded plugins and configuration
 */

import type React from 'react';
import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ComposableUIConfig, SectionPlugin } from './types';
import { usePluginsByType } from './PluginProvider';

export interface ComposableAppProps {
  config?: ComposableUIConfig;
  defaultLayout?: React.ComponentType<{ children: React.ReactNode }>;
  loadingComponent?: React.ComponentType;
  // errorComponent?: React.ComponentType<{ error: Error }>;
}

const DefaultLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="h-screen flex flex-col">
    {children}
  </div>
);

const DefaultLoading: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Unused error boundary placeholder removed

export function ComposableApp({
  config,
  defaultLayout: Layout = DefaultLayout,
  loadingComponent: Loading = DefaultLoading
}: ComposableAppProps) {
  const sectionPlugins = usePluginsByType<SectionPlugin>('section');
  
  // Filter enabled sections
  const enabledSections = sectionPlugins.filter(plugin => {
    if (config?.disabledSections?.includes(plugin.id)) return false;
    if (config?.enabledSections && !config.enabledSections.includes(plugin.id)) return false;
    return true;
  });
  
  // Sort sections according to config
  const sortedSections = config?.sectionOrder
    ? enabledSections.sort((a, b) => {
        const aIndex = config.sectionOrder!.indexOf(a.id);
        const bIndex = config.sectionOrder!.indexOf(b.id);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      })
    : enabledSections;

  // Apply custom layout components if provided
  const LayoutComponent = config?.layout?.headerComponent || Layout;

  return (
    <LayoutComponent>
      <Suspense fallback={<Loading />}>
        <Routes>
          {sortedSections.map(plugin => {
            const { path, component: Component, layout } = plugin.section;
            
            // Wrap component with layout options
            const WrappedComponent = () => {
              if (layout?.fullWidth) {
                return <Component />;
              }
              
              return (
                <div className="container mx-auto px-4">
                  <Component />
                </div>
              );
            };
            
            return (
              <Route
                key={plugin.id}
                path={path}
                element={<WrappedComponent />}
              />
            );
          })}
          
          {/* Default redirect */}
          {sortedSections.length > 0 && (
            <Route
              path="/"
              element={<Navigate to={sortedSections[0].section.path} replace />}
            />
          )}
          
          {/* 404 route */}
          <Route
            path="*"
            element={
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
                  <p className="text-muted-foreground">The requested page does not exist.</p>
                </div>
              </div>
            }
          />
        </Routes>
      </Suspense>
    </LayoutComponent>
  );
}

/**
 * Hook to create navigation structure from plugins
 */
export function usePluginNavigation() {
  const sectionPlugins = usePluginsByType<SectionPlugin>('section');
  
  return sectionPlugins.map(plugin => ({
    id: plugin.id,
    label: plugin.name,
    icon: plugin.section.icon,
    path: plugin.section.path,
    items: plugin.navigation || []
  }));
}
