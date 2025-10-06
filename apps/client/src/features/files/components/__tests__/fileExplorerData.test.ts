import { describe, expect, it } from 'vitest';
import {
  normalizePath,
  createFileLookup,
  buildFileTreeState,
  buildTreeFromFileList,
  normalizeComponentData,
  buildFileChildrenMap,
  type FileExplorerComponent,
} from '../fileExplorerData';

describe('fileExplorerData utilities', () => {
  it('normalizes file lookup entries with cross-platform paths', () => {
    const lookup = createFileLookup([
      { id: 'a', filePath: 'src/index.ts', name: 'index.ts' },
      { id: 'b', path: 'docs/guide.md' },
      { id: 'c', filePath: 'src\\utils\\helpers.ts' },
    ]);

    expect(lookup.byPath['src/index.ts']).toBe('a');
    expect(lookup.byPath['docs/guide.md']).toBe('b');
    expect(lookup.byPath['src/utils/helpers.ts']).toBe('c');
    expect(lookup.byId['c']).toEqual({ path: 'src/utils/helpers.ts', name: 'helpers.ts' });
  });

  it('builds tree from file list when API tree is unavailable', () => {
    const fileEntries = [
      { id: 'file-src-index', filePath: 'src/index.ts' },
      { id: 'file-src/utils', filePath: 'src/utils/helpers.ts', name: 'helpers.ts' },
    ];

    const lookup = createFileLookup(fileEntries);
    const tree = buildTreeFromFileList(fileEntries, lookup);

    expect(tree.rootChildren).toContain('dir:src');
    const srcDir = tree.nodes.get('dir:src');
    expect(srcDir?.childrenIds).toContain('file-src-index');
    expect(srcDir?.childrenIds).toContain('dir:src/utils');
    const utilsDir = tree.nodes.get('dir:src/utils');
    expect(utilsDir?.childrenIds).toContain('file-src/utils');
  });

  it('builds a file tree that reuses known file ids', () => {
    const lookup = createFileLookup([
      { id: 'file-src-index', filePath: 'src/index.ts' },
      { id: 'file-readme', filePath: 'README.md', name: 'README.md' },
    ]);

    const tree = buildFileTreeState(
      {
        type: 'directory',
        name: 'root',
        children: [
          {
            type: 'directory',
            name: 'src',
            path: 'src',
            children: [
              { type: 'file', name: 'index.ts', path: 'src/index.ts' },
            ],
          },
          { type: 'file', name: 'README.md', path: 'README.md' },
        ],
      },
      lookup
    );

    const srcDir = tree.nodes.get('dir:src');
    expect(srcDir).toBeDefined();
    expect(srcDir?.childrenIds).toContain('file-src-index');

    const readme = tree.nodes.get('file-readme');
    expect(readme?.path).toBe('README.md');
    expect(tree.rootChildren).toContain('dir:src');
    expect(tree.rootChildren).toContain('file-readme');
  });

  it('normalizes component payloads and preserves relationships', () => {
    const normalized = normalizeComponentData(
      {
        id: 'comp-1',
        name: 'ExampleClass',
        type: 'class',
        filePath: 'src/example.ts',
        metadata: JSON.stringify({ description: 'Example component', code: 'class Example {}' }),
        relationships: [{ id: 'rel-1' }],
      },
      { fileId: 'file-src-example', filePath: 'src/example.ts' }
    );

    expect(normalized).toEqual(
      expect.objectContaining({
        id: 'comp-1',
        name: 'ExampleClass',
        type: 'class',
        filePath: 'src/example.ts',
        parentId: 'file-src-example',
        description: 'Example component',
        sourceCode: 'class Example {}',
        relationships: [{ id: 'rel-1' }],
        _visible: true,
      })
    );
  });

  it('groups visible child components by file and parent', () => {
    const components: FileExplorerComponent[] = [
      {
        id: 'file-src-index',
        name: 'index.ts',
        type: 'file',
        filePath: 'src/index.ts',
        _visible: true,
      },
      {
        id: 'comp-root',
        name: 'rootFn',
        type: 'function',
        filePath: 'src/index.ts',
        parentId: 'file-src-index',
        _visible: true,
      },
      {
        id: 'comp-child',
        name: 'childFn',
        type: 'function',
        filePath: 'src/index.ts',
        parentId: 'comp-root',
        _visible: true,
      },
      {
        id: 'hidden',
        name: 'hiddenFn',
        type: 'function',
        filePath: 'src/index.ts',
        parentId: 'comp-root',
        _visible: false,
      },
    ];

    const getFileNode = (component: FileExplorerComponent) =>
      component.type === 'file' ? component.id : 'file-src-index';

    const map = buildFileChildrenMap(components, getFileNode);
    const rootChildren = map.get('file-src-index');

    expect(rootChildren?.get('file-src-index')?.map(c => c.id)).toEqual(['comp-root']);
    expect(rootChildren?.get('comp-root')?.map(c => c.id)).toEqual(['comp-child']);
    expect(rootChildren?.get('comp-root')?.some(c => c.id === 'hidden')).toBe(false);
  });

  it('normalizes mixed path formats consistently', () => {
    expect(normalizePath('src\\modules\\index.ts')).toBe('src/modules/index.ts');
    expect(normalizePath(undefined)).toBeUndefined();
  });
});
