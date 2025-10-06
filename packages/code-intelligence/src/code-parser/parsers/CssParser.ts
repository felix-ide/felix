/**
 * CSS Parser - Parses CSS files and embedded CSS
 */

import { BaseLanguageParser } from './BaseLanguageParser.js';
import { ParseError, LanguageBoundary } from '../interfaces/ILanguageParser.js';
import { IComponent, IRelationship, ComponentType, RelationshipType } from '../types.js';

/**
 * CSS parser that detects CSS rules, selectors, and properties
 */
export class CssParser extends BaseLanguageParser {
  constructor() {
    super('css', ['.css', '.scss', '.sass', '.less']);
  }

  /**
   * Get CSS specific ignore patterns
   */
  getIgnorePatterns(): string[] {
    return [
      ...this.getBaseIgnorePatterns()
    ];
  }

  /**
   * Validate that content is valid CSS
   */
  validateContent(content: string): boolean {
    // Basic CSS validation - check for CSS patterns
    const cssPatterns = [
      /\{[^}]*\}/,  // CSS blocks
      /[a-zA-Z-]+\s*:\s*[^;]+;/,  // Property declarations
      /^\s*\/\*.*\*\//m,  // CSS comments
      /@[a-zA-Z-]+/,  // At-rules (@media, @import, etc.)
      /\.[a-zA-Z_-][\w-]*\s*\{/,  // Class selectors
      /#[a-zA-Z_-][\w-]*\s*\{/,  // ID selectors
      /[a-zA-Z][a-zA-Z0-9]*\s*\{/,  // Element selectors
    ];
    
    return cssPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Validate CSS syntax
   */
  validateSyntax(content: string): ParseError[] {
    const errors: ParseError[] = [];
    const lines = content.split('\n');
    
    // Basic CSS validation
    let braceCount = 0;
    
    lines.forEach((line, index) => {
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      
      braceCount += openBraces - closeBraces;
      
      // Check for unmatched braces at end
      if (index === lines.length - 1 && braceCount !== 0) {
        errors.push(this.createParseError(
          `Unmatched braces in CSS (${braceCount > 0 ? 'missing closing' : 'extra closing'})`,
          this.createLocation(index + 1, index + 1),
          'CSS_UNMATCHED_BRACES',
          'error'
        ));
      }
    });
    
    return errors;
  }

  /**
   * Detect components in CSS content
   */
  detectComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    
    // Add file component
    components.push(this.createFileComponent(filePath, content));
    
    const lines = content.split('\n');
    
    // Extract CSS rules
    this.extractCssRules(content, lines, filePath, components);
    
    // Extract CSS variables
    this.extractCssVariables(content, lines, filePath, components);
    
    // Extract media queries
    this.extractMediaQueries(content, lines, filePath, components);
    
    return components;
  }

  /**
   * Detect relationships between CSS components
   */
  detectRelationships(components: IComponent[], content: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    
    // Use base parser's containment detection
    relationships.push(...this.extractContainmentRelationships(components));
    
    return relationships;
  }

  /**
   * Detect language boundaries (CSS is typically pure CSS)
   */
  detectLanguageBoundaries(content: string, filePath: string): LanguageBoundary[] {
    const lines = content.split('\n');
    
    // Default CSS boundary
    return [{
      language: 'css',
      startLine: 1,
      startColumn: 0,
      endLine: lines.length,
      endColumn: lines[lines.length - 1]?.length || 0,
      scope: 'source.css'
    }];
  }

  /**
   * Extract CSS rules
   */
  private extractCssRules(content: string, lines: string[], filePath: string, components: IComponent[]): void {
    let ruleIndex = 0;
    let inRule = false;
    let currentRule = '';
    let ruleStartLine = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      // Skip comments
      if (line.trim().startsWith('/*')) continue;
      
      // Look for selectors (before opening brace)
      if (!inRule && line.includes('{')) {
        const selectorMatch = line.match(/([^{]+)\s*\{/);
        if (selectorMatch && selectorMatch[1]) {
          const selector = selectorMatch[1].trim();
          ruleStartLine = i + 1;
          inRule = true;
          currentRule = selector;
        }
      }
      
      // Look for end of rule
      if (inRule && line.includes('}')) {
        const ruleEndLine = i + 1;
        
        components.push({
          id: this.generateComponentId(filePath, `css_rule_${ruleIndex++}`, ComponentType.CLASS),
          name: currentRule,
          type: ComponentType.CLASS,
          language: this.language,
          filePath,
          location: this.createLocation(ruleStartLine, ruleEndLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            cssSelector: currentRule,
            ruleType: this.determineSelectorType(currentRule),
            isCssRule: true
          }
        });
        
        inRule = false;
        currentRule = '';
      }
    }
  }

  /**
   * Extract CSS custom properties (variables)
   */
  private extractCssVariables(content: string, lines: string[], filePath: string, components: IComponent[]): void {
    lines.forEach((line, index) => {
      const variableMatch = line.match(/--([a-zA-Z_-][\w-]*)\s*:\s*([^;]+);/);
      if (variableMatch && variableMatch[1] && variableMatch[2]) {
        const varName = variableMatch[1];
        const varValue = variableMatch[2].trim();
        
        components.push({
          id: this.generateComponentId(filePath, varName, ComponentType.PROPERTY),
          name: `--${varName}`,
          type: ComponentType.PROPERTY,
          language: this.language,
          filePath,
          location: this.createLocation(index + 1, index + 1),
          parentId: this.getCurrentParentId(),
          metadata: {
            isCssVariable: true,
            variableName: varName,
            variableValue: varValue,
            propertyType: 'css-custom-property'
          }
        });
      }
    });
  }

  /**
   * Extract media queries
   */
  private extractMediaQueries(content: string, lines: string[], filePath: string, components: IComponent[]): void {
    let mediaIndex = 0;
    
    lines.forEach((line, index) => {
      const mediaMatch = line.match(/@media\s+([^{]+)\s*\{/);
      if (mediaMatch && mediaMatch[1]) {
        const mediaQuery = mediaMatch[1].trim();
        
        components.push({
          id: this.generateComponentId(filePath, `media_query_${mediaIndex++}`, ComponentType.SECTION),
          name: `@media ${mediaQuery}`,
          type: ComponentType.SECTION,
          language: this.language,
          filePath,
          location: this.createLocation(index + 1, index + 1),
          parentId: this.getCurrentParentId(),
          metadata: {
            isMediaQuery: true,
            mediaCondition: mediaQuery,
            sectionType: 'media-query'
          }
        });
      }
    });
  }

  /**
   * Determine the type of CSS selector
   */
  private determineSelectorType(selector: string): string {
    if (selector.startsWith('.')) return 'class';
    if (selector.startsWith('#')) return 'id';
    if (selector.includes(':')) return 'pseudo';
    if (selector.includes('[')) return 'attribute';
    if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(selector.trim())) return 'element';
    return 'complex';
  }
}