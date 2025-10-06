import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutName } from '../types';

type UpdateSettings = (project: string, settings: {
  filterText?: string;
  activeRelTypes?: string[];
  activeNodeTypes?: string[];
  layoutType?: LayoutName;
}) => void;

export const DEFAULT_REL_TYPES = ['imports', 'extends', 'implements', 'calls', 'contains'] as const;
export const DEFAULT_NODE_TYPES = ['file', 'class', 'function', 'method', 'interface', 'module', 'variable', 'property'] as const;

const ALLOWED_LAYOUTS: LayoutName[] = ['force', 'hierarchical', 'radial', 'tree', 'circular', 'dependency', 'grid'];

export const isAllowedLayout = (value: string | LayoutName): value is LayoutName =>
  ALLOWED_LAYOUTS.includes(value as LayoutName);

interface PreferencesOptions {
  projectPath: string | null;
  componentMapSettings: {
    filterText: string;
    activeRelTypes: string[];
    activeNodeTypes: string[];
    layoutType: LayoutName;
  } | null | undefined;
  externalFilterText?: string;
  updateComponentMapSettings: UpdateSettings;
}

export interface ComponentMapPreferences {
  filterText: string;
  setFilterText: (value: string) => void;
  activeRelTypes: Set<string>;
  toggleRelTypeFilter: (type: string) => void;
  activeNodeTypes: Set<string>;
  toggleNodeTypeFilter: (type: string) => void;
  layoutType: LayoutName;
  setLayoutType: (type: LayoutName) => void;
  preferencesReady: boolean;
}

export function useComponentMapPreferences({
  projectPath,
  componentMapSettings,
  externalFilterText,
  updateComponentMapSettings,
}: PreferencesOptions): ComponentMapPreferences {
  const [filterText, setFilterText] = useState(
    externalFilterText || componentMapSettings?.filterText || ''
  );
  const [activeRelTypes, setActiveRelTypes] = useState<Set<string>>(
    () => new Set(componentMapSettings?.activeRelTypes || DEFAULT_REL_TYPES)
  );
  const [activeNodeTypes, setActiveNodeTypes] = useState<Set<string>>(
    () => new Set(componentMapSettings?.activeNodeTypes || DEFAULT_NODE_TYPES)
  );
  const initialLayout = componentMapSettings?.layoutType;
  const [layoutType, setLayoutType] = useState<LayoutName>(
    isAllowedLayout(initialLayout || '') ? (initialLayout as LayoutName) : 'force'
  );
  const [preferencesReady, setPreferencesReady] = useState(false);

  const loadedSnapshotRef = useRef<Snapshot | null>(null);
  const persistedSnapshotRef = useRef<Snapshot | null>(null);

  useEffect(() => {
    if (!projectPath) {
      loadedSnapshotRef.current = null;
      persistedSnapshotRef.current = null;
      setPreferencesReady(false);
      return;
    }

    if (!componentMapSettings) {
      if (!preferencesReady) setPreferencesReady(true);
      return;
    }

    const snapshotFromStore: Snapshot = {
      filterText: componentMapSettings.filterText,
      rel: [...componentMapSettings.activeRelTypes].sort(),
      node: [...componentMapSettings.activeNodeTypes].sort(),
      layout: isAllowedLayout(componentMapSettings.layoutType)
        ? (componentMapSettings.layoutType as LayoutName)
        : 'force',
    };

    if (!loadedSnapshotRef.current || !snapshotsEqual(snapshotFromStore, loadedSnapshotRef.current)) {
      loadedSnapshotRef.current = snapshotFromStore;
      persistedSnapshotRef.current = snapshotFromStore;
      setFilterText(snapshotFromStore.filterText);
      setActiveRelTypes(new Set(snapshotFromStore.rel));
      setActiveNodeTypes(new Set(snapshotFromStore.node));
      setLayoutType(snapshotFromStore.layout);
    }

    if (!preferencesReady) setPreferencesReady(true);
  }, [projectPath, componentMapSettings, preferencesReady]);

  useEffect(() => {
    if (!projectPath || !preferencesReady) return;

    const snapshot: Snapshot = {
      filterText,
      rel: [...activeRelTypes].sort(),
      node: [...activeNodeTypes].sort(),
      layout: layoutType,
    };

    if (
      persistedSnapshotRef.current &&
      snapshotsEqual(snapshot, persistedSnapshotRef.current)
    ) {
      return;
    }

    persistedSnapshotRef.current = snapshot;
    loadedSnapshotRef.current = snapshot;
    updateComponentMapSettings(projectPath, {
      filterText: snapshot.filterText,
      activeRelTypes: snapshot.rel,
      activeNodeTypes: snapshot.node,
      layoutType: snapshot.layout,
    });
  }, [projectPath, preferencesReady, filterText, activeRelTypes, activeNodeTypes, layoutType, updateComponentMapSettings]);

  useEffect(() => {
    if (externalFilterText !== undefined) {
      setFilterText(externalFilterText);
    }
  }, [externalFilterText]);

  const toggleRelTypeFilter = useCallback((type: string) => {
    setActiveRelTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const toggleNodeTypeFilter = useCallback((type: string) => {
    setActiveNodeTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      filterText,
      setFilterText,
      activeRelTypes,
      toggleRelTypeFilter,
      activeNodeTypes,
      toggleNodeTypeFilter,
      layoutType,
      setLayoutType,
      preferencesReady,
    }),
    [
      filterText,
      activeRelTypes,
      toggleRelTypeFilter,
      activeNodeTypes,
      toggleNodeTypeFilter,
      layoutType,
      preferencesReady,
    ]
  );
}

type Snapshot = {
  filterText: string;
  rel: string[];
  node: string[];
  layout: LayoutName;
};

function snapshotsEqual(a: Snapshot, b: Snapshot): boolean {
  return (
    a.filterText === b.filterText &&
    arraysEqual(a.rel, b.rel) &&
    arraysEqual(a.node, b.node) &&
    a.layout === b.layout
  );
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
