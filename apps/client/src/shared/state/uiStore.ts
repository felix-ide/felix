import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UIState {
  // Expanded states for hierarchies
  expandedTasks: Set<string>;
  expandedNotes: Set<string>;
  expandedRules: Set<string>;
  
  // Filter states
  taskStatusFilter: string;
  taskTypeFilter: string;
  noteTypeFilter: string;
  ruleTypeFilter: string;
  
  // Actions
  toggleTaskExpanded: (taskId: string) => void;
  toggleNoteExpanded: (noteId: string) => void;
  toggleRuleExpanded: (ruleId: string) => void;
  setTaskFilters: (statusFilter: string, typeFilter: string) => void;
  setNoteTypeFilter: (filter: string) => void;
  setRuleTypeFilter: (filter: string) => void;
  clearExpandedStates: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        // Initial states
        expandedTasks: new Set<string>(),
        expandedNotes: new Set<string>(),
        expandedRules: new Set<string>(),
        taskStatusFilter: 'all',
        taskTypeFilter: 'all',
        noteTypeFilter: 'all',
        ruleTypeFilter: 'all',

        toggleTaskExpanded: (taskId: string) =>
          set((state) => {
            const newExpanded = new Set(state.expandedTasks);
            if (newExpanded.has(taskId)) {
              newExpanded.delete(taskId);
            } else {
              newExpanded.add(taskId);
            }
            return { expandedTasks: newExpanded };
          }),

        toggleNoteExpanded: (noteId: string) =>
          set((state) => {
            const newExpanded = new Set(state.expandedNotes);
            if (newExpanded.has(noteId)) {
              newExpanded.delete(noteId);
            } else {
              newExpanded.add(noteId);
            }
            return { expandedNotes: newExpanded };
          }),

        toggleRuleExpanded: (ruleId: string) =>
          set((state) => {
            const newExpanded = new Set(state.expandedRules);
            if (newExpanded.has(ruleId)) {
              newExpanded.delete(ruleId);
            } else {
              newExpanded.add(ruleId);
            }
            return { expandedRules: newExpanded };
          }),

        setTaskFilters: (statusFilter: string, typeFilter: string) =>
          set({ taskStatusFilter: statusFilter, taskTypeFilter: typeFilter }),

        setNoteTypeFilter: (filter: string) =>
          set({ noteTypeFilter: filter }),

        setRuleTypeFilter: (filter: string) =>
          set({ ruleTypeFilter: filter }),

        clearExpandedStates: () =>
          set({
            expandedTasks: new Set<string>(),
            expandedNotes: new Set<string>(),
            expandedRules: new Set<string>(),
          }),
      }),
      {
        name: 'ui-state',
        partialize: (state) => ({
          // Convert Sets to Arrays for storage
          expandedTasks: Array.from(state.expandedTasks),
          expandedNotes: Array.from(state.expandedNotes),
          expandedRules: Array.from(state.expandedRules),
          taskStatusFilter: state.taskStatusFilter,
          taskTypeFilter: state.taskTypeFilter,
          noteTypeFilter: state.noteTypeFilter,
          ruleTypeFilter: state.ruleTypeFilter,
        }),
        onRehydrateStorage: () => (state) => {
          // Convert Arrays back to Sets after loading
          if (state) {
            state.expandedTasks = new Set(state.expandedTasks);
            state.expandedNotes = new Set(state.expandedNotes);
            state.expandedRules = new Set(state.expandedRules);
          }
        },
      }
    ),
    { name: 'ui-store' }
  )
);