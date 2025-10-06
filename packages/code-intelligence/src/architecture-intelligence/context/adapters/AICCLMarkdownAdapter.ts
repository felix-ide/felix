/**
 * AICCL Markdown Format Adapter - Ultra-compressed AI-optimized format
 * 
 * Uses AI Code Compression Language principles to minimize tokens while
 * preserving ALL context information through hierarchical compression maps.
 */

import type { ContextData, ContextGenerationOptions } from '../types.js';
import { BaseFormatAdapter } from './IFormatAdapter.js';

interface CompressionMap {
  types: Record<string, string>;
  operations: Record<string, string>;
  patterns: Record<string, string>;
  variables: Record<string, string>;
  files: Record<string, string>;
  systems: Record<string, string>;
}

export class AICCLMarkdownAdapter extends BaseFormatAdapter {
  getFormatName(): string {
    return 'aiccl-markdown';
  }

  format(data: ContextData, options: ContextGenerationOptions): string {
    const sections: string[] = [];
    
    // Build compression maps from the data
    const compressionMap = this.buildCompressionMaps(data);
    
    // Generate compressed sections
    sections.push(this.generateFilePaths(data, compressionMap));
    sections.push(this.generateCompressionMap(compressionMap));
    sections.push(this.generateSystems(data, compressionMap, options));
    
    if (options.includeSourceCode !== false) {
      sections.push(this.generateCompressedCode(data, compressionMap, options));
    }
    
    if (data.relationships && data.relationships.length > 0 && options.includeRelationships !== false) {
      sections.push(this.generateRelationships(data, compressionMap));
    }
    
    if (data.applicableRules && data.applicableRules.length > 0) {
      sections.push(this.generateRules(data, compressionMap));
    }
    
    sections.push(this.generateFlows(data, compressionMap));
    
    return sections.filter(s => s.trim()).join('\n\n');
  }

  private buildCompressionMaps(data: ContextData): CompressionMap {
    const map: CompressionMap = {
      types: {},
      operations: {},
      patterns: {},
      variables: {},
      files: {},
      systems: {}
    };

    // Common type mappings
    map.types = {
      'class': 'c',
      'function': 'f',
      'method': 'm',
      'property': 'p',
      'interface': 'i',
      'variable': 'v',
      'string': 's',
      'number': 'n',
      'boolean': 'b',
      'Promise': 'P',
      'Array': 'A',
      'Object': 'O',
      'null': 'N',
      'undefined': 'U'
    };

    // Common operation mappings
    map.operations = {
      'async': 'a',
      'await': 'w',
      'return': 'r',
      'throw': 't',
      'new': 'new',
      'export': 'exp',
      'import': 'imp',
      'const': 'c',
      'let': 'l',
      'var': 'v',
      'if': '?',
      'else': ':',
      'for': 'for',
      'while': 'wh',
      'try': 'try',
      'catch': 'cat',
      'finally': 'fin'
    };

    // Build file mappings
    const uniqueFiles = [...new Set((data.components || []).map(c => c.filePath))];
    uniqueFiles.forEach((filePath, index) => {
      map.files[filePath] = `F${index + 1}`;
    });

    // Build variable/pattern mappings from component names
    const commonPatterns = this.extractCommonPatterns(data.components || []);
    Object.entries(commonPatterns).forEach(([pattern, count], index) => {
      if (count > 1 && pattern.length > 3) {
        map.patterns[pattern] = this.generateShortId(index);
      }
    });

    return map;
  }

  private extractCommonPatterns(components: any[]): Record<string, number> {
    const patterns: Record<string, number> = {};
    
    components.forEach(comp => {
      // Extract common words from names
      const words = comp.name.match(/[A-Z][a-z]+/g) || [];
      words.forEach((word: string) => {
        if (word.length > 3) {
          patterns[word] = (patterns[word] || 0) + 1;
        }
      });
      
      // Extract common patterns from source code
      if ((comp as any).sourceCode) {
        const codePatterns = (comp as any).sourceCode.match(/\b[a-zA-Z_][a-zA-Z0-9_]{4,}\b/g) || [];
        codePatterns.forEach((pattern: string) => {
          patterns[pattern] = (patterns[pattern] || 0) + 1;
        });
      }
    });

    return patterns;
  }

  private generateShortId(index: number): string {
    // Generate short IDs: a, b, c, ..., z, aa, ab, ac, ...
    let result = '';
    let num = index;
    do {
      result = String.fromCharCode(97 + (num % 26)) + result;
      num = Math.floor(num / 26) - 1;
    } while (num >= 0);
    return result;
  }

  private generateFilePaths(data: ContextData, map: CompressionMap): string {
    const lines = ['# FILE_PATHS'];
    
    Object.entries(map.files).forEach(([filePath, fileId]) => {
      lines.push(`${fileId}:${filePath}`);
    });
    
    return lines.join('\n');
  }

  private generateCompressionMap(map: CompressionMap): string {
    const lines = ['# COMPRESSION_MAP'];
    
    // Type mappings
    const typeMappings = Object.entries(map.types)
      .map(([full, short]) => `${short}=${full}`)
      .join('|');
    if (typeMappings) lines.push(typeMappings);
    
    // Operation mappings
    const opMappings = Object.entries(map.operations)
      .map(([full, short]) => `${short}=${full}`)
      .join('|');
    if (opMappings) lines.push(opMappings);
    
    // Pattern mappings
    const patternMappings = Object.entries(map.patterns)
      .map(([full, short]) => `${short}=${full}`)
      .join('|');
    if (patternMappings) lines.push(patternMappings);
    
    return lines.join('\n');
  }

  private generateSystems(data: ContextData, map: CompressionMap, options: ContextGenerationOptions): string {
    const lines = ['# SYSTEMS'];
    
    // Group components by file
    const componentsByFile: Record<string, any[]> = {};
    (data.components || []).forEach(comp => {
      const fileId = map.files[comp.filePath] || comp.filePath;
      if (!componentsByFile[fileId]) {
        componentsByFile[fileId] = [];
      }
      componentsByFile[fileId]?.push(comp);
    });

    // Generate system entries
    let systemIndex = 1;
    Object.entries(componentsByFile).forEach(([fileId, components]) => {
      const sortedComponents = this.sortComponentsByRelevance(components);
      
      sortedComponents.forEach(comp => {
        const systemId = `S${systemIndex++}`;
        const relevance = comp.metadata?.relevanceScore 
          ? `|${(comp.metadata.relevanceScore * 100).toFixed(1)}%` 
          : '';
        
        const summary = comp.metadata?.summary 
          ? `|${this.compressText(comp.metadata.summary, map)}`
          : '';
        
        const lang = comp.language ? `@${comp.language}` : '';
        lines.push(`${systemId}:${this.compressText(comp.name, map)}${lang}${summary}${relevance}`);
        
        const location = comp.location 
          ? `${fileId}>${comp.location.startLine}-${comp.location.endLine}:${comp.location.startColumn || 0}-${comp.location.endColumn || 0}`
          : fileId;
        
        const typeSymbol = map.types[comp.type] || comp.type;
        lines.push(`${location}:${typeSymbol}{${this.generateComponentSignature(comp, map)}}`);
        
        if (map.systems) {
          map.systems[comp.id] = systemId;
        }
      });
    });
    
    return lines.join('\n');
  }

  private generateComponentSignature(comp: any, map: CompressionMap): string {
    const parts = [];
    
    // Add component type info
    if (comp.type === 'function' || comp.type === 'method') {
      const params = comp.metadata?.parameters || [];
      const paramStr = params.map((p: any) => 
        `${this.compressText(p.name, map)}:${map.types[p.type] || p.type}`
      ).join(',');
      
      const returnType = comp.metadata?.returnType 
        ? `:${map.types[comp.metadata.returnType] || comp.metadata.returnType}`
        : '';
      
      parts.push(`${this.compressText(comp.name, map)}(${paramStr})${returnType}`);
    } else if (comp.type === 'variable') {
      // Handle variable metadata
      const varParts = [this.compressText(comp.name, map)];
      
      if (comp.metadata) {
        // Add variable type info
        if (comp.metadata.type) {
          varParts.push(`:${map.types[comp.metadata.type] || comp.metadata.type}`);
        }
        
        // Add modifiers (const, let, var, exported)
        const modifiers = [];
        if (comp.metadata.isConst) modifiers.push('c');
        else if (comp.metadata.scope === 'let') modifiers.push('l');
        else if (comp.metadata.scope === 'var') modifiers.push('v');
        
        if (comp.metadata.isExported) modifiers.push('exp');
        if (comp.metadata.isAsync) modifiers.push('a');
        
        if (modifiers.length > 0) {
          varParts.push(`|${modifiers.join(',')}`);
        }
      }
      
      parts.push(varParts.join(''));
    } else {
      parts.push(this.compressText(comp.name, map));
    }
    
    return parts.join(',');
  }

  private generateCompressedCode(data: ContextData, map: CompressionMap, options: ContextGenerationOptions): string {
    const lines = ['# COMPRESSED_CODE'];
    const minified = this.shouldUseMinified(options);
    
    (data.components || []).forEach(comp => {
      const sourceCode = (comp as any).sourceCode || (comp as any).code;
      if (!sourceCode) return;
      
      const fileId = map.files[comp.filePath] || comp.filePath;
      const systemId = map.systems[comp.id];
      const compressedCode = this.compressSourceCode(sourceCode, map, minified);
      
      if (compressedCode.trim()) {
        // For variables, the code IS the defaultValue, so don't duplicate
        // For other types, include additional metadata if needed
        let metadataInfo = '';
        if (comp.type === 'variable' && comp.metadata?.defaultValue && 
            comp.metadata.defaultValue !== sourceCode) {
          // Only add defaultValue if it's different from the code
          metadataInfo = `[${this.compressText(comp.metadata.defaultValue, map)}]`;
        }
        lines.push(`${fileId}>${comp.name}:${compressedCode}${metadataInfo}`);
      }
    });
    
    return lines.join('\n');
  }

  private compressSourceCode(sourceCode: string, map: CompressionMap, minified: boolean): string {
    let compressed = sourceCode;
    
    // Remove comments and extra whitespace
    compressed = compressed
      .replace(/\/\*[\s\S]*?\*\//g, '') // Block comments
      .replace(/\/\/.*$/gm, '') // Line comments
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/\s*([{}();,])\s*/g, '$1') // Remove spaces around punctuation
      .trim();
    
    // Apply compression mappings
    Object.entries(map.types).forEach(([full, short]) => {
      compressed = compressed.replace(new RegExp(`\\b${full}\\b`, 'g'), short);
    });
    
    Object.entries(map.operations).forEach(([full, short]) => {
      compressed = compressed.replace(new RegExp(`\\b${full}\\b`, 'g'), short);
    });
    
    Object.entries(map.patterns).forEach(([full, short]) => {
      compressed = compressed.replace(new RegExp(`\\b${full}\\b`, 'g'), short);
    });
    
    // Truncate if minified and still too long
    if (minified && compressed.length > 200) {
      compressed = compressed.substring(0, 197) + '...';
    }
    
    return compressed;
  }

  private generateRelationships(data: ContextData, map: CompressionMap): string {
    const lines = ['# RELATIONSHIPS'];
    
    (data.relationships || []).forEach(rel => {
      const sourceSystem = map.systems[rel.sourceId] || rel.sourceId;
      const targetSystem = map.systems[rel.targetId] || rel.targetId;
      const confidence = (rel as any).confidence ? `|${((rel as any).confidence * 100).toFixed(0)}%` : '';
      
      lines.push(`${sourceSystem}>${targetSystem}:${rel.type}${confidence}`);
    });
    
    return lines.join('\n');
  }

  private generateRules(data: ContextData, map: CompressionMap): string {
    const lines = ['# RULES'];
    
    (data.applicableRules || []).forEach((rule, index) => {
      const ruleId = `R${index + 1}`;
      const confidence = rule.confidence ? `|${(rule.confidence * 100).toFixed(0)}%` : '';
      const guidance = rule.guidance_text 
        ? `|${this.compressText(rule.guidance_text, map)}`
        : '';
      const why = rule.why_applicable 
        ? `|${this.compressText(rule.why_applicable, map)}`
        : '';
      
      lines.push(`${ruleId}:${rule.rule_type}${confidence}${guidance}${why}`);
    });
    
    return lines.join('\n');
  }

  private generateFlows(data: ContextData, map: CompressionMap): string {
    const lines = ['# FLOWS'];
    
    // Generate execution flows based on component relationships
    const flowMap = this.buildExecutionFlows(data, map);
    
    Object.entries(flowMap).forEach(([flowName, flow]) => {
      lines.push(`${flowName}: ${flow}`);
    });
    
    return lines.join('\n');
  }

  private buildExecutionFlows(data: ContextData, map: CompressionMap): Record<string, string> {
    const flows: Record<string, string> = {};
    
    // Find entry point components (functions/methods)
    const entryPoints = (data.components || []).filter(comp => 
      comp.type === 'function' || comp.type === 'method'
    );
    
    entryPoints.forEach(entryPoint => {
      const flow = this.traceExecutionFlow(entryPoint, data, map);
      if (flow.length > 1) {
        flows[this.compressText(entryPoint.name, map)] = flow.join('>');
      }
    });
    
    return flows;
  }

  private traceExecutionFlow(component: any, data: ContextData, map: CompressionMap): string[] {
    const flow = [map.systems[component.id] || component.name];
    
    // Find outgoing relationships
    const outgoing = (data.relationships || []).filter(rel => rel.sourceId === component.id);
    
    outgoing.forEach(rel => {
      const target = (data.components || []).find(c => c.id === rel.targetId);
      if (target) {
        const targetSystem = map.systems[target.id] || target.name;
        if (!flow.includes(targetSystem)) {
          flow.push(targetSystem);
        }
      }
    });
    
    return flow;
  }

  private compressText(text: string, map: CompressionMap): string {
    if (!text) return '';
    
    let compressed = text;
    
    // Apply pattern mappings
    Object.entries(map.patterns).forEach(([full, short]) => {
      compressed = compressed.replace(new RegExp(`\\b${full}\\b`, 'g'), short);
    });
    
    // Truncate long descriptions
    if (compressed.length > 100) {
      compressed = compressed.substring(0, 97) + '...';
    }
    
    return compressed;
  }
}