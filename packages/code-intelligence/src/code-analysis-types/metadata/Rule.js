/**
 * Rule model - Smart coding rules that go beyond Cursor
 */
/**
 * Rule validation utility
 */
export class RuleValidator {
    /**
     * Validate rule data
     */
    static validate(rule) {
        const errors = [];
        if (!rule.name || rule.name.trim().length === 0) {
            errors.push('Name is required');
        }
        if (rule.name && rule.name.length > 200) {
            errors.push('Name exceeds maximum length (200 characters)');
        }
        if (!rule.rule_type || !['pattern', 'constraint', 'semantic', 'automation'].includes(rule.rule_type)) {
            errors.push('Invalid rule type');
        }
        if (!rule.guidance_text || rule.guidance_text.trim().length === 0) {
            errors.push('Guidance text is required');
        }
        if (rule.guidance_text && rule.guidance_text.length > 10000) {
            errors.push('Guidance text exceeds maximum length (10,000 characters)');
        }
        if (rule.priority !== undefined && (rule.priority < 1 || rule.priority > 10)) {
            errors.push('Priority must be between 1 and 10');
        }
        if (rule.confidence_threshold !== undefined && (rule.confidence_threshold < 0 || rule.confidence_threshold > 1)) {
            errors.push('Confidence threshold must be between 0 and 1');
        }
        if (rule.merge_strategy && !['append', 'replace', 'merge'].includes(rule.merge_strategy)) {
            errors.push('Invalid merge strategy');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    /**
     * Validate rule application context
     */
    static validateApplicationContext(context) {
        const errors = [];
        if (!context.entity_type) {
            errors.push('Entity type is required');
        }
        if (!context.entity_id) {
            errors.push('Entity ID is required');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
}
/**
 * Rule utility functions
 */
export class RuleUtils {
    /**
     * Generate a unique rule ID
     */
    static generateId() {
        return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Generate a unique relationship ID
     */
    static generateRelationshipId() {
        return `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Generate a unique application ID
     */
    static generateApplicationId() {
        return `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Create a rule from creation parameters
     */
    static createFromParams(params) {
        const now = new Date();
        return {
            id: this.generateId(),
            name: params.name,
            description: params.description,
            rule_type: params.rule_type,
            parent_id: params.parent_id || null,
            sort_order: params.sort_order || 0,
            depth_level: 0, // Will be calculated based on parent
            guidance_text: params.guidance_text,
            code_template: params.code_template,
            validation_script: params.validation_script,
            trigger_patterns: params.trigger_patterns,
            semantic_triggers: params.semantic_triggers,
            context_conditions: params.context_conditions,
            exclusion_patterns: params.exclusion_patterns,
            priority: params.priority || 5,
            auto_apply: params.auto_apply || false,
            merge_strategy: params.merge_strategy || 'append',
            confidence_threshold: params.confidence_threshold || 0.8,
            usage_count: 0,
            acceptance_rate: 0.0,
            effectiveness_score: 0.0,
            created_by: 'user',
            active: true,
            entity_links: params.entity_links || [],
            stable_tags: params.stable_tags || [],
            created_at: now,
            updated_at: now
        };
    }
    /**
     * Convert database row to Rule object
     */
    static fromDbRow(row) {
        const rule = {
            id: row.id,
            name: row.name,
            rule_type: row.rule_type,
            parent_id: row.parent_id || null,
            sort_order: row.sort_order || 0,
            depth_level: row.depth_level || 0,
            guidance_text: row.guidance_text || '',
            priority: row.priority || 5,
            auto_apply: Boolean(row.auto_apply),
            merge_strategy: row.merge_strategy || 'append',
            confidence_threshold: row.confidence_threshold || 0.8,
            usage_count: row.usage_count || 0,
            acceptance_rate: row.acceptance_rate || 0.0,
            effectiveness_score: row.effectiveness_score || 0.0,
            created_by: row.created_by || 'user',
            active: Boolean(row.active),
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
        // Add optional properties only if they exist
        if (row.description)
            rule.description = row.description;
        if (row.code_template)
            rule.code_template = row.code_template;
        if (row.validation_script)
            rule.validation_script = row.validation_script;
        if (row.trigger_patterns)
            rule.trigger_patterns = JSON.parse(row.trigger_patterns);
        if (row.semantic_triggers)
            rule.semantic_triggers = JSON.parse(row.semantic_triggers);
        if (row.context_conditions)
            rule.context_conditions = JSON.parse(row.context_conditions);
        if (row.exclusion_patterns)
            rule.exclusion_patterns = JSON.parse(row.exclusion_patterns);
        if (row.last_used)
            rule.last_used = new Date(row.last_used);
        // Universal linking and tagging fields
        if (row.entity_links) {
            rule.entity_links = JSON.parse(row.entity_links);
        }
        if (row.stable_links)
            rule.stable_links = JSON.parse(row.stable_links);
        if (row.fragile_links)
            rule.fragile_links = JSON.parse(row.fragile_links);
        if (row.semantic_context)
            rule.semantic_context = row.semantic_context;
        if (row.stable_tags)
            rule.stable_tags = JSON.parse(row.stable_tags);
        if (row.auto_tags)
            rule.auto_tags = JSON.parse(row.auto_tags);
        if (row.contextual_tags)
            rule.contextual_tags = JSON.parse(row.contextual_tags);
        return rule;
    }
    /**
     * Convert database row to Rule summary object (for list/tree views)
     */
    static fromDbRowSummary(row) {
        const rule = {
            id: row.id,
            name: row.name,
            rule_type: row.rule_type,
            parent_id: row.parent_id || null,
            sort_order: row.sort_order || 0,
            depth_level: row.depth_level || 0,
            priority: row.priority || 5,
            auto_apply: Boolean(row.auto_apply),
            usage_count: row.usage_count || 0,
            acceptance_rate: row.acceptance_rate || 0.0,
            effectiveness_score: row.effectiveness_score || 0.0,
            active: Boolean(row.active),
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
        if (row.last_used)
            rule.last_used = new Date(row.last_used);
        // Universal linking and tagging fields
        if (row.entity_links) {
            rule.entity_links = JSON.parse(row.entity_links);
        }
        if (row.stable_tags) {
            rule.stable_tags = JSON.parse(row.stable_tags);
        }
        return rule;
    }
    /**
     * Convert Rule object to database row
     */
    static toDbRow(rule) {
        return {
            id: rule.id,
            name: rule.name,
            description: rule.description || null,
            rule_type: rule.rule_type,
            parent_id: rule.parent_id || null,
            sort_order: rule.sort_order,
            depth_level: rule.depth_level,
            guidance_text: rule.guidance_text,
            code_template: rule.code_template || null,
            validation_script: rule.validation_script || null,
            trigger_patterns: rule.trigger_patterns ? JSON.stringify(rule.trigger_patterns) : null,
            semantic_triggers: rule.semantic_triggers ? JSON.stringify(rule.semantic_triggers) : null,
            context_conditions: rule.context_conditions ? JSON.stringify(rule.context_conditions) : null,
            exclusion_patterns: rule.exclusion_patterns ? JSON.stringify(rule.exclusion_patterns) : null,
            priority: rule.priority,
            auto_apply: rule.auto_apply ? 1 : 0,
            merge_strategy: rule.merge_strategy,
            confidence_threshold: rule.confidence_threshold,
            usage_count: rule.usage_count,
            acceptance_rate: rule.acceptance_rate,
            effectiveness_score: rule.effectiveness_score,
            last_used: rule.last_used ? rule.last_used.toISOString() : null,
            created_by: rule.created_by,
            active: rule.active ? 1 : 0,
            // Universal linking and tagging fields
            entity_links: rule.entity_links ? JSON.stringify(rule.entity_links) : null,
            stable_links: rule.stable_links ? JSON.stringify(rule.stable_links) : null,
            fragile_links: rule.fragile_links ? JSON.stringify(rule.fragile_links) : null,
            semantic_context: rule.semantic_context || null,
            stable_tags: rule.stable_tags ? JSON.stringify(rule.stable_tags) : null,
            auto_tags: rule.auto_tags ? JSON.stringify(rule.auto_tags) : null,
            contextual_tags: rule.contextual_tags ? JSON.stringify(rule.contextual_tags) : null,
            created_at: rule.created_at.toISOString(),
            updated_at: rule.updated_at.toISOString()
        };
    }
    /**
     * Check if rule is applicable to given entity and context (simplified version)
     */
    static isApplicableTo(rule, entityType, context) {
        // Simplified check based on rule patterns
        if (rule.trigger_patterns?.files && context.file_content) {
            // Basic file pattern matching would go here
            return true;
        }
        if (rule.trigger_patterns?.components && rule.trigger_patterns.components.includes(entityType)) {
            return true;
        }
        // Default to applicable if no specific patterns
        return !rule.trigger_patterns || Object.keys(rule.trigger_patterns).length === 0;
    }
    /**
     * Calculate rule confidence for given entity and context (simplified version)
     */
    static calculateConfidence(rule, entityType, context) {
        let confidence = 0.5; // Base confidence
        // Adjust based on rule effectiveness score
        confidence *= (0.8 + (rule.effectiveness_score * 0.2));
        // Slight boost for frequently used rules
        if (rule.usage_count > 10) {
            confidence = Math.min(confidence * 1.05, 1.0);
        }
        return Math.min(1.0, confidence);
    }
    /**
     * Get applicable rules for context (simplified version)
     */
    static getApplicableRules(rules, entityType, context) {
        const applicable = [];
        for (const rule of rules) {
            if (!rule.active)
                continue;
            // Check if rule is applicable first
            if (!this.isApplicableTo(rule, entityType, context)) {
                continue;
            }
            const confidence = this.calculateConfidence(rule, entityType, context);
            if (confidence >= rule.confidence_threshold) {
                applicable.push({
                    rule_id: rule.id,
                    rule_type: rule.rule_type,
                    guidance_text: rule.guidance_text,
                    confidence,
                    why_applicable: this.explainApplicability(rule, entityType, context),
                    suggested_action: this.getSuggestedAction(rule, context),
                    auto_executable: rule.auto_apply && confidence > 0.9
                });
            }
        }
        // Sort by confidence and priority
        return applicable.sort((a, b) => {
            const ruleA = rules.find(r => r.id === a.rule_id);
            const ruleB = rules.find(r => r.id === b.rule_id);
            // First by confidence, then by priority
            if (a.confidence !== b.confidence) {
                return b.confidence - a.confidence;
            }
            return ruleB.priority - ruleA.priority;
        });
    }
    /**
     * Explain why a rule is applicable (simplified version)
     */
    static explainApplicability(rule, entityType, context) {
        const explanations = [];
        if (rule.trigger_patterns?.components?.includes(entityType)) {
            explanations.push(`matches ${entityType} component type`);
        }
        if (rule.effectiveness_score > 0.7) {
            explanations.push('has high effectiveness score');
        }
        return explanations.length > 0 ? explanations.join('; ') : 'general applicability';
    }
    /**
     * Get suggested action for rule
     */
    static getSuggestedAction(rule, context) {
        switch (rule.rule_type) {
            case 'pattern':
                return 'Apply coding pattern';
            case 'constraint':
                return 'Validate constraints';
            case 'semantic':
                return 'Follow semantic guidelines';
            case 'automation':
                return rule.auto_apply ? 'Generate code automatically' : 'Generate code with approval';
            default:
                return 'Apply rule guidance';
        }
    }
    /**
     * Update rule effectiveness based on feedback
     */
    static updateEffectiveness(rule, userAction, feedbackScore) {
        const updatedRule = { ...rule };
        updatedRule.usage_count += 1;
        updatedRule.last_used = new Date();
        // Update acceptance rate
        const wasAccepted = userAction === 'accepted' || userAction === 'modified';
        if (rule.usage_count === 0) {
            // First usage
            updatedRule.acceptance_rate = wasAccepted ? 1.0 : 0.0;
        }
        else {
            const previousAcceptances = rule.acceptance_rate * rule.usage_count;
            const newAcceptanceRate = (previousAcceptances + (wasAccepted ? 1 : 0)) / updatedRule.usage_count;
            updatedRule.acceptance_rate = newAcceptanceRate;
        }
        // Update effectiveness score
        if (feedbackScore) {
            if (rule.usage_count === 0) {
                // First usage
                updatedRule.effectiveness_score = feedbackScore / 5;
            }
            else {
                const previousEffectiveness = rule.effectiveness_score * rule.usage_count;
                const newEffectivenessScore = (previousEffectiveness + (feedbackScore / 5)) / updatedRule.usage_count;
                updatedRule.effectiveness_score = newEffectivenessScore;
            }
        }
        updatedRule.updated_at = new Date();
        return updatedRule;
    }
    /**
     * Detect rule conflicts
     */
    static detectConflicts(rules) {
        const conflicts = [];
        // Simple conflict detection - rules with same trigger patterns but different guidance
        for (let i = 0; i < rules.length; i++) {
            for (let j = i + 1; j < rules.length; j++) {
                const ruleA = rules[i];
                const ruleB = rules[j];
                if (ruleA && ruleB && this.hasSimilarTriggers(ruleA, ruleB) && this.hasConflictingGuidance(ruleA, ruleB)) {
                    conflicts.push({
                        conflicting_rules: [ruleA.id, ruleB.id],
                        suggested_resolution: `Rules "${ruleA.name}" and "${ruleB.name}" have similar triggers but conflicting guidance. Consider merging or adjusting priorities.`
                    });
                }
            }
        }
        return conflicts;
    }
    /**
     * Check if rules have similar triggers
     */
    static hasSimilarTriggers(ruleA, ruleB) {
        // Simplified - would implement actual trigger comparison
        return JSON.stringify(ruleA.trigger_patterns) === JSON.stringify(ruleB.trigger_patterns);
    }
    /**
     * Check if rules have conflicting guidance
     */
    static hasConflictingGuidance(ruleA, ruleB) {
        // Simplified - would implement semantic analysis of guidance text
        return ruleA.guidance_text !== ruleB.guidance_text;
    }
    /**
     * Build rule hierarchy tree
     */
    static buildHierarchy(rules) {
        const ruleMap = new Map();
        const rootRules = [];
        // Create rule map
        for (const rule of rules) {
            ruleMap.set(rule.id, { ...rule, children: [] });
        }
        // Build hierarchy
        for (const rule of rules) {
            if (rule.parent_id && ruleMap.has(rule.parent_id)) {
                const parent = ruleMap.get(rule.parent_id);
                parent.children.push(ruleMap.get(rule.id));
            }
            else {
                rootRules.push(ruleMap.get(rule.id));
            }
        }
        // Sort at each level by sort_order and creation date
        const sortRules = (rules) => {
            rules.sort((a, b) => {
                if (a.sort_order !== b.sort_order) {
                    return a.sort_order - b.sort_order;
                }
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });
            rules.forEach(rule => {
                if (rule.children) {
                    sortRules(rule.children);
                }
            });
        };
        sortRules(rootRules);
        return rootRules;
    }
    /**
     * Build rule hierarchy tree with summary data only
     */
    static buildHierarchySummary(rules) {
        const ruleMap = new Map();
        const rootRules = [];
        // Create rule map
        for (const rule of rules) {
            if (rule.id) {
                ruleMap.set(rule.id, { ...rule, children: [] });
            }
        }
        // Build hierarchy
        for (const rule of rules) {
            if (!rule.id)
                continue;
            if (rule.parent_id && ruleMap.has(rule.parent_id)) {
                const parent = ruleMap.get(rule.parent_id);
                parent.children.push(ruleMap.get(rule.id));
            }
            else {
                rootRules.push(ruleMap.get(rule.id));
            }
        }
        // Sort at each level by sort_order and creation date
        const sortRules = (rules) => {
            rules.sort((a, b) => {
                if ((a.sort_order || 0) !== (b.sort_order || 0)) {
                    return (a.sort_order || 0) - (b.sort_order || 0);
                }
                const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
                const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
                return aTime - bTime;
            });
            rules.forEach(rule => {
                const ruleWithChildren = rule;
                if (ruleWithChildren.children) {
                    sortRules(ruleWithChildren.children);
                }
            });
        };
        sortRules(rootRules);
        return rootRules;
    }
}
//# sourceMappingURL=Rule.js.map