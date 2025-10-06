/**
 * File Pattern Trigger - Matches rules based on file path patterns
 */

import { minimatch } from 'minimatch';
import type { IRule } from '../Rule.js';
import type { RuleApplicationContext } from '../Rule.js';
import type { ITriggerMatcher, Entity } from './ITriggerMatcher.js';

export class FilePatternTrigger implements ITriggerMatcher {
  matches(rule: IRule, entity: Entity, context: RuleApplicationContext): boolean {
    if (!rule.trigger_patterns?.files || !entity.file_path) {
      return false;
    }

    return rule.trigger_patterns.files.some(pattern => 
      minimatch(entity.file_path!, pattern)
    );
  }

  getConfidence(rule: IRule, entity: Entity, context: RuleApplicationContext): number {
    if (!this.matches(rule, entity, context)) {
      return 0.0;
    }

    if (!rule.trigger_patterns?.files || !entity.file_path) {
      return 0.0;
    }

    // Calculate confidence based on pattern specificity
    // More specific patterns (longer, with directories) get higher confidence
    const matchingPatterns = rule.trigger_patterns.files.filter(pattern =>
      minimatch(entity.file_path!, pattern)
    );

    let maxConfidence = 0.0;
    for (const pattern of matchingPatterns) {
      // Base confidence for any match
      let confidence = 0.5;
      
      // Bonus for directory structure specificity
      const slashCount = (pattern.match(/\//g) || []).length;
      confidence += Math.min(slashCount * 0.1, 0.3);
      
      // Bonus for file extension specificity
      if (pattern.includes('.')) {
        confidence += 0.1;
      }
      
      // Bonus for exact matches vs wildcards
      if (!pattern.includes('*') && !pattern.includes('?')) {
        confidence += 0.1;
      }
      
      maxConfidence = Math.max(maxConfidence, Math.min(confidence, 1.0));
    }

    return maxConfidence;
  }

  getExplanation(rule: IRule, entity: Entity, context: RuleApplicationContext): string {
    if (!this.matches(rule, entity, context)) {
      return '';
    }

    const matchingPatterns = rule.trigger_patterns!.files!.filter(pattern =>
      minimatch(entity.file_path!, pattern)
    );

    if (matchingPatterns.length === 1) {
      return `File path "${entity.file_path}" matches pattern "${matchingPatterns[0]}"`;
    } else {
      return `File path "${entity.file_path}" matches patterns: ${matchingPatterns.join(', ')}`;
    }
  }
}