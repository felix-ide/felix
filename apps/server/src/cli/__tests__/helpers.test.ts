import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  DEFAULT_CONFIG,
  getChokidarIgnorePatterns,
  loadConfig,
  saveConfig,
  CLIProgressReporter,
  formatComponents,
  formatRelationships,
  formatStats,
  formatOutput,
  handleError,
  handleCommandError,
  outputContent,
} from '../helpers';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync, readFileSync, rmSync } from 'node:fs';

const sampleComponent = (over: Partial<any> = {}) => ({
  id: 'c1',
  name: 'Foo',
  type: 'function',
  language: 'typescript',
  filePath: '/project/src/foo.ts',
  location: { startLine: 10, startColumn: 1, endLine: 12, endColumn: 2 },
  metadata: {},
  ...over,
});

const sampleRelationship = (over: Partial<any> = {}) => ({
  id: 'r1',
  type: 'calls',
  sourceId: 'a',
  targetId: 'b',
  metadata: {},
  ...over,
});

const sampleStats = (): any => ({
  componentCount: 3,
  relationshipCount: 2,
  fileCount: 1,
  indexSize: 12_345,
  lastUpdated: new Date('2024-01-02T03:04:05Z'),
  languageBreakdown: { typescript: 3 },
});

describe('CLI helpers', () => {
  const originalExit = process.exit;
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeEach(() => {
    // silence console in tests unless needed
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    // prevent process.exit
    // @ts-ignore
    process.exit = jest.fn();
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    process.exit = originalExit;
  });

  it('returns sensible chokidar ignore patterns', () => {
    const patterns = getChokidarIgnorePatterns();
    expect(Array.isArray(patterns)).toBe(true);
    expect(patterns.some(p => String(p).includes('node_modules'))).toBe(true);
    expect(patterns.some(p => String(p).includes('coverage'))).toBe(true);
  });

  it('loads default config when file missing and saves config to disk', () => {
    const tmp = join(tmpdir(), `cfg_${Date.now()}.json`);
    const cfg = loadConfig(tmp);
    expect(cfg.defaultStorage).toBe(DEFAULT_CONFIG.defaultStorage);
    const mod = { ...cfg, verbose: true };
    saveConfig(mod, tmp);
    expect(existsSync(tmp)).toBe(true);
    const disk = JSON.parse(readFileSync(tmp, 'utf-8'));
    expect(disk.verbose).toBe(true);
    rmSync(tmp);
  });

  it('CLIProgressReporter prints dots vs verbose messages', () => {
    const pr = new CLIProgressReporter(false);
    pr.onFileProcessed('/x.ts', 1, 2);
    pr.onError('/x.ts', new Error('bad'));
    pr.finish(1);
    expect((console.log as any).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('formats components in text and markdown', () => {
    const comps = [sampleComponent(), sampleComponent({ type: 'class', name: 'Bar' })];
    const text = formatComponents(comps as any, 'text', true);
    const md = formatComponents(comps as any, 'markdown', true);
    expect(text).toContain('Found 2 components');
    expect(text).toContain('Foo');
    expect(md).toContain('# Components (2)');
    expect(md).toContain('### Foo');
  });

  it('formats relationships and stats', () => {
    const rels = [sampleRelationship(), sampleRelationship({ type: 'imports', id: 'r2' })];
    const txt = formatRelationships(rels as any, 'text');
    expect(txt).toContain('Found 2 relationships');
    const statsTxt = formatStats(sampleStats(), 'text', true);
    expect(statsTxt).toContain('Felix Statistics');
  });

  it('formatOutput handles json/text/markdown', () => {
    const data = { a: 1 };
    expect(formatOutput(data, 'json')).toContain('"a": 1');
    expect(formatOutput(data, 'text')).toContain('"a": 1');
    expect(formatOutput(data, 'markdown')).toContain('```json');
  });

  it('handleError and handleCommandError do not crash tests (exit mocked)', () => {
    handleError(new Error('x'), true);
    handleCommandError(new Error('y'), true);
    expect((process.exit as any).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('outputContent writes to file or logs', () => {
    const tmp = join(tmpdir(), `out_${Date.now()}.txt`);
    outputContent('hello');
    expect((console.log as any).mock.calls.some((c: any[]) => String(c[0]).includes('hello'))).toBe(true);
    outputContent('file', tmp);
    expect(existsSync(tmp)).toBe(true);
    rmSync(tmp);
  });
});
