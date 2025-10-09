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
  const [currentPath, setCurrentPath] = useState<string>('');
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
    // Handle both Windows (C:\foo\bar) and Unix (/foo/bar) paths
    const isWindows = currentPath.includes('\\') || /^[A-Z]:/i.test(currentPath);
    const separator = isWindows ? '\\' : '/';
    const parts = currentPath.split(/[/\\]/).filter(p => p); // Remove empty parts

    // Can't go up from root (e.g., C:\ or /)
    if (parts.length <= 1) {
      return;
    }

    const parentParts = parts.slice(0, -1);
    let parentPath = parentParts.join(separator);

    // On Unix, prepend leading slash
    if (!isWindows) {
      parentPath = separator + parentPath;
    }

    // On Windows, ensure drive letter has backslash (C:\ not C:)
    if (isWindows && parentParts.length === 1 && /^[A-Z]:$/i.test(parentPath)) {
      parentPath += separator;
    }

    loadDirectory(parentPath);
    setSelectedPath(null);
  };

  return (
    <Card className={cn('w-full max-w-3xl', className)}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-lg font-semibold">Choose Project Directory</h3>
            <p className="text-sm text-muted-foreground mt-1">
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
              disabled={loading}
            >
              Up
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted p-3 font-mono text-sm">
          {currentPath}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr,1fr] md:items-start">
          <div className="rounded-md border border-border bg-card">
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
                      'group flex items-center gap-3 rounded-md px-3 py-2 transition-colors cursor-pointer',
                      selectedPath === dir.path
                        ? 'bg-accent'
                        : 'hover:bg-accent/50'
                    )}
                    onClick={() => handleDirectoryClick(dir)}
                    onDoubleClick={() => handleNavigateInto(dir)}
                  >
                    <Folder className="h-4 w-4 text-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium">{dir.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{dir.path}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateInto(dir);
                      }}
                      className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
            <div className="rounded-md border border-border bg-muted p-3 text-sm">
              <p className="mb-2 font-medium">Tips</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• Click once to highlight a directory</li>
                <li>• Double-click or use the arrow to enter a folder</li>
                <li>• Use the Up button to move to the parent directory</li>
              </ul>
            </div>

            {selectedPath && (
              <div className="rounded-md border border-border bg-muted p-4 text-sm">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Selected Directory</p>
                <p className="font-mono text-xs break-all mb-3">{selectedPath}</p>
                <Button onClick={handleSelect} className="w-full">
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
