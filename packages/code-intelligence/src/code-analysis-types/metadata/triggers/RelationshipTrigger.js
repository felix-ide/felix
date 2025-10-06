/**
 * Relationship Trigger - Matches rules based on component relationships (imports, extends, calls)
 */
export class RelationshipTrigger {
    matches(rule, entity, context) {
        if (!rule.trigger_patterns?.relationships) {
            return false;
        }
        const entityWithRels = entity;
        if (!entityWithRels.relationships || entityWithRels.relationships.length === 0) {
            return false;
        }
        return rule.trigger_patterns.relationships.some(relationshipType => {
            return entityWithRels.relationships.some(rel => {
                // Support exact matches and wildcard patterns
                if (relationshipType === rel.type) {
                    return true;
                }
                // Support wildcard matching for relationship types
                if (relationshipType.includes('*')) {
                    const regex = new RegExp(relationshipType.replace(/\*/g, '.*'), 'i');
                    return regex.test(rel.type);
                }
                // Support common relationship aliases
                if (this.matchesRelationshipAlias(relationshipType, rel.type)) {
                    return true;
                }
                return false;
            });
        });
    }
    matchesRelationshipAlias(pattern, actualType) {
        const patternLower = pattern.toLowerCase();
        const actualLower = actualType.toLowerCase();
        // Common aliases for relationship types
        const aliases = {
            'imports': ['import', 'require', 'dependency'],
            'extends': ['extend', 'inheritance', 'inherits'],
            'implements': ['implement', 'interface'],
            'calls': ['call', 'invoke', 'execute', 'method_call'],
            'uses': ['use', 'usage', 'utilizes'],
            'contains': ['contain', 'composition', 'has'],
            'references': ['reference', 'ref', 'points_to']
        };
        // Check if pattern has aliases that match the actual type
        for (const [canonical, aliasList] of Object.entries(aliases)) {
            if (patternLower === canonical || aliasList.includes(patternLower)) {
                if (actualLower === canonical || aliasList.includes(actualLower)) {
                    return true;
                }
            }
        }
        return false;
    }
    getConfidence(rule, entity, context) {
        if (!this.matches(rule, entity, context)) {
            return 0.0;
        }
        const entityWithRels = entity;
        if (!entityWithRels.relationships || !rule.trigger_patterns?.relationships) {
            return 0.0;
        }
        let totalConfidence = 0;
        let matchCount = 0;
        for (const relationshipType of rule.trigger_patterns.relationships) {
            const matchingRels = entityWithRels.relationships.filter(rel => {
                return relationshipType === rel.type ||
                    (relationshipType.includes('*') && new RegExp(relationshipType.replace(/\*/g, '.*'), 'i').test(rel.type)) ||
                    this.matchesRelationshipAlias(relationshipType, rel.type);
            });
            if (matchingRels.length > 0) {
                let confidence = 0.7; // Base confidence for relationship matching
                // Exact matches get higher confidence
                const exactMatches = matchingRels.filter(rel => rel.type === relationshipType);
                if (exactMatches.length > 0) {
                    confidence = 0.9;
                }
                // Multiple relationships of the same type increase confidence
                if (matchingRels.length > 1) {
                    confidence = Math.min(confidence * 1.1, 1.0);
                }
                totalConfidence += confidence;
                matchCount++;
            }
        }
        return matchCount > 0 ? Math.min(totalConfidence / matchCount, 1.0) : 0.0;
    }
    getExplanation(rule, entity, context) {
        if (!this.matches(rule, entity, context)) {
            return '';
        }
        const entityWithRels = entity;
        if (!entityWithRels.relationships || !rule.trigger_patterns?.relationships) {
            return '';
        }
        const matchingPatterns = [];
        const matchingRelationships = [];
        for (const relationshipType of rule.trigger_patterns.relationships) {
            const matching = entityWithRels.relationships.filter(rel => {
                return relationshipType === rel.type ||
                    (relationshipType.includes('*') && new RegExp(relationshipType.replace(/\*/g, '.*'), 'i').test(rel.type)) ||
                    this.matchesRelationshipAlias(relationshipType, rel.type);
            });
            if (matching.length > 0) {
                matchingPatterns.push(relationshipType);
                matching.forEach(rel => {
                    const targetName = rel.target_name || rel.target_id;
                    matchingRelationships.push(`${rel.type}(${targetName})`);
                });
            }
        }
        if (matchingPatterns.length === 0) {
            return '';
        }
        const patternText = matchingPatterns.length === 1
            ? `pattern "${matchingPatterns[0]}"`
            : `patterns: ${matchingPatterns.join(', ')}`;
        const relationshipText = matchingRelationships.length <= 3
            ? matchingRelationships.join(', ')
            : `${matchingRelationships.slice(0, 3).join(', ')} and ${matchingRelationships.length - 3} more`;
        return `Has relationships matching ${patternText}: ${relationshipText}`;
    }
}
//# sourceMappingURL=RelationshipTrigger.js.map