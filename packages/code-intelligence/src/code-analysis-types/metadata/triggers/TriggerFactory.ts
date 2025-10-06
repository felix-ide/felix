/**
 * Factory for creating trigger matcher instances
 */

import { FilePatternTrigger } from './FilePatternTrigger.js';
import { ComponentTypeTrigger } from './ComponentTypeTrigger.js';
import { RelationshipTrigger } from './RelationshipTrigger.js';
import { SemanticTrigger } from './SemanticTrigger.js';
import type { ITriggerMatcher } from './ITriggerMatcher.js';

export class TriggerFactory {
  private static triggerInstances: Map<string, ITriggerMatcher> = new Map();

  /**
   * Get all available trigger matchers
   */
  static getAllTriggerMatchers(): ITriggerMatcher[] {
    return [
      this.getFilePatternTrigger(),
      this.getComponentTypeTrigger(),
      this.getRelationshipTrigger(),
      this.getSemanticTrigger(),
    ];
  }

  /**
   * Get file pattern trigger (singleton)
   */
  static getFilePatternTrigger(): FilePatternTrigger {
    if (!this.triggerInstances.has('file')) {
      this.triggerInstances.set('file', new FilePatternTrigger());
    }
    return this.triggerInstances.get('file') as FilePatternTrigger;
  }

  /**
   * Get component type trigger (singleton)
   */
  static getComponentTypeTrigger(): ComponentTypeTrigger {
    if (!this.triggerInstances.has('component')) {
      this.triggerInstances.set('component', new ComponentTypeTrigger());
    }
    return this.triggerInstances.get('component') as ComponentTypeTrigger;
  }

  /**
   * Get relationship trigger (singleton)
   */
  static getRelationshipTrigger(): RelationshipTrigger {
    if (!this.triggerInstances.has('relationship')) {
      this.triggerInstances.set('relationship', new RelationshipTrigger());
    }
    return this.triggerInstances.get('relationship') as RelationshipTrigger;
  }

  /**
   * Get semantic trigger (singleton)
   */
  static getSemanticTrigger(): SemanticTrigger {
    if (!this.triggerInstances.has('semantic')) {
      this.triggerInstances.set('semantic', new SemanticTrigger());
    }
    return this.triggerInstances.get('semantic') as SemanticTrigger;
  }

  /**
   * Get trigger matchers that are applicable for a specific rule
   */
  static getApplicableMatchers(rule: any): ITriggerMatcher[] {
    const matchers: ITriggerMatcher[] = [];

    if (rule.trigger_patterns?.files) {
      matchers.push(this.getFilePatternTrigger());
    }

    if (rule.trigger_patterns?.components) {
      matchers.push(this.getComponentTypeTrigger());
    }

    if (rule.trigger_patterns?.relationships) {
      matchers.push(this.getRelationshipTrigger());
    }

    if (rule.semantic_triggers) {
      matchers.push(this.getSemanticTrigger());
    }

    // If no specific triggers, return all matchers
    if (matchers.length === 0) {
      return this.getAllTriggerMatchers();
    }

    return matchers;
  }
}