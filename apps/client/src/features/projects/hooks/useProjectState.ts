import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@client/features/app-shell/state/appStore';
import { useProjectStore } from '@client/features/projects/state/projectStore';
import { felixService } from '@/services/felixService';

export function useProjectState() {
  const [error, setError] = useState<string | null>(null);
  const hasRestored = useRef(false);
  
  const { 
    projectSelected, 
    projectPath,
    setProjectSelected,
    setProjectPath,
  } = useAppStore();
  
  const {
    loading,
    indexing,
    isIndexed,
    stats,
    setProject,
    setStats,
    setLoading,
    setIndexing,
    clearProject,
    updateLastIndexed,
  } = useProjectStore();

  // Load project using REST API
  const loadProject = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);

    try {
      // Set project via REST API
      const result = await felixService.setProject(path);
      if (!result.success) {
        throw new Error(result.message || 'Failed to set project');
      }

      // Update local state
      setProject(path);
      setProjectPath(path);
      setProjectSelected(true);

      // Get project statistics
      try {
        const projectStats = await felixService.getStats();
        setStats(projectStats);
      } catch (statsError) {
        console.warn('Failed to load project stats:', statsError);
        // Continue without stats
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [
    setProject,
    setProjectPath,
    setProjectSelected,
    setStats,
    setLoading,
  ]);

  // Index current project
  const indexProject = useCallback(async (force = false) => {
    if (!projectPath) {
      throw new Error('No project selected');
    }

    setIndexing(true);
    setError(null);

    try {
      const result = await felixService.indexCodebase(projectPath, force);
      if (!result.success) {
        throw new Error(result.message || 'Indexing failed');
      }

      // Update stats after indexing
      const stats = await felixService.getStats();
      setStats(stats);
      updateLastIndexed();

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIndexing(false);
    }
  }, [
    projectPath,
    setIndexing,
    setStats,
    updateLastIndexed,
  ]);

  // Get current project info from server
  const refreshProject = useCallback(async () => {
    setLoading(true);
    try {
      const current = await felixService.getCurrentProject();
      if (current.current_project && current.current_project !== projectPath) {
        await loadProject(current.current_project);
      }
    } catch (err) {
      console.warn('Failed to refresh project:', err);
    } finally {
      setLoading(false);
    }
  }, [projectPath, loadProject]);

  // Clear current project
  const closeProject = useCallback(() => {
    clearProject();
    setProjectSelected(false);
    setProjectPath('');
    setError(null);
  }, [clearProject, setProjectSelected, setProjectPath]);

  // Restore project on startup if we have one saved
  useEffect(() => {
    const restoreProject = async () => {
      if (projectPath && !hasRestored.current && !loading) {
        hasRestored.current = true;
        
        try {
          // First check if the backend has the same project
          const current = await felixService.getCurrentProject();
          
          if (current.current_project !== projectPath) {
            // Backend has different project, restore our saved one
            console.log('Restoring saved project:', projectPath);
            await loadProject(projectPath);
          } else if (!projectSelected) {
            // Backend matches but we need to update our state
            setProjectSelected(true);
            try {
              const projectStats = await felixService.getStats();
              setStats(projectStats);
            } catch (err) {
              console.warn('Failed to load project stats on restore:', err);
            }
          }
        } catch (err) {
          console.warn('Failed to restore project on startup:', err);
          // Don't throw error, just log it
        }
      }
    };

    restoreProject();
  }, [projectPath, projectSelected, loading, loadProject, setProjectSelected, setStats]);

  return {
    // State
    projectSelected,
    projectPath,
    isIndexed,
    loading,
    indexing,
    stats,
    error,

    // Actions
    loadProject,
    indexProject,
    refreshProject,
    closeProject,
    clearError: () => setError(null),
  };
}