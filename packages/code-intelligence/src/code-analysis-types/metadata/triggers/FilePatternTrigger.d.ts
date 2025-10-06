/**
 * File Pattern Trigger - Matches rules based on file path patterns
 */
import type { IRule } from '../Rule.js';
import type { RuleApplicationContext } from '../Rule.js';
import type { ITriggerMatcher, Entity } from './ITriggerMatcher.js';
export declare class FilePatternTrigger implements ITriggerMatcher {
    matches(rule: IRule, entity: Entity, context: RuleApplicationContext): boolean;
    getConfidence(rule: IRule, entity: Entity, context: RuleApplicationContext): number;
    getExplanation(rule: IRule, entity: Entity, context: RuleApplicationContext): string;
}
//# sourceMappingURL=FilePatternTrigger.d.ts.map