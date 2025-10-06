import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { DataSource } from 'typeorm';
import { RulesRepository } from '../RulesRepository';
import { Rule } from '../../entities/metadata/Rule.entity';
import { RuleRelationship } from '../../entities/metadata/RuleRelationship.entity';
import { RuleApplication } from '../../entities/metadata/RuleApplication.entity';

describe('RulesRepository Integration', () => {
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
  });

  afterEach(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('reads and updates a rule and recalculates depth on parent change', async () => {
    // Seed directly via TypeORM to avoid storeRule constraints variability
    const ruleRepo = ds.getRepository(Rule);
    await ruleRepo.save({ id: 'rule-1', name: 'Base Rule', guidance_text: 'Do', rule_type: 'semantic', depth_level: 0 } as any);
    await ruleRepo.save({ id: 'rule-2', name: 'Child', guidance_text: 'Do', rule_type: 'semantic', parent_id: 'rule-1', depth_level: 1 } as any);

    const saved = await repo.getRule('rule-1');
    expect(saved?.name).toBe('Base Rule');
    expect(saved?.depth_level).toBe(0);

    // Update child parent to null -> depth 0
    const up = await repo.updateRule('rule-2', { parent_id: null });
    expect(up.success).toBe(true);
    expect((await repo.getRule('rule-2'))?.depth_level).toBe(0);
  });
});
