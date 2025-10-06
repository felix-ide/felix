import { useState, useRef, useEffect } from 'react';
import { ChevronDown, FolderOpen, Clock, X, Plus } from 'lucide-react';
import { useProjectStore } from '@client/features/projects/state/projectStore';
import { useAppStore } from '@client/features/app-shell/state/appStore';
import { useVisualizationStore } from '@client/features/visualization/state/visualizationStore';
import { felixService } from '@/services/felixService';
import { cn } from '@/utils/cn';

export function ProjectSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { name: currentProjectName, path: currentProjectPath, recentProjects, removeRecentProject } = useProjectStore();
  const { setProjectSelected, setProjectPath: setAppProjectPath } = useAppStore();
  const { setProject, setStats } = useProjectStore();
  const { setCurrentProject } = useVisualizationStore();
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSwitchProject = async (path: string, name: string) => {
    if (path === currentProjectPath) {
      setIsOpen(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Set project in code indexer
      const result = await felixService.setProject(path);
      if (!result.success) {
        throw new Error(result.message || 'Failed to set project');
      }
      
      // Update local state
      setProject(path, name);
      setAppProjectPath(path);
      setProjectSelected(true);
      
      // Update visualization store for the new project
      setCurrentProject(path);
      
      // Get stats
      try {
        const stats = await felixService.getStats();
        setStats(stats);
      } catch (statsError) {
        console.warn('Failed to get stats:', statsError);
      }
      
      // Emit project-switched event
      window.dispatchEvent(new CustomEvent('project-switched', { detail: { path, name } }));
      
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch project:', error);
      alert(`Failed to switch project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNewProject = () => {
    setProjectSelected(false);
  };
  
  const handleRemoveRecentProject = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeRecentProject(path);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors",
          "hover:border-primary/40 hover:text-primary hover:bg-card/80",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
      >
        <FolderOpen className="h-4 w-4 text-primary" />
        <span className="max-w-[420px] truncate" title={currentProjectPath || ''}>
          {currentProjectName || 'Select Project'}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform",
          isOpen && "rotate-180 text-primary"
        )} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-3 min-w-[34rem] max-w-[50rem] overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur-lg">
          {/* Current Project */}
          {currentProjectPath && (
            <div className="border-b border-border/70 px-5 py-4">
              <div className="mb-1 text-[0.65rem] uppercase tracking-[0.25rem] text-muted-foreground/80">Current Project</div>
              <div className="text-lg font-semibold text-primary-foreground">{currentProjectName}</div>
              <div className="truncate font-mono text-xs text-muted-foreground/90" title={currentProjectPath}>{currentProjectPath}</div>
            </div>
          )}

          {/* Recent Projects */}
          {recentProjects.length > 0 && (
            <>
              <div className="border-b border-border px-5 py-3 text-[0.65rem] uppercase tracking-[0.25rem] text-muted-foreground/80">
                Recent Projects
              </div>
              <div className="max-h-72 overflow-y-auto">
                {recentProjects
                  .filter(p => p.path !== currentProjectPath)
                  .map((project) => (
                    <div
                      key={project.path}
                      className="group flex w-full items-center justify-between px-5 py-3 transition-colors hover:bg-secondary/40"
                    >
                      <button
                        onClick={() => handleSwitchProject(project.path, project.name)}
                        disabled={isLoading}
                        className="min-w-0 flex-1 text-left disabled:opacity-50"
                      >
                        <div className="truncate text-sm font-medium text-primary-foreground">{project.name}</div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground/80">
                          <span className="flex-1 truncate font-mono tracking-tight" title={project.path}>{project.path}</span>
                          <span className="flex flex-shrink-0 items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(project.lastAccessed)}
                          </span>
                        </div>
                      </button>
                      <button
                        onClick={(e) => handleRemoveRecentProject(project.path, e)}
                        className="ml-3 rounded p-1 opacity-0 transition-all hover:bg-muted/60 group-hover:opacity-100"
                        title="Remove from recent projects"
                      >
                        <X className="h-3 w-3 text-muted-foreground/80 hover:text-destructive" />
                      </button>
                    </div>
                  ))}
              </div>
            </>
          )}

          {/* New Project Button */}
          <div className="border-t border-border/70 bg-card/60 p-3">
            <button
              onClick={handleNewProject}
              className="flex w-full items-center gap-2 rounded-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-primary"
            >
              <Plus className="h-4 w-4" />
              Open New Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
