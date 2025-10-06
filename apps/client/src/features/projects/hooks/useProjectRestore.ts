import { useEffect } from 'react';
import { useAppStore } from '@client/features/app-shell/state/appStore';
import { useProjectStore } from '@client/features/projects/state/projectStore';
import { felixService } from '@/services/felixService';

export function useProjectRestore() {
  const { projectPath, setProjectSelected, setServerRunning } = useAppStore();
  const { setProject, setStats } = useProjectStore();

  useEffect(() => {
    // Always try to restore if we have a project path
    // This handles both initial load and server restarts
    if (projectPath) {
      restoreProject();
    }
  }, []);

  const restoreProject = async () => {
    if (!projectPath) return;

    console.log('Attempting to restore project:', projectPath);

    try {
      // First check if server is running by trying to get current project
      try {
        const current = await felixService.getCurrentProject();
        console.log('Current project on server:', current);
      } catch (error) {
        console.log('Server not ready yet, attempting to set project...');
      }

      // Attempt to set the project in the service
      const result = await felixService.setProject(projectPath);
      
      if (result.success) {
        // Update stores
        setProject(projectPath);
        setServerRunning(true);
        
        // Try to get stats
        try {
          const stats = await felixService.getStats();
          setStats(stats);
        } catch (error) {
          console.warn('Failed to get project stats:', error);
        }
        
        // Mark project as selected
        setProjectSelected(true);
        
        // Trigger a data refresh for all stores
        // This ensures lists are populated after reconnection
        window.dispatchEvent(new Event('project-restored'));
      } else {
        // If failed, clear the saved project path
        console.error('Failed to restore project:', result.message);
        setProjectSelected(false);
      }
    } catch (error) {
      console.error('Error restoring project:', error);
      // Don't immediately fail - server might still be starting
      // Try again after a delay
      setTimeout(() => {
        console.log('Retrying project restoration...');
        restoreProject();
      }, 2000);
    }
  };

  return { restoreProject };
}