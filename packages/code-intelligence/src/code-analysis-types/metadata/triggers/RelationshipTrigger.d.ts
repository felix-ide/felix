/**
 * Relationship Trigger - Matches rules based on component relationships (imports, extends, calls)
 */
import type { IRule } from '../Rule.js';
import type { RuleApplicationContext } from '../Rule.js';
import type { ITriggerMatcher, Entity } from './ITriggerMatcher.js';
export interface EntityWithRelationships extends Entity {
    relationships?: Array<{
        type: string;
        target_id: string;
        target_type: string;
        target_name?: string;
    }>;
}
export declare class RelationshipTrigger implements ITriggerMatcher {
    matches(rule: IRule, entity: Entity, context: RuleApplicationContext): boolean;
    private matchesRelationshipAlias;
    getConfidence(rule: IRule, entity: Entity, context: RuleApplicationContext): number;
    getExplanation(rule: IRule, entity: Entity, context: RuleApplicationContext): string;
}
//# sourceMappingURL=RelationshipTrigger.d.ts.map