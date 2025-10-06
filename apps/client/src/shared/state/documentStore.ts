import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { DocumentTab } from '@/types/components';
import { STORAGE_KEYS, MAX_OPEN_TABS, DEFAULT_DOCUMENT_CONTENT } from '@/utils/constants';
import { felixService } from '@/services/felixService';

interface DocumentStore {
  tabs: DocumentTab[];
  activeTabId?: string;
  
  // Actions
  createTab: (filePath: string, content?: string) => DocumentTab;
  openTab: (filePath: string, content?: string) => void;
  closeTab: (tabId: string) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  updateTabTitle: (tabId: string, title: string) => void;
  markTabDirty: (tabId: string, isDirty: boolean) => void;
  saveTab: (tabId: string) => Promise<void>;
  saveAllTabs: () => Promise<void>;
  getTab: (tabId: string) => DocumentTab | undefined;
  getActiveTab: () => DocumentTab | undefined;
  hasUnsavedChanges: () => boolean;
}

const generateTabId = () => `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getFileName = (filePath: string) => {
  const parts = filePath.split('/');
  return parts[parts.length - 1] || 'Untitled';
};

const getLanguageFromPath = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'json':
      return 'json';
    case 'html':
      return 'html';
    case 'css':
    case 'scss':
      return 'css';
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'php':
      return 'php';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return 'text';
  }
};

export const useDocumentStore = create<DocumentStore>()(
  devtools(
    persist(
      (set, get) => ({
        tabs: [],
        activeTabId: undefined,

        createTab: (filePath: string, content?: string): DocumentTab => {
          const id = generateTabId();
          const title = getFileName(filePath);
          const language = getLanguageFromPath(filePath);
          
          return {
            id,
            title,
            filePath,
            path: filePath, // Add path for project-editor compatibility
            content: content || DEFAULT_DOCUMENT_CONTENT,
            isDirty: false,
            isActive: false,
            language,
          };
        },

        openTab: (filePath: string, content?: string) => {
          const { tabs, createTab, setActiveTab } = get();
          
          // Check if tab is already open
          const existingTab = tabs.find(tab => tab.filePath === filePath);
          if (existingTab) {
            setActiveTab(existingTab.id);
            return;
          }

          // Check tab limit
          if (tabs.length >= MAX_OPEN_TABS) {
            console.warn(`Cannot open more than ${MAX_OPEN_TABS} tabs`);
            return;
          }

          // Create new tab
          const newTab = createTab(filePath, content);
          
          set((state) => ({
            tabs: [...state.tabs, newTab],
            activeTabId: newTab.id,
          }), false, 'openTab');
        },

        closeTab: (tabId: string) => {
          const { tabs, activeTabId } = get();
          const tabIndex = tabs.findIndex(tab => tab.id === tabId);
          
          if (tabIndex === -1) return;

          const newTabs = tabs.filter(tab => tab.id !== tabId);
          let newActiveTabId = activeTabId;

          // If closing active tab, select another
          if (activeTabId === tabId) {
            if (newTabs.length > 0) {
              // Select tab to the right, or leftmost if closing rightmost
              const nextIndex = Math.min(tabIndex, newTabs.length - 1);
              newActiveTabId = newTabs[nextIndex]?.id;
            } else {
              newActiveTabId = undefined;
            }
          }

          set({
            tabs: newTabs,
            activeTabId: newActiveTabId,
          }, false, 'closeTab');
        },

        closeAllTabs: () => {
          set({
            tabs: [],
            activeTabId: undefined,
          }, false, 'closeAllTabs');
        },

        closeOtherTabs: (tabId: string) => {
          const { tabs } = get();
          const targetTab = tabs.find(tab => tab.id === tabId);
          
          if (!targetTab) return;

          set({
            tabs: [targetTab],
            activeTabId: tabId,
          }, false, 'closeOtherTabs');
        },

        setActiveTab: (tabId: string) => {
          const { tabs } = get();
          const targetTab = tabs.find(tab => tab.id === tabId);
          
          if (!targetTab) return;

          set({
            activeTabId: tabId,
          }, false, 'setActiveTab');
        },

        updateTabContent: (tabId: string, content: string) => {
          set((state) => ({
            tabs: state.tabs.map(tab =>
              tab.id === tabId
                ? { ...tab, content, isDirty: tab.content !== content }
                : tab
            ),
          }), false, 'updateTabContent');
        },

        updateTabTitle: (tabId: string, title: string) => {
          set((state) => ({
            tabs: state.tabs.map(tab =>
              tab.id === tabId ? { ...tab, title } : tab
            ),
          }), false, 'updateTabTitle');
        },

        markTabDirty: (tabId: string, isDirty: boolean) => {
          set((state) => ({
            tabs: state.tabs.map(tab =>
              tab.id === tabId ? { ...tab, isDirty } : tab
            ),
          }), false, 'markTabDirty');
        },

        saveTab: async (tabId: string) => {
          const { tabs } = get();
          const tab = tabs.find(t => t.id === tabId);
          
          if (!tab) return;

          try {
            // Use the file service to save the content
            await felixService.writeFile(tab.filePath, tab.content);
            
            set((state) => ({
              tabs: state.tabs.map(t =>
                t.id === tabId ? { ...t, isDirty: false } : t
              ),
            }), false, 'saveTab');
          } catch (error) {
            console.error('Failed to save tab:', error);
            throw error;
          }
        },

        saveAllTabs: async () => {
          const { tabs, saveTab } = get();
          const dirtyTabs = tabs.filter(tab => tab.isDirty);
          
          try {
            await Promise.all(dirtyTabs.map(tab => saveTab(tab.id)));
          } catch (error) {
            console.error('Failed to save all tabs:', error);
            throw error;
          }
        },

        getTab: (tabId: string) => {
          const { tabs } = get();
          return tabs.find(tab => tab.id === tabId);
        },

        getActiveTab: () => {
          const { tabs, activeTabId } = get();
          return activeTabId ? tabs.find(tab => tab.id === activeTabId) : undefined;
        },

        hasUnsavedChanges: () => {
          const { tabs } = get();
          return tabs.some(tab => tab.isDirty);
        },
      }),
      {
        name: STORAGE_KEYS.DOCUMENT_TABS,
        partialize: (state) => ({
          tabs: state.tabs,
          activeTabId: state.activeTabId,
        }),
      }
    ),
    { name: 'document-store' }
  )
);