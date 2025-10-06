/**
 * Interface for rule trigger matching strategies
 */
import type { IRule } from '../Rule.js';
import type { RuleApplicationContext } from '../Rule.js';
export interface Entity {
    id: string;
    type: string;
    name: string;
    file_path?: string;
    language?: string;
    [key: string]: any;
}
export interface ITriggerMatcher {
    /**
     * Check if this trigger matcher applies to the given rule and entity
     */
    matches(rule: IRule, entity: Entity, context: RuleApplicationContext): boolean;
    /**
     * Calculate confidence score for this trigger match (0.0 to 1.0)
     */
    getConfidence(rule: IRule, entity: Entity, context: RuleApplicationContext): number;
    /**
     * Get explanation for why this trigger matched
     */
    getExplanation(rule: IRule, entity: Entity, context: RuleApplicationContext): string;
}
//# sourceMappingURL=ITriggerMatcher.d.ts.map