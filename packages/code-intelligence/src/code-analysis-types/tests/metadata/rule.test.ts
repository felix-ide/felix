/**
 * Tests for Rule model
 */

import { 
  RuleValidator, 
  RuleUtils, 
  CreateRuleParams,
  RuleApplicationContext,
  IRule
} from '../../metadata/Rule.js';

describe('RuleValidator', () => {
  describe('validate', () => {
    test('should validate valid rule', () => {
      const rule = {
        name: 'Test Rule',
        rule_type: 'pattern' as const,
        guidance_text: 'This is guidance text',
        priority: 5,
        confidence_threshold: 0.8,
        merge_strategy: 'append' as const
      };
      
      const result = RuleValidator.validate(rule);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject rule without name', () => {
      const rule = {
        rule_type: 'pattern' as const,
        guidance_text: 'This is guidance text'
      };
      
      const result = RuleValidator.validate(rule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    test('should reject rule with empty name', () => {
      const rule = {
        name: '   ',
        rule_type: 'pattern' as const,
        guidance_text: 'This is guidance text'
      };
      
      const result = RuleValidator.validate(rule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    test('should reject rule with name too long', () => {
      const rule = {
        name: 'a'.repeat(201),
        rule_type: 'pattern' as const,
        guidance_text: 'This is guidance text'
      };
      
      const result = RuleValidator.validate(rule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Name exceeds maximum length (200 characters)');
    });

    test('should reject rule with invalid type', () => {
      const rule = {
        name: 'Test Rule',
        rule_type: 'invalid' as any,
        guidance_text: 'This is guidance text'
      };
      
      const result = RuleValidator.validate(rule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid rule type');
    });

    test('should reject rule without guidance text', () => {
      const rule = {
        name: 'Test Rule',
        rule_type: 'pattern' as const
      };
      
      const result = RuleValidator.validate(rule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Guidance text is required');
    });

    test('should reject rule with guidance text too long', () => {
      const rule = {
        name: 'Test Rule',
        rule_type: 'pattern' as const,
        guidance_text: 'a'.repeat(10001)
      };
      
      const result = RuleValidator.validate(rule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Guidance text exceeds maximum length (10,000 characters)');
    });

    test('should reject rule with invalid priority', () => {
      const rule = {
        name: 'Test Rule',
        rule_type: 'pattern' as const,
        guidance_text: 'Guidance',
        priority: 11
      };
      
      const result = RuleValidator.validate(rule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Priority must be between 1 and 10');
    });

    test('should reject rule with invalid confidence threshold', () => {
      const rule = {
        name: 'Test Rule',
        rule_type: 'pattern' as const,
        guidance_text: 'Guidance',
        confidence_threshold: 1.5
      };
      
      const result = RuleValidator.validate(rule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Confidence threshold must be between 0 and 1');
    });

    test('should reject rule with invalid merge strategy', () => {
      const rule = {
        name: 'Test Rule',
        rule_type: 'pattern' as const,
        guidance_text: 'Guidance',
        merge_strategy: 'invalid' as any
      };
      
      const result = RuleValidator.validate(rule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid merge strategy');
    });
  });

  describe('validateApplicationContext', () => {
    test('should validate valid context', () => {
      const context: RuleApplicationContext = {
        entity_type: 'component',
        entity_id: 'comp-1'
      };
      
      const result = RuleValidator.validateApplicationContext(context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject context without entity type', () => {
      const context = {
        entity_id: 'comp-1'
      } as any;
      
      const result = RuleValidator.validateApplicationContext(context);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entity type is required');
    });

    test('should reject context without entity ID', () => {
      const context = {
        entity_type: 'component'
      } as any;
      
      const result = RuleValidator.validateApplicationContext(context);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entity ID is required');
    });
  });
});

describe('RuleUtils', () => {
  describe('ID generation', () => {
    test('should generate unique rule IDs', () => {
      const id1 = RuleUtils.generateId();
      const id2 = RuleUtils.generateId();
      
      expect(id1).toMatch(/^rule_\d+_[a-z0-9]{9}$/);
      expect(id2).toMatch(/^rule_\d+_[a-z0-9]{9}$/);
      expect(id1).not.toBe(id2);
    });

    test('should generate unique relationship IDs', () => {
      const id1 = RuleUtils.generateRelationshipId();
      const id2 = RuleUtils.generateRelationshipId();
      
      expect(id1).toMatch(/^rel_\d+_[a-z0-9]{9}$/);
      expect(id2).toMatch(/^rel_\d+_[a-z0-9]{9}$/);
      expect(id1).not.toBe(id2);
    });

    test('should generate unique application IDs', () => {
      const id1 = RuleUtils.generateApplicationId();
      const id2 = RuleUtils.generateApplicationId();
      
      expect(id1).toMatch(/^app_\d+_[a-z0-9]{9}$/);
      expect(id2).toMatch(/^app_\d+_[a-z0-9]{9}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('createFromParams', () => {
    test('should create rule from parameters', () => {
      const params: CreateRuleParams = {
        name: 'Test Rule',
        description: 'Test description',
        rule_type: 'pattern',
        guidance_text: 'Follow this pattern'
      };
      
      const rule = RuleUtils.createFromParams(params);
      
      expect(rule.id).toMatch(/^rule_\d+_[a-z0-9]{9}$/);
      expect(rule.name).toBe('Test Rule');
      expect(rule.description).toBe('Test description');
      expect(rule.rule_type).toBe('pattern');
      expect(rule.guidance_text).toBe('Follow this pattern');
      expect(rule.parent_id).toBeNull();
      expect(rule.sort_order).toBe(0);
      expect(rule.depth_level).toBe(0);
      expect(rule.priority).toBe(5);
      expect(rule.auto_apply).toBe(false);
      expect(rule.merge_strategy).toBe('append');
      expect(rule.confidence_threshold).toBe(0.8);
      expect(rule.usage_count).toBe(0);
      expect(rule.acceptance_rate).toBe(0.0);
      expect(rule.effectiveness_score).toBe(0.0);
      expect(rule.created_by).toBe('user');
      expect(rule.active).toBe(true);
      expect(rule.created_at).toBeInstanceOf(Date);
      expect(rule.updated_at).toBeInstanceOf(Date);
    });

    test('should handle optional parameters', () => {
      const params: CreateRuleParams = {
        name: 'Advanced Rule',
        rule_type: 'automation',
        guidance_text: 'Auto-generate code',
        code_template: 'const ${name} = () => {};',
        priority: 8,
        auto_apply: true,
        confidence_threshold: 0.9,
        trigger_patterns: {
          files: ['*.ts'],
          components: ['function']
        },
        semantic_triggers: {
          patterns: ['factory-pattern'],
          business_domains: ['authentication']
        },
        entity_links: [{
          entity_type: 'component',
          entity_id: 'comp-1',
          link_strength: 'primary'
        }],
        stable_tags: ['code-gen', 'pattern']
      };
      
      const rule = RuleUtils.createFromParams(params);
      
      expect(rule.rule_type).toBe('automation');
      expect(rule.code_template).toBe('const ${name} = () => {};');
      expect(rule.priority).toBe(8);
      expect(rule.auto_apply).toBe(true);
      expect(rule.confidence_threshold).toBe(0.9);
      expect(rule.trigger_patterns).toEqual({
        files: ['*.ts'],
        components: ['function']
      });
      expect(rule.semantic_triggers).toEqual({
        patterns: ['factory-pattern'],
        business_domains: ['authentication']
      });
      expect(rule.entity_links).toHaveLength(1);
      expect(rule.stable_tags).toEqual(['code-gen', 'pattern']);
    });
  });

  describe('fromDbRow', () => {
    test('should create rule from database row', () => {
      const row = {
        id: 'rule_123_abc',
        name: 'Database Rule',
        description: 'Database description',
        rule_type: 'constraint',
        parent_id: null,
        sort_order: 1,
        depth_level: 0,
        guidance_text: 'Database guidance',
        code_template: null,
        validation_script: 'return true;',
        trigger_patterns: JSON.stringify({ files: ['*.js'] }),
        semantic_triggers: null,
        context_conditions: null,
        exclusion_patterns: null,
        priority: 7,
        auto_apply: 0,
        merge_strategy: 'replace',
        confidence_threshold: 0.7,
        usage_count: 5,
        acceptance_rate: 0.8,
        effectiveness_score: 0.9,
        last_used: '2024-01-01T12:00:00.000Z',
        created_by: 'ai',
        active: 1,
        entity_links: JSON.stringify([{
          entity_type: 'component',
          entity_id: 'comp-1'
        }]),
        stable_tags: JSON.stringify(['validation']),
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-02T00:00:00.000Z'
      };
      
      const rule = RuleUtils.fromDbRow(row);
      
      expect(rule.id).toBe('rule_123_abc');
      expect(rule.name).toBe('Database Rule');
      expect(rule.description).toBe('Database description');
      expect(rule.rule_type).toBe('constraint');
      expect(rule.validation_script).toBe('return true;');
      expect(rule.trigger_patterns).toEqual({ files: ['*.js'] });
      expect(rule.priority).toBe(7);
      expect(rule.auto_apply).toBe(false);
      expect(rule.merge_strategy).toBe('replace');
      expect(rule.confidence_threshold).toBe(0.7);
      expect(rule.usage_count).toBe(5);
      expect(rule.acceptance_rate).toBe(0.8);
      expect(rule.effectiveness_score).toBe(0.9);
      expect(rule.last_used).toEqual(new Date('2024-01-01T12:00:00.000Z'));
      expect(rule.created_by).toBe('ai');
      expect(rule.active).toBe(true);
      expect(rule.entity_links).toHaveLength(1);
      expect(rule.stable_tags).toEqual(['validation']);
    });
  });

  describe('toDbRow', () => {
    test('should convert rule to database row', () => {
      const rule = RuleUtils.createFromParams({
        name: 'Test Rule',
        rule_type: 'semantic',
        guidance_text: 'Semantic guidance',
        priority: 6,
        trigger_patterns: { files: ['*.tsx'] },
        entity_links: [{
          entity_type: 'component',
          entity_id: 'comp-1'
        }],
        stable_tags: ['react']
      });
      
      const row = RuleUtils.toDbRow(rule);
      
      expect(row.id).toBe(rule.id);
      expect(row.name).toBe('Test Rule');
      expect(row.rule_type).toBe('semantic');
      expect(row.guidance_text).toBe('Semantic guidance');
      expect(row.priority).toBe(6);
      expect(row.auto_apply).toBe(0);
      expect(row.trigger_patterns).toBe(JSON.stringify({ files: ['*.tsx'] }));
      expect(row.entity_links).toBe(JSON.stringify([{
        entity_type: 'component',
        entity_id: 'comp-1'
      }]));
      expect(row.stable_tags).toBe(JSON.stringify(['react']));
      expect(row.created_at).toBe(rule.created_at.toISOString());
      expect(row.updated_at).toBe(rule.updated_at.toISOString());
    });
  });

  describe('updateEffectiveness', () => {
    test('should update effectiveness for accepted action', () => {
      const originalRule = RuleUtils.createFromParams({
        name: 'Test Rule',
        rule_type: 'pattern',
        guidance_text: 'Test guidance'
      });
      
      const updatedRule = RuleUtils.updateEffectiveness(originalRule, 'accepted', 4);
      
      expect(updatedRule.usage_count).toBe(1);
      expect(updatedRule.acceptance_rate).toBe(1.0);
      expect(updatedRule.effectiveness_score).toBe(0.8); // 4/5
      expect(updatedRule.last_used).toBeInstanceOf(Date);
      expect(updatedRule.updated_at.getTime()).toBeGreaterThanOrEqual(originalRule.updated_at.getTime());
    });

    test('should update effectiveness for rejected action', () => {
      const originalRule = RuleUtils.createFromParams({
        name: 'Test Rule',
        rule_type: 'pattern',
        guidance_text: 'Test guidance'
      });
      
      const updatedRule = RuleUtils.updateEffectiveness(originalRule, 'rejected', 2);
      
      expect(updatedRule.usage_count).toBe(1);
      expect(updatedRule.acceptance_rate).toBe(0.0);
      expect(updatedRule.effectiveness_score).toBe(0.4); // 2/5
    });
  });

  describe('buildHierarchy', () => {
    test('should build rule hierarchy correctly', () => {
      const rules = [
        RuleUtils.createFromParams({ 
          name: 'Root Rule 1', 
          rule_type: 'pattern',
          guidance_text: 'Root guidance 1'
        }),
        RuleUtils.createFromParams({ 
          name: 'Root Rule 2', 
          rule_type: 'pattern',
          guidance_text: 'Root guidance 2'
        }),
      ];
      
      const child1 = RuleUtils.createFromParams({ 
        name: 'Child Rule 1', 
        rule_type: 'constraint',
        guidance_text: 'Child guidance 1',
        parent_id: rules[0].id 
      });
      
      const child2 = RuleUtils.createFromParams({ 
        name: 'Child Rule 2', 
        rule_type: 'automation',
        guidance_text: 'Child guidance 2',
        parent_id: rules[0].id 
      });
      
      const allRules = [...rules, child1, child2];
      const hierarchy = RuleUtils.buildHierarchy(allRules);
      
      expect(hierarchy).toHaveLength(2); // Two root rules
      expect((hierarchy[0] as any).children).toHaveLength(2); // First root has 2 children
      expect((hierarchy[1] as any).children).toHaveLength(0); // Second root has no children
    });
  });

  describe('detectConflicts', () => {
    test('should detect conflicting rules', () => {
      const rule1 = RuleUtils.createFromParams({
        name: 'Rule 1',
        rule_type: 'pattern',
        guidance_text: 'Use camelCase',
        trigger_patterns: { files: ['*.ts'] }
      });
      
      const rule2 = RuleUtils.createFromParams({
        name: 'Rule 2',
        rule_type: 'pattern',
        guidance_text: 'Use snake_case',
        trigger_patterns: { files: ['*.ts'] }
      });
      
      const conflicts = RuleUtils.detectConflicts([rule1, rule2]);
      
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflicting_rules).toContain(rule1.id);
      expect(conflicts[0].conflicting_rules).toContain(rule2.id);
      expect(conflicts[0].suggested_resolution).toContain('similar triggers but conflicting guidance');
    });
  });
});