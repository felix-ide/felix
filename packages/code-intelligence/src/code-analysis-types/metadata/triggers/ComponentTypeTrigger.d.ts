/**
 * Component Type Trigger - Matches rules based on component types (function, class, interface, etc.)
 */
import type { IRule } from '../Rule.js';
import type { RuleApplicationContext } from '../Rule.js';
import type { ITriggerMatcher, Entity } from './ITriggerMatcher.js';
export declare class ComponentTypeTrigger implements ITriggerMatcher {
    matches(rule: IRule, entity: Entity, context: RuleApplicationContext): boolean;
    getConfidence(rule: IRule, entity: Entity, context: RuleApplicationContext): number;
    getExplanation(rule: IRule, entity: Entity, context: RuleApplicationContext): string;
}
//# sourceMappingURL=ComponentTypeTrigger.d.ts.map