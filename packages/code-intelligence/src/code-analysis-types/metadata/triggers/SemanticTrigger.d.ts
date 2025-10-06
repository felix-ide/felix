/**
 * Semantic Trigger - Matches rules based on business domains and architectural layers
 */
import type { IRule } from '../Rule.js';
import type { RuleApplicationContext } from '../Rule.js';
import type { ITriggerMatcher, Entity } from './ITriggerMatcher.js';
export declare class SemanticTrigger implements ITriggerMatcher {
    matches(rule: IRule, entity: Entity, context: RuleApplicationContext): boolean;
    private matchesBusinessDomain;
    private matchesArchitecturalLayer;
    private matchesCodePattern;
    getConfidence(rule: IRule, entity: Entity, context: RuleApplicationContext): number;
    getExplanation(rule: IRule, entity: Entity, context: RuleApplicationContext): string;
}
//# sourceMappingURL=SemanticTrigger.d.ts.map