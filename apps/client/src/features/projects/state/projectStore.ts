import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ProjectState } from '@/types/components';
import type { ProjectStats } from '@/types/api';

interface RecentProject {
  path: string;
  name: string;
  lastAccessed: string;
}

interface ProjectStore extends ProjectState {
  // Loading states
  loading: boolean;
  indexing: boolean;
  
  // Recent projects
  recentProjects: RecentProject[];
  
  // Actions
  setProject: (path: string, name?: string) => void;
  setStats: (stats: ProjectStats) => void;
  setIndexed: (indexed: boolean) => void;
  setLoading: (loading: boolean) => void;
  setIndexing: (indexing: boolean) => void;
  updateLastIndexed: () => void;
  clearProject: () => void;
  addRecentProject: (path: string, name: string) => void;
  removeRecentProject: (path: string) => void;
  clearRecentProjects: () => void;
}

const initialState: ProjectState = {
  isIndexed: false,
  stats: {
    componentCount: 0,
    relationshipCount: 0,
    fileCount: 0,
  },
};

export const useProjectStore = create<ProjectStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        loading: false,
        indexing: false,
        recentProjects: [],

        setProject: (path: string, name?: string) => {
          const projectName = name || path.split('/').pop() || 'Unknown Project';
          set({ 
            path, 
            name: projectName,
            isIndexed: false,
            lastIndexed: undefined,
            stats: initialState.stats,
          }, false, 'setProject');
          
          // Add to recent projects
          get().addRecentProject(path, projectName);
        },

        setStats: (stats: ProjectStats) =>
          set({ 
            stats: {
              componentCount: stats.componentCount,
              relationshipCount: stats.relationshipCount,
              fileCount: stats.fileCount,
            },
            lastIndexed: stats.lastIndexed,
            isIndexed: true,
          }, false, 'setStats'),

        setIndexed: (indexed: boolean) =>
          set({ isIndexed: indexed }, false, 'setIndexed'),

        setLoading: (loading: boolean) =>
          set({ loading }, false, 'setLoading'),

        setIndexing: (indexing: boolean) =>
          set({ indexing }, false, 'setIndexing'),

        updateLastIndexed: () =>
          set({ 
            lastIndexed: new Date().toISOString(),
            isIndexed: true,
          }, false, 'updateLastIndexed'),

        clearProject: () =>
          set({
            ...initialState,
            loading: false,
            indexing: false,
          }, false, 'clearProject'),
        
        addRecentProject: (path: string, name: string) => {
          set((state) => {
            // Remove existing entry if present
            const filtered = state.recentProjects.filter(p => p.path !== path);
            
            // Add new entry at the beginning
            const newRecent: RecentProject = {
              path,
              name,
              lastAccessed: new Date().toISOString()
            };
            
            // Keep only last 15 projects
            const updated = [newRecent, ...filtered].slice(0, 15);
            
            return { recentProjects: updated };
          }, false, 'addRecentProject');
        },
        
        removeRecentProject: (path: string) => {
          set((state) => ({
            recentProjects: state.recentProjects.filter(p => p.path !== path)
          }), false, 'removeRecentProject');
        },
        
        clearRecentProjects: () =>
          set({ recentProjects: [] }, false, 'clearRecentProjects'),
      }),
      {
        name: 'project-store',
        partialize: (state) => ({
          path: state.path,
          name: state.name,
          isIndexed: state.isIndexed,
          lastIndexed: state.lastIndexed,
          stats: state.stats,
          recentProjects: state.recentProjects,
        }),
      }
    ),
    { name: 'project-store' }
  )
);