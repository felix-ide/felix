/**
 * Semantic Trigger - Matches rules based on business domains and architectural layers
 */

import type { IRule } from '../Rule.js';
import type { RuleApplicationContext } from '../Rule.js';
import type { ITriggerMatcher, Entity } from './ITriggerMatcher.js';

export class SemanticTrigger implements ITriggerMatcher {
  matches(rule: IRule, entity: Entity, context: RuleApplicationContext): boolean {
    if (!rule.semantic_triggers) {
      return false;
    }

    // Check business domain matching
    if (rule.semantic_triggers.business_domains && this.matchesBusinessDomain(rule, entity, context)) {
      return true;
    }

    // Check architectural layer matching
    if (rule.semantic_triggers.architectural_layers && this.matchesArchitecturalLayer(rule, entity, context)) {
      return true;
    }

    // Check code pattern matching
    if (rule.semantic_triggers.patterns && this.matchesCodePattern(rule, entity, context)) {
      return true;
    }

    return false;
  }

  private matchesBusinessDomain(rule: IRule, entity: Entity, context: RuleApplicationContext): boolean {
    const domains = rule.semantic_triggers!.business_domains!;
    
    // Check entity name for domain keywords
    const entityName = entity.name.toLowerCase();
    const filePath = entity.file_path?.toLowerCase() || '';
    
    return domains.some(domain => {
      const domainLower = domain.toLowerCase();
      return entityName.includes(domainLower) || filePath.includes(domainLower);
    });
  }

  private matchesArchitecturalLayer(rule: IRule, entity: Entity, context: RuleApplicationContext): boolean {
    const layers = rule.semantic_triggers!.architectural_layers!;
    
    const entityName = entity.name.toLowerCase();
    const filePath = entity.file_path?.toLowerCase() || '';
    const entityType = entity.type.toLowerCase();
    
    return layers.some(layer => {
      const layerLower = layer.toLowerCase();
      
      // Check for common layer naming patterns
      if (layerLower === 'controller' && (
        entityName.includes('controller') || 
        filePath.includes('controller') ||
        filePath.includes('/api/') ||
        filePath.includes('/routes/')
      )) {
        return true;
      }
      
      if (layerLower === 'service' && (
        entityName.includes('service') || 
        filePath.includes('service') ||
        filePath.includes('/services/')
      )) {
        return true;
      }
      
      if (layerLower === 'model' && (
        entityName.includes('model') || 
        filePath.includes('model') ||
        filePath.includes('/models/') ||
        entityType === 'interface' ||
        entityType === 'class'
      )) {
        return true;
      }
      
      if (layerLower === 'repository' && (
        entityName.includes('repository') || 
        entityName.includes('repo') ||
        filePath.includes('repository') ||
        filePath.includes('/repositories/')
      )) {
        return true;
      }
      
      // Generic pattern matching
      return entityName.includes(layerLower) || filePath.includes(layerLower);
    });
  }

  private matchesCodePattern(rule: IRule, entity: Entity, context: RuleApplicationContext): boolean {
    const patterns = rule.semantic_triggers!.patterns!;
    
    const entityName = entity.name.toLowerCase();
    const filePath = entity.file_path?.toLowerCase() || '';
    
    return patterns.some(pattern => {
      const patternLower = pattern.toLowerCase();
      
      // Check for common pattern indicators
      if (patternLower.includes('api') && (filePath.includes('/api/') || entityName.includes('api'))) {
        return true;
      }
      
      if (patternLower.includes('auth') && (
        entityName.includes('auth') || 
        entityName.includes('login') ||
        entityName.includes('token') ||
        filePath.includes('auth')
      )) {
        return true;
      }
      
      if (patternLower.includes('crud') && (
        entityName.includes('create') ||
        entityName.includes('read') ||
        entityName.includes('update') ||
        entityName.includes('delete') ||
        entityName.includes('get') ||
        entityName.includes('post') ||
        entityName.includes('put')
      )) {
        return true;
      }
      
      // Generic pattern matching
      return entityName.includes(patternLower) || filePath.includes(patternLower);
    });
  }

  getConfidence(rule: IRule, entity: Entity, context: RuleApplicationContext): number {
    if (!this.matches(rule, entity, context)) {
      return 0.0;
    }

    let confidence = 0.0;
    let matchCount = 0;

    // Business domain confidence
    if (rule.semantic_triggers?.business_domains && this.matchesBusinessDomain(rule, entity, context)) {
      confidence += 0.8;
      matchCount++;
    }

    // Architectural layer confidence
    if (rule.semantic_triggers?.architectural_layers && this.matchesArchitecturalLayer(rule, entity, context)) {
      confidence += 0.7;
      matchCount++;
    }

    // Code pattern confidence
    if (rule.semantic_triggers?.patterns && this.matchesCodePattern(rule, entity, context)) {
      confidence += 0.6;
      matchCount++;
    }

    return matchCount > 0 ? Math.min(confidence / matchCount, 1.0) : 0.0;
  }

  getExplanation(rule: IRule, entity: Entity, context: RuleApplicationContext): string {
    if (!this.matches(rule, entity, context)) {
      return '';
    }

    const explanations: string[] = [];

    if (rule.semantic_triggers?.business_domains && this.matchesBusinessDomain(rule, entity, context)) {
      explanations.push(`Matches business domain: ${rule.semantic_triggers.business_domains.join(', ')}`);
    }

    if (rule.semantic_triggers?.architectural_layers && this.matchesArchitecturalLayer(rule, entity, context)) {
      explanations.push(`Matches architectural layer: ${rule.semantic_triggers.architectural_layers.join(', ')}`);
    }

    if (rule.semantic_triggers?.patterns && this.matchesCodePattern(rule, entity, context)) {
      explanations.push(`Matches code pattern: ${rule.semantic_triggers.patterns.join(', ')}`);
    }

    return explanations.join('; ');
  }
}