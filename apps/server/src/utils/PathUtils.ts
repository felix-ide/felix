import path from 'path';

// Normalize any absolute or relative path to a project-relative POSIX path
export function toProjectRelativePosix(filePath: string, projectRoot: string): string {
  if (!filePath) return filePath;
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(projectRoot, filePath);
  let rel = path.relative(projectRoot, abs);
  // Ensure predictable separators
  rel = rel.split(path.sep).join('/');
  return rel;
}

export function isInsideProject(absPath: string, projectRoot: string): boolean {
  const resolvedRoot = path.resolve(projectRoot) + path.sep;
  const resolved = path.resolve(absPath) + path.sep;
  return resolved.startsWith(resolvedRoot);
}

export function toAbsoluteFromProjectRelative(relPosixPath: string, projectRoot: string): string {
  const nativeRel = relPosixPath.split('/').join(path.sep);
  return path.resolve(projectRoot, nativeRel);
}

export function normalizePosix(p: string): string {
  return p.split(path.sep).join('/');
}

