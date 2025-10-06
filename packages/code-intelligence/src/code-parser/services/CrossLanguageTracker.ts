/**
 * Cross-Language Reference Tracker
 * 
 * Tracks references across language boundaries like:
 * - PHP variables used in JavaScript
 * - Twig template variables
 * - API endpoint calls between JS and PHP
 * - SQL queries referencing schema components
 */

import { IComponent, IRelationship, RelationshipType, ComponentType } from '../types.js';

export interface VariableScope {
  language: string;
  componentId: string;
  variables: Map<string, Variable>;
}

export interface Variable {
  name: string;
  value?: any;
  type?: string;
  exportedAs?: string; // How it's exposed to other languages
  line?: number;
}

export interface TemplateVariable {
  sourceComponent: string;
  templatePath: string;
  variables: Record<string, any>;
  sourceLanguage: string;
}

export interface CrossLanguageReference {
  sourceComponent: IComponent;
  targetComponent?: IComponent;
  referenceType: 'variable' | 'function' | 'endpoint' | 'template_var' | 'sql_table';
  pattern: string;
  variableName?: string;
  endpoint?: string;
  sqlTable?: string;
}

export class CrossLanguageTracker {
  private variableScopes: Map<string, VariableScope> = new Map();
  private templateVars: Map<string, TemplateVariable> = new Map();
  private crossLanguageRefs: CrossLanguageReference[] = [];

  /**
   * Track PHP variables passed to templates
   */
  trackTemplateVariables(
    phpComponent: IComponent,
    templatePath: string,
    variables: Record<string, any>
  ): void {
    const key = `${phpComponent.id}:${templatePath}`;
    this.templateVars.set(key, {
      sourceComponent: phpComponent.id,
      templatePath,
      variables,
      sourceLanguage: 'php'
    });
  }

  /**
   * Track variables in a component's scope
   */
  trackComponentVariables(component: IComponent, variables: Variable[]): void {
    const scope: VariableScope = {
      language: component.language,
      componentId: component.id,
      variables: new Map()
    };

    variables.forEach(variable => {
      scope.variables.set(variable.name, variable);
    });

    this.variableScopes.set(component.id, scope);
  }

  /**
   * Find cross-language references in all components
   */
  findCrossLanguageReferences(
    components: IComponent[],
    relationships: IRelationship[]
  ): IRelationship[] {
    const crossRefs: IRelationship[] = [];

    // Track PHP → JavaScript variable references
    crossRefs.push(...this.findPhpToJsReferences(components));

    // Track JavaScript → PHP API calls
    crossRefs.push(...this.findJsToPhpApiCalls(components));

    // Track Twig template variable usage
    crossRefs.push(...this.findTwigVariableUsage(components));

    // Track SQL references in application code
    crossRefs.push(...this.findSqlReferences(components));

    // Track CSS class usage across HTML/JS
    crossRefs.push(...this.findCssClassReferences(components));

    return crossRefs;
  }

  /**
   * Find PHP variables used in embedded JavaScript
   */
  private findPhpToJsReferences(components: IComponent[]): IRelationship[] {
    const relationships: IRelationship[] = [];

    const jsComponents = components.filter(c => 
      c.language === 'javascript' && 
      c.scopeContext?.crossLanguageParent?.language === 'php'
    );

    for (const jsComponent of jsComponents) {
      if (!jsComponent.code || !jsComponent.scopeContext?.crossLanguageParent) continue;

      // Look for PHP echo patterns in JS: <?php echo $var ?>
      const phpEchoPattern = /<\?php\s+echo\s+\$(\w+).*?\?>/g;
      
      // Look for JSON encoded variables: <?= json_encode($var) ?>
      const phpJsonPattern = /<\?\=?\s*json_encode\(\$(\w+)\)/g;
      
      // Look for direct variable output: var x = <?= $var ?>;
      const phpDirectPattern = /<\?\=?\s*\$(\w+)\s*\?>/g;

      const patterns = [phpEchoPattern, phpJsonPattern, phpDirectPattern];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(jsComponent.code)) !== null) {
          const varName = match[1];
          if (!varName) continue;
          
          // Find the PHP component that might define this variable
          const phpComponent = this.findPhpVariableDefinition(
            varName,
            jsComponent.scopeContext.crossLanguageParent.id,
            components
          );

          if (phpComponent) {
            relationships.push({
              id: `${phpComponent.id}-crosslang-${jsComponent.id}-${varName}`,
              type: RelationshipType.CROSS_LANGUAGE_REF,
              sourceId: phpComponent.id,
              targetId: jsComponent.id,
              metadata: {
                crossLanguageRef: {
                  sourceLanguage: 'php',
                  targetLanguage: 'javascript',
                  referenceType: 'variable',
                  variableName: varName,
                  usagePattern: match[0],
                  transferMethod: match[0].includes('json_encode') ? 'json' : 'direct'
                }
              }
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Find JavaScript API calls to PHP endpoints
   */
  private findJsToPhpApiCalls(components: IComponent[]): IRelationship[] {
    const relationships: IRelationship[] = [];

    const jsComponents = components.filter(c => c.language === 'javascript');
    const phpComponents = components.filter(c => c.language === 'php');

    for (const jsComponent of jsComponents) {
      if (!jsComponent.code) continue;

      // Look for fetch() calls
      const fetchPattern = /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g;
      
      // Look for jQuery AJAX calls
      const ajaxPattern = /\$\.(?:ajax|get|post)\s*\(\s*['"`]([^'"`]+)['"`]/g;
      
      // Look for XMLHttpRequest
      const xhrPattern = /open\s*\(\s*['"`]\w+['"`]\s*,\s*['"`]([^'"`]+)['"`]/g;

      const patterns = [fetchPattern, ajaxPattern, xhrPattern];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(jsComponent.code)) !== null) {
          const endpoint = match[1];
          if (!endpoint) continue;
          
          // Find PHP component handling this endpoint
          const phpHandler = this.findPhpEndpointHandler(endpoint, phpComponents);
          
          if (phpHandler) {
            relationships.push({
              id: `${jsComponent.id}-api-${phpHandler.id}`,
              type: RelationshipType.CROSS_LANGUAGE_REF,
              sourceId: jsComponent.id,
              targetId: phpHandler.id,
              metadata: {
                crossLanguageRef: {
                  sourceLanguage: 'javascript',
                  targetLanguage: 'php',
                  referenceType: 'endpoint',
                  endpoint: endpoint,
                  callType: 'ajax',
                  method: this.extractHttpMethod(match[0])
                }
              }
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Find Twig template variable usage
   */
  private findTwigVariableUsage(components: IComponent[]): IRelationship[] {
    const relationships: IRelationship[] = [];

    const twigComponents = components.filter(c => 
      c.language === 'twig' || 
      (c.code && c.code.includes('{{') && c.code.includes('}}'))
    );

    for (const twigComponent of twigComponents) {
      if (!twigComponent.code) continue;

      // Look for Twig variable output: {{ variable }}
      const twigVarPattern = /{{\s*(\w+)(?:\.\w+)*\s*}}/g;
      
      // Look for Twig control structures: {% if variable %}
      const twigControlPattern = /{%\s*(?:if|for|set)\s+(\w+)/g;

      const patterns = [twigVarPattern, twigControlPattern];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(twigComponent.code)) !== null) {
          const varName = match[1];
          if (!varName) continue;
          
          // Find PHP component that passes this variable to template
          const phpSource = this.findPhpTemplateVariableSource(varName, twigComponent, components);
          
          if (phpSource) {
            relationships.push({
              id: `${phpSource.id}-twig-${twigComponent.id}-${varName}`,
              type: RelationshipType.TEMPLATE_VAR_USAGE,
              sourceId: phpSource.id,
              targetId: twigComponent.id,
              metadata: {
                crossLanguageRef: {
                  sourceLanguage: 'php',
                  targetLanguage: 'twig',
                  referenceType: 'template_var',
                  variableName: varName,
                  usagePattern: match[0]
                }
              }
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Find SQL table/column references in application code
   */
  private findSqlReferences(components: IComponent[]): IRelationship[] {
    const relationships: IRelationship[] = [];

    const codeComponents = components.filter(c => 
      ['php', 'javascript', 'python'].includes(c.language) && c.code
    );

    for (const component of codeComponents) {
      if (!component.code) continue;

      // Look for SQL table references in queries
      const sqlTablePattern = /(?:FROM|JOIN|INTO|UPDATE)\s+([a-zA-Z_]\w*)/gi;
      
      // Look for Eloquent model references (Laravel)
      const eloquentPattern = /['\"]([a-z_]+)['\"].*?->(?:where|find|create|update)/g;

      let match;
      while ((match = sqlTablePattern.exec(component.code)) !== null) {
        const tableName = match[1];
        if (!tableName) continue;
        
        relationships.push({
          id: `${component.id}-sql-table-${tableName}`,
          type: RelationshipType.STRING_EMBEDDED_LANG,
          sourceId: component.id,
          targetId: `SQL_TABLE:${tableName}`,
          metadata: {
            crossLanguageRef: {
              sourceLanguage: component.language,
              targetLanguage: 'sql',
              referenceType: 'sql_table',
              sqlTable: tableName,
              queryType: this.extractSqlOperation(match[0])
            }
          }
        });
      }
    }

    return relationships;
  }

  /**
   * Find CSS class references across HTML/JS
   */
  private findCssClassReferences(components: IComponent[]): IRelationship[] {
    const relationships: IRelationship[] = [];

    const htmlComponents = components.filter(c => c.language === 'html');
    const jsComponents = components.filter(c => c.language === 'javascript');
    const cssComponents = components.filter(c => c.language === 'css');

    // Find CSS classes defined in stylesheets
    const definedClasses = new Set<string>();
    for (const cssComponent of cssComponents) {
      if (!cssComponent.code) continue;
      
      const classPattern = /\.([a-zA-Z_-][\w-]*)\s*\{/g;
      let match;
      while ((match = classPattern.exec(cssComponent.code)) !== null) {
        if (match[1]) {
          definedClasses.add(match[1]);
        }
      }
    }

    // Find class usage in HTML
    for (const htmlComponent of htmlComponents) {
      if (!htmlComponent.code) continue;
      
      const classUsagePattern = /class\s*=\s*['"]([^'"]*)['"]/g;
      let match;
      while ((match = classUsagePattern.exec(htmlComponent.code)) !== null) {
        const classString = match[1];
        if (!classString) continue;
        const classes = classString.split(/\s+/);
        
        for (const className of classes) {
          if (definedClasses.has(className)) {
            // Find the CSS component that defines this class
            const cssDefiner = cssComponents.find(c => 
              c.code && c.code.includes(`.${className}`)
            );
            
            if (cssDefiner) {
              relationships.push({
                id: `${htmlComponent.id}-uses-css-${cssDefiner.id}-${className}`,
                type: RelationshipType.CROSS_LANGUAGE_REF,
                sourceId: htmlComponent.id,
                targetId: cssDefiner.id,
                metadata: {
                  crossLanguageRef: {
                    sourceLanguage: 'html',
                    targetLanguage: 'css',
                    referenceType: 'css_class',
                    className: className
                  }
                }
              });
            }
          }
        }
      }
    }

    // Find class manipulation in JavaScript
    for (const jsComponent of jsComponents) {
      if (!jsComponent.code) continue;
      
      const jsClassPattern = /(?:addClass|removeClass|hasClass|classList\.(?:add|remove|contains))\s*\(\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = jsClassPattern.exec(jsComponent.code)) !== null) {
        const className = match[1];
        if (!className) continue;
        
        if (definedClasses.has(className)) {
          const cssDefiner = cssComponents.find(c => 
            c.code && c.code.includes(`.${className}`)
          );
          
          if (cssDefiner) {
            relationships.push({
              id: `${jsComponent.id}-manipulates-css-${cssDefiner.id}-${className}`,
              type: RelationshipType.CROSS_LANGUAGE_REF,
              sourceId: jsComponent.id,
              targetId: cssDefiner.id,
              metadata: {
                crossLanguageRef: {
                  sourceLanguage: 'javascript',
                  targetLanguage: 'css',
                  referenceType: 'css_class',
                  className: className,
                  operation: this.extractCssOperation(match[0])
                }
              }
            });
          }
        }
      }
    }

    return relationships;
  }

  // Helper methods

  private findPhpVariableDefinition(
    varName: string,
    parentComponentId: string,
    components: IComponent[]
  ): IComponent | null {
    // Look for PHP components that define this variable
    const phpComponents = components.filter(c => 
      c.language === 'php' && 
      c.code && 
      c.code.includes(`$${varName}`)
    );

    // Prefer the parent component if it defines the variable
    const parentComponent = phpComponents.find(c => c.id === parentComponentId);
    if (parentComponent) return parentComponent;

    // Otherwise return any component that defines it
    return phpComponents[0] || null;
  }

  private findPhpEndpointHandler(endpoint: string, phpComponents: IComponent[]): IComponent | null {
    // Look for PHP components that handle this endpoint
    for (const component of phpComponents) {
      if (!component.code) continue;
      
      // Look for route definitions
      if (component.code.includes(endpoint) || 
          component.code.includes(`'${endpoint}'`) ||
          component.code.includes(`"${endpoint}"`)) {
        return component;
      }
    }
    
    return null;
  }

  private findPhpTemplateVariableSource(
    varName: string,
    twigComponent: IComponent,
    components: IComponent[]
  ): IComponent | null {
    // Look for PHP components that render templates with this variable
    const phpComponents = components.filter(c => c.language === 'php');
    
    for (const component of phpComponents) {
      if (!component.code) continue;
      
      // Look for template rendering with variable assignment
      if (component.code.includes(varName) && 
          (component.code.includes('render') || component.code.includes('twig'))) {
        return component;
      }
    }
    
    return null;
  }

  private extractHttpMethod(callCode: string): string {
    if (callCode.includes('post') || callCode.includes('POST')) return 'POST';
    if (callCode.includes('put') || callCode.includes('PUT')) return 'PUT';
    if (callCode.includes('delete') || callCode.includes('DELETE')) return 'DELETE';
    return 'GET';
  }

  private extractSqlOperation(sqlCode: string): string {
    const upper = sqlCode.toUpperCase();
    if (upper.includes('SELECT')) return 'SELECT';
    if (upper.includes('INSERT')) return 'INSERT';
    if (upper.includes('UPDATE')) return 'UPDATE';
    if (upper.includes('DELETE')) return 'DELETE';
    return 'UNKNOWN';
  }

  private extractCssOperation(jsCode: string): string {
    if (jsCode.includes('add')) return 'add';
    if (jsCode.includes('remove')) return 'remove';
    if (jsCode.includes('contains') || jsCode.includes('has')) return 'check';
    return 'manipulate';
  }
}