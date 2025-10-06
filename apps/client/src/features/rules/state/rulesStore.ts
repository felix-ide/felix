import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { RuleData } from '@/types/api';
import { felixService } from '@/services/felixService';
import type { ListRulesResponse } from '@client/shared/api/rulesClient';

interface RulesStore {
  rules: RuleData[];
  loading: boolean;
  error: string | null;
  selectedRuleId?: string;
  selectedRuleIds: Set<string>;
  
  // Actions
  loadRules: () => Promise<void>;
  selectRule: (ruleId?: string) => void;
  toggleRuleSelection: (ruleId: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  clearError: () => void;
}

export const useRulesStore = create<RulesStore>()(
  devtools(
    (set, _get) => ({
      rules: [],
      loading: false,
      error: null,
      selectedRuleId: undefined,
      selectedRuleIds: new Set<string>(),

      loadRules: async () => {
        set({ loading: true, error: null });
        
        try {
          const result: ListRulesResponse = await felixService.listRules({
            includeAutomation: true
          });

          set({ 
            rules: result.applicable_rules ?? [],
            loading: false,
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load rules',
            loading: false,
          });
        }
      },

      selectRule: (ruleId?: string) => {
        set({ selectedRuleId: ruleId });
      },

      toggleRuleSelection: (ruleId: string) => {
        set((state) => {
          const newSelectedIds = new Set(state.selectedRuleIds);
          if (newSelectedIds.has(ruleId)) {
            newSelectedIds.delete(ruleId);
          } else {
            newSelectedIds.add(ruleId);
          }
          return { selectedRuleIds: newSelectedIds };
        });
      },

      clearSelection: () => {
        set({ selectedRuleIds: new Set<string>() });
      },

      selectAll: () => {
        set((state) => ({
          selectedRuleIds: new Set(state.rules.map(r => r.id))
        }));
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    { name: 'rules-store' }
  )
);
