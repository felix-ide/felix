/**
 * JSON Format Adapter - Outputs context as JSON
 */

import type { ContextData, ContextGenerationOptions } from '../types.js';
import { BaseFormatAdapter } from './IFormatAdapter.js';

/**
 * Standard JSON adapter
 */
export class JsonAdapter extends BaseFormatAdapter {
  getFormatName(): string {
    return 'json';
  }

  format(data: ContextData, options: ContextGenerationOptions): string {
    const minified = this.shouldUseMinified(options);
    
    // Create a clean output object WITHOUT duplication
    const output: any = {
      query: data.query || {},
      timestamp: data.timestamp,
      components: this.cleanComponents(data.components || [], options),
      relationships: options.includeRelationships === false ? [] : this.cleanRelationships(data.relationships || []),
      source: {
        totalComponents: data.source?.totalComponents || 0,
        totalRelationships: data.source?.totalRelationships || 0
      }
    };

    // Only include applicableRules if non-empty
    if (data.applicableRules && data.applicableRules.length > 0) {
      output.applicableRules = data.applicableRules;
    }

    // Only include metadata if it has useful content
    const cleanMetadata = this.cleanMetadata(data.metadata);
    if (cleanMetadata && Object.keys(cleanMetadata).length > 0) {
      output.metadata = cleanMetadata;
    }

    // Format output
    if (minified) {
      return JSON.stringify(output, null, 0);
    } else {
      return JSON.stringify(output, null, 2);
    }
  }

  private cleanComponents(components: any[], options: ContextGenerationOptions): any[] {
    return components.map(component => {
      const cleaned: any = {
        id: component.id,
        name: component.name,
        type: component.type,
        language: component.language,
        filePath: component.filePath
      };

      // Add location if present
      if (component.location) {
        cleaned.location = component.location;
      }

      // Add metadata, removing duplication
      if (component.metadata) {
        const cleanedMetadata: any = {};
        
        // Copy only non-redundant metadata fields
        const skipFields = ['relevanceScore', 'weightedRelevanceScore', 'skeleton', 'code', 'sourceCode'];
        Object.entries(component.metadata).forEach(([key, value]) => {
          if (!skipFields.includes(key) && value !== null && value !== undefined) {
            cleanedMetadata[key] = value;
          }
        });

        // Include relevance score only if significant
        if (component.metadata.relevanceScore && component.metadata.relevanceScore > 0) {
          cleanedMetadata.relevance = component.metadata.relevanceScore;
        }

        // Include skeleton only if requested and present
        if (options.includeMetadata !== false && component.metadata.skeleton) {
          cleanedMetadata.skeleton = component.metadata.skeleton;
        }

        if (Object.keys(cleanedMetadata).length > 0) {
          cleaned.metadata = cleanedMetadata;
        }
      }

      // Include source code ONCE if requested and available
      if (options.includeSourceCode !== false) {
        const sourceCode = component.code || component.sourceCode || (component.metadata && component.metadata.code);
        if (sourceCode) {
          cleaned.code = sourceCode;
        }
      }

      return cleaned;
    });
  }

  private cleanRelationships(relationships: any[]): any[] {
    return relationships.map(rel => {
      const cleaned: any = {
        id: rel.id,
        type: rel.type,
        sourceId: rel.sourceId,
        targetId: rel.targetId
      };

      // Only include confidence if not 1.0 (default)
      if (rel.confidence && rel.confidence !== 1.0) {
        cleaned.confidence = rel.confidence;
      }

      // Clean metadata - remove redundant fields
      if (rel.metadata) {
        const cleanedMetadata: any = {};
        const skipFields = ['relevanceScore', 'weightedRelevanceScore', 'relationship', 'className', 'interfaceName', 'isInverse', 'originalRelationshipId', 'originalType'];
        
        Object.entries(rel.metadata).forEach(([key, value]) => {
          if (!skipFields.includes(key) && value !== null && value !== undefined) {
            cleanedMetadata[key] = value;
          }
        });

        if (Object.keys(cleanedMetadata).length > 0) {
          cleaned.metadata = cleanedMetadata;
        }
      }

      return cleaned;
    });
  }

  private cleanMetadata(metadata: any): any {
    if (!metadata) return null;

    const cleaned: any = {};

    // Only include non-empty fields
    if (metadata.generationTime) {
      cleaned.generationTime = metadata.generationTime;
    }

    if (metadata.processingSteps && metadata.processingSteps.length > 0) {
      cleaned.processingSteps = metadata.processingSteps;
    }

    if (metadata.warnings && metadata.warnings.length > 0) {
      cleaned.warnings = metadata.warnings;
    }

    // Skip languageGroups, languageInsights, crossLanguageRelationships unless they have unique info
    // These are derived from the components/relationships already included

    return cleaned;
  }
}

/**
 * Compressed JSON adapter with abbreviated keys
 */
export class JsonCompressedAdapter extends BaseFormatAdapter {
  getFormatName(): string {
    return 'json-compressed';
  }

  format(data: ContextData, options: ContextGenerationOptions): string {
    // Create compressed output with abbreviated keys
    const output: any = {
      q: data.query || {},
      ts: data.timestamp,
      c: this.compressComponents(data.components || [], options),
      r: this.compressRelationships(data.relationships || [], options),
      rules: this.compressRules(data.applicableRules || []),
      src: {
        tc: data.source?.totalComponents || 0,
        tr: data.source?.totalRelationships || 0
      },
      meta: {
        gt: data.metadata?.generationTime || 0,
        steps: data.metadata?.processingSteps || [],
        warn: data.metadata?.warnings || []
      }
    };

    return JSON.stringify(output, null, 0);
  }

  private compressComponents(components: any[], options: ContextGenerationOptions): any[] {
    return components.map(comp => {
      const compressed: any = {
        id: comp.id,
        n: comp.name,
        t: comp.type,
        l: comp.language,
        f: comp.filePath
      };

      // Add location
      if (comp.location) {
        compressed.loc = {
          sl: comp.location.startLine,
          el: comp.location.endLine
        };
      }

      // Add source code if requested and available
      if (options.includeSourceCode !== false && comp.sourceCode) {
        compressed.src = comp.sourceCode;
      }

      // Add metadata if available
      if (comp.metadata) {
        compressed.m = {};
        if (comp.metadata.relevanceScore !== undefined) {
          compressed.m.rel = comp.metadata.relevanceScore;
        }
        if (comp.metadata.summary) {
          compressed.m.sum = this.truncateText(comp.metadata.summary, 100);
        }
      }

      return compressed;
    });
  }

  private compressRelationships(relationships: any[], options: ContextGenerationOptions): any[] {
    if (options.includeRelationships === false) return [];
    
    return relationships.map(rel => ({
      id: rel.id,
      t: rel.type,
      s: rel.sourceId,
      tgt: rel.targetId,
      conf: rel.confidence || 1.0
    }));
  }

  private compressRules(rules: any[]): any[] {
    return rules.map(rule => ({
      id: rule.rule_id,
      t: rule.rule_type,
      guid: this.truncateText(rule.guidance_text || '', 200),
      conf: rule.confidence,
      why: this.truncateText(rule.why_applicable || '', 100)
    }));
  }
}