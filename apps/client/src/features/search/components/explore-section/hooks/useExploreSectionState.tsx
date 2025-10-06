import { useState, useEffect, useRef, useCallback } from 'react';
import { felixService } from '@/services/felixService';
import { useProjectStore } from '@client/features/projects/state/projectStore';
import { useVisualizationStore } from '@client/features/visualization/state/visualizationStore';
import type { ExploreView } from '@/types/components';
import type { GuardrailInfo } from '@client/shared/api/searchClient';
import type {
  ContextData,
  ContextOptions,
  ExploreSearchFilters,
  SearchResult,
} from '../types';

type ReactKeyboardEvent<T = Element> = import('react').KeyboardEvent<T>;

export interface ExploreSectionState {
  activeView: ExploreView;
  setActiveView: (view: ExploreView) => void;
  activeWorkingSetItem: string | null;
  setActiveWorkingSetItem: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  searchError: string | null;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (value: boolean) => void;
  showSearchOverlay: boolean;
  setShowSearchOverlay: (value: boolean) => void;
  totalResults: number;
  searchGuardrails: GuardrailInfo | null;
  searchFilters: ExploreSearchFilters;
  setSearchFilters: (filters: ExploreSearchFilters) => void;
  contextData: ContextData | null;
  parsedContext: any;
  isLoadingContext: boolean;
  contextError: string | null;
  workingSet: SearchResult[];
  addToWorkingSet: (item: SearchResult) => void;
  removeFromWorkingSet: (id: string) => void;
  clearWorkingSet: () => void;
  closeActiveWorkingSetItem: () => void;
  showCompFilters: boolean;
  setShowCompFilters: (value: boolean) => void;
  showCompStats: boolean;
  setShowCompStats: (value: boolean) => void;
  showCompLegend: boolean;
  setShowCompLegend: (value: boolean) => void;
  focusedComponentId: string | null;
  setFocusedComponentId: (id: string | null) => void;
  showContextOptions: boolean;
  setShowContextOptions: (value: boolean) => void;
  contextOptions: ContextOptions;
  setContextOptions: (options: ContextOptions) => void;
  contextPopoverRef: React.MutableRefObject<HTMLDivElement | null>;
  contextSettingsBtnRef: React.MutableRefObject<HTMLButtonElement | null>;
  handleSearch: () => Promise<void>;
  loadContext: (entityId: string) => Promise<void>;
  handleKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  normalizeFilePath: (filePath?: string) => string;
  projectPath: string | null;
  projectSettings: ReturnType<typeof useVisualizationStore> extends { getProjectSettings: any }
    ? ReturnType<ReturnType<typeof useVisualizationStore>['getProjectSettings']>
    : any;
}

const DEFAULT_FILTERS: ExploreSearchFilters = {
  entityTypes: ['component', 'task', 'note', 'rule'],
  componentTypes: [],
  includeCode: false,
  expandTerms: true,
};

const CONTEXT_OUTPUT_FORMATS: ContextOptions['outputFormat'][] = [
  'ui',
  'json',
  'json-compressed',
  'markdown',
  'markdown-compressed',
  'text',
  'aiccl',
  'aiccl-expand',
];

const DEFAULT_CONTEXT_OPTIONS: ContextOptions = {
  depth: 3,
  targetTokens: 1_000_000,
  includeSource: true,
  includeRelationships: true,
  includeDocumentation: true,
  includeMetadata: true,
  includeNotes: true,
  includeRules: true,
  includeTasks: false,
  outputFormat: 'ui',
};

const normalizeContextOptions = (options?: unknown): ContextOptions => {
  const partial =
    options && typeof options === 'object'
      ? (options as Partial<ContextOptions>)
      : undefined;

  const format = partial?.outputFormat;
  const normalizedFormat = format && CONTEXT_OUTPUT_FORMATS.includes(format)
    ? format
    : DEFAULT_CONTEXT_OPTIONS.outputFormat;

  return {
    ...DEFAULT_CONTEXT_OPTIONS,
    ...partial,
    outputFormat: normalizedFormat,
  };
};

export function useExploreSectionState(): ExploreSectionState {
  const rawProjectPath = useProjectStore((state) => state.path);
  const projectPath = rawProjectPath ?? null;
  const {
    getProjectSettings,
    updateSettings,
    updateComponentMapSettings,
    updateSearchSettings,
    setCurrentProject,
  } = useVisualizationStore();

  const projectSettings = projectPath ? getProjectSettings(projectPath) : null;

  const [activeView, setActiveView] = useState<ExploreView>(projectSettings?.activeView || 'search');
  const [activeWorkingSetItem, setActiveWorkingSetItem] = useState<string | null>(
    projectSettings?.search.activeWorkingSetItem || null,
  );
  const [searchQuery, setSearchQuery] = useState(projectSettings?.search.searchQuery || '');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [searchGuardrails, setSearchGuardrails] = useState<GuardrailInfo | null>(null);
  const [searchFilters, setSearchFiltersState] = useState<ExploreSearchFilters>(
    projectSettings?.search.searchFilters || DEFAULT_FILTERS,
  );
  const [contextData, setContextData] = useState<ContextData | null>(null);
  const [parsedContext, setParsedContext] = useState<any>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [workingSet, setWorkingSet] = useState<SearchResult[]>(projectSettings?.search.workingSet || []);
  const [showCompFilters, setShowCompFilters] = useState(projectSettings?.componentMap.showFilters || false);
  const [showCompStats, setShowCompStats] = useState(projectSettings?.componentMap.showStats || false);
  const [showCompLegend, setShowCompLegend] = useState(projectSettings?.componentMap.showLegend || false);
  const [focusedComponentId, setFocusedComponentId] = useState<string | null>(null);
  const [showContextOptions, setShowContextOptions] = useState(false);
  const [contextOptions, setContextOptionsState] = useState<ContextOptions>(
    normalizeContextOptions(projectSettings?.search.contextOptions),
  );

  const contextPopoverRef = useRef<HTMLDivElement | null>(null);
  const contextSettingsBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (projectPath) {
      setCurrentProject(projectPath);
    }
  }, [projectPath, setCurrentProject]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!showContextOptions) return;
      const target = event.target as Node;
      if (contextPopoverRef.current?.contains(target)) return;
      if (contextSettingsBtnRef.current?.contains(target)) return;
      setShowContextOptions(false);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowContextOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showContextOptions]);

  useEffect(() => {
    (window as any).__switchToRelationshipView = (componentId?: string) => {
      setActiveView('components');
      if (componentId) {
        setFocusedComponentId(componentId);
      }
    };

    return () => {
      delete (window as any).__switchToRelationshipView;
    };
  }, []);

  useEffect(() => {
    if (!projectPath) return;

    updateSettings(projectPath, { activeView });
  }, [activeView, projectPath, updateSettings]);

  useEffect(() => {
    if (!projectPath) return;

    updateSearchSettings(projectPath, {
      workingSet,
      activeWorkingSetItem,
      searchQuery,
      searchFilters,
      contextOptions,
    });
  }, [workingSet, activeWorkingSetItem, searchQuery, searchFilters, contextOptions, projectPath, updateSearchSettings]);

  useEffect(() => {
    if (!projectPath) return;

    updateComponentMapSettings(projectPath, {
      showFilters: showCompFilters,
      showStats: showCompStats,
      showLegend: showCompLegend,
    });
  }, [showCompFilters, showCompStats, showCompLegend, projectPath, updateComponentMapSettings]);

  useEffect(() => {
    if (!projectPath) return;

    const settings = getProjectSettings(projectPath);
    setActiveView(settings.activeView);
    setActiveWorkingSetItem(settings.search.activeWorkingSetItem ?? null);
    setSearchQuery(settings.search.searchQuery);
    setSearchFiltersState(settings.search.searchFilters || DEFAULT_FILTERS);
    setContextOptionsState(normalizeContextOptions(settings.search.contextOptions));
    setWorkingSet(settings.search.workingSet);
    setShowCompFilters(settings.componentMap.showFilters);
    setShowCompStats(settings.componentMap.showStats);
    setShowCompLegend(settings.componentMap.showLegend);

    setSearchResults([]);
    setContextData(null);
    setParsedContext(null);
    setSearchGuardrails(null);

    if (settings.search.activeWorkingSetItem && settings.search.workingSet.length > 0) {
      void loadContext(settings.search.activeWorkingSetItem);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath]);

  useEffect(() => {
    const handleProjectSwitch = () => {
      if (!projectPath) return;
      const settings = getProjectSettings(projectPath);
      setActiveView(settings.activeView);
    };

    window.addEventListener('project-switched', handleProjectSwitch);
    return () => window.removeEventListener('project-switched', handleProjectSwitch);
  }, [projectPath, getProjectSettings]);

  const setSearchFilters = useCallback((filters: ExploreSearchFilters) => {
    setSearchFiltersState(filters);
  }, []);

  const setContextOptions = useCallback((options: ContextOptions) => {
    setContextOptionsState(normalizeContextOptions(options));
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchGuardrails(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setShowSearchOverlay(true);
    setSearchResults([]);
    setTotalResults(0);

    try {
      const response = await felixService.search(
        searchQuery.trim(),
        100,
        searchFilters.entityTypes,
        searchFilters.componentTypes.length > 0 ? searchFilters.componentTypes : undefined,
      );
      setSearchResults(response.results || []);
      setTotalResults(response.totalResults ?? response.results?.length ?? 0);
      setSearchGuardrails(response.guardrailInfo ?? null);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError(error instanceof Error ? error.message : 'Search failed');
      setSearchResults([]);
      setSearchGuardrails(null);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchFilters]);

  const addToWorkingSet = useCallback((result: SearchResult) => {
    setWorkingSet((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      if (existingIds.has(result.id)) {
        return prev;
      }
      return [...prev, result];
    });
  }, []);

  const removeFromWorkingSet = useCallback((itemId: string) => {
    setWorkingSet((prev) => prev.filter((item) => item.id !== itemId));
    setFocusedComponentId((current) => (current === itemId ? null : current));
    if (activeWorkingSetItem === itemId) {
      setActiveWorkingSetItem(null);
      setContextData(null);
      setParsedContext(null);
    }
  }, [activeWorkingSetItem]);

  const clearWorkingSet = useCallback(() => {
    setWorkingSet([]);
    setActiveWorkingSetItem(null);
    setContextData(null);
    setParsedContext(null);
  }, []);

  const closeActiveWorkingSetItem = useCallback(() => {
    setActiveWorkingSetItem(null);
    setContextData(null);
    setParsedContext(null);
  }, []);

  const loadContext = useCallback(async (entityId: string) => {
    setIsLoadingContext(true);
    setContextError(null);

    try {
      const response = await felixService.getContext(entityId, {
        depth: contextOptions.depth,
        includeSource: contextOptions.includeSource,
        includeRelationships: contextOptions.includeRelationships,
        includeDocumentation: contextOptions.includeDocumentation,
        includeMetadata: contextOptions.includeMetadata,
        includeNotes: contextOptions.includeNotes,
        includeRules: contextOptions.includeRules,
        includeTasks: contextOptions.includeTasks,
        targetTokens: contextOptions.targetTokens,
        format: contextOptions.outputFormat === 'ui' ? 'json' : (contextOptions.outputFormat as any),
      });

      if (contextOptions.outputFormat === 'ui') {
        const contentData = response.content && response.content.startsWith('{')
          ? JSON.parse(response.content)
          : {};
        const mergedMetadata = {
          ...(contentData.metadata || {}),
          ...(response.metadata || {}),
        } as any;
        if (!Array.isArray(mergedMetadata.notes)) {
          mergedMetadata.notes = mergedMetadata.notes ? [].concat(mergedMetadata.notes) : [];
        }
        if (!Array.isArray(mergedMetadata.rules)) {
          mergedMetadata.rules = mergedMetadata.rules ? [].concat(mergedMetadata.rules) : [];
        }
        if (!Array.isArray(mergedMetadata.tasks)) {
          mergedMetadata.tasks = mergedMetadata.tasks ? [].concat(mergedMetadata.tasks) : [];
        }
        const contextDataParsed = {
          ...contentData,
          components: response.components || contentData.components || [],
          relationships: response.relationships || contentData.relationships || [],
          metadata: mergedMetadata,
          notes: mergedMetadata.notes,
          rules: mergedMetadata.rules,
          tasks: mergedMetadata.tasks,
          component: response.component || contentData.component || null,
          component_detail: (response as any).component_detail || (contentData as any).component_detail || null,
        };
        setParsedContext(contextDataParsed);
      } else {
        setParsedContext(null);
      }

      setContextData({
        content: response.content,
        stats: response.stats || {},
        tokenCount: response.tokenCount || 0,
        warnings: response.warnings || [],
        metadata: response.metadata || {},
        notes: (response.metadata as any)?.notes || [],
        rules: (response.metadata as any)?.rules || [],
        tasks: (response.metadata as any)?.tasks || [],
      });
    } catch (error) {
      console.error('Failed to load context:', error);
      setContextError(error instanceof Error ? error.message : 'Failed to load context');
      setContextData(null);
      setParsedContext(null);
    } finally {
      setIsLoadingContext(false);
    }
  }, [contextOptions]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        void handleSearch();
      }
    },
    [handleSearch],
  );

  const normalizeFilePath = useCallback((filePath?: string) => {
    if (!filePath) return '';
    return filePath
      .replace(/^.*\/Felix\//, '')
      .replace(/^\/Users\/[^\/]+\/[^\/]+\/[^\/]+\//, '')
      .replace(/^\/home\/[^\/]+\/[^\/]+\/[^\/]+\//, '')
      .replace(/^.*\/apps\//, 'apps/')
      .replace(/^.*\/packages\//, 'packages/')
      .replace(/^.*\/src\//, 'src/');
  }, []);

  return {
    activeView,
    setActiveView,
    activeWorkingSetItem,
    setActiveWorkingSetItem,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchError,
    showAdvancedFilters,
    setShowAdvancedFilters,
    showSearchOverlay,
    setShowSearchOverlay,
    totalResults,
    searchGuardrails,
    searchFilters,
    setSearchFilters,
    contextData,
    parsedContext,
    isLoadingContext,
    contextError,
    workingSet,
    addToWorkingSet,
    removeFromWorkingSet,
    clearWorkingSet,
    closeActiveWorkingSetItem,
    showCompFilters,
    setShowCompFilters,
    showCompStats,
    setShowCompStats,
    showCompLegend,
    setShowCompLegend,
    focusedComponentId,
    setFocusedComponentId,
    showContextOptions,
    setShowContextOptions,
    contextOptions,
    setContextOptions,
    contextPopoverRef,
    contextSettingsBtnRef,
    handleSearch,
    loadContext,
    handleKeyDown,
    normalizeFilePath,
    projectPath,
    projectSettings,
  };
}
