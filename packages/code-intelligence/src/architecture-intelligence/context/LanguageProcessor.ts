/**
 * Language Processor - Handles multi-language context generation
 * 
 * This processor groups components by programming language,
 * generates language-specific insights, and finds cross-language relationships.
 */

import type { ILanguageProcessor } from './IContextProcessor.js';
import type { ContextData, ContextQuery, ContextGenerationOptions, ProcessorResult } from './types.js';
import type { IComponent, IRelationship } from '../../code-analysis-types/index.js';

export class LanguageProcessor implements ILanguageProcessor {
  readonly name = 'LanguageProcessor';
  readonly description = 'Handles multi-language context generation';
  readonly version = '1.0.0';
  readonly priority = 30;

  async process(data: ContextData, query: ContextQuery, options: ContextGenerationOptions): Promise<ProcessorResult> {
    const startTime = Date.now();
    
    // Skip language analysis if metadata is disabled
    if (!options.includeMetadata) {
      console.log(`🚫 LanguageProcessor: Skipping language analysis (includeMetadata=false)`);
      return {
        data,
        metadata: {
          processorName: this.name,
          processingTime: Date.now() - startTime,
          itemsProcessed: 0,
          itemsFiltered: 0
        },
        warnings: ['Language analysis skipped - metadata disabled']
      };
    }
    
    console.log(`🔤 LanguageProcessor: Processing language analysis (includeMetadata=true)`);
    
    // Group components by language
    const languageGroups = this.groupByLanguage(data);
    
    // Generate insights for each language
    const languageInsights: Record<string, any> = {};
    for (const [language, langData] of Object.entries(languageGroups)) {
      languageInsights[language] = this.generateLanguageInsights(langData, language);
    }
    
    // Find cross-language relationships
    const crossLangRels = this.findCrossLanguageRelationships(data);
    
    const enhancedData = {
      ...data,
      metadata: {
        ...data.metadata,
        languageGroups,
        languageInsights,
        crossLanguageRelationships: crossLangRels
      }
    };
    
    return {
      data: enhancedData,
      metadata: {
        processorName: this.name,
        processingTime: Date.now() - startTime,
        itemsProcessed: Object.keys(languageGroups).length,
        itemsFiltered: 0
      },
      warnings: []
    };
  }

  canProcess(data: ContextData, options: ContextGenerationOptions): boolean {
    const languages = new Set(data.components.map(c => c.language));
    return languages.size > 0;
  }

  getConfigSchema(): Record<string, any> {
    return {
      enableCrossLanguageAnalysis: { type: 'boolean', default: true },
      generateLanguageStats: { type: 'boolean', default: true }
    };
  }

  validateConfig(config: any): true | string {
    return true;
  }

  groupByLanguage(data: ContextData): Record<string, ContextData> {
    const groups: Record<string, ContextData> = {};
    
    // Group components by language
    const componentsByLang: Record<string, IComponent[]> = {};
    data.components.forEach(component => {
      if (!componentsByLang[component.language]) {
        componentsByLang[component.language] = [];
      }
      componentsByLang[component.language]!.push(component);
    });
    
    // Create ContextData for each language
    for (const [language, components] of Object.entries(componentsByLang)) {
      const componentIds = new Set(components.map(c => c.id));
      const relationships = data.relationships.filter(rel =>
        componentIds.has(rel.sourceId) && componentIds.has(rel.targetId)
      );
      
      groups[language] = {
        components,
        relationships,
        query: data.query!,
        timestamp: data.timestamp,
        source: {
          ...data.source,
          totalComponents: components.length,
          totalRelationships: relationships.length,
        },
        metadata: {
          ...data.metadata
        }
      };
    }
    
    return groups;
  }

  generateLanguageInsights(data: ContextData, language: string): any {
    const components = data.components;
    const relationships = data.relationships;
    
    // Component type distribution
    const typeDistribution: Record<string, number> = {};
    components.forEach(comp => {
      typeDistribution[comp.type] = (typeDistribution[comp.type] || 0) + 1;
    });
    
    // Relationship type distribution
    const relTypeDistribution: Record<string, number> = {};
    relationships.forEach(rel => {
      relTypeDistribution[rel.type] = (relTypeDistribution[rel.type] || 0) + 1;
    });
    
    // Calculate complexity metrics
    const avgRelationshipsPerComponent = relationships.length / Math.max(components.length, 1);
    
    // Language-specific patterns
    const patterns = this.detectLanguagePatterns(components, language);
    
    return {
      language,
      componentCount: components.length,
      relationshipCount: relationships.length,
      typeDistribution,
      relTypeDistribution,
      avgRelationshipsPerComponent: Math.round(avgRelationshipsPerComponent * 100) / 100,
      patterns,
      files: [...new Set(components.map(c => c.filePath))].length
    };
  }

  findCrossLanguageRelationships(data: ContextData): any[] {
    const crossLangRels: any[] = [];
    
    // Group components by language
    const componentsByLang: Record<string, IComponent[]> = {};
    data.components.forEach(comp => {
      if (!componentsByLang[comp.language]) {
        componentsByLang[comp.language] = [];
      }
      componentsByLang[comp.language]!.push(comp);
    });
    
    // Find relationships that cross language boundaries
    data.relationships.forEach(rel => {
      const sourceComp = data.components.find(c => c.id === rel.sourceId);
      const targetComp = data.components.find(c => c.id === rel.targetId);
      
      if (sourceComp && targetComp && sourceComp.language !== targetComp.language) {
        crossLangRels.push({
          relationship: rel,
          sourceLanguage: sourceComp.language,
          targetLanguage: targetComp.language,
          sourceComponent: sourceComp.name,
          targetComponent: targetComp.name
        });
      }
    });
    
    return crossLangRels;
  }

  private detectLanguagePatterns(components: IComponent[], language: string): any {
    const patterns: any = {
      language,
      hasClasses: false,
      hasFunctions: false,
      hasInterfaces: false,
      hasModules: false,
      frameworkPatterns: []
    };
    
    // Detect common patterns
    components.forEach(comp => {
      switch (comp.type) {
        case 'class':
          patterns.hasClasses = true;
          break;
        case 'function':
          patterns.hasFunctions = true;
          break;
        case 'interface':
          patterns.hasInterfaces = true;
          break;
        case 'module':
          patterns.hasModules = true;
          break;
      }
      
      // Detect framework patterns
      this.detectFrameworkPatterns(comp, patterns, language);
    });
    
    return patterns;
  }

  private detectFrameworkPatterns(component: IComponent, patterns: any, language: string): void {
    const name = component.name.toLowerCase();
    const filePath = component.filePath.toLowerCase();
    
    switch (language) {
      case 'javascript':
      case 'typescript':
        if (name.includes('react') || filePath.includes('jsx') || filePath.includes('tsx')) {
          if (!patterns.frameworkPatterns.includes('React')) {
            patterns.frameworkPatterns.push('React');
          }
        }
        if (name.includes('vue') || filePath.includes('.vue')) {
          if (!patterns.frameworkPatterns.includes('Vue')) {
            patterns.frameworkPatterns.push('Vue');
          }
        }
        if (name.includes('angular') || component.metadata?.decorators?.some((d: string) => d.includes('Component'))) {
          if (!patterns.frameworkPatterns.includes('Angular')) {
            patterns.frameworkPatterns.push('Angular');
          }
        }
        break;
        
      case 'python':
        if (name.includes('django') || filePath.includes('django')) {
          if (!patterns.frameworkPatterns.includes('Django')) {
            patterns.frameworkPatterns.push('Django');
          }
        }
        if (name.includes('flask') || filePath.includes('flask')) {
          if (!patterns.frameworkPatterns.includes('Flask')) {
            patterns.frameworkPatterns.push('Flask');
          }
        }
        break;
        
      case 'java':
        if (name.includes('spring') || component.metadata?.annotations?.some((a: string) => a.includes('Spring'))) {
          if (!patterns.frameworkPatterns.includes('Spring')) {
            patterns.frameworkPatterns.push('Spring');
          }
        }
        break;
        
      case 'php':
        if (name.includes('laravel') || filePath.includes('laravel')) {
          if (!patterns.frameworkPatterns.includes('Laravel')) {
            patterns.frameworkPatterns.push('Laravel');
          }
        }
        if (name.includes('symfony') || filePath.includes('symfony')) {
          if (!patterns.frameworkPatterns.includes('Symfony')) {
            patterns.frameworkPatterns.push('Symfony');
          }
        }
        break;
    }
  }
}