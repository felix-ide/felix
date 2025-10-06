/**
 * Rule model - Smart coding rules that go beyond Cursor
 */
import { EntityType } from './Note.js';
/**
 * Rule types for categorization
 */
export type RuleType = 'pattern' | 'constraint' | 'semantic' | 'automation';
/**
 * Rule merge strategies
 */
export type MergeStrategy = 'append' | 'replace' | 'merge';
/**
 * Rule relationship types
 */
export type RuleRelationshipType = 'extends' | 'overrides' | 'conflicts';
/**
 * User actions on rule applications
 */
export type UserAction = 'accepted' | 'modified' | 'rejected' | 'ignored';
/**
 * Smart trigger patterns for rules
 */
export interface RuleTriggerPatterns {
    files?: string[];
    components?: string[];
    relationships?: string[];
}
/**
 * Semantic triggers for intelligent rule matching
 */
export interface RuleSemanticTriggers {
    patterns?: string[];
    business_domains?: string[];
    architectural_layers?: string[];
}
/**
 * Context conditions for rule application
 */
export interface RuleContextConditions {
    file_size?: {
        max?: number;
        min?: number;
    };
    complexity?: {
        max?: number;
    };
    dependencies?: {
        max?: number;
    };
    testing_coverage?: {
        min?: number;
    };
}
/**
 * Core Rule interface
 */
export interface IRule {
    id: string;
    name: string;
    description?: string;
    rule_type: RuleType;
    parent_id?: string | null;
    sort_order: number;
    depth_level: number;
    guidance_text: string;
    code_template?: string;
    validation_script?: string;
    trigger_patterns?: RuleTriggerPatterns;
    semantic_triggers?: RuleSemanticTriggers;
    context_conditions?: RuleContextConditions;
    exclusion_patterns?: any;
    priority: number;
    auto_apply: boolean;
    merge_strategy: MergeStrategy;
    confidence_threshold: number;
    entity_links?: Array<{
        entity_type: EntityType;
        entity_id: string;
        entity_name?: string;
        link_strength?: 'primary' | 'secondary' | 'reference';
    }>;
    stable_links?: Record<string, any>;
    fragile_links?: Record<string, any>;
    semantic_context?: string;
    stable_tags?: string[];
    auto_tags?: string[];
    contextual_tags?: string[];
    usage_count: number;
    acceptance_rate: number;
    effectiveness_score: number;
    last_used?: Date;
    created_by: string;
    active: boolean;
    created_at: Date;
    updated_at: Date;
}
/**
 * Rule relationship interface
 */
export interface IRuleRelationship {
    id: string;
    parent_rule_id: string;
    child_rule_id: string;
    relationship_type: RuleRelationshipType;
    priority_adjustment: number;
    created_at: Date;
}
/**
 * Rule application interface
 */
export interface IRuleApplication {
    id: string;
    rule_id: string;
    entity_type: EntityType;
    entity_id: string;
    applied_context?: any;
    user_action?: UserAction;
    generated_code?: string;
    feedback_score?: number;
    applied_at: Date;
}
/**
 * Rule creation parameters
 */
export interface CreateRuleParams {
    name: string;
    description?: string;
    rule_type: RuleType;
    parent_id?: string | null;
    guidance_text: string;
    code_template?: string;
    validation_script?: string;
    trigger_patterns?: RuleTriggerPatterns;
    semantic_triggers?: RuleSemanticTriggers;
    context_conditions?: RuleContextConditions;
    exclusion_patterns?: any;
    priority?: number;
    auto_apply?: boolean;
    merge_strategy?: MergeStrategy;
    confidence_threshold?: number;
    active?: boolean;
    entity_links?: Array<{
        entity_type: EntityType;
        entity_id: string;
        entity_name?: string;
        link_strength?: 'primary' | 'secondary' | 'reference';
    }>;
    stable_tags?: string[];
}
/**
 * Rule application context
 */
export interface RuleApplicationContext {
    entity_type: EntityType;
    entity_id: string;
    current_task?: string;
    user_intent?: string;
    file_content?: string;
}
/**
 * Applicable rule result
 */
export interface ApplicableRule {
    rule_id: string;
    rule_type: RuleType;
    guidance_text: string;
    confidence: number;
    why_applicable: string;
    suggested_action?: string;
    auto_executable?: boolean;
}
/**
 * Rule conflict result
 */
export interface RuleConflict {
    conflicting_rules: string[];
    suggested_resolution: string;
}
/**
 * Pattern suggestion
 */
export interface PatternSuggestion {
    detected_pattern: string;
    suggested_rule: CreateRuleParams;
    confidence: number;
}
/**
 * Rule validation utility
 */
export declare class RuleValidator {
    /**
     * Validate rule data
     */
    static validate(rule: Partial<IRule>): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Validate rule application context
     */
    static validateApplicationContext(context: RuleApplicationContext): {
        valid: boolean;
        errors: string[];
    };
}
/**
 * Rule utility functions
 */
export declare class RuleUtils {
    /**
     * Generate a unique rule ID
     */
    static generateId(): string;
    /**
     * Generate a unique relationship ID
     */
    static generateRelationshipId(): string;
    /**
     * Generate a unique application ID
     */
    static generateApplicationId(): string;
    /**
     * Create a rule from creation parameters
     */
    static createFromParams(params: CreateRuleParams & {
        parent_id?: string | null;
        sort_order?: number;
    }): IRule;
    /**
     * Convert database row to Rule object
     */
    static fromDbRow(row: any): IRule;
    /**
     * Convert database row to Rule summary object (for list/tree views)
     */
    static fromDbRowSummary(row: any): Partial<IRule>;
    /**
     * Convert Rule object to database row
     */
    static toDbRow(rule: IRule): any;
    /**
     * Check if rule is applicable to given entity and context (simplified version)
     */
    static isApplicableTo(rule: IRule, entityType: string, context: RuleApplicationContext): boolean;
    /**
     * Calculate rule confidence for given entity and context (simplified version)
     */
    static calculateConfidence(rule: IRule, entityType: string, context: RuleApplicationContext): number;
    /**
     * Get applicable rules for context (simplified version)
     */
    static getApplicableRules(rules: IRule[], entityType: string, context: RuleApplicationContext): ApplicableRule[];
    /**
     * Explain why a rule is applicable (simplified version)
     */
    private static explainApplicability;
    /**
     * Get suggested action for rule
     */
    private static getSuggestedAction;
    /**
     * Update rule effectiveness based on feedback
     */
    static updateEffectiveness(rule: IRule, userAction: UserAction, feedbackScore?: number): IRule;
    /**
     * Detect rule conflicts
     */
    static detectConflicts(rules: IRule[]): RuleConflict[];
    /**
     * Check if rules have similar triggers
     */
    private static hasSimilarTriggers;
    /**
     * Check if rules have conflicting guidance
     */
    private static hasConflictingGuidance;
    /**
     * Build rule hierarchy tree
     */
    static buildHierarchy(rules: IRule[]): IRule[];
    /**
     * Build rule hierarchy tree with summary data only
     */
    static buildHierarchySummary(rules: Partial<IRule>[]): Partial<IRule>[];
}
/**
 * Default export
 */
export { IRule as Rule };
//# sourceMappingURL=Rule.d.ts.map