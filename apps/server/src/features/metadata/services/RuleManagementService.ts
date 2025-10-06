/**
 * RuleManagementService - Handles all rule operations
 * Single responsibility: Rule CRUD, application, and analytics
 */

import { DatabaseManager } from '../../storage/DatabaseManager.js';
import { EmbeddingService } from '../../../nlp/EmbeddingServiceAdapter.js';
import type { 
  IRule, 
  CreateRuleParams
} from '@felix/code-intelligence';
import { RuleUtils } from '@felix/code-intelligence';
import type { SearchResult } from '../../../types/storage.js';

export interface RuleApplicationContext {
  current_task_id?: string;
  user_intent?: string;
  file_content?: string;
  force_apply?: boolean;
}

export interface RuleApplicationResult {
  success: boolean;
  rule_id: string;
  generated_code?: string;
  guidance?: string;
  error?: string;
}

export interface RuleAnalytics {
  total_rules: number;
  active_rules: number;
  applications_count: number;
  success_rate: number;
  average_feedback: number;
  rules_by_type: Record<string, number>;
  top_rules: Array<{ rule_id: string; usage_count: number }>;
}

export interface UpdateRuleParams {
  name?: string;
  description?: string;
  guidance_text?: string;
  code_template?: string;
  validation_script?: string;
  priority?: number;
  active?: boolean;
  auto_apply?: boolean;
  confidence_threshold?: number;
}

export interface RuleSearchCriteria {
  query?: string;
  semantic?: boolean;
  rule_type?: string;
  active?: boolean;
  limit?: number;
  offset?: number;
}

export class RuleManagementService {
  private dbManager: DatabaseManager;
  private embeddingService: EmbeddingService;

  constructor(
    dbManager: DatabaseManager,
    embeddingService: EmbeddingService
  ) {
    this.dbManager = dbManager;
    this.embeddingService = embeddingService;
  }

  /**
   * Add a new rule
   */
  async addRule(params: CreateRuleParams): Promise<IRule> {
    const rule = RuleUtils.createFromParams(params);
    const result = await this.dbManager.getRulesRepository().storeRule(rule);
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to add rule');
    }
    
    // Generate embedding for the rule asynchronously
    const savedRule = result.data;
    this.generateRuleEmbedding(savedRule).catch(async error => {
      const { logger } = await import('../../../shared/logger.js');
      logger.warn(`Failed to generate embedding for rule ${savedRule.id}:`, error);
    });
    
    return result.data;
  }

  /**
   * Get a rule by ID
   */
  async getRule(id: string): Promise<IRule | null> {
    return await this.dbManager.getRulesRepository().getRule(id);
  }

  /**
   * Update a rule
   */
  async updateRule(id: string, updates: UpdateRuleParams): Promise<IRule> {
    const result = await this.dbManager.getRulesRepository().updateRule(id, updates);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update rule');
    }
    
    const updatedRule = await this.getRule(id);
    if (!updatedRule) {
      throw new Error('Rule not found after update');
    }
    
    // Regenerate embedding if content changed
    if (updates.name || updates.description || updates.guidance_text) {
      this.generateRuleEmbedding(updatedRule).catch(async error => {
        const { logger } = await import('../../../shared/logger.js');
        logger.warn(`Failed to regenerate embedding for rule ${id}:`, error);
      });
    }
    
    return updatedRule;
  }

  /**
   * Delete a rule
   */
  async deleteRule(id: string): Promise<void> {
    const result = await this.dbManager.getRulesRepository().deleteRule(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete rule');
    }
  }

  /**
   * List rules with optional criteria
   */
  async listRules(criteria: RuleSearchCriteria = {}): Promise<IRule[]> {
    const includeInactive = criteria.active === undefined || criteria.active === false;
    const allRules = await this.dbManager.getRulesRepository().getAllRules(includeInactive);
    
    // Apply filters
    let filtered = allRules;
    if (criteria.rule_type) {
      filtered = filtered.filter(r => r.rule_type === criteria.rule_type);
    }
    if (criteria.active !== undefined) {
      filtered = filtered.filter(r => r.active === criteria.active);
    }
    
    // Apply limit
    if (criteria.limit) {
      filtered = filtered.slice(criteria.offset || 0, (criteria.offset || 0) + criteria.limit);
    }
    
    return filtered;
  }

  async getRulesByIds(ids: string[], includeInactive = true): Promise<IRule[]> {
    return await this.dbManager.getRulesRepository().getRulesByIds(ids, includeInactive);
  }

  /**
   * Search rules with pagination
   */
  async searchRules(criteria: RuleSearchCriteria = {}): Promise<SearchResult<IRule>> {
    const rules = await this.listRules(criteria);
    return {
      items: rules,
      total: rules.length,
      hasMore: false,
      offset: criteria.offset || 0,
      limit: criteria.limit || 50
    };
  }

  /**
   * Get rule hierarchy tree
   */
  async getRuleTree(rootId?: string, includeInactive = false): Promise<IRule[]> {
    return await this.dbManager.getRulesRepository().getRuleTree(rootId, includeInactive);
  }

  /**
   * Get applicable rules for a context
   */
  async getApplicableRules(
    entityType: string,
    entityId: string,
    context?: RuleApplicationContext
  ): Promise<IRule[]> {
    const rulesRepo = this.dbManager.getRulesRepository() as any;
    
    if (rulesRepo.getApplicableRules) {
      return await rulesRepo.getApplicableRules(entityType, entityId, context);
    }
    
    // Fallback: get all rules and filter
    const allRules = await this.listRules({ active: true });
    return this.filterApplicableRules(allRules, entityType, entityId, context);
  }

  async getRulesForEntity(entityType: string, entityId: string, includeInactive = false): Promise<IRule[]> {
    const rules = await this.listRules(includeInactive ? {} : { active: true });
    return rules.filter(rule => {
      const links = ((rule as any).entity_links || []) as Array<{ entity_type?: string; entity_id?: string }>;
      if (!Array.isArray(links)) return false;
      return links.some(link => link?.entity_type === entityType && link?.entity_id === entityId);
    });
  }

  /**
   * Apply a rule to an entity
   */
  async applyRule(
    ruleId: string,
    entityType: string,
    entityId: string,
    context?: RuleApplicationContext
  ): Promise<RuleApplicationResult> {
    const rule = await this.getRule(ruleId);
    
    if (!rule) {
      return {
        success: false,
        rule_id: ruleId,
        error: 'Rule not found'
      };
    }
    
    if (!rule.active) {
      return {
        success: false,
        rule_id: ruleId,
        error: 'Rule is not active'
      };
    }
    
    try {
      // Apply the rule based on its type
      let result: RuleApplicationResult;
      
      if (rule.rule_type === 'automation' && rule.auto_apply && rule.code_template) {
        // Generate code from template
        const generatedCode = this.generateCodeFromTemplate(rule.code_template, context);
        result = {
          success: true,
          rule_id: ruleId,
          generated_code: generatedCode
        };
      } else {
        // Return guidance
        result = {
          success: true,
          rule_id: ruleId,
          guidance: rule.guidance_text
        };
      }
      
      // Track application
      await this.trackRuleApplication(ruleId, entityType, entityId, result, context);
      
      return result;
    } catch (error) {
      return {
        success: false,
        rule_id: ruleId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Track rule application for analytics
   */
  async trackRuleApplication(
    ruleId: string,
    entityType: string,
    entityId: string,
    result: RuleApplicationResult,
    context?: RuleApplicationContext
  ): Promise<void> {
    const rulesRepo = this.dbManager.getRulesRepository() as any;
    
    if (rulesRepo.trackRuleApplication) {
      await rulesRepo.trackRuleApplication({
        rule_id: ruleId,
        entity_type: entityType,
        entity_id: entityId,
        applied_context: context,
        generated_code: result.generated_code,
        user_action: result.success ? 'accepted' : 'rejected',
        feedback_score: result.success ? 5 : 1
      });
    }
  }

  /**
   * Get rule analytics
   */
  async getRuleAnalytics(daysSince = 30): Promise<RuleAnalytics> {
    const rulesRepo = this.dbManager.getRulesRepository() as any;
    
    if (rulesRepo.getRuleAnalytics) {
      return await rulesRepo.getRuleAnalytics(daysSince);
    }
    
    // Fallback: calculate basic analytics
    const allRules = await this.listRules();
    const activeRules = allRules.filter(r => r.active);
    
    const rulesByType = allRules.reduce((acc, rule) => {
      acc[rule.rule_type] = (acc[rule.rule_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total_rules: allRules.length,
      active_rules: activeRules.length,
      applications_count: 0,
      success_rate: 0,
      average_feedback: 0,
      rules_by_type: rulesByType,
      top_rules: []
    };
  }

  /**
   * Get rule count
   */
  async getRuleCount(): Promise<number> {
    return await this.dbManager.getRulesRepository().getRuleCount();
  }

  /**
   * Get all rules
   */
  async getAllRules(): Promise<IRule[]> {
    const rulesRepo = this.dbManager.getRulesRepository() as any;
    if (rulesRepo.getAllRules) {
      return await rulesRepo.getAllRules();
    }
    // Fallback to search with no criteria
    const result = await this.searchRules({ limit: 1000 });
    return result.items;
  }

  /**
   * Get rules by type
   */
  async getRulesByType(type: string): Promise<IRule[]> {
    const result = await this.searchRules({ rule_type: type as any });
    return result.items;
  }

  /**
   * Generate embedding for a single rule and store it
   */
  private async generateRuleEmbedding(rule: IRule): Promise<void> {
    try {
      const embeddingResult = await this.embeddingService.generateRuleEmbedding(rule);
      const embeddingRepo = this.dbManager.getEmbeddingRepository();
      await embeddingRepo.storeEmbedding(
        rule.id,
        embeddingResult.embedding,
        String(embeddingResult.version),
        'rule'
      );
    } catch (error) {
      const { logger } = await import('../../../shared/logger.js');
      logger.warn(`Failed to generate embedding for rule ${rule.id}:`, error);
    }
  }

  /**
   * Generate embeddings for rules in batch
   */
  async generateRuleEmbeddingsBatch(rules: IRule[]): Promise<void> {
    try {
      const { logger } = await import('../../../shared/logger.js');
      logger.info(`Generating embeddings for ${rules.length} rules...`);
      const startTime = Date.now();
      
      // Process rules in smaller batches to avoid memory issues
      const BATCH_SIZE = 10;
      const results = { success: 0, failed: 0 };
      
      for (let i = 0; i < rules.length; i += BATCH_SIZE) {
        const batch = rules.slice(i, i + BATCH_SIZE);
        
        // Generate embeddings for this batch
        const embeddingPromises = batch.map(async (rule) => {
          try {
            const embeddingResult = await this.embeddingService.generateRuleEmbedding(rule);
            const embeddingRepo = this.dbManager.getEmbeddingRepository();
            await embeddingRepo.storeEmbedding(
              rule.id,
              embeddingResult.embedding,
              String(embeddingResult.version),
              'rule'
            );
            return { success: true, ruleId: rule.id };
          } catch (error) {
            const { logger } = await import('../../../shared/logger.js');
            logger.warn(`Failed to generate embedding for rule ${rule.id}:`, error);
            return { success: false, ruleId: rule.id, error };
          }
        });
        
        const batchResults = await Promise.all(embeddingPromises);
        
        // Count successes and failures
        batchResults.forEach(result => {
          if (result.success) {
            results.success++;
          } else {
            results.failed++;
          }
        });
      }
      
      const endTime = Date.now();
      logger.info(`Generated embeddings for ${results.success} rules (${results.failed} failed) in ${endTime - startTime}ms`);
    } catch (error) {
      const { logger } = await import('../../../shared/logger.js');
      logger.error('Failed to generate rule embeddings in batch:', error);
    }
  }

  /**
   * Filter applicable rules based on context
   */
  private filterApplicableRules(
    rules: IRule[],
    entityType: string,
    entityId: string,
    context?: RuleApplicationContext
  ): IRule[] {
    return rules.filter(rule => {
      // Check if rule is active
      if (!rule.active) return false;
      
      // Check confidence threshold
      if (context?.force_apply !== true && rule.confidence_threshold) {
        // Would need actual confidence calculation here
        // For now, just check if threshold is met
        if (rule.confidence_threshold > 0.5) {
          // Placeholder logic
        }
      }
      
      // Check trigger patterns
      if (rule.trigger_patterns) {
        const patterns = rule.trigger_patterns as any;
        
        // Check file patterns
        if (patterns.files && Array.isArray(patterns.files)) {
          // Would need to match against actual file path
        }
        
        // Check component types
        if (patterns.components && Array.isArray(patterns.components)) {
          // Would need to match against component type
        }
      }
      
      return true;
    });
  }

  /**
   * Generate code from template
   */
  private generateCodeFromTemplate(template: string, context?: RuleApplicationContext): string {
    let code = template;
    
    // Replace context placeholders
    if (context) {
      if (context.current_task_id) {
        code = code.replace(/\{\{task_id\}\}/g, context.current_task_id);
      }
      if (context.user_intent) {
        code = code.replace(/\{\{intent\}\}/g, context.user_intent);
      }
    }
    
    // Replace common placeholders
    code = code.replace(/\{\{timestamp\}\}/g, new Date().toISOString());
    code = code.replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
    
    return code;
  }

  /**
   * Validate rule configuration
   */
  validateRuleConfiguration(rule: Partial<IRule>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!rule.name) {
      errors.push('Rule name is required');
    }
    
    if (!rule.rule_type) {
      errors.push('Rule type is required');
    }
    
    if (rule.rule_type === 'automation' && rule.auto_apply && !rule.code_template) {
      errors.push('Automation rules with auto_apply must have a code_template');
    }
    
    if (rule.rule_type === 'constraint' && !rule.validation_script) {
      errors.push('Constraint rules must have a validation_script');
    }
    
    if (rule.confidence_threshold !== undefined) {
      if (rule.confidence_threshold < 0 || rule.confidence_threshold > 1) {
        errors.push('Confidence threshold must be between 0 and 1');
      }
    }
    
    if (rule.priority !== undefined) {
      if (rule.priority < 1 || rule.priority > 10) {
        errors.push('Priority must be between 1 and 10');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // watcher-ping: 2025-09-12T00:00:00Z — harmless comment to trigger file watcher
}
