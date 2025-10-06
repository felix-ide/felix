import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFileTree, getFileComponents, getFileComponentDetails } from '@client/shared/api/filesClient';
import type {
  FileExplorerComponent,
  FileExplorerTreeNode,
  FileLookup,
} from '../fileExplorerData';
import {
  buildFileChildrenMap,
  buildFileTreeState,
  buildTreeFromFileList,
  createFileLookup,
  normalizeComponentData,
  normalizePath,
} from '../fileExplorerData';

type Component = FileExplorerComponent;
type TreeNode = FileExplorerTreeNode;

export interface UseFileExplorerDataState {
  components: Component[];
  fileTree: { nodes: Map<string, TreeNode>; rootChildren: string[] };
  fileLookup: FileLookup;
  fileChildrenMap: Map<string, Map<string, Component[]>>;
  fileComponentStatus: Record<string, { status: 'idle' | 'loading' | 'loaded' | 'error'; error?: string }>;
  isLoading: boolean;
  error: string | null;
}

export interface UseFileExplorerDataActions {
  loadInitialData: () => Promise<void>;
  ensureFileComponentsLoaded: (node: TreeNode) => Promise<Component[] | null>;
  upsertComponents: (incoming: Component[]) => void;
  registerVisibilityCascade: (cascade: (list: Component[]) => Component[]) => void;
}

export interface UseFileExplorerDataOptions {
  onComponentsChanged?: (components: Component[]) => void;
}

export function useFileExplorerData({
  onComponentsChanged,
}: UseFileExplorerDataOptions = {}): [UseFileExplorerDataState, UseFileExplorerDataActions] {
  const [components, setComponents] = useState<Component[]>([]);
  const [fileTree, setFileTree] = useState<{ nodes: Map<string, TreeNode>; rootChildren: string[] }>(() => ({
    nodes: new Map(),
    rootChildren: [],
  }));
  const [fileLookup, setFileLookup] = useState<FileLookup>({ byPath: {}, byId: {} });
  const [fileComponentStatus, setFileComponentStatus] = useState<Record<string, { status: 'idle' | 'loading' | 'loaded' | 'error'; error?: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibilityCascadeRef = useRef<((list: Component[]) => Component[]) | null>(null);

  const componentIndex = useMemo(() => new Map(components.map(component => [component.id, component])), [components]);

  const getFileNodeIdForComponent = useCallback((component: Component): string | undefined => {
    if (component.type === 'file') return component.id;

    const visited = new Set<string>();
    let current: Component | undefined = component;

    while (current && current.parentId) {
      if (visited.has(current.parentId)) break;
      visited.add(current.parentId);
      const parent = componentIndex.get(current.parentId);
      if (!parent) break;
      if (parent.type === 'file') return parent.id;
      current = parent;
    }

    if (component.filePath) {
      const normalized = normalizePath(component.filePath);
      if (!normalized) return undefined;
      return fileLookup.byPath[normalized] ?? `file:${normalized}`;
    }

    return undefined;
  }, [componentIndex, fileLookup.byPath]);

  const fileChildrenMap = useMemo(
    () => buildFileChildrenMap(components, getFileNodeIdForComponent),
    [components, getFileNodeIdForComponent]
  );

  const applyVisibilityCascade = useCallback((list: Component[]) => {
    const cascade = visibilityCascadeRef.current;
    if (!cascade) return list;
    return cascade(list);
  }, []);

  const upsertComponents = useCallback((incoming: Component[]) => {
    setComponents(prev => {
      const map = new Map(prev.map(component => [component.id, component]));
      incoming.forEach(component => {
        map.set(component.id, component);
      });
      const merged = Array.from(map.values());
      const updated = applyVisibilityCascade(merged);
      onComponentsChanged?.(updated);
      return updated;
    });
  }, [applyVisibilityCascade, onComponentsChanged]);

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [treeResponse, filesResponse] = await Promise.all([
        getFileTree('', 6).catch(() => null),
        getFileComponents().catch(() => ({ files: [] })),
      ]);

      const treeData = treeResponse && 'data' in (treeResponse as any)
        ? (treeResponse as any).data
        : treeResponse;

      const fileEntries = filesResponse && 'files' in (filesResponse as any)
        ? (filesResponse as any).files
        : [];

      const lookup = createFileLookup(fileEntries);
      let treeState = buildFileTreeState(treeData, lookup);

      if (treeState.rootChildren.length === 0 && Array.isArray(fileEntries) && fileEntries.length > 0) {
        treeState = buildTreeFromFileList(fileEntries, lookup);
      }

      setFileLookup(lookup);
      setFileTree(treeState);
      setComponents([]);
      setFileComponentStatus({});
    } catch (err) {
      console.error('Failed to load file tree:', err);
      setFileTree({ nodes: new Map(), rootChildren: [] });
      setComponents([]);
      setFileComponentStatus({});
      setError(err instanceof Error ? err.message : 'Failed to load file tree');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const ensureFileComponentsLoaded = useCallback(async (node: TreeNode): Promise<Component[] | null> => {
    if (node.type !== 'file') return null;

    const lookupId = node.fileId || (node.path ? fileLookup.byPath[node.path] : undefined) || node.id;
    if (!lookupId) return null;

    const hasRegisteredFile = Boolean(node.fileId) || Boolean(fileLookup.byId[lookupId]);
    if (!hasRegisteredFile && lookupId.startsWith('file:')) {
      return null;
    }

    const currentStatus = fileComponentStatus[lookupId]?.status;
    if (currentStatus === 'loaded') {
      return components.filter(component => component.id === lookupId || getFileNodeIdForComponent(component) === lookupId);
    }
    if (currentStatus === 'loading') return null;

    setFileComponentStatus(prev => ({ ...prev, [lookupId]: { status: 'loading' } }));

    try {
      const details = await getFileComponentDetails(lookupId);
      const fileData = details?.file || { id: lookupId, name: node.name, type: 'file', filePath: node.path };
      const filePath = normalizePath(fileData.filePath || fileData.path || node.path);

      const normalizedFile = normalizeComponentData(fileData, { fileId: lookupId, filePath, isFile: true });

      const rawComponents: any[] = Array.isArray(details?.components) ? details.components : [];
      const normalizedComponents = rawComponents
        .map(child => normalizeComponentData(child, { fileId: lookupId, filePath }))
        .filter((comp): comp is Component => Boolean(comp))
        .map(comp => (!comp.parentId ? { ...comp, parentId: lookupId } : comp));

      const incoming = normalizedFile ? [normalizedFile, ...normalizedComponents] : normalizedComponents;
      upsertComponents(incoming);

      setFileComponentStatus(prev => ({ ...prev, [lookupId]: { status: 'loaded' } }));
      return incoming;
    } catch (err) {
      console.error(`Failed to load components for file ${lookupId}:`, err);
      setFileComponentStatus(prev => ({
        ...prev,
        [lookupId]: {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        },
      }));
      return null;
    }
  }, [components, fileComponentStatus, fileLookup, getFileNodeIdForComponent, upsertComponents]);

  useEffect(() => {
    if (!onComponentsChanged) return;
    onComponentsChanged(components);
  }, [components, onComponentsChanged]);

  const state: UseFileExplorerDataState = {
    components,
    fileTree,
    fileLookup,
    fileChildrenMap,
    fileComponentStatus,
    isLoading,
    error,
  };

  const actions: UseFileExplorerDataActions = {
    loadInitialData,
    ensureFileComponentsLoaded,
    upsertComponents,
    registerVisibilityCascade: (cascade) => {
      visibilityCascadeRef.current = cascade;
      setComponents(prev => (cascade ? cascade(prev) : prev));
    },
  };

  return [state, actions];
}

export function useFileExplorerVisibilityCascade(
  shouldComponentBeVisible: (component: Component, searchLower: string) => boolean,
  filterText: string,
): (list: Component[]) => Component[] {
  return useCallback((list: Component[]) => {
    const searchLower = filterText.toLowerCase();
    const idToIndex = new Map<string, number>();
    const updated = list.map((component, index) => {
      idToIndex.set(component.id, index);
      const visible = shouldComponentBeVisible(component, searchLower);
      return { ...component, _visible: visible };
    });

    updated.forEach(component => {
      if (component._visible && component.parentId) {
        let parentId: string | undefined | null = component.parentId;
        while (parentId) {
          const parentIndex = idToIndex.get(parentId);
          if (parentIndex === undefined) break;
          if (updated[parentIndex]._visible) break;
          updated[parentIndex] = { ...updated[parentIndex], _visible: true };
          parentId = updated[parentIndex].parentId ?? null;
        }
      }
    });

    return updated;
  }, [filterText, shouldComponentBeVisible]);
}
