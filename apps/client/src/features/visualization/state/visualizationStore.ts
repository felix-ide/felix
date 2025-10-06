import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ExploreView } from '@/types/components';
import type { ContextOptions } from '@/features/search/components/explore-section/types';

interface VisualizationSettings {
  // Explore section
  activeView: ExploreView;
  
  // ComponentMapView settings (unified for both overview and relationships modes)
  componentMap: {
    showFilters: boolean;
    showStats: boolean;
    showLegend: boolean;
    layoutType: 'force' | 'hierarchical' | 'radial' | 'tree' | 'circular' | 'dependency' | 'grid' | 'inheritance' | 'flow' | 'network';
    filterText: string;
    activeRelTypes: string[];
    activeNodeTypes: string[];
  };
  
  // Search/context settings
  search: {
    workingSet: Array<{
      id: string;
      name: string;
      type: string;
    }>;
    activeWorkingSetItem: string | null;
    searchQuery: string;
    searchFilters: {
      entityTypes: string[];
      componentTypes: string[];
      includeCode: boolean;
      expandTerms: boolean;
    };
    contextOptions: ContextOptions;
    // Persisted context view mode and viewport
    contextDisplayMode?: 'focus' | 'all';
    contextAllViewport?: { x: number; y: number; zoom: number } | null;
    contextGraphLayout?: 'LR' | 'TB';
  };
}

interface VisualizationStore {
  // Per-project settings (keyed by project path)
  projectSettings: Record<string, VisualizationSettings>;
  
  // Current project path
  currentProjectPath: string | null;
  
  // Actions
  setCurrentProject: (path: string | null) => void;
  updateSettings: (path: string, updates: Partial<VisualizationSettings>) => void;
  updateComponentMapSettings: (path: string, updates: Partial<VisualizationSettings['componentMap']>) => void;
  updateSearchSettings: (path: string, updates: Partial<VisualizationSettings['search']>) => void;
  getProjectSettings: (path: string) => VisualizationSettings;
  clearProjectSettings: (path: string) => void;
}

const defaultSettings: VisualizationSettings = {
  activeView: 'search',
  componentMap: {
    showFilters: false,
    showStats: false,
    showLegend: false,
    layoutType: 'force',
    filterText: '',
    activeRelTypes: ['imports', 'extends', 'implements', 'calls', 'contains'],
    activeNodeTypes: ['file', 'class', 'function', 'method', 'interface', 'module', 'variable', 'property'],
  },
  search: {
    workingSet: [],
    activeWorkingSetItem: null,
    searchQuery: '',
    searchFilters: {
      entityTypes: ['component', 'task', 'note', 'rule'],
      componentTypes: [],
      includeCode: false,
      expandTerms: true,
    },
    contextOptions: {
      depth: 3,
      // Default to effectively unlimited token window
      targetTokens: 1_000_000,
      includeSource: true,
      includeRelationships: true,
      includeDocumentation: true,
      includeMetadata: true,
      includeNotes: true,
      includeRules: true,
      includeTasks: false,
      outputFormat: 'ui',
    },
    contextDisplayMode: 'focus',
    contextAllViewport: null,
    contextGraphLayout: 'LR',
  },
};

export const useVisualizationStore = create<VisualizationStore>()(
  devtools(
    persist(
      (set, get) => ({
        projectSettings: {},
        currentProjectPath: null,

        setCurrentProject: (path: string | null) =>
          set({ currentProjectPath: path }, false, 'setCurrentProject'),

        updateSettings: (path: string, updates: Partial<VisualizationSettings>) => {
          set((state) => {
            const current = state.projectSettings[path] || defaultSettings;
            return {
              projectSettings: {
                ...state.projectSettings,
                [path]: { ...current, ...updates },
              },
            };
          }, false, 'updateSettings');
        },

        updateComponentMapSettings: (path: string, updates: Partial<VisualizationSettings['componentMap']>) => {
          set((state) => {
            const current = state.projectSettings[path] || defaultSettings;
            return {
              projectSettings: {
                ...state.projectSettings,
                [path]: {
                  ...current,
                  componentMap: { ...current.componentMap, ...updates },
                },
              },
            };
          }, false, 'updateComponentMapSettings');
        },

        updateSearchSettings: (path: string, updates: Partial<VisualizationSettings['search']>) => {
          set((state) => {
            const current = state.projectSettings[path] || defaultSettings;
            return {
              projectSettings: {
                ...state.projectSettings,
                [path]: {
                  ...current,
                  search: { ...current.search, ...updates },
                },
              },
            };
          }, false, 'updateSearchSettings');
        },

        getProjectSettings: (path: string): VisualizationSettings => {
          const state = get();
          return state.projectSettings[path] || defaultSettings;
        },

        clearProjectSettings: (path: string) => {
          set((state) => {
            const { [path]: _, ...rest } = state.projectSettings;
            return { projectSettings: rest };
          }, false, 'clearProjectSettings');
        },
      }),
      {
        name: 'visualization-store',
        partialize: (state) => ({
          projectSettings: state.projectSettings,
          currentProjectPath: state.currentProjectPath,
        }),
      }
    ),
    { name: 'visualization-store' }
  )
);
