import { create } from 'zustand';
import { knowledgeBaseApi, type KBNode, type KBListItem, type KBTemplate } from '../api/knowledgeBaseApi';

interface KnowledgeBaseState {
  // Data
  knowledgeBases: KBListItem[];
  currentKB: KBNode | null;
  currentKBId: string | null;
  templates: KBTemplate[];

  // UI State
  isLoading: boolean;
  error: string | null;
  isCreatingKB: boolean;

  // Actions
  loadKnowledgeBases: () => Promise<void>;
  loadKBStructure: (kbId: string) => Promise<void>;
  loadTemplates: () => Promise<void>;
  createKB: (templateName: string, customName: string, kbConfig?: Record<string, any>) => Promise<string>;
  createNode: (parentId: string, title: string, content?: string) => Promise<string>;
  updateNode: (nodeId: string, updates: { title?: string; content?: string }) => Promise<void>;
  updateKBConfig: (kbId: string, config: Record<string, any>) => Promise<void>;
  setCurrentKB: (kbId: string | null) => void;
  clearError: () => void;
}

export const useKnowledgeBaseStore = create<KnowledgeBaseState>((set, get) => ({
  // Initial state
  knowledgeBases: [],
  currentKB: null,
  currentKBId: null,
  templates: [],
  isLoading: false,
  error: null,
  isCreatingKB: false,

  // Load all KBs in the project
  loadKnowledgeBases: async () => {
    set({ isLoading: true, error: null });
    try {
      const kbs = await knowledgeBaseApi.listKnowledgeBases();
      set({ knowledgeBases: kbs, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load knowledge bases',
        isLoading: false
      });
    }
  },

  // Load a specific KB structure
  loadKBStructure: async (kbId: string) => {
    set({ isLoading: true, error: null });
    try {
      const structure = await knowledgeBaseApi.getStructure(kbId);
      set({
        currentKB: structure,
        currentKBId: kbId,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load KB structure',
        isLoading: false
      });
    }
  },

  // Load available templates
  loadTemplates: async () => {
    try {
      const templates = await knowledgeBaseApi.getTemplates();
      set({ templates });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load templates'
      });
    }
  },

  // Create a new KB from template
  createKB: async (templateName: string, customName: string, kbConfig?: Record<string, any>) => {
    set({ isCreatingKB: true, error: null });
    try {
      const { rootId } = await knowledgeBaseApi.createFromTemplate(templateName, customName, kbConfig);

      // Reload the KB list
      await get().loadKnowledgeBases();

      // Load the new KB structure
      await get().loadKBStructure(rootId);

      set({ isCreatingKB: false });
      return rootId;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create KB',
        isCreatingKB: false
      });
      throw error;
    }
  },

  // Create a new child node
  createNode: async (parentId: string, title: string, content?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { nodeId } = await knowledgeBaseApi.createNode(parentId, title, content);

      // Reload the current KB structure to show the new node
      const currentKBId = get().currentKBId;
      if (currentKBId) {
        await get().loadKBStructure(currentKBId);
      }

      set({ isLoading: false });
      return nodeId;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create KB node',
        isLoading: false
      });
      throw error;
    }
  },

  // Update a KB node
  updateNode: async (nodeId: string, updates: { title?: string; content?: string }) => {
    set({ isLoading: true, error: null });
    try {
      await knowledgeBaseApi.updateNode(nodeId, updates);

      // Reload the current KB structure to reflect changes
      const currentKBId = get().currentKBId;
      if (currentKBId) {
        await get().loadKBStructure(currentKBId);
      }

      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update KB node',
        isLoading: false
      });
      throw error;
    }
  },

  // Update KB configuration and regenerate rules
  updateKBConfig: async (kbId: string, config: Record<string, any>) => {
    set({ isLoading: true, error: null });
    try {
      await knowledgeBaseApi.updateConfig(kbId, config);

      // Reload the KB structure to get updated metadata and rules
      await get().loadKBStructure(kbId);

      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update KB configuration',
        isLoading: false
      });
      throw error;
    }
  },

  // Set current KB
  setCurrentKB: (kbId: string | null) => {
    if (kbId) {
      get().loadKBStructure(kbId);
    } else {
      set({ currentKB: null, currentKBId: null });
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));
