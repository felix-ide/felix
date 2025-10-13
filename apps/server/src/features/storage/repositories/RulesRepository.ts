/**
 * RulesRepository - TypeORM implementation matching RulesManager exactly
 * CRITICAL: Every query must match RulesManager.ts behavior 100%
 */

import { Repository, DataSource, Like, Raw, SelectQueryBuilder, In } from 'typeorm';
import { Rule } from '../entities/metadata/Rule.entity.js';
import { RuleRelationship } from '../entities/metadata/RuleRelationship.entity.js';
import { RuleApplication } from '../entities/metadata/RuleApplication.entity.js';
import { IRule, CreateRuleParams, RuleApplicationContext, ApplicableRule, RuleUtils } from '@felix/code-intelligence';

// Helper to map TypeORM entity to IRule format
// TypeORM already deserializes simple-json fields, so we don't use fromDbRow
function mapEntityToRule(entity: any): IRule {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    rule_type: entity.rule_type,
    parent_id: entity.parent_id,
    sort_order: entity.sort_order || 0,
    depth_level: entity.depth_level || 0,
    guidance_text: entity.guidance_text || '',
    code_template: entity.code_template,
    validation_script: entity.validation_script,
    trigger_patterns: entity.trigger_patterns, // Already deserialized by TypeORM
    semantic_triggers: entity.semantic_triggers, // Already deserialized by TypeORM
    context_conditions: entity.context_conditions, // Already deserialized by TypeORM
    exclusion_patterns: entity.exclusion_patterns, // Already deserialized by TypeORM
    priority: entity.priority || 5,
    auto_apply: Boolean(entity.auto_apply),
    merge_strategy: entity.merge_strategy || 'append',
    confidence_threshold: entity.confidence_threshold || 0.8,
    usage_count: entity.usage_count || 0,
    acceptance_rate: entity.acceptance_rate || 0.0,
    effectiveness_score: entity.effectiveness_score || 0.0,
    last_used: entity.last_used ? new Date(entity.last_used) : undefined,
    created_by: entity.created_by || 'user',
    active: Boolean(entity.is_active),
    entity_links: entity.entity_links, // Already deserialized by TypeORM
    stable_links: entity.stable_links, // Already deserialized by TypeORM
    fragile_links: entity.fragile_links, // Already deserialized by TypeORM
    semantic_context: entity.semantic_context,
    stable_tags: entity.stable_tags, // Already deserialized by TypeORM
    auto_tags: entity.auto_tags, // Already deserialized by TypeORM
    contextual_tags: entity.contextual_tags, // Already deserialized by TypeORM
    created_at: new Date(entity.created_at),
    updated_at: new Date(entity.updated_at)
  };
}

// Helper to prepare entity for storage
function mapRuleToEntity(rule: any): any {
  return {
    ...rule,
    is_active: rule.active !== undefined ? rule.active : true  // Map active to is_active for TypeORM
  };
}
import type { StorageResult } from '../../../types/storage.js';
import { logger } from '../../../shared/logger.js';

export class RulesRepository {
  private ruleRepo: Repository<Rule>;
  private relationshipRepo: Repository<RuleRelationship>;
  private applicationRepo: Repository<RuleApplication>;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.ruleRepo = dataSource.getRepository(Rule);
    this.relationshipRepo = dataSource.getRepository(RuleRelationship);
    this.applicationRepo = dataSource.getRepository(RuleApplication);
  }

  /**
   * Store rule - EXACT MATCH to RulesManager.storeRule
   * Maps to SQL: INSERT INTO meta.rules (28 columns) VALUES (?, ?, ...)
   */
  async storeRule(rule: IRule): Promise<StorageResult & { data?: IRule }> {
    try {
      // Calculate depth level before storing - EXACT MATCH
      const ruleWithDepth = { ...rule };
      if (ruleWithDepth.parent_id) {
        const parentRule = await this.getRuleSync(ruleWithDepth.parent_id);
        if (parentRule) {
          ruleWithDepth.depth_level = parentRule.depth_level + 1;
        }
      } else {
        ruleWithDepth.depth_level = 0;
      }

      // Don't use toDbRow - TypeORM's simple-json will handle serialization
      // Pass the IRule directly and let TypeORM serialize the JSON fields
      const ruleEntity = this.ruleRepo.create({
        id: ruleWithDepth.id,
        name: ruleWithDepth.name,
        description: ruleWithDepth.description,
        rule_type: ruleWithDepth.rule_type,
        parent_id: ruleWithDepth.parent_id,
        sort_order: ruleWithDepth.sort_order,
        depth_level: ruleWithDepth.depth_level,
        guidance_text: ruleWithDepth.guidance_text,
        code_template: ruleWithDepth.code_template,
        validation_script: ruleWithDepth.validation_script,
        trigger_patterns: ruleWithDepth.trigger_patterns, // TypeORM will serialize
        semantic_triggers: ruleWithDepth.semantic_triggers, // TypeORM will serialize
        context_conditions: ruleWithDepth.context_conditions, // TypeORM will serialize
        exclusion_patterns: ruleWithDepth.exclusion_patterns, // TypeORM will serialize
        priority: ruleWithDepth.priority,
        auto_apply: ruleWithDepth.auto_apply,
        merge_strategy: ruleWithDepth.merge_strategy,
        confidence_threshold: ruleWithDepth.confidence_threshold,
        usage_count: ruleWithDepth.usage_count,
        acceptance_rate: ruleWithDepth.acceptance_rate,
        effectiveness_score: ruleWithDepth.effectiveness_score,
        last_used: ruleWithDepth.last_used,
        created_by: ruleWithDepth.created_by,
        is_active: ruleWithDepth.active,
        entity_links: ruleWithDepth.entity_links, // TypeORM will serialize
        stable_tags: ruleWithDepth.stable_tags, // TypeORM will serialize
        auto_tags: ruleWithDepth.auto_tags, // TypeORM will serialize
        contextual_tags: ruleWithDepth.contextual_tags, // TypeORM will serialize
        created_at: ruleWithDepth.created_at,
        updated_at: ruleWithDepth.updated_at
      });

      const savedRule = await this.ruleRepo.save(ruleEntity);
      const iRule = mapEntityToRule(savedRule);
      return { success: true, data: iRule };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get rule by ID - EXACT MATCH to RulesManager.getRule
   * Maps to SQL: SELECT * FROM meta.rules WHERE id = ?
   */
  async getRule(id: string): Promise<IRule | null> {
    try {
      const rule = await this.ruleRepo.findOne({ where: { id } });
      if (!rule) return null;
      return mapEntityToRule(rule);
    } catch (error) {
      return null;
    }
  }

  /**
   * Synchronous get for depth calculation - mirrors RulesManager.getRuleSync
   * Maps to SQL: SELECT * FROM meta.rules WHERE id = ?
   */
  private async getRuleSync(id: string): Promise<IRule | null> {
    // TypeORM doesn't have sync, so we use async
    try {
      const rule = await this.ruleRepo.findOne({ where: { id } });
      if (!rule) return null;
      return mapEntityToRule(rule);
    } catch (error) {
      return null;
    }
  }

  /**
   * Update rule - EXACT MATCH to RulesManager.updateRule
   * Dynamically builds UPDATE statement with only changed fields
   */
  async updateRule(id: string, updates: any): Promise<StorageResult> {
    try {
      logger.debug('RulesRepository.updateRule updates:', JSON.stringify(updates, null, 2));
      const updateData: any = {};
      
      // Build update object EXACTLY as RulesManager does
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.guidance_text !== undefined) updateData.guidance_text = updates.guidance_text;
      if (updates.code_template !== undefined) updateData.code_template = updates.code_template;
      if (updates.validation_script !== undefined) updateData.validation_script = updates.validation_script;
      
      // TypeORM's simple-json will handle serialization
      if (updates.trigger_patterns !== undefined) {
        updateData.trigger_patterns = updates.trigger_patterns;
      }

      if (updates.semantic_triggers !== undefined) {
        updateData.semantic_triggers = updates.semantic_triggers;
      }

      if (updates.context_conditions !== undefined) {
        updateData.context_conditions = updates.context_conditions;
      }
      
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      
      if (updates.auto_apply !== undefined) {
        // EXACT MATCH: RulesManager uses 1/0 for boolean in SQLite
        updateData.auto_apply = updates.auto_apply ? 1 : 0;
      }
      
      if (updates.confidence_threshold !== undefined) {
        updateData.confidence_threshold = updates.confidence_threshold;
      }
      
      if (updates.merge_strategy !== undefined) updateData.merge_strategy = updates.merge_strategy;
      
      if (updates.active !== undefined) {
        // Map 'active' from API to 'is_active' in TypeORM entity
        updateData.is_active = updates.active;
      }
      
      if (updates.usage_count !== undefined) updateData.usage_count = updates.usage_count;
      if (updates.acceptance_rate !== undefined) updateData.acceptance_rate = updates.acceptance_rate;
      if (updates.effectiveness_score !== undefined) updateData.effectiveness_score = updates.effectiveness_score;
      if (updates.last_used !== undefined) updateData.last_used = updates.last_used;
      
      // TypeORM's simple-json will handle serialization
      if (updates.stable_tags !== undefined) {
        updateData.stable_tags = updates.stable_tags;
      }

      if (updates.entity_links !== undefined) {
        updateData.entity_links = updates.entity_links;
      }
      
      if (updates.parent_id !== undefined) {
        updateData.parent_id = updates.parent_id;
        // Recalculate depth level when parent changes
        let newDepthLevel = 0;
        if (updates.parent_id) {
          const parentRule = await this.getRule(updates.parent_id);
          if (parentRule) {
            newDepthLevel = parentRule.depth_level + 1;
          }
        }
        updateData.depth_level = newDepthLevel;
      }
      
      if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;
      
      if (Object.keys(updateData).length === 0) {
        return { success: false, error: 'No fields to update' };
      }
      
      updateData.updated_at = new Date();
      
      const result = await this.ruleRepo.update(id, updateData);
      
      if (!result.affected || result.affected === 0) {
        return { success: false, error: 'Rule not found' };
      }
      
      // Update children depths if parent_id was changed - EXACT MATCH
      if (updates.parent_id !== undefined) {
        await this.updateChildrenDepths(id);
      }
      
      return { success: true, affected: result.affected };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Delete rule - EXACT MATCH to RulesManager.deleteRule
   * Maps to SQL: DELETE FROM meta.rules WHERE id = ?
   */
  async deleteRule(id: string): Promise<StorageResult> {
    try {
      const result = await this.ruleRepo.delete(id);
      
      if (!result.affected || result.affected === 0) {
        return { success: false, error: 'Rule not found' };
      }
      
      return { success: true, affected: result.affected };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Get applicable rules - EXACT MATCH to RulesManager.getApplicableRules
   * Filters rules based on context and returns sorted by priority
   */
  async getApplicableRules(context: RuleApplicationContext): Promise<ApplicableRule[]> {
    try {
      const query = this.ruleRepo.createQueryBuilder('rule')
        .where('rule.is_active = :active', { active: true });
      
      const rules = await query.getMany();
      const parsedRules = rules.map(row => mapEntityToRule(row));
      
      // Use RuleUtils to determine applicable rules - EXACT MATCH
      return RuleUtils.getApplicableRules(parsedRules, context.entity_type, context);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get rule count
   */
  async getRuleCount(): Promise<number> {
    return this.ruleRepo.count();
  }

  /**
   * Get embedding count for rules
   */
  async getEmbeddingCount(): Promise<number> {
    return this.ruleRepo
      .createQueryBuilder('rule')
      .where('rule.semantic_embedding IS NOT NULL')
      .getCount();
  }

  /**
   * Get all rules - EXACT MATCH to RulesManager.getAllRules
   * Returns all rules optionally filtered by active status
   */
  async getAllRules(includeInactive: boolean = false): Promise<IRule[]> {
    try {
      const query = this.ruleRepo.createQueryBuilder('rule');
      
      if (!includeInactive) {
        query.where('rule.is_active = :active', { active: true });
      }
      
      const rules = await query.getMany();
      logger.debug(`RulesRepository.getAllRules: Found ${rules.length} rules (includeInactive=${includeInactive})`);
      return rules.map(row => mapEntityToRule(row));
    } catch (error) {
      logger.error('RulesRepository.getAllRules error:', error);
      return [];
    }
  }

  /**
   * Get all rules summary - EXACT MATCH to RulesManager.getAllRulesSummary
   * Returns minimal rule info for performance
   */
  async getAllRulesSummary(includeInactive: boolean = false): Promise<any[]> {
    try {
      const query = this.ruleRepo.createQueryBuilder('rule')
        .select([
          'rule.id',
          'rule.name', 
          'rule.rule_type',
          'rule.priority',
          'rule.is_active',
          'rule.parent_id',
          'rule.depth_level',
          'rule.usage_count',
          'rule.effectiveness_score',
          'rule.last_used'
        ]);
      
      if (!includeInactive) {
        query.where('rule.is_active = :active', { active: true });
      }
      
      const rules = await query.getRawMany();
      return rules.map(row => mapEntityToRule(row));
    } catch (error) {
      return [];
    }
  }

  /**
   * Update rule usage - EXACT MATCH to RulesManager.updateRuleUsage
   * Updates usage statistics after rule application
   */
  async updateRuleUsage(updatedRule: IRule): Promise<StorageResult> {
    try {
      const result = await this.ruleRepo.update(updatedRule.id, {
        usage_count: updatedRule.usage_count,
        acceptance_rate: updatedRule.acceptance_rate,
        effectiveness_score: updatedRule.effectiveness_score,
        last_used: updatedRule.last_used,
        updated_at: new Date()
      });
      
      if (!result.affected || result.affected === 0) {
        return { success: false, error: 'Rule not found' };
      }
      
      return { success: true, affected: result.affected };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Track rule application - EXACT MATCH to RulesManager.trackRuleApplication
   * Maps to SQL: INSERT INTO meta.rule_applications
   */
  async trackRuleApplication(
    ruleId: string,
    entityType: string,
    entityId: string,
    appliedContext: any,
    userAction?: string,
    generatedCode?: string,
    feedbackScore?: number
  ): Promise<StorageResult> {
    try {
      const applicationId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const application = this.applicationRepo.create({
        id: applicationId,
        rule_id: ruleId,
        entity_type: entityType,
        entity_id: entityId,
        applied_context: JSON.stringify(appliedContext),
        user_action: userAction,
        generated_code: generatedCode,
        feedback_score: feedbackScore,
        applied_at: new Date()
      });
      
      await this.applicationRepo.save(application);
      
      // Update rule statistics - EXACT MATCH to old SQL behavior
      const rule = await this.ruleRepo.findOne({ where: { id: ruleId } });
      if (!rule) {
        throw new Error('Rule not found');
      }
      
      const currentUsageCount = rule.usage_count || 0;
      const currentAcceptance = rule.acceptance_rate || 0;
      
      let newAcceptance = currentAcceptance;
      if (userAction === 'accepted') {
        newAcceptance = (currentAcceptance * currentUsageCount + 1.0) / (currentUsageCount + 1);
      } else if (userAction === 'rejected') {
        newAcceptance = (currentAcceptance * currentUsageCount) / (currentUsageCount + 1);
      }
      
      let newEffectiveness = rule.effectiveness_score || 0;
      if (feedbackScore !== undefined && feedbackScore !== null) {
        newEffectiveness = (newEffectiveness * currentUsageCount + feedbackScore / 5.0) / (currentUsageCount + 1);
      }
      
      await this.ruleRepo.update(ruleId, {
        usage_count: currentUsageCount + 1,
        last_used: new Date().toISOString(),
        acceptance_rate: newAcceptance,
        effectiveness_score: newEffectiveness
      });
      
      return { success: true, affected: 1 };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Get rule analytics - EXACT MATCH to RulesManager.getRuleAnalytics
   * Complex aggregation query for rule effectiveness
   */
  async getRuleAnalytics(daysSince: number = 30): Promise<any[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysSince);
      
      // This is a complex aggregation query that needs raw SQL
      // TypeORM query builder doesn't easily support all the aggregations
      const query = `
        SELECT 
          r.id,
          r.name,
          r.rule_type,
          r.usage_count,
          r.acceptance_rate,
          r.effectiveness_score,
          r.last_used,
          (
            SELECT COUNT(1)
            FROM rule_relationships rr
            WHERE rr.relationship_type = 'conflicts'
              AND (rr.parent_rule_id = r.id OR rr.child_rule_id = r.id)
          ) AS conflict_count,
          COUNT(DISTINCT ra.id) as recent_applications,
          SUM(CASE WHEN ra.user_action = 'accepted' THEN 1 ELSE 0 END) as recent_accepted,
          SUM(CASE WHEN ra.user_action = 'modified' THEN 1 ELSE 0 END) as recent_modified,
          SUM(CASE WHEN ra.user_action = 'rejected' THEN 1 ELSE 0 END) as recent_rejected,
          AVG(ra.feedback_score) as avg_feedback_score
        FROM rules r
        LEFT JOIN rule_applications ra ON r.id = ra.rule_id AND ra.applied_at >= ?
        GROUP BY r.id
        ORDER BY r.usage_count DESC, r.effectiveness_score DESC
      `;
      
      const results = await this.dataSource.query(query, [cutoffDate.toISOString()]);
      
      return results.map((row: any) => ({
        ...row,
        recent_acceptance_rate: row.recent_applications > 0 
          ? row.recent_accepted / row.recent_applications 
          : null,
        days_since_last_use: row.last_used 
          ? Math.floor((Date.now() - new Date(row.last_used).getTime()) / (1000 * 60 * 60 * 24))
          : null
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get rules for degradation - EXACT MATCH to RulesManager.getRulesForDegradation
   * Maps to complex SQL with date and effectiveness filters
   */
  async getRulesForDegradation(inactiveThresholdDays: number, effectivenessThreshold: number): Promise<IRule[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactiveThresholdDays);
      
      const query = this.ruleRepo.createQueryBuilder('rule')
        .where('rule.is_active = :active', { active: true })
        .andWhere(
          '(rule.last_used IS NULL OR rule.last_used < :cutoff OR rule.effectiveness_score < :threshold)',
          { 
            cutoff: cutoffDate.toISOString(),
            threshold: effectivenessThreshold
          }
        )
        .orderBy('rule.last_used', 'ASC')
        .addOrderBy('rule.effectiveness_score', 'ASC');
      
      const rules = await query.getMany();
      return rules.map(row => mapEntityToRule(row));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get rule hierarchy - EXACT MATCH to RulesManager.getRuleHierarchy
   * Returns rules in hierarchical structure
   */
  async getRuleHierarchy(rootId?: string, includeInactive: boolean = false): Promise<any> {
    try {
      const query = this.ruleRepo.createQueryBuilder('rule');
      
      if (!includeInactive) {
        query.where('rule.is_active = :active', { active: true });
      }
      
      const allRules = await query.getMany();
      const parsedRules = allRules.map(row => mapEntityToRule(row));
      
      if (rootId) {
        const allRulesWithRoot = parsedRules.filter(rule => 
          rule.id === rootId || parsedRules.some(p => p.parent_id === rootId)
        );
        const hierarchy = RuleUtils.buildHierarchy(allRulesWithRoot as IRule[]);
        const rootNode = hierarchy.find(h => h.id === rootId);
        return rootNode || null;
      } else {
        return RuleUtils.buildHierarchy(parsedRules as IRule[]);
      }
    } catch (error) {
      return rootId ? null : [];
    }
  }

  /**
   * Get rule hierarchy summary - EXACT MATCH to RulesManager.getRuleHierarchySummary
   * Lightweight version for UI
   */
  async getRuleHierarchySummary(rootId?: string, includeInactive: boolean = false): Promise<any> {
    try {
      const query = this.ruleRepo.createQueryBuilder('rule')
        .select([
          'rule.id',
          'rule.name',
          'rule.rule_type',
          'rule.priority',
          'rule.is_active',
          'rule.parent_id',
          'rule.depth_level',
          'rule.usage_count',
          'rule.effectiveness_score',
          'rule.last_used'
        ]);
      
      if (!includeInactive) {
        query.where('rule.is_active = :active', { active: true });
      }
      
      const allRules = await query.getRawMany();
      const parsedRules = allRules.map(row => mapEntityToRule(row));
      
      if (rootId) {
        const allRulesWithRoot = parsedRules.filter(rule => 
          rule.id === rootId || parsedRules.some(p => p.parent_id === rootId)
        );
        const hierarchy = RuleUtils.buildHierarchy(allRulesWithRoot as IRule[]);
        const rootNode = hierarchy.find(h => h.id === rootId);
        return rootNode || null;
      } else {
        return RuleUtils.buildHierarchy(parsedRules as IRule[]);
      }
    } catch (error) {
      return rootId ? null : [];
    }
  }

  /**
   * Update children depths recursively - EXACT MATCH to RulesManager.updateChildrenDepths
   */
  private async updateChildrenDepths(parentId: string): Promise<void> {
    try {
      const parentRule = await this.getRule(parentId);
      if (!parentRule) return;
      
      // Get all direct children
      const children = await this.ruleRepo.find({ 
        where: { parent_id: parentId },
        select: ['id']
      });
      
      // Update each child's depth and recursively update their children
      for (const child of children) {
        const newDepthLevel = parentRule.depth_level + 1;
        
        // Update the child's depth
        await this.ruleRepo.update(child.id, {
          depth_level: newDepthLevel,
          updated_at: new Date()
        });
        
        // Recursively update this child's children
        await this.updateChildrenDepths(child.id);
      }
    } catch (error) {
      console.warn('Failed to update children depths:', error);
    }
  }

  /**
   * Get rule tree - Returns rules in hierarchical structure
   */
  async getRuleTree(rootId?: string, includeInactive?: boolean): Promise<IRule[]> {
    try {
      const query = this.ruleRepo.createQueryBuilder('rule');
      
      if (rootId) {
        query.where('rule.parent_id = :rootId', { rootId });
      } else {
        query.where('rule.parent_id IS NULL');
      }
      
      // Note: Rule entity doesn't have active field, using effectiveness_score as proxy
      if (!includeInactive) {
        query.andWhere('rule.effectiveness_score > :threshold', { threshold: 0.3 });
      }
      
      query.orderBy('rule.priority', 'DESC')
        .addOrderBy('rule.created_at', 'ASC');
      
      const rules = await query.getRawMany();
      return rules.map(row => mapEntityToRule(row));
    } catch (error) {
      return [];
    }
  }

  /**
   * Update rule effectiveness - EXACT MATCH to RulesManager.updateRuleEffectiveness
   */
  async updateRuleEffectiveness(ruleId: string, userAction: string, feedbackScore?: number): Promise<StorageResult> {
    try {
      const rule = await this.getRule(ruleId);
      if (!rule) {
        return { success: false, error: 'Rule not found' };
      }

      // Calculate new effectiveness based on action and feedback
      const currentUsageCount = rule.usage_count || 0;
      const currentAcceptance = rule.acceptance_rate || 0;
      const currentEffectiveness = rule.effectiveness_score || 0;

      let newAcceptance = currentAcceptance;
      let newEffectiveness = currentEffectiveness;

      // Update acceptance rate based on user action
      if (userAction === 'accepted') {
        newAcceptance = (currentAcceptance * currentUsageCount + 1.0) / (currentUsageCount + 1);
      } else if (userAction === 'rejected') {
        newAcceptance = (currentAcceptance * currentUsageCount) / (currentUsageCount + 1);
      }

      // Update effectiveness score if feedback provided
      if (feedbackScore !== undefined) {
        const normalizedScore = feedbackScore / 5.0; // Normalize to 0-1
        newEffectiveness = (currentEffectiveness * currentUsageCount + normalizedScore) / (currentUsageCount + 1);
      }

      // Update the rule
      await this.ruleRepo.update(ruleId, {
        usage_count: currentUsageCount + 1,
        acceptance_rate: newAcceptance,
        effectiveness_score: newEffectiveness,
        last_used: new Date()
      });

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Get rule tree summary - EXACT MATCH to RulesManager.getRuleTreeSummary
   */
  async getRuleTreeSummary(rootId?: string, includeInactive = false): Promise<Partial<IRule>[]> {
    try {
      const query = this.ruleRepo.createQueryBuilder('rule')
        .select([
          'rule.id', 'rule.parent_id', 'rule.name', 'rule.rule_type', 
          'rule.priority', 'rule.auto_apply',
          'rule.usage_count', 'rule.acceptance_rate', 'rule.effectiveness_score',
          'rule.last_used', 'rule.entity_links', 'rule.stable_tags', 
          'rule.depth_level', 'rule.sort_order', 'rule.created_at', 'rule.updated_at'
        ]);
      
      if (rootId) {
        query.where('rule.parent_id = :rootId', { rootId });
      } else {
        query.where('rule.parent_id IS NULL');
      }
      
      // Note: Rule entity doesn't have active field, using effectiveness_score as proxy
      if (!includeInactive) {
        query.andWhere('rule.effectiveness_score > :threshold', { threshold: 0.3 });
      }
      
      query.orderBy('rule.created_at', 'ASC');
      
      const rules = await query.getMany();
      
      // Convert to partial IRule format (summary without full content)
      return rules.map(rule => ({
        id: rule.id,
        parent_id: rule.parent_id,
        name: rule.name,
        rule_type: rule.rule_type as any,
        priority: rule.priority,
        auto_apply: rule.auto_apply,
        active: true, // Rules don't have active field in entity, default to true
        usage_count: rule.usage_count,
        acceptance_rate: rule.acceptance_rate,
        effectiveness_score: rule.effectiveness_score,
        last_used: rule.last_used,
        entity_links: rule.entity_links as any,
        stable_tags: rule.stable_tags,
        depth_level: rule.depth_level,
        sort_order: rule.sort_order,
        created_at: rule.created_at,
        updated_at: rule.updated_at
      }));
    } catch (error) {
      return [];
    }
  }

  async getRulesByIds(ids: string[], includeInactive = true): Promise<IRule[]> {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    try {
      const query = this.ruleRepo.createQueryBuilder('rule')
        .where('rule.id IN (:...ids)', { ids });

      if (!includeInactive) {
        query.andWhere('rule.is_active = :active', { active: true });
      }

      const rules = await query.getMany();
      return rules.map(rule => mapEntityToRule(rule));
    } catch (error) {
      logger.warn('getRulesByIds failed:', error);
      return [];
    }
  }
}
