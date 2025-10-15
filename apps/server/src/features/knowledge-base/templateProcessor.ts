/**
 * Simple template processor for KB rule guidance templates
 * Supports:
 * - {{variable}} - simple variable substitution
 * - {{#if variable}}...{{else}}...{{/if}} - conditionals
 * - {{#each array}}...{{/each}} - array iteration (use {{this.property}} in loop)
 */

export function processTemplate(template: string, config: Record<string, any>): string {
  let result = template;

  // Process each loops: {{#each variable}}...{{/each}}
  const eachRegex = /\{\{#each\s+(\w+)\}\}(.*?)\{\{\/each\}\}/gs;
  result = result.replace(eachRegex, (match, variable, block) => {
    const array = config[variable];
    if (!Array.isArray(array) || array.length === 0) {
      return '';
    }

    return array.map((item, index) => {
      let itemBlock = block;

      // Replace {{this.property}} with item values
      const propRegex = /\{\{this\.(\w+)\}\}/g;
      itemBlock = itemBlock.replace(propRegex, (_m: string, prop: string) => {
        const value = item[prop];
        return value !== undefined && value !== null ? String(value) : '[not set]';
      });

      // Replace {{@index}} with the current index (1-based for display)
      itemBlock = itemBlock.replace(/\{\{@index\}\}/g, String(index + 1));

      return itemBlock;
    }).join('');
  });

  // Process conditionals first: {{#if variable}}...{{else}}...{{/if}}
  // Use a non-greedy match that doesn't cross other template boundaries
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}((?:(?!\{\{#if|\{\{else\}\}|\{\{\/if\}\}).)*?)\{\{else\}\}((?:(?!\{\{#if|\{\{\/if\}\}).)*?)\{\{\/if\}\}/gs;
  result = result.replace(conditionalRegex, (match, variable, trueBlock, falseBlock) => {
    const value = config[variable];
    return value && (Array.isArray(value) ? value.length > 0 : true) ? trueBlock : falseBlock;
  });

  // Process conditionals without else: {{#if variable}}...{{/if}}
  const simpleConditionalRegex = /\{\{#if\s+(\w+)\}\}((?:(?!\{\{#if|\{\{\/if\}\}).)*?)\{\{\/if\}\}/gs;
  result = result.replace(simpleConditionalRegex, (match, variable, block) => {
    const value = config[variable];
    return value && (Array.isArray(value) ? value.length > 0 : true) ? block : '';
  });

  // Process simple variables: {{variable}}
  const variableRegex = /\{\{(\w+)\}\}/g;
  result = result.replace(variableRegex, (match, variable) => {
    const value = config[variable];
    if (value === undefined || value === null) {
      return '[not configured]';
    }
    if (Array.isArray(value)) {
      // For simple arrays (not objects), join them
      if (value.length > 0 && typeof value[0] !== 'object') {
        return value.join(', ');
      }
      return `${value.length} items`;
    }
    return String(value);
  });

  return result;
}
