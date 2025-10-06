import { useState } from 'react';
import { useAppStore } from '@client/features/app-shell/state/appStore';
import { useProjectStore } from '@client/features/projects/state/projectStore';
import { felixService } from '@/services/felixService';
import { DirectoryBrowser } from './DirectoryBrowser';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@client/shared/ui/Card';
import { Loader2, Folder, Server, CheckCircle, XCircle, Clock, X } from 'lucide-react';

export function ProjectSetup() {
  // Check for project parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  const urlProject = urlParams.get('project') || '';
  
  const [projectPath, setProjectPath] = useState(urlProject);
  const [, setIsIndexing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'setting-project' | 'indexing' | 'complete' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showBrowser, setShowBrowser] = useState(false);

  const { setProjectSelected, setProjectPath: setAppProjectPath } = useAppStore();
  const { setProject, setStats, setIndexing, recentProjects, removeRecentProject } = useProjectStore();

  const handleProjectSetup = async (path?: string) => {
    const projectToSetup = path || projectPath;
    if (!projectToSetup.trim()) return;

    try {
      setStatus('setting-project');
      setErrorMessage('');

      // Set project in Felix
      const result = await felixService.setProject(projectToSetup);
      if (!result.success) {
        throw new Error(result.message || 'Failed to set project');
      }

      // Update local state
      setProject(projectToSetup);
      setAppProjectPath(projectToSetup);

      // Just get existing stats, don't auto-index
      try {
        const stats = await felixService.getStats();
        setStats(stats);
      } catch (statsError) {
        console.warn('Failed to get stats:', statsError);
        // Continue without stats
      }
      
      setStatus('complete');
      setProjectSelected(true);

    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Setup failed');
      setIsIndexing(false);
      setIndexing(false);
    }
  };

  const handleSelectFolder = () => {
    setShowBrowser(true);
  };

  const handleDirectorySelected = (path: string) => {
    setProjectPath(path);
    setShowBrowser(false);
  };
  
  const handleSelectRecentProject = (path: string) => {
    setProjectPath(path);
    handleProjectSetup(path);
  };
  
  const handleRemoveRecentProject = (path: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    removeRecentProject(path);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connecting':
      case 'setting-project':
      case 'indexing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connecting':
        return 'Connecting to Felix backend...';
      case 'setting-project':
        return 'Setting up project...';
      case 'indexing':
        return 'Indexing codebase...';
      case 'complete':
        return 'Setup complete!';
      case 'error':
        return `Error: ${errorMessage}`;
      case 'idle':
        return 'Ready to set up project';
      default:
        return `Status: ${status}`;
    }
  };

  if (showBrowser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <DirectoryBrowser onSelectDirectory={handleDirectorySelected} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Server className="h-6 w-6" />
            Felix
          </CardTitle>
          <p className="text-muted-foreground">
            Set up your project to get started
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Server Status */}
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">
              Ready to explore indexed projects
            </span>
          </div>
          
          {/* Recent Projects */}
          {recentProjects.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Recent Projects</label>
              <div className="max-h-32 overflow-y-auto space-y-1 border border-border rounded-md p-2">
                {recentProjects.map((project) => (
                  <button
                    key={project.path}
                    onClick={() => handleSelectRecentProject(project.path)}
                    disabled={status !== 'idle'}
                    className="w-full group flex items-center justify-between p-2 text-left rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{project.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{project.path}</span>
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <Clock className="h-3 w-3" />
                          {formatDate(project.lastAccessed)}
                        </span>
                      </div>
                    </div>
                    <div
                      onClick={(e) => handleRemoveRecentProject(project.path, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all cursor-pointer"
                      title="Remove from recent projects"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleRemoveRecentProject(project.path, e);
                        }
                      }}
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Project Path Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Directory</label>
            <div className="flex gap-2">
              <Input
                placeholder="/path/to/your/project"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                disabled={status !== 'idle'}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleSelectFolder}
                disabled={status !== 'idle'}
              >
                <Folder className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Setup Button */}
          <Button
            onClick={() => handleProjectSetup()}
            disabled={!projectPath.trim() || (status !== 'idle' && status !== 'error')}
            className="w-full"
          >
            {status === 'setting-project' || status === 'indexing' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {status === 'indexing' ? 'Indexing...' : 'Setting up...'}
              </>
            ) : (
              'Connect to Felix'
            )}
          </Button>

          {/* Status Display */}
          {status !== 'idle' && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted text-sm">
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </div>
          )}

          {/* Tips */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Make sure Felix backend is running</p>
            <p>• Use an absolute path to your project directory</p>
            <p>• Large projects may take a few minutes to index</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
