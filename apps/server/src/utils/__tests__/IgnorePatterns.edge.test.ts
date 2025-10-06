import { describe, it, expect } from '@jest/globals';
import { IgnorePatterns } from '../IgnorePatterns';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('IgnorePatterns edge cases', () => {
  it('respects .gitignore in project root', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ser-ignore-'));
    try {
      writeFileSync(join(dir, '.gitignore'), 'dist/\n*.log\n');
      const ig = new IgnorePatterns(dir, { respectGitignore: true });
      expect(ig.shouldIgnore(join(dir, 'dist/app.js'))).toBe(true);
      expect(ig.shouldIgnore(join(dir, 'src/app.ts'))).toBe(false);
      expect(ig.shouldIgnore(join(dir, 'debug.log'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('filters arrays via filterPaths', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ser-ignore-'));
    try {
      writeFileSync(join(dir, '.gitignore'), '__tests__/\n');
      const ig = new IgnorePatterns(dir, { respectGitignore: true });
      const out = ig.filterPaths([
        join(dir, '__tests__/x.ts'),
        join(dir, 'src/index.ts'),
      ]);
      expect(out).toEqual([join(dir, 'src/index.ts')]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('createDefaultIndexIgnore writes a template file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ser-ignore-'));
    try {
      IgnorePatterns.createDefaultIndexIgnore(dir, ['custom/']);
      const content = require('fs').readFileSync(join(dir, '.indexignore'), 'utf8');
      expect(content).toContain('The Felix ignore file');
      expect(content).toContain('custom/');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
