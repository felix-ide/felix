/**
 * Component Type Trigger - Matches rules based on component types (function, class, interface, etc.)
 */
export class ComponentTypeTrigger {
    matches(rule, entity, context) {
        if (!rule.trigger_patterns?.components || !entity.type) {
            return false;
        }
        return rule.trigger_patterns.components.some(componentType => {
            // Support both exact matches and wildcard patterns
            if (componentType === entity.type) {
                return true;
            }
            // Support wildcard matching for component types
            if (componentType.includes('*')) {
                const regex = new RegExp(componentType.replace(/\*/g, '.*'), 'i');
                return regex.test(entity.type);
            }
            return false;
        });
    }
    getConfidence(rule, entity, context) {
        if (!this.matches(rule, entity, context)) {
            return 0.0;
        }
        if (!rule.trigger_patterns?.components || !entity.type) {
            return 0.0;
        }
        const matchingTypes = rule.trigger_patterns.components.filter(componentType => {
            if (componentType === entity.type) {
                return true;
            }
            if (componentType.includes('*')) {
                const regex = new RegExp(componentType.replace(/\*/g, '.*'), 'i');
                return regex.test(entity.type);
            }
            return false;
        });
        let maxConfidence = 0.0;
        for (const componentType of matchingTypes) {
            let confidence = 0.6; // Base confidence for component type matching
            // Exact matches get higher confidence than wildcard matches
            if (componentType === entity.type) {
                confidence = 0.9;
            }
            else if (componentType.includes('*')) {
                confidence = 0.7;
            }
            maxConfidence = Math.max(maxConfidence, confidence);
        }
        return maxConfidence;
    }
    getExplanation(rule, entity, context) {
        if (!this.matches(rule, entity, context)) {
            return '';
        }
        const matchingTypes = rule.trigger_patterns.components.filter(componentType => {
            if (componentType === entity.type) {
                return true;
            }
            if (componentType.includes('*')) {
                const regex = new RegExp(componentType.replace(/\*/g, '.*'), 'i');
                return regex.test(entity.type);
            }
            return false;
        });
        if (matchingTypes.length === 1) {
            return `Component type "${entity.type}" matches "${matchingTypes[0]}"`;
        }
        else {
            return `Component type "${entity.type}" matches: ${matchingTypes.join(', ')}`;
        }
    }
}
//# sourceMappingURL=ComponentTypeTrigger.js.map