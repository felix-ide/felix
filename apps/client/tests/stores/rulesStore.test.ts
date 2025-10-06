import { describe, it, expect, vi, afterEach } from 'vitest';
import { useRulesStore } from '../../src/features/rules/state/rulesStore';

vi.mock('../../src/services/felixService', () => ({
  felixService: {
    listRules: vi.fn().mockResolvedValue({ applicable_rules: [{ id: 'r1', name: 'No console', description: '', rule_type: 'pattern', sort_order: 0, depth_level: 0, guidance_text: '', priority: 1, auto_apply: false, merge_strategy: 'append', confidence_threshold: 0.5, active: true, created_at: '', updated_at: '' }] }),
  }
}));

describe('rulesStore', () => {
  afterEach(() => {
    useRulesStore.setState({ rules: [], loading: false, error: null, selectedRuleId: undefined, selectedRuleIds: new Set() });
    vi.restoreAllMocks();
  });

  it('loads and selects rules', async () => {
    const s = useRulesStore.getState();
    await s.loadRules();
    expect(useRulesStore.getState().rules.length).toBe(1);
    s.selectRule('r1');
    expect(useRulesStore.getState().selectedRuleId).toBe('r1');
    s.toggleRuleSelection('r1');
    expect(useRulesStore.getState().selectedRuleIds.has('r1')).toBe(true);
    s.clearSelection();
    expect(useRulesStore.getState().selectedRuleIds.size).toBe(0);
  });
});

