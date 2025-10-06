import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Section, AppState } from '@/types/components';
import { STORAGE_KEYS } from '@/utils/constants';

interface AppStore extends AppState {
  autoRefresh: boolean;
  refreshInterval: number;
  // Actions
  setCurrentSection: (section: Section) => void;
  setProjectSelected: (selected: boolean) => void;
  setProjectPath: (path: string) => void;
  setServerRunning: (running: boolean) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  reset: () => void;
}

const initialState: AppState = {
  currentSection: 'explore',
  projectSelected: false,
  serverRunning: false,
};

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        autoRefresh: true,
        refreshInterval: 5000,

        setCurrentSection: (section: Section) => 
          set({ currentSection: section }, false, 'setCurrentSection'),

        setProjectSelected: (selected: boolean) => 
          set({ projectSelected: selected }, false, 'setProjectSelected'),

        setProjectPath: (path: string) => 
          set({ 
            projectPath: path,
            projectSelected: !!path 
          }, false, 'setProjectPath'),

        setServerRunning: (running: boolean) => 
          set({ serverRunning: running }, false, 'setServerRunning'),

        setAutoRefresh: (enabled: boolean) =>
          set({ autoRefresh: enabled }, false, 'setAutoRefresh'),

        setRefreshInterval: (interval: number) =>
          set({ refreshInterval: interval }, false, 'setRefreshInterval'),

        reset: () => 
          set({ ...initialState, autoRefresh: true, refreshInterval: 5000 }, false, 'reset'),
      }),
      {
        name: STORAGE_KEYS.PROJECT_PATH,
        partialize: (state) => ({
          projectPath: state.projectPath,
          projectSelected: state.projectSelected,
          currentSection: state.currentSection,
          autoRefresh: state.autoRefresh,
          refreshInterval: state.refreshInterval,
        }),
      }
    ),
    { name: 'app-store' }
  )
);