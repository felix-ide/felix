import type { Theme } from '@felix/theme-system';

export interface FileExplorerComponent {
  id: string;
  name: string;
  type: string;
  filePath?: string;
  parentId?: string;
  location?: {
    file?: string;
    startLine?: number;
    endLine?: number;
    startColumn?: number;
    endColumn?: number;
    start?: { line: number; column: number };
    end?: { line: number; column: number };
  };
  metadata?: any;
  sourceCode?: string;
  description?: string;
  _visible?: boolean;
  relationships?: any[];
}

export type FileExplorerTreeNode = {
  id: string;
  name: string;
  type: 'directory' | 'file';
  path: string;
  parentId?: string;
  fileId?: string;
  childrenIds: string[];
};

export type FileLookup = {
  byPath: Record<string, string>;
  byId: Record<string, { path: string; name: string }>;
};

export const ROOT_NODE_ID = '__root__';

export const normalizePath = (value?: string | null) =>
  value ? value.replace(/\\/g, '/') : undefined;

export const createFileLookup = (fileEntries: any[] = []): FileLookup => {
  const byPath: Record<string, string> = {};
  const byId: Record<string, { path: string; name: string }> = {};

  for (const file of fileEntries) {
    const fileId = file?.id;
    const normalizedPath = normalizePath(file?.filePath ?? file?.path ?? file?.name);
    if (!fileId || !normalizedPath) continue;

    const name = file?.name ?? normalizedPath.split('/').pop() ?? normalizedPath;
    byPath[normalizedPath] = fileId;
    byId[fileId] = { path: normalizedPath, name };
  }

  return { byPath, byId };
};

export const buildFileTreeState = (
  treeData: any,
  lookup: FileLookup
): { nodes: Map<string, FileExplorerTreeNode>; rootChildren: string[] } => {
  const nodes = new Map<string, FileExplorerTreeNode>();

  const ensureNodeExists = (node: FileExplorerTreeNode) => {
    const existing = nodes.get(node.id);
    if (existing) {
      existing.name = node.name;
      existing.type = node.type;
      existing.path = node.path;
      existing.parentId = node.parentId;
      existing.fileId = node.fileId ?? existing.fileId;
      existing.childrenIds = node.childrenIds.length ? node.childrenIds : existing.childrenIds ?? [];
      return existing;
    }
    nodes.set(node.id, { ...node, childrenIds: node.childrenIds ?? [] });
    return nodes.get(node.id)!;
  };

  const addChild = (parentId: string | undefined, childId: string) => {
    if (!parentId) return;
    const parent = nodes.get(parentId);
    if (!parent) return;
    if (!parent.childrenIds.includes(childId)) {
      parent.childrenIds = [...parent.childrenIds, childId];
    }
  };

  const processNode = (node: any, parentId?: string): string | undefined => {
    if (!node) return undefined;

    if (node.type === 'directory') {
      const path = normalizePath(node.path ?? node.name) ?? '';
      const id = path ? `dir:${path}` : ROOT_NODE_ID;
      const directory = ensureNodeExists({
        id,
        name: node.name ?? (path ? path.split('/').pop() ?? path : 'root'),
        type: 'directory',
        path,
        parentId,
        childrenIds: nodes.get(id)?.childrenIds ?? [],
      });
      directory.parentId = parentId;
      if (parentId) addChild(parentId, id);
      if (Array.isArray(node.children)) {
        node.children.forEach((child: any) => processNode(child, id));
      }
      return id;
    }

    if (node.type === 'file') {
      const path = normalizePath(node.path ?? node.filePath ?? node.name);
      if (!path) return undefined;
      const fileId = lookup.byPath[path];
      const id = fileId ?? `file:${path}`;
      ensureNodeExists({
        id,
        name: node.name ?? path.split('/').pop() ?? path,
        type: 'file',
        path,
        parentId,
        childrenIds: [],
        fileId,
      });
      if (parentId) addChild(parentId, id);
      return id;
    }

    return undefined;
  };

  const rootId = processNode(treeData) ?? ROOT_NODE_ID;

  if (!nodes.has(rootId)) {
    ensureNodeExists({ id: rootId, name: 'root', type: 'directory', path: '', childrenIds: [] });
  }

  const rootChildren = [...(nodes.get(rootId)?.childrenIds ?? [])];

  return { nodes, rootChildren };
};

export const buildTreeFromFileList = (
  fileEntries: any[],
  lookup: FileLookup
): { nodes: Map<string, FileExplorerTreeNode>; rootChildren: string[] } => {
  const nodes = new Map<string, FileExplorerTreeNode>();

  const ensureNode = (id: string, attrs: Partial<FileExplorerTreeNode>) => {
    const existing = nodes.get(id);
    if (existing) {
      Object.assign(existing, attrs);
      if (!existing.childrenIds) existing.childrenIds = [];
      return existing;
    }
    const node: FileExplorerTreeNode = {
      id,
      name: attrs.name ?? id,
      type: attrs.type as any,
      path: attrs.path ?? '',
      parentId: attrs.parentId,
      fileId: attrs.fileId,
      childrenIds: attrs.childrenIds ?? [],
    };
    nodes.set(id, node);
    return node;
  };

  const root = ensureNode(ROOT_NODE_ID, {
    name: 'root',
    type: 'directory',
    path: '',
    childrenIds: [],
  });

  const addChild = (parent: FileExplorerTreeNode, childId: string) => {
    if (!parent.childrenIds.includes(childId)) {
      parent.childrenIds.push(childId);
    }
  };

  fileEntries.forEach(entry => {
    const rawPath = normalizePath(entry?.filePath ?? entry?.path ?? entry?.name);
    if (!rawPath) return;

    const segments = rawPath.split('/').filter(Boolean);
    let currentParent = root;
    let currentPath = '';

    segments.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const isFile = index === segments.length - 1;

      if (isFile) {
        const fileId = lookup.byPath[currentPath] ?? entry?.id ?? `file:${currentPath}`;
        const node = ensureNode(fileId, {
          name: entry?.name ?? segment,
          type: 'file',
          path: currentPath,
          parentId: currentParent.id,
          fileId: lookup.byPath[currentPath] ?? entry?.id,
          childrenIds: [],
        });
        addChild(currentParent, node.id);
      } else {
        const dirId = `dir:${currentPath}`;
        const node = ensureNode(dirId, {
          name: segment,
          type: 'directory',
          path: currentPath,
          parentId: currentParent.id,
          childrenIds: nodes.get(dirId)?.childrenIds ?? [],
        });
        addChild(currentParent, node.id);
        currentParent = node;
      }
    });
  });

  return {
    nodes,
    rootChildren: [...root.childrenIds],
  };
};

export interface NormalizeComponentOptions {
  fileId: string;
  filePath?: string;
  isFile?: boolean;
}

export const normalizeComponentData = (
  raw: any,
  options: NormalizeComponentOptions
): FileExplorerComponent | null => {
  if (!raw && !options.isFile) return null;

  let metadata = raw?.metadata;
  if (typeof metadata === 'string') {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = {};
    }
  }

  const id = raw?.id ?? (options.isFile ? options.fileId : undefined);
  if (!id) return null;

  const normalizedPath = normalizePath(raw?.filePath ?? raw?.file_path ?? options.filePath);
  const parentId = raw?.parentId ?? raw?.parent_id ?? (options.isFile ? undefined : options.fileId);
  const location = raw?.location ?? {};

  return {
    id,
    name: raw?.name ?? (normalizedPath ? normalizedPath.split('/').pop() ?? normalizedPath : 'Unnamed'),
    type: raw?.type ?? (options.isFile ? 'file' : 'unknown'),
    filePath: normalizedPath,
    parentId,
    location: {
      file: normalizedPath,
      startLine: location.startLine ?? raw?.start_line,
      endLine: location.endLine ?? raw?.end_line,
      startColumn: location.startColumn ?? raw?.start_column,
      endColumn: location.endColumn ?? raw?.end_column,
      start: location.start,
      end: location.end,
    },
    metadata,
    sourceCode: raw?.code ?? metadata?.code ?? raw?.source_code ?? metadata?.skeleton,
    description: metadata?.description ?? raw?.description ?? metadata?.documentTitle,
    relationships: raw?.relationships,
    _visible: true,
  };
};

export const buildFileChildrenMap = (
  components: FileExplorerComponent[],
  getFileNodeIdForComponent: (component: FileExplorerComponent) => string | undefined
): Map<string, Map<string, FileExplorerComponent[]>> => {
  const map = new Map<string, Map<string, FileExplorerComponent[]>>();

  components.forEach(component => {
    if (component.type === 'file') return;
    if (!component._visible) return;

    const fileId = getFileNodeIdForComponent(component);
    if (!fileId) return;

    if (!map.has(fileId)) {
      map.set(fileId, new Map());
    }

    const children = map.get(fileId)!;
    const parentKey = component.parentId ?? fileId;
    if (!children.has(parentKey)) {
      children.set(parentKey, []);
    }

    children.get(parentKey)!.push(component);
  });

  map.forEach(children => {
    children.forEach(list => {
      list.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type.localeCompare(b.type);
      });
    });
  });

  return map;
};

export const getComponentIconColor = (
  theme: Theme,
  getCodeComponentStyles: (theme: Theme, type: string) => { color?: string }
) => (type: string) => {
  const styles = getCodeComponentStyles(theme, type);
  return styles.color ?? theme.colors.foreground.primary;
};
