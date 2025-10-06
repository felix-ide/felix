/**
 * JSON Parser - Parses JSON files
 */

import { BaseLanguageParser } from './BaseLanguageParser.js';
import { ParseError, LanguageBoundary } from '../interfaces/ILanguageParser.js';
import { IComponent, IRelationship, ComponentType } from '../types.js';

/**
 * JSON parser for .json, .jsonc, and .json5 files
 */
export class JsonParser extends BaseLanguageParser {
  constructor() {
    super('json', ['.json', '.jsonc', '.json5']);
  }

  /**
   * Get JSON specific ignore patterns
   */
  getIgnorePatterns(): string[] {
    return [
      ...this.getBaseIgnorePatterns()
    ];
  }

  /**
   * Validate that content is valid JSON
   */
  validateContent(content: string): boolean {
    try {
      // Remove comments for .jsonc files
      const stripped = this.stripJsonComments(content);
      JSON.parse(stripped);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate JSON syntax
   */
  validateSyntax(content: string): ParseError[] {
    const errors: ParseError[] = [];
    
    try {
      const stripped = this.stripJsonComments(content);
      JSON.parse(stripped);
    } catch (error: any) {
      // Try to extract line number from error message
      const lineMatch = error.message.match(/position (\d+)/);
      const position = lineMatch ? parseInt(lineMatch[1]) : 0;
      const line = this.getLineFromPosition(content, position);
      
      errors.push(this.createParseError(
        `JSON syntax error: ${error.message}`,
        this.createLocation(line, line),
        'JSON_PARSE_ERROR',
        'error'
      ));
    }
    
    return errors;
  }

  /**
   * Detect components in JSON content
   */
  detectComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    
    // Add file component
    components.push(this.createFileComponent(filePath, content));
    
    try {
      const stripped = this.stripJsonComments(content);
      const data = JSON.parse(stripped);
      
      // Extract top-level properties as components
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        Object.keys(data).forEach((key, index) => {
          const value = data[key];
          const line = this.findPropertyLine(content, key) || index + 1;
          
          components.push({
            id: this.generateComponentId(filePath, key, ComponentType.PROPERTY),
            name: key,
            type: ComponentType.PROPERTY,
            language: this.language,
            filePath,
            location: this.createLocation(line, line),
            parentId: this.getCurrentParentId(),
            metadata: {
              valueType: this.getJsonValueType(value),
              isRequired: true,
              documentation: this.extractJsonDocumentation(content, line)
            }
          });
        });
      }
    } catch (error) {
      // If parsing fails, still return file component
      console.warn(`JsonParser failed to parse ${filePath}:`, error);
    }
    
    return components;
  }

  /**
   * Detect relationships between JSON components
   */
  detectRelationships(components: IComponent[], content: string): IRelationship[] {
    // Use base parser's containment detection
    return this.extractContainmentRelationships(components);
  }

  /**
   * JSON files are entirely in JSON language
   */
  detectLanguageBoundaries(content: string, filePath: string): LanguageBoundary[] {
    const lines = content.split('\n');
    return [{
      language: 'json',
      startLine: 1,
      startColumn: 0,
      endLine: lines.length,
      endColumn: lines[lines.length - 1]?.length || 0,
      scope: 'source.json'
    }];
  }

  /**
   * Strip comments from JSON content for .jsonc files
   */
  private stripJsonComments(content: string): string {
    // Remove single-line comments
    let stripped = content.replace(/\/\/.*$/gm, '');
    // Remove multi-line comments
    stripped = stripped.replace(/\/\*[\s\S]*?\*\//g, '');
    return stripped;
  }

  /**
   * Get line number from character position
   */
  private getLineFromPosition(content: string, position: number): number {
    const lines = content.substring(0, position).split('\n');
    return lines.length;
  }

  /**
   * Find the line number where a property is defined
   */
  private findPropertyLine(content: string, propertyName: string): number | null {
    const lines = content.split('\n');
    const propertyPattern = new RegExp(`"${propertyName}"\\s*:`);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line && propertyPattern.test(line)) {
        return i + 1;
      }
    }
    
    return null;
  }

  /**
   * Get the type of a JSON value
   */
  private getJsonValueType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return typeof value;
  }

  /**
   * Extract documentation from comments above a JSON property
   */
  private extractJsonDocumentation(content: string, line: number): string | undefined {
    const lines = content.split('\n');
    const docs: string[] = [];
    
    // Look for comments before the property
    for (let i = line - 2; i >= 0; i--) {
      const currentLine = lines[i];
      if (!currentLine) continue;
      const trimmed = currentLine.trim();
      
      // Single line comment
      if (trimmed.startsWith('//')) {
        docs.unshift(trimmed.substring(2).trim());
      } 
      // Multi-line comment
      else if (trimmed.includes('*/')) {
        // Extract the comment block
        let commentLines: string[] = [];
        for (let j = i; j >= 0; j--) {
          const commentLine = lines[j];
          if (commentLine) {
            commentLines.unshift(commentLine);
            if (commentLine.includes('/*')) break;
          }
        }
        
        const comment = commentLines.join('\n');
        const cleanComment = comment
          .replace(/\/\*\*?/, '')
          .replace(/\*\//, '')
          .split('\n')
          .map(l => l.trim().replace(/^\*\s?/, ''))
          .filter(l => l.length > 0)
          .join('\n');
        
        docs.unshift(cleanComment);
        break;
      }
      // Stop if we hit non-comment content
      else if (trimmed.length > 0 && !trimmed.startsWith(',')) {
        break;
      }
    }
    
    return docs.length > 0 ? docs.join('\n') : undefined;
  }
}