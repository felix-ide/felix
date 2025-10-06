import { describe, it, expect } from '@jest/globals';
import { toProjectRelativePosix, isInsideProject, toAbsoluteFromProjectRelative, normalizePosix } from '../PathUtils';
import path from 'path';

describe('PathUtils', () => {
  const projectRoot = path.resolve('/tmp/project');

  it('toProjectRelativePosix normalizes absolute and relative inputs', () => {
    const abs = path.resolve(projectRoot, 'src/sub/index.ts');
    const rel = toProjectRelativePosix(abs, projectRoot);
    expect(rel).toBe('src/sub/index.ts');

    const relFromCwd = toProjectRelativePosix('src/sub/index.ts', projectRoot);
    expect(relFromCwd).toBe('src/sub/index.ts');
  });

  it('isInsideProject detects containment using resolved paths', () => {
    const abs = path.resolve(projectRoot, 'a/b/c.ts');
    expect(isInsideProject(abs, projectRoot)).toBe(true);
    expect(isInsideProject('/etc/hosts', projectRoot)).toBe(false);
  });

  it('toAbsoluteFromProjectRelative converts POSIX rel to native absolute', () => {
    const abs = toAbsoluteFromProjectRelative('src/a/b.ts', projectRoot);
    expect(abs).toBe(path.resolve(projectRoot, 'src', 'a', 'b.ts'));
  });

  it('normalizePosix swaps separators predictably', () => {
    const p = path.join('a', 'b', 'c');
    expect(normalizePosix(p)).toBe('a/b/c');
  });
});

