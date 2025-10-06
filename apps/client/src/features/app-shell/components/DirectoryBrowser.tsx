import { useState, useEffect } from 'react';
import { Folder, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { Card, CardContent } from '@client/shared/ui/Card';
import { cn } from '@/utils/cn';

interface DirectoryNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: DirectoryNode[];
  expanded?: boolean;
  size?: number;
  modified?: string;
}

interface DirectoryBrowserProps {
  onSelectDirectory: (path: string) => void;
  className?: string;
}

export function DirectoryBrowser({ onSelectDirectory, className }: DirectoryBrowserProps) {
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [directories, setDirectories] = useState<DirectoryNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    try {
      // Get base URL from integration config or use default
      const integrationConfig = (window as any).FELIX_INTEGRATION || (window as any).FELIX_INTEGRATION;
      const baseUrl = integrationConfig?.apiUrl || '/api';
      
      const response = await fetch(`${baseUrl}/files/browse?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error('Failed to load directory');
      }
      const data = await response.json();
      const dirs = data.entries.filter((entry: DirectoryNode) => entry.type === 'directory');
      setDirectories(dirs);
      setCurrentPath(data.path);
    } catch (error) {
      console.error('Failed to load directory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory(currentPath);
  }, []);

  const handleDirectoryClick = (dir: DirectoryNode) => {
    setSelectedPath(dir.path);
  };

  const handleNavigateInto = (dir: DirectoryNode) => {
    loadDirectory(dir.path);
    setSelectedPath(null);
  };

  const handleSelect = () => {
    if (selectedPath) {
      onSelectDirectory(selectedPath);
    }
  };

  const goUp = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    loadDirectory(parentPath);
    setSelectedPath(null);
  };

  return (
    <Card className={cn('w-full max-w-3xl bg-background/90 shadow-xl backdrop-blur-xl border-border/70', className)}>
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-border/70 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-primary-foreground">Choose Project Directory</h3>
            <p className="text-xs text-muted-foreground/80 mt-1">
              Click to select, double-click or use the arrow to open a folder.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => loadDirectory(currentPath)} disabled={loading} title="Refresh">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goUp}
              disabled={currentPath === '/' || loading}
            >
              Up
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-card/80 p-3 font-mono text-xs text-primary-foreground/90">
          {currentPath}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr,1fr] md:items-start">
          <div className="rounded-xl border border-border/60 bg-card/70">
            {loading ? (
              <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">Loading directories…</div>
            ) : directories.length === 0 ? (
              <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">No directories found</div>
            ) : (
              <div className="max-h-80 overflow-auto p-2 space-y-1">
                {directories.map((dir) => (
                  <div
                    key={dir.path}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors',
                      selectedPath === dir.path
                        ? 'border-primary/60 bg-primary/10'
                        : 'hover:border-primary/30 hover:bg-primary/5'
                    )}
                    onClick={() => handleDirectoryClick(dir)}
                    onDoubleClick={() => handleNavigateInto(dir)}
                  >
                    <Folder className="h-4 w-4 text-primary/80" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium text-primary-foreground">{dir.name}</div>
                      <div className="text-[0.7rem] text-muted-foreground/80">{dir.path}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateInto(dir);
                      }}
                      className="rounded-full p-1 text-muted-foreground/70 transition-colors hover:bg-primary/20 hover:text-primary"
                      title="Open"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex h-full flex-col gap-3">
            <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-sm text-muted-foreground/80">
              <p className="mb-2 font-medium text-primary-foreground/90">Tips</p>
              <ul className="space-y-2 text-xs">
                <li>• Click once to highlight a directory.</li>
                <li>• Double-click or use the arrow to enter a folder.</li>
                <li>• Use the Up button to move to the parent directory.</li>
              </ul>
            </div>

            {selectedPath && (
              <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm text-primary-foreground">
                <p className="mb-2 text-xs uppercase tracking-[0.2rem] text-primary-foreground/70">Selected Directory</p>
                <p className="font-mono text-xs break-all">{selectedPath}</p>
                <Button onClick={handleSelect} className="mt-3 w-full">
                  Use This Directory
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
