import { ProjectSwitcher } from './ProjectSwitcher';
import { ThemeSelector } from './ThemeSelector';
import { useProjectStore } from '@client/features/projects/state/projectStore';
import { felixService } from '@/services/felixService';
import { RefreshCw } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { cn } from '@/utils/cn';

export interface AppHeaderProps {
  /** Whether running in integrated mode (hides project switcher) */
  isIntegrated?: boolean;
}

export function AppHeader({ isIntegrated = false }: AppHeaderProps) {
  const { path: currentProjectPath, isIndexed, setIndexing, updateLastIndexed, setStats } = useProjectStore();
  
  const handleReindex = async () => {
    if (!confirm('Re-index the current project? This may take a few minutes for large projects.')) {
      return;
    }
    
    setIndexing(true);
    try {
      if (!currentProjectPath) {
        throw new Error('No project selected');
      }
      const result = await felixService.indexCodebase(currentProjectPath, true);
      
      if (result.success) {
        updateLastIndexed();
        // Refresh stats
        const newStats = await felixService.getStats();
        setStats(newStats);
      } else {
        throw new Error(result.message || 'Indexing failed');
      }
    } catch (error) {
      console.error('Failed to reindex:', error);
      alert(`Failed to reindex: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIndexing(false);
    }
  };
  
  return (
    <header className="h-14 bg-background border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        {!isIntegrated && <ProjectSwitcher />}
        
        {/* Project status */}
        <div className="flex items-center gap-2 text-sm">
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded",
            isIndexed
              ? "bg-accent/10 text-accent border border-accent/20"
              : "bg-warning/10 text-warning border border-warning/20"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              isIndexed ? "bg-accent" : "bg-warning animate-pulse"
            )} />
            {isIndexed ? "Indexed" : "Not Indexed"}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Re-index button */}
        {isIndexed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReindex}
            className="text-muted-foreground hover:text-primary-foreground"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Re-index
          </Button>
        )}
        
        {/* Theme selector */}
        <ThemeSelector />
      </div>
    </header>
  );
}