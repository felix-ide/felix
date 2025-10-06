import { useState, useEffect, useMemo, useCallback } from 'react';
import { felixService } from '@/services/felixService';
import { useTheme, getCodeComponentStyles } from '@felix/theme-system';
import { FileCode, Box, Hash, Braces, FunctionSquare, Type, Package, Variable } from 'lucide-react';
import mermaid from 'mermaid';

import {
  FileExplorerComponent,
  FileExplorerTreeNode,
  getComponentIconColor,
  normalizePath,
} from './fileExplorerData';
import {
  useFileExplorerData,
  useFileExplorerVisibilityCascade,
} from './hooks/useFileExplorerData';
import { FileExplorerSidebar } from './FileExplorerSidebar';
import type { TypeFilterOption } from './FileExplorerSidebar';
import { ComponentDetailsEmptyState, ComponentDetailsPanel } from './ComponentDetailsPanel';
import type { ComponentRelationship } from './types';

type Component = FileExplorerComponent;
type TreeNode = FileExplorerTreeNode;

const COLOR_FALLBACKS = {
  primary: '#0ea5e9',
  secondary: '#6366f1',
  accent: '#22d3ee',
  info: '#38bdf8',
  success: '#22c55e',
  error: '#ef4444',
  neutral: '#94a3b8',
  backgroundLight: '#ffffff',
  backgroundDark: '#0f172a',
  textLight: '#0f172a',
  textDark: '#f8fafc',
  textMuted: '#94a3b8',
};

const toHex = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');

const parseColorToHex = (color: string | undefined, fallback: string): string => {
  if (!color) return fallback;
  const trimmed = color.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('#')) {
    if (trimmed.length === 4) {
      const [r, g, b] = [trimmed[1], trimmed[2], trimmed[3]];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return trimmed;
  }
  const rgbMatch = trimmed.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map((part) => Number(part.trim()));
    if (parts.length >= 3 && parts.every((v) => !Number.isNaN(v))) {
      const [r, g, b] = parts;
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
  }
  const hslMatch = trimmed.match(/hsla?\(([^)]+)\)/i);
  if (hslMatch) {
    const [hStr, sStr, lStr] = hslMatch[1].split(',').map((part) => part.trim());
    if (hStr && sStr && lStr) {
      const h = Number(hStr);
      const s = Number(sStr.replace('%', '')) / 100;
      const l = Number(lStr.replace('%', '')) / 100;
      if (![h, s, l].some((v) => Number.isNaN(v))) {
        const hue = ((h % 360) + 360) % 360;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
        const m = l - c / 2;
        let [r1, g1, b1] = [0, 0, 0];
        if (hue < 60) [r1, g1, b1] = [c, x, 0];
        else if (hue < 120) [r1, g1, b1] = [x, c, 0];
        else if (hue < 180) [r1, g1, b1] = [0, c, x];
        else if (hue < 240) [r1, g1, b1] = [0, x, c];
        else if (hue < 300) [r1, g1, b1] = [x, 0, c];
        else [r1, g1, b1] = [c, 0, x];
        const r = Math.round((r1 + m) * 255);
        const g = Math.round((g1 + m) * 255);
        const b = Math.round((b1 + m) * 255);
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      }
    }
  }
  return fallback;
};

const readCssVar = (variable: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return parseColorToHex(value, fallback);
};

const mixHex = (sourceHex: string, targetHex: string, ratio: number) => {
  const clean = (hex: string) => (hex.startsWith('#') ? hex.slice(1) : hex);
  const src = clean(sourceHex);
  const dst = clean(targetHex);
  if (src.length !== 6 || dst.length !== 6) return sourceHex;
  const blend = (index: number) => {
    const s = parseInt(src.slice(index, index + 2), 16);
    const t = parseInt(dst.slice(index, index + 2), 16);
    return toHex(s * (1 - ratio) + t * ratio);
  };
  return `#${blend(0)}${blend(2)}${blend(4)}`;
};

const adjustForTheme = (
  hex: string,
  isDark: boolean,
  options: { darkTarget?: string; lightTarget?: string; darkRatio?: number; lightRatio?: number } = {}
) => {
  const {
    darkTarget = COLOR_FALLBACKS.backgroundDark,
    lightTarget = COLOR_FALLBACKS.backgroundLight,
    darkRatio = 0.45,
    lightRatio = 0.4,
  } = options;
  const target = isDark ? darkTarget : lightTarget;
  const ratio = isDark ? darkRatio : lightRatio;
  return mixHex(hex, target, ratio);
};

export function FileExplorerView() {
  const { theme } = useTheme();
  const typeFilters = useMemo<TypeFilterOption[]>(() => [
    { type: 'file', label: 'Files' },
    { type: 'class', label: 'Classes' },
    { type: 'function', label: 'Functions' },
    { type: 'method', label: 'Methods' },
    { type: 'section', label: 'Sections' },
    { type: 'comment', label: 'Comments' },
    { type: 'module', label: 'Modules' },
    { type: 'variable', label: 'Variables' },
    { type: 'constant', label: 'Constants' },
    { type: 'import', label: 'Imports/Links' },
  ], []);
  const [dataState, dataActions] = useFileExplorerData();
  const { components, fileTree, fileLookup, fileChildrenMap, fileComponentStatus, isLoading, error: dataError } = dataState;
  const { loadInitialData, ensureFileComponentsLoaded, registerVisibilityCascade } = dataActions;
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [expandedComponentIds, setExpandedComponentIds] = useState<Set<string>>(new Set());
  const [expandedTreeNodes, setExpandedTreeNodes] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<string>>(() => new Set(typeFilters.map(option => option.type)));
  const [selectedComponentContext, setSelectedComponentContext] = useState<any>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'code' | 'tree' | 'raw'>('overview');
  const [mermaidChart, setMermaidChart] = useState<string>('');
  const [relationships, setRelationships] = useState<ComponentRelationship[]>([]);
  const themeKey = useMemo(() => `${theme?.id ?? 'default'}-${theme.type}`, [theme?.id, theme.type]);

  const shouldComponentBeVisible = useCallback((component: Component, searchLower: string) => {
    if (component.type !== 'file' && !activeTypes.has(component.type)) return false;
    if (!filterText) return true;
    if (component.type === 'file') {
      const nameMatch = component.name?.toLowerCase().includes(searchLower) ?? false;
      const pathMatch = component.filePath?.toLowerCase().includes(searchLower) ?? false;
      return nameMatch || pathMatch;
    }
    const nameMatch = component.name?.toLowerCase().includes(searchLower) ?? false;
    const descMatch = component.description?.toLowerCase().includes(searchLower) ?? false;
    const pathMatch = component.filePath?.toLowerCase().includes(searchLower) ?? false;
    return nameMatch || descMatch || pathMatch;
  }, [activeTypes, filterText]);

  const visibilityCascade = useFileExplorerVisibilityCascade(shouldComponentBeVisible, filterText);

  useEffect(() => {
    registerVisibilityCascade(visibilityCascade);
  }, [registerVisibilityCascade, visibilityCascade]);

  const initializeExplorer = useCallback(async () => {
    setExpandedTreeNodes(new Set());
    setExpandedComponentIds(new Set());
    setSelectedComponentId(null);
    setSelectedComponentContext(null);
    setRelationships([]);
    setMermaidChart('');
    await loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    void initializeExplorer();

    const handleProjectRestored = () => {
      void initializeExplorer();
    };

    window.addEventListener('project-restored', handleProjectRestored);
    return () => window.removeEventListener('project-restored', handleProjectRestored);
  }, [initializeExplorer]);

  useEffect(() => {
    loadInitialData();

    const handleProjectRestored = () => {
      loadInitialData();
    };

    window.addEventListener('project-restored', handleProjectRestored);
    return () => window.removeEventListener('project-restored', handleProjectRestored);
  }, [loadInitialData]);

  const toggleTreeNode = useCallback((nodeId: string) => {
    setExpandedTreeNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const toggleComponentExpansion = useCallback((componentId: string) => {
    setExpandedComponentIds(prev => {
      const next = new Set(prev);
      if (next.has(componentId)) {
        next.delete(componentId);
      } else {
        next.add(componentId);
      }
      return next;
    });
  }, []);

  const selectComponent = async (componentId: string) => {
    const treeNodeForSelection = fileTree.nodes.get(componentId);
    let freshlyLoaded: Component[] | null = null;
    let component = components.find(c => c.id === componentId);
    if (!component && treeNodeForSelection && treeNodeForSelection.type === 'file') {
      freshlyLoaded = await ensureFileComponentsLoaded(treeNodeForSelection);
      if (freshlyLoaded) {
        component = freshlyLoaded.find(item => item.id === componentId) || component;
      }
    }

    const findComponentById = (id: string | undefined) => {
      if (!id) return undefined;
      return (freshlyLoaded?.find(c => c.id === id)) || components.find(c => c.id === id);
    };

    if (component) {
      const fileNodeId = getFileNodeIdForComponent(component);
      expandTreeForFile(fileNodeId);

      let parentId = component.parentId;
      while (parentId) {
        setExpandedComponentIds(prev => new Set(prev).add(parentId!));
        const parent = findComponentById(parentId);
        parentId = parent?.parentId;
      }
    }

    setSelectedComponentId(componentId);

    if (componentId) {
      setIsLoadingContext(true);
      try {
        const context = await felixService.getContext(componentId, {
          depth: 3,
          includeSource: true,
          includeRelationships: true,
          includeDocumentation: true,
          includeMetadata: true,
          format: 'markdown',
        });
        setSelectedComponentContext(context);

        const relationshipList = Array.isArray(context?.relationships) ? context.relationships : [];
        const relationshipData: ComponentRelationship[] = [];

        for (const rel of relationshipList) {
          const sourceId = rel?.sourceId || rel?.source?.id;
          const targetId = rel?.targetId || rel?.target?.id;
          const isSource = sourceId === componentId;
          const relatedComponentId = isSource ? targetId : sourceId;
          const relatedComponent = findComponentById(relatedComponentId);
          const fallbackName = rel?.target?.name || rel?.source?.name || relatedComponentId;
          const connection = relatedComponent
            ? `${relatedComponent.name} (${relatedComponent.type})`
            : fallbackName;

          if (!connection) continue;

          relationshipData.push({
            type: rel?.type || 'unknown',
            connection,
            source: sourceId,
            target: targetId,
            direction: isSource ? 'outgoing' : 'incoming',
            relatedComponent: relatedComponent ?? undefined,
          });
        }

        setRelationships(relationshipData);
        generateMermaidChart(componentId);
      } catch (error) {
        console.error('Failed to load component context:', error);
        setSelectedComponentContext(null);
        setRelationships([]);
      } finally {
        setIsLoadingContext(false);
      }
    } else {
      setSelectedComponentContext(null);
      setRelationships([]);
      setMermaidChart('');
    }
  };

  const generateMermaidChart = (componentId: string) => {
    if (!componentId) {
      setMermaidChart('');
      return;
    }
    
    const selectedComponent = components.find(c => c.id === componentId);
    if (!selectedComponent) {
      setMermaidChart('');
      return;
    }
    
    // Build a FOCUSED tree around the selected component only
    const addedNodes = new Set<string>();
    const addedEdges = new Set<string>();
    let chart = 'graph TD\n';
    
    // Helper function to get node ID
    const getNodeId = (comp: Component) => `comp_${comp.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    // Get the selected component's immediate context
    const parent = selectedComponent.parentId ? components.find(c => c.id === selectedComponent.parentId) : null;
    const children = components.filter(c => c.parentId === selectedComponent.id);
    const siblings = parent ? components.filter(c => c.parentId === parent.id && c.id !== selectedComponent.id) : [];
    
    // Add the selected component
    const selectedNodeId = getNodeId(selectedComponent);
    const displayName = selectedComponent.name.length > 25 ? selectedComponent.name.substring(0, 22) + '...' : selectedComponent.name;
    chart += `    ${selectedNodeId}["${displayName}\\n(${selectedComponent.type})"]:::selected\n`;
    addedNodes.add(selectedNodeId);
    
    // Add parent if exists
    if (parent) {
      const parentNodeId = getNodeId(parent);
      const parentDisplayName = parent.name.length > 25 ? parent.name.substring(0, 22) + '...' : parent.name;
      chart += `    ${parentNodeId}["${parentDisplayName}\\n(${parent.type})"]:::parent\n`;
      chart += `    ${parentNodeId} --> ${selectedNodeId}\n`;
      addedNodes.add(parentNodeId);
      addedEdges.add(`${parentNodeId}->${selectedNodeId}`);
    }
    
    // Add children (limit to prevent huge width)
    children.slice(0, 8).forEach(child => {
      const childNodeId = getNodeId(child);
      const childDisplayName = child.name.length > 20 ? child.name.substring(0, 17) + '...' : child.name;
      chart += `    ${childNodeId}["${childDisplayName}\\n(${child.type})"]:::child\n`;
      chart += `    ${selectedNodeId} --> ${childNodeId}\n`;
      addedNodes.add(childNodeId);
      addedEdges.add(`${selectedNodeId}->${childNodeId}`);
      
      // Add grandchildren for the first few children only
      if (children.indexOf(child) < 3) {
        const grandchildren = components.filter(c => c.parentId === child.id);
        grandchildren.slice(0, 4).forEach(grandchild => {
          const grandchildNodeId = getNodeId(grandchild);
          const grandchildDisplayName = grandchild.name.length > 15 ? grandchild.name.substring(0, 12) + '...' : grandchild.name;
          chart += `    ${grandchildNodeId}["${grandchildDisplayName}\\n(${grandchild.type})"]:::grandchild\n`;
          chart += `    ${childNodeId} --> ${grandchildNodeId}\n`;
          addedNodes.add(grandchildNodeId);
          addedEdges.add(`${childNodeId}->${grandchildNodeId}`);
        });
      }
    });
    
    // Show if there are more children
    if (children.length > 8) {
      const moreNodeId = 'more_children';
      chart += `    ${moreNodeId}["... ${children.length - 8} more\\nchildren"]:::more\n`;
      chart += `    ${selectedNodeId} --> ${moreNodeId}\n`;
    }
    
    // Add a few siblings for context (limit to 3)
    siblings.slice(0, 3).forEach(sibling => {
      const siblingNodeId = getNodeId(sibling);
      const siblingDisplayName = sibling.name.length > 20 ? sibling.name.substring(0, 17) + '...' : sibling.name;
      chart += `    ${siblingNodeId}["${siblingDisplayName}\\n(${sibling.type})"]:::sibling\n`;
      if (parent) {
        const parentNodeId = getNodeId(parent);
        chart += `    ${parentNodeId} --> ${siblingNodeId}\n`;
      }
      addedNodes.add(siblingNodeId);
    });
    
    // Show if there are more siblings
    if (siblings.length > 3 && parent) {
      const moreSiblingsId = 'more_siblings';
      const parentNodeId = getNodeId(parent);
      chart += `    ${moreSiblingsId}["... ${siblings.length - 3} more\\nsiblings"]:::more\n`;
      chart += `    ${parentNodeId} --> ${moreSiblingsId}\n`;
    }
    
    // Add key relationships (limit to top 3 types)
    if (relationships.length > 0) {
      const relGroups: { [key: string]: any[] } = {};
      relationships.forEach(rel => {
        if (!relGroups[rel.type]) relGroups[rel.type] = [];
        relGroups[rel.type].push(rel);
      });
      
      // Show top 3 relationship types only
      Object.entries(relGroups).slice(0, 3).forEach(([type, rels]) => {
        const relNodeId = `rel_${type.toLowerCase()}`;
        chart += `    ${relNodeId}["${type.replace(/_/g, ' ')}\\n(${rels.length} connections)"]:::relationship\n`;
        chart += `    ${selectedNodeId} -.-> ${relNodeId}\n`;
        addedNodes.add(relNodeId);
      });
    }
    
    // Add styling derived from theme tokens
    const isDark = theme.type === 'dark';
    const basePrimary = readCssVar('--color-primary-400', COLOR_FALLBACKS.primary);
    const baseSecondary = readCssVar('--color-secondary-400', COLOR_FALLBACKS.secondary);
    const baseAccent = readCssVar('--color-accent-400', COLOR_FALLBACKS.accent);
    const baseInfo = readCssVar('--color-info-400', COLOR_FALLBACKS.info);
    const baseSuccess = readCssVar('--color-success-400', COLOR_FALLBACKS.success);
    const baseError = readCssVar('--color-error-400', COLOR_FALLBACKS.error);
    const baseNeutral = readCssVar('--color-border-tertiary', COLOR_FALLBACKS.neutral);
    const backgroundBase = readCssVar('--color-background-tertiary', COLOR_FALLBACKS.backgroundDark);
    const textPrimary = readCssVar(
      '--color-foreground-primary',
      isDark ? COLOR_FALLBACKS.textDark : COLOR_FALLBACKS.textLight
    );
    const textMuted = readCssVar('--color-foreground-muted', COLOR_FALLBACKS.textMuted);

    const selectedStroke = basePrimary;
    const selectedBg = adjustForTheme(basePrimary, isDark, {
      darkTarget: backgroundBase,
      darkRatio: 0.55,
      lightRatio: 0.35,
    });
    const parentStroke = baseSecondary;
    const parentBg = adjustForTheme(baseSecondary, isDark, {
      darkTarget: backgroundBase,
      darkRatio: 0.5,
      lightRatio: 0.4,
    });
    const childStroke = baseAccent;
    const childBg = adjustForTheme(baseAccent, isDark, {
      darkTarget: backgroundBase,
      darkRatio: 0.5,
      lightRatio: 0.4,
    });
    const grandchildStroke = baseInfo;
    const grandchildBg = adjustForTheme(baseInfo, isDark, {
      darkTarget: backgroundBase,
      darkRatio: 0.45,
      lightRatio: 0.45,
    });
    const siblingStroke = baseSuccess;
    const siblingBg = adjustForTheme(baseSuccess, isDark, {
      darkTarget: backgroundBase,
      darkRatio: 0.45,
      lightRatio: 0.4,
    });
    const relationshipStroke = baseError;
    const relationshipBg = adjustForTheme(baseError, isDark, {
      darkTarget: backgroundBase,
      darkRatio: 0.35,
      lightRatio: 0.45,
    });
    const moreStroke = baseNeutral;
    const moreBg = adjustForTheme(baseNeutral, isDark, {
      darkTarget: backgroundBase,
      darkRatio: 0.25,
      lightRatio: 0.3,
    });

    chart += `\n    classDef selected fill:${selectedBg},stroke:${selectedStroke},stroke-width:3px,color:${textPrimary},font-weight:bold\n`;
    chart += `    classDef parent fill:${parentBg},stroke:${parentStroke},stroke-width:2.5px,color:${textPrimary}\n`;
    chart += `    classDef child fill:${childBg},stroke:${childStroke},stroke-width:2px,color:${textPrimary}\n`;
    chart += `    classDef grandchild fill:${grandchildBg},stroke:${grandchildStroke},stroke-width:1.5px,color:${textPrimary}\n`;
    chart += `    classDef sibling fill:${siblingBg},stroke:${siblingStroke},stroke-width:1.5px,color:${textPrimary}\n`;
    chart += `    classDef relationship fill:${relationshipBg},stroke:${relationshipStroke},stroke-width:1px,color:${textPrimary},stroke-dasharray:5 5\n`;
    chart += `    classDef more fill:${moreBg},stroke:${moreStroke},stroke-width:1px,color:${textMuted},stroke-dasharray:3 3\n`;
    
    setMermaidChart(chart);
  };

  // Initialize mermaid
  useEffect(() => {
    const fontFamily = (() => {
      if (typeof window === 'undefined') return 'Inter, system-ui, sans-serif';
      const styles = getComputedStyle(document.documentElement);
      return (
        styles.getPropertyValue('--font-sans').trim() ||
        styles.getPropertyValue('--font-family-sans').trim() ||
        'Inter, system-ui, sans-serif'
      );
    })();

    const isDark = theme.type === 'dark';
    const baseBorder = readCssVar('--color-border-primary', COLOR_FALLBACKS.neutral);
    const baseLine = readCssVar('--color-border-secondary', COLOR_FALLBACKS.neutral);
    const background = readCssVar(
      '--color-background-secondary',
      isDark ? COLOR_FALLBACKS.backgroundDark : COLOR_FALLBACKS.backgroundLight
    );
    const textColor = readCssVar(
      '--color-foreground-primary',
      isDark ? COLOR_FALLBACKS.textDark : COLOR_FALLBACKS.textLight
    );

    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
      },
      themeVariables: {
        fontFamily,
        fontSize: '14px',
        primaryColor: background,
        primaryTextColor: textColor,
        primaryBorderColor: baseBorder,
        secondaryColor: background,
        secondaryTextColor: textColor,
        secondaryBorderColor: baseBorder,
        lineColor: baseLine,
        textColor,
        nodeBorder: baseBorder,
        clusterBorder: baseBorder,
        edgeLabelBackground: background,
      },
      maxEdges: 2000,
    });
  }, [themeKey]);

  // Re-generate chart when component or relationships change
  useEffect(() => {
    if (selectedComponentId && relationships.length >= 0) {
      generateMermaidChart(selectedComponentId);
    }
  }, [selectedComponentId, relationships, components, themeKey]);

  const toggleTypeFilter = (type: string) => {
    setActiveTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const getComponentIcon = (type: string) => {
    const icons: Record<string, any> = {
      file: FileCode,
      class: Box,
      function: FunctionSquare,
      method: Hash,
      module: Package,
      variable: Variable,
      property: Type,
      interface: Braces
    };
    
    return icons[type] || FileCode;
  };

  const getComponentColor = useMemo<((type: string) => string)>(
    () => getComponentIconColor(theme, getCodeComponentStyles),
    [theme]
  );

  const componentIndex = useMemo(
    () => new Map(components.map(component => [component.id, component])),
    [components]
  );

  const getFileNodeIdForComponent = (component: Component): string | undefined => {
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
  };

  const expandTreeForFile = (fileId?: string) => {
    if (!fileId) return;
    const toExpand: string[] = [];
    let current: TreeNode | undefined = fileTree.nodes.get(fileId);
    while (current) {
      if (current.id !== '__root__') {
        toExpand.push(current.id);
      }
      if (!current.parentId) break;
      current = fileTree.nodes.get(current.parentId);
    }
    if (toExpand.length === 0) return;
    setExpandedTreeNodes(prev => {
      const next = new Set(prev);
      toExpand.forEach(id => next.add(id));
      return next;
    });
  };

  const selectedComponent = selectedComponentId 
    ? components.find(c => c.id === selectedComponentId)
    : null;

  return (
    <div className="h-full flex bg-background">
      <FileExplorerSidebar
        filterText={filterText}
        onFilterTextChange={(value) => setFilterText(value)}
        activeTypes={activeTypes}
        onToggleTypeFilter={toggleTypeFilter}
        typeFilters={typeFilters}
        fileTree={fileTree}
        fileChildrenMap={fileChildrenMap}
        fileComponentStatus={fileComponentStatus}
        expandedTreeNodes={expandedTreeNodes}
        onToggleTreeNode={toggleTreeNode}
        expandedComponentIds={expandedComponentIds}
        onToggleComponent={toggleComponentExpansion}
        ensureFileComponentsLoaded={ensureFileComponentsLoaded}
        onSelectComponent={selectComponent}
        selectedComponentId={selectedComponentId}
        isLoading={isLoading}
        dataError={dataError}
        getComponentColor={getComponentColor}
        getComponentIcon={getComponentIcon}
      />
      
      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col bg-background">
        {selectedComponent ? (
          <ComponentDetailsPanel
            component={selectedComponent}
            components={components}
            context={selectedComponentContext}
            relationships={relationships}
            selectedTab={selectedTab}
            onTabChange={(tab) => setSelectedTab(tab)}
            isLoadingContext={isLoadingContext}
            theme={theme}
            themeKey={themeKey}
            getComponentIcon={getComponentIcon}
            getComponentColor={getComponentColor}
            mermaidChart={mermaidChart}
            onSelectComponent={selectComponent}
          />
        ) : (
          <ComponentDetailsEmptyState />
        )}
      </div>
    </div>
  );
}
