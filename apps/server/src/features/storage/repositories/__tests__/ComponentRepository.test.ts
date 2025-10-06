import { describe, it, expect, jest } from '@jest/globals';
import os from 'os';
import fs from 'fs';
import path from 'path';

describe('ComponentRepository (sqlite via DatabaseManager)', () => {
  it('stores, updates, searches, and aggregates components', async () => {
    await jest.isolateModulesAsync(async () => {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'comp-repo-'));

      jest.resetModules();
      jest.unmock('typeorm');

      const { DatabaseManager } = await import('../../DatabaseManager.js');
      const db = new DatabaseManager(tmpRoot);
      await db.initialize();

      const repo = db.getComponentRepository();

    // Seed a few components across files and languages
    await repo.storeComponent({
      id: 'c1', name: 'Alpha', type: 'class', language: 'typescript',
      filePath: path.join(tmpRoot, 'src/a.ts'),
      location: { startLine: 1, endLine: 5, startColumn: 0, endColumn: 0 },
      metadata: { decorators: ['@Inject'] }
    } as any);
    await repo.storeComponent({
      id: 'c2', name: 'alpha_util', type: 'function', language: 'typescript',
      filePath: path.join(tmpRoot, 'src/b.ts'),
      location: { startLine: 10, endLine: 20, startColumn: 0, endColumn: 0 }
    } as any);
    await repo.storeComponent({
      id: 'c3', name: 'Namespace.Alpha', type: 'namespace', language: 'typescript',
      filePath: path.join(tmpRoot, 'src/c.ts'),
      location: { startLine: 1, endLine: 1, startColumn: 0, endColumn: 0 }
    } as any);

    // Update existing with merged metadata
    await repo.storeComponent({
      id: 'c1', name: 'Alpha', type: 'class', language: 'typescript',
      filePath: path.join(tmpRoot, 'src/a.ts'),
      location: { startLine: 2, endLine: 6, startColumn: 0, endColumn: 0 },
      metadata: { capabilities: { x: true } }
    } as any);

    // Search preferring exact normalized name matches and class over namespace
    const res = await repo.searchComponents({ name: 'Alpha', limit: 10 });
    const count = await repo.getComponentCount();
    // Basic sanity: we inserted rows
    expect(count).toBeGreaterThan(0);
    expect(res.items.length).toBeGreaterThan(0);
    // First result should be the class Alpha rather than namespace
    expect(res.items[0].id).toBe('c1');

    // Direct getters
    const got = await repo.getComponent('c1');
    expect(got?.name).toBe('Alpha');
    expect(got?.location?.startLine).toBeGreaterThanOrEqual(1);

    // Aggregations and helpers
    const files = await repo.getIndexedFiles();
    expect(files.some(f => f.includes('src/a.ts'))).toBe(true);
    const langBreakdown = await repo.getLanguageBreakdown();
    expect(langBreakdown.typescript).toBeGreaterThan(0);
      const relPath = path.relative(tmpRoot, path.join(tmpRoot, 'src/a.ts')).split(path.sep).join('/');
      const byFile = await repo.getComponentsByFile(relPath);
      expect(byFile.some(c => c.id === 'c1')).toBe(true);
    const total = await repo.getComponentCount();
    expect(total).toBeGreaterThan(0);
    const counts = await repo.getComponentCountByType();
    expect(Object.keys(counts).length).toBeGreaterThan(0);
    const distinctFiles = await repo.countDistinctFiles();
    expect(distinctFiles).toBeGreaterThan(0);
    const distinctPaths = await repo.getDistinctFilePaths();
    expect(distinctPaths.length).toBeGreaterThan(0);

    // Batch helpers
    const idByName = await repo.getComponentIdsByNames(['Alpha','alpha_util']);
    expect(idByName.get('Alpha')).toBe('c1');
      const idByPath = await repo.getComponentIdsByFilePaths([relPath]);
      expect(idByPath.get(relPath)).toBe('c1');

      // Deletions
      const relPathC = path.relative(tmpRoot, path.join(tmpRoot, 'src/c.ts')).split(path.sep).join('/');
      const delInFile = await repo.deleteComponentsInFile(relPathC);
      expect(delInFile.success).toBe(true);

      await db.disconnect();
      try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
      jest.resetModules();
    });
  }, 30000);
});
