/**
 * Factory for creating trigger matcher instances
 */
import { FilePatternTrigger } from './FilePatternTrigger.js';
import { ComponentTypeTrigger } from './ComponentTypeTrigger.js';
import { RelationshipTrigger } from './RelationshipTrigger.js';
import { SemanticTrigger } from './SemanticTrigger.js';
import type { ITriggerMatcher } from './ITriggerMatcher.js';
export declare class TriggerFactory {
    private static triggerInstances;
    /**
     * Get all available trigger matchers
     */
    static getAllTriggerMatchers(): ITriggerMatcher[];
    /**
     * Get file pattern trigger (singleton)
     */
    static getFilePatternTrigger(): FilePatternTrigger;
    /**
     * Get component type trigger (singleton)
     */
    static getComponentTypeTrigger(): ComponentTypeTrigger;
    /**
     * Get relationship trigger (singleton)
     */
    static getRelationshipTrigger(): RelationshipTrigger;
    /**
     * Get semantic trigger (singleton)
     */
    static getSemanticTrigger(): SemanticTrigger;
    /**
     * Get trigger matchers that are applicable for a specific rule
     */
    static getApplicableMatchers(rule: any): ITriggerMatcher[];
}
//# sourceMappingURL=TriggerFactory.d.ts.map