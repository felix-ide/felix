import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { DataSource } from 'typeorm';
import { RulesRepository } from '../RulesRepository';
import { Rule } from '../../entities/metadata/Rule.entity';
import { RuleRelationship } from '../../entities/metadata/RuleRelationship.entity';
import { RuleApplication } from '../../entities/metadata/RuleApplication.entity';

describe('RulesRepository Analytics Integration', () => {
  let ds: DataSource;
  let repo: RulesRepository;

  beforeEach(async () => {
    ds = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [Rule, RuleRelationship, RuleApplication],
      synchronize: true,
      logging: false,
      dropSchema: true,
    });
    await ds.initialize();
    repo = new RulesRepository(ds);

    // Seed a couple of rules
    const ruleRepo = ds.getRepository(Rule);
    await ruleRepo.save({ id: 'r-1', name: 'A', guidance_text: 'Do A', rule_type: 'pattern', usage_count: 0, effectiveness_score: 0.0, acceptance_rate: 0.0 } as any);
    await ruleRepo.save({ id: 'r-2', name: 'B', guidance_text: 'Do B', rule_type: 'semantic', usage_count: 0, effectiveness_score: 0.0, acceptance_rate: 0.0 } as any);
  });

  afterEach(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('updates rule effectiveness on application and returns analytics with recent metrics', async () => {
    // Apply rule r-1 twice: one accepted with feedback 5, one rejected with feedback 3
    await repo.trackRuleApplication('r-1', 'component' as any, 'comp-1', { ctx: 1 }, 'accepted', undefined, 5);
    await repo.trackRuleApplication('r-1', 'component' as any, 'comp-2', { ctx: 2 }, 'rejected', undefined, 3);

    // Verify counters
    const updated = await repo.getRule('r-1');
    expect(updated?.usage_count).toBe(2);
    expect(updated?.effectiveness_score).toBeGreaterThan(0);

    const analytics = await repo.getRuleAnalytics(30);
    expect(Array.isArray(analytics)).toBe(true);
    const row = analytics.find((r: any) => r.id === 'r-1');
    expect(row).toBeTruthy();
    expect(row.recent_applications).toBeGreaterThanOrEqual(1);
  });

  it('finds rules for degradation when inactive or low effectiveness', async () => {
    // r-2: low effectiveness
    await repo.updateRuleEffectiveness('r-2', 'rejected', 1);
    const toDegrade = await repo.getRulesForDegradation(0, 0.5);
    const ids = toDegrade.map(r => r.id);
    expect(ids).toContain('r-2');
  });
});
