import { useState, useEffect } from 'react';
import { useAppStore } from '@client/features/app-shell/state/appStore';
import { useProjectStore } from '@client/features/projects/state/projectStore';
import { useVisualizationStore } from '@client/features/visualization/state/visualizationStore';
import { useProjectRestore } from '@client/features/projects/hooks/useProjectRestore';
import { useTheme } from '@felix/theme-system';
// Theme handling moved to main.tsx
import { ProjectSetup } from './ProjectSetup';
import { IconNavBar } from './IconNavBar';
import { AppHeader } from './AppHeader';
import { SectionRouter } from './SectionRouter';
import { ThemeDebugPanel } from '@client/features/debug/components/ThemeDebugPanel';
import '@/styles/globals.css';

export interface AppProps {
  /** Current project path for integrated mode */
  projectPath?: string;
  /** Whether running in integrated mode (disables project setup) */
  isIntegrated?: boolean;
  /** Whether to disable the internal project editor (for integration) */
  disableProjectEditor?: boolean;
}

// Create WebSocketEventClient for this module
let eventClient: any = null;
if (typeof window !== 'undefined' && (window as any).WebSocketEventClient) {
  try {
    // Use global WebSocketEventClient if available
    const WebSocketEventClient = (window as any).WebSocketEventClient;
    eventClient = new WebSocketEventClient('felix');
    (window as any).eventClient = eventClient;
  } catch (e) {
    console.warn('[Felix] Could not create WebSocketEventClient:', e);
  }
}

export function App({ 
  projectPath: externalProjectPath, 
  isIntegrated = false
}: AppProps = {}) {
  // Check if running in integration mode from window object
  const integrationConfig = (window as any).FELIX_INTEGRATION;
  const actuallyIntegrated = isIntegrated || !!integrationConfig?.isIntegrated;
  // Project editor remains enabled in this build
  const { projectSelected, projectPath } = useAppStore();
  const currentProjectPath = useProjectStore((state) => state.path);
  const setCurrentProject = useVisualizationStore((state) => state.setCurrentProject);
  const [isRestoring, setIsRestoring] = useState(!isIntegrated); // Skip restoring in integrated mode
  const { setTheme } = useTheme();
  
  // Check for project parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  const urlProject = urlParams.get('project');
  const effectiveProjectPath = externalProjectPath || urlProject;
  
  // Attempt to restore saved project on mount (skip in integrated mode)
  useProjectRestore();
  
  // Handle external project path in integrated mode
  useEffect(() => {
    if (isIntegrated && effectiveProjectPath) {
      setCurrentProject(effectiveProjectPath);
      // Mark as having a project in integrated mode
      const setProjectSelected = useAppStore.getState().setProjectSelected;
      setProjectSelected(true);
    }
  }, [isIntegrated, effectiveProjectPath, setCurrentProject]);
  
  // Handle theme synchronization in integrated mode
  useEffect(() => {
    // Only run in integrated mode
    if (!actuallyIntegrated) return;
    
    // Theme handling moved to main.tsx
    
    // Apply initial theme from localStorage
    const savedTheme = localStorage.getItem('felix-current-theme');
    if (savedTheme) {
      try {
        setTheme(savedTheme);
      } catch (error) {
        console.error('[Felix] Failed to apply saved theme', error);
      }
    }
    
    // Notify ready when WebSocket connects (if available)
    if (eventClient && eventClient.waitForConnection) {
      eventClient.waitForConnection().then(() => {
        console.log('[Felix] WebSocket connected, notifying ready');
        eventClient.notifyReady();
        
        // Request current theme
        console.log('[Felix] Requesting current theme');
        const themeRequestId = crypto.randomUUID();
        eventClient.publish('theme-request', { requestId: themeRequestId });
      }).catch((error: any) => {
        console.error('[Felix] Failed to connect to WebSocket:', error);
      });
    }
    
    // Subscribe to theme changes if eventClient exists
    let unsubscribeThemeChange: (() => void) | undefined;
    let unsubscribeThemeResponse: (() => void) | undefined;
    
    if (eventClient) {
      unsubscribeThemeChange = eventClient.subscribe('theme-change', (event: any) => {
        console.log('[Felix] Received theme-change event:', event.payload);
        const { themeId, cssVariables } = event.payload || {};
        if (themeId) {
          console.log('[Felix] Applying theme from theme-change:', themeId);
          // Convert theme type to theme ID if needed
          if (themeId === 'light' || themeId === 'dark') {
            const actualThemeId = localStorage.getItem('felix-current-theme');
            if (actualThemeId) {
              console.log('[Felix] Converting theme type, applying:', actualThemeId);
              try {
                setTheme(actualThemeId);
              } catch (error) {
                console.error('[Felix] Failed to apply converted theme', error);
              }
            }
          } else {
            console.log('[Felix] Applying theme directly:', themeId);
            try {
              setTheme(themeId);
            } catch (error) {
              console.error('[Felix] Failed to apply theme', error);
            }
          }
          // Also apply CSS variables directly if provided
          if (cssVariables && Object.keys(cssVariables).length > 0) {
            console.log('[Felix] Applying CSS variables directly');
            // CSS variables handled by theme adapter
          }
        }
      });
      
      unsubscribeThemeResponse = eventClient.subscribe('theme-response', (event: any) => {
        console.log('[Felix] Received theme-response:', event.payload);
        const { themeId, cssVariables } = event.payload || {};
        if (themeId) {
          // Convert theme type to theme ID if needed
          if (themeId === 'light' || themeId === 'dark') {
            const actualThemeId = localStorage.getItem('felix-current-theme');
            if (actualThemeId) {
              try {
                setTheme(actualThemeId);
              } catch (error) {
                console.error('[Felix] Failed to apply converted theme', error);
              }
            }
          } else {
            try {
              setTheme(themeId);
            } catch (error) {
              console.error('[Felix] Failed to apply theme', error);
            }
          }
          // Also apply CSS variables directly if provided
          if (cssVariables && Object.keys(cssVariables).length > 0) {
            console.log('[Felix] Applying CSS variables directly from response');
            // CSS variables handled by theme adapter
          }
        }
      });
    }
    
    return () => {
      if (unsubscribeThemeChange) unsubscribeThemeChange();
      if (unsubscribeThemeResponse) unsubscribeThemeResponse();
    };
  }, [actuallyIntegrated, setTheme]);
  
  // Initialize visualization store with current project
  useEffect(() => {
    if (currentProjectPath) {
      setCurrentProject(currentProjectPath);
    }
  }, [currentProjectPath, setCurrentProject]);
  
  // Check if we're done trying to restore (skip in integrated mode)
  useEffect(() => {
    if (isIntegrated) {
      setIsRestoring(false);
      return;
    }
    
    // If no saved project path, we're not restoring
    if (!projectPath) {
      setIsRestoring(false);
    } else {
      // Give restoration a moment to complete
      const timer = setTimeout(() => setIsRestoring(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [projectPath, isIntegrated]);

  // Show loading while attempting to restore
  if (isRestoring && projectPath) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Restoring project...</p>
        </div>
      </div>
    );
  }

  // Show project setup if no project is selected (skip in integrated mode)
  if (!projectSelected && !isIntegrated) {
    return (
      <div className="min-h-screen bg-background">
        <ProjectSetup />
      </div>
    );
  }

  // Main application layout
  return (
    <div className="app-layout">
      <IconNavBar />
      <div className="flex flex-col flex-1 min-h-0">
        {!actuallyIntegrated && <AppHeader isIntegrated={actuallyIntegrated} />}
        <main className="main-content flex-1">
          <SectionRouter />
        </main>
      </div>
      <ThemeDebugPanel />
    </div>
  );
}
