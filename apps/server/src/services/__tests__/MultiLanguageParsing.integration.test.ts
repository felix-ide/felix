import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseManager } from '../../features/storage/DatabaseManager';
import { FileIndexingService } from '../../features/indexing/services/FileIndexingService.js';
import { ParserFactory } from '@felix/code-intelligence';
import { IgnorePatterns } from '../../utils/IgnorePatterns';

function createTempProject(structure: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'mlp-'));
  for (const [rel, content] of Object.entries(structure)) {
    const full = join(dir, rel);
    const folder = full.slice(0, full.lastIndexOf('/'));
    if (folder) { try { require('node:fs').mkdirSync(folder, { recursive: true }); } catch {} }
    writeFileSync(full, content);
  }
  return dir;
}

describe('Multi-language parsing (integration)', () => {
  let db: DatabaseManager;
  let projectDir: string;

  beforeAll(async () => {
    projectDir = createTempProject({
      'src/a.ts': 'export function alpha(){ return 1 }',
      'docs/readme.md': '# Intro\n\nSee `alpha`.',
      'src/ignored/x.ts': 'export const x = 1;'
    });
    // Add .indexignore to exclude src/ignored
    writeFileSync(join(projectDir, '.indexignore'), 'src/ignored/**\n');
    db = DatabaseManager.getInstance(projectDir);
    await db.initialize();
  });

  afterAll(async () => {
    await db.disconnect();
    try { rmSync(projectDir, { recursive: true, force: true }); } catch {}
  });

  it('indexes TS and MD, and respects .indexignore', async () => {
    const parserFactory = new ParserFactory();
    const service = new FileIndexingService(
      db,
      parserFactory,
      undefined,
      { includeExtensions: ['.ts', '.md'] },
      { respectGitignore: true, useIndexIgnore: true }
    );

    const result = await service.indexDirectory(projectDir);
    // Should not process the ignored file
    expect(result.filesProcessed).toBeGreaterThanOrEqual(2);
    expect(result.success).toBe(true);
    expect(result.componentCount).toBeGreaterThan(0);
  });
});

