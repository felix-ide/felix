import { resolve as resolvePath, join, isAbsolute } from 'path';
import { existsSync, statSync, readdirSync } from 'fs';
import type { Request, Response, RequestHandler } from 'express';

interface FileNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  size?: number;
  modified?: string;
}

/**
 * Build an Express handler that browses the local filesystem. Extracted
 * verbatim from the legacy searchRoutes implementation to keep behaviour
 * stable while allowing independent testing.
 */
export function createFileBrowserHandler(resolveFn: typeof resolvePath = resolvePath): RequestHandler {
  return async function handleFileBrowse(req: Request, res: Response) {
    try {
      // Default to current working directory, allow absolute paths
      const targetPath = typeof req.query.path === 'string' ? req.query.path : process.cwd();
      const resolvedPath = resolveFn(targetPath);

      if (!existsSync(resolvedPath)) {
        res.status(404).json({ error: 'Directory not found' });
        return;
      }

      const stat = statSync(resolvedPath);
      if (!stat.isDirectory()) {
        res.status(400).json({ error: 'Path is not a directory' });
        return;
      }

      const entries = readdirSync(resolvedPath, { withFileTypes: true });
      const nodes = entries
        .filter(entry => !entry.name.startsWith('.'))
        .map<FileNode | null>(entry => {
          const entryPath = join(resolvedPath, entry.name);
          try {
            const entryStat = statSync(entryPath);
            return {
              name: entry.name,
              path: entryPath,
              type: entry.isDirectory() ? 'directory' : 'file',
              size: entry.isFile() ? entryStat.size : undefined,
              modified: entryStat.mtime.toISOString()
            };
          } catch (error) {
            // Skip files that are locked or inaccessible (common on Windows system drives)
            console.log(`[DEBUG] Skipping inaccessible file: ${entryPath}`);
            return null;
          }
        })
        .filter((node): node is FileNode => node !== null)
        .sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });

      res.json({ path: resolvedPath, entries: nodes });
      return;
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
      return;
    }
  };
}
