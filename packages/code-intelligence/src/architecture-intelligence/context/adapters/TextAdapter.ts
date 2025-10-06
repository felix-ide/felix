/**
 * Text Format Adapter - Outputs context as plain text
 */

import type { ContextData, ContextGenerationOptions } from '../types.js';
import { BaseFormatAdapter } from './IFormatAdapter.js';

/**
 * Plain text adapter
 */
export class TextAdapter extends BaseFormatAdapter {
  getFormatName(): string {
    return 'text';
  }

  format(data: ContextData, options: ContextGenerationOptions): string {
    const lines: string[] = [];
    const minified = this.shouldUseMinified(options);
    
    // Header
    lines.push('CODE CONTEXT');
    lines.push('============');
    lines.push('');
    
    // Query info
    const queryText = this.extractQueryText(data.query);
    if (queryText) {
      lines.push(`Query: ${queryText}`);
      lines.push('');
    }

    // Summary
    if (data.source) {
      lines.push(`Components: ${data.source.totalComponents || 0}`);
      lines.push(`Relationships: ${data.source.totalRelationships || 0}`);
      if (data.applicableRules && data.applicableRules.length > 0) {
        lines.push(`Applicable Rules: ${data.applicableRules.length}`);
      }
      lines.push('');
    }

    // Components
    if (data.components && data.components.length > 0) {
      lines.push('COMPONENTS');
      lines.push('----------');
      
      const sortedComponents = this.sortComponentsByRelevance(data.components);
      
      for (const component of sortedComponents) {
        if (minified) {
          lines.push(`- ${component.name} (${component.type})`);
        } else {
          lines.push(`- ${component.name} (${component.type}) in ${component.language}`);
          lines.push(`  Path: ${component.filePath}`);
          
          if (component.location) {
            lines.push(`  Location: Lines ${component.location.startLine}-${component.location.endLine}`);
          }

          if (component.metadata?.relevanceScore !== undefined) {
            lines.push(`  Relevance: ${(component.metadata.relevanceScore * 100).toFixed(1)}%`);
          }
          
          if (component.metadata?.summary) {
            lines.push(`  Summary: ${this.truncateText(component.metadata.summary, minified ? 100 : 200)}`);
          }

          // Add source code if requested and available
          if (options.includeSourceCode !== false && (component as any).sourceCode) {
            lines.push('  Source Code:');
            const sourceLines = (component as any).sourceCode.split('\n');
            const maxLines = minified ? 10 : 50;
            const truncatedSource = sourceLines.slice(0, maxLines);
            for (const sourceLine of truncatedSource) {
              lines.push(`    ${sourceLine}`);
            }
            if (sourceLines.length > maxLines) {
              lines.push(`    ... (${sourceLines.length - maxLines} more lines)`);
            }
          }
        }
        lines.push('');
      }
    }

    // Relationships
    if (data.relationships && data.relationships.length > 0 && options.includeRelationships !== false) {
      lines.push('RELATIONSHIPS');
      lines.push('-------------');
      
      // Group by type
      const relationshipsByType: Record<string, any[]> = {};
      for (const relationship of data.relationships) {
        if (!relationshipsByType[relationship.type]) {
          relationshipsByType[relationship.type] = [];
        }
        relationshipsByType[relationship.type]?.push(relationship);
      }

      for (const [type, relationships] of Object.entries(relationshipsByType)) {
        lines.push(`${type}:`);
        for (const rel of relationships) {
          if (minified) {
            lines.push(`  - ${rel.sourceId} -> ${rel.targetId}`);
          } else {
            const confidence = rel.confidence ? ` (confidence: ${(rel.confidence * 100).toFixed(0)}%)` : '';
            lines.push(`  - ${rel.sourceId} -> ${rel.targetId}${confidence}`);
          }
        }
        lines.push('');
      }
    }

    // Rules
    if (data.applicableRules && data.applicableRules.length > 0) {
      lines.push('APPLICABLE RULES');
      lines.push('---------------');
      
      const sortedRules = [...data.applicableRules].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      
      for (const rule of sortedRules) {
        lines.push(`${rule.rule_type.toUpperCase()}: ${rule.rule_id}`);
        lines.push(`Confidence: ${((rule.confidence || 0) * 100).toFixed(0)}%`);
        
        if (rule.guidance_text) {
          lines.push(`Guidance: ${this.truncateText(rule.guidance_text, minified ? 200 : 400)}`);
        }
        
        if (rule.why_applicable) {
          lines.push(`Why: ${this.truncateText(rule.why_applicable, minified ? 100 : 200)}`);
        }
        
        lines.push('');
      }
    }

    // Metadata (only in non-minified mode)
    if (!minified && data.metadata) {
      lines.push('METADATA');
      lines.push('--------');
      lines.push(`Generation Time: ${data.metadata.generationTime || 0}ms`);
      lines.push(`Processing Steps: ${(data.metadata.processingSteps || []).join(', ')}`);
      if (data.metadata.warnings && data.metadata.warnings.length > 0) {
        lines.push(`Warnings: ${data.metadata.warnings.length}`);
        for (const warning of data.metadata.warnings) {
          lines.push(`  - ${warning}`);
        }
      }
    }

    return lines.join('\n');
  }
}