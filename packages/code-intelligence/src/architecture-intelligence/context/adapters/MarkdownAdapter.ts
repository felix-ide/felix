/**
 * Markdown Format Adapter - Outputs context as human-readable markdown
 */

import type { ContextData, ContextGenerationOptions } from '../types.js';
import { BaseFormatAdapter } from './IFormatAdapter.js';

/**
 * Standard Markdown adapter
 */
export class MarkdownAdapter extends BaseFormatAdapter {
  getFormatName(): string {
    return 'markdown';
  }

  format(data: ContextData, options: ContextGenerationOptions): string {
    const sections: string[] = [];
    const minified = this.shouldUseMinified(options);
    
    // Title with query context
    const queryText = this.extractQueryText(data.query);
    sections.push(`# Context for Query: "${queryText || 'All Components'}"\n`);
    
    // Summary section
    if (data.source) {
      sections.push('## Summary\n');
      sections.push(`- **Components**: ${data.source.totalComponents || 0}`);
      sections.push(`- **Relationships**: ${data.source.totalRelationships || 0}`);
      if (data.applicableRules && data.applicableRules.length > 0) {
        sections.push(`- **Applicable Rules**: ${data.applicableRules.length}`);
      }
      sections.push('');
    }

    // Components section
    if (data.components && data.components.length > 0) {
      sections.push('## Relevant Components\n');
      
      const sortedComponents = this.sortComponentsByRelevance(data.components);
      
      for (const component of sortedComponents) {
        sections.push(`### ${component.name} (${component.type}, ${component.language})`);
        sections.push(`**Path**: \`${component.filePath}\``);
        
        // Add location info
        if (component.location) {
          sections.push(`**Location**: Lines ${component.location.startLine}-${component.location.endLine}`);
        }

        // Add relevance score if available
        if (component.metadata?.relevanceScore !== undefined) {
          sections.push(`**Relevance**: ${(component.metadata.relevanceScore * 100).toFixed(1)}%`);
        }
        
        // Add summary if available
        if (component.metadata?.summary || component.metadata?.description) {
          const summary = component.metadata.summary || component.metadata.description;
          sections.push(`**Summary**: ${this.truncateText(summary, minified ? 100 : 300)}`);
        }

        // Add source code if requested and available
        if (options.includeSourceCode !== false && (component as any).sourceCode) {
          sections.push('\n**Source Code**:');
          sections.push('```' + component.language);
          if (minified) {
            // In minified mode, truncate source code
            sections.push(this.truncateText((component as any).sourceCode, 500));
          } else {
            sections.push((component as any).sourceCode);
          }
          sections.push('```');
        }

        // Add skeleton if available and no full source
        if (!(component as any).sourceCode && component.metadata?.skeleton) {
          sections.push('\n**Structure**:');
          sections.push('```' + component.language);
          sections.push(component.metadata.skeleton);
          sections.push('```');
        }

        sections.push('');
      }
    }

    // Relationships section
    if (data.relationships && data.relationships.length > 0 && options.includeRelationships !== false) {
      sections.push('## Component Relationships\n');
      
      // Group relationships by type
      const relationshipsByType: Record<string, any[]> = {};
      for (const relationship of data.relationships) {
        if (!relationshipsByType[relationship.type]) {
          relationshipsByType[relationship.type] = [];
        }
        relationshipsByType[relationship.type]?.push(relationship);
      }

      for (const [type, relationships] of Object.entries(relationshipsByType)) {
        sections.push(`### ${type}\n`);
        for (const rel of relationships) {
          const confidence = rel.confidence ? ` (confidence: ${(rel.confidence * 100).toFixed(0)}%)` : '';
          sections.push(`- **${rel.sourceId}** → **${rel.targetId}**${confidence}`);
        }
        sections.push('');
      }
    }

    // Rules section
    if (data.applicableRules && data.applicableRules.length > 0) {
      sections.push('## Applicable Coding Rules\n');
      
      // Sort rules by confidence
      const sortedRules = [...data.applicableRules].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      
      for (const rule of sortedRules) {
        sections.push(`### ${rule.rule_type.toUpperCase()}: ${rule.rule_id}`);
        sections.push(`**Confidence**: ${((rule.confidence || 0) * 100).toFixed(0)}%`);
        
        if (rule.guidance_text) {
          sections.push(`**Guidance**: ${this.truncateText(rule.guidance_text, minified ? 200 : 500)}`);
        }
        
        if (rule.why_applicable) {
          sections.push(`**Why Applicable**: ${this.truncateText(rule.why_applicable, minified ? 100 : 200)}`);
        }
        
        if (rule.suggested_action) {
          sections.push(`**Suggested Action**: ${this.truncateText(rule.suggested_action, minified ? 100 : 200)}`);
        }
        
        sections.push('');
      }
    }

    // Metadata section (only in non-minified mode)
    if (!minified && data.metadata) {
      sections.push('## Generation Metadata\n');
      sections.push(`- **Generation Time**: ${data.metadata.generationTime || 0}ms`);
      sections.push(`- **Processing Steps**: ${(data.metadata.processingSteps || []).join(', ')}`);
      if (data.metadata.warnings && data.metadata.warnings.length > 0) {
        sections.push(`- **Warnings**: ${data.metadata.warnings.length}`);
        for (const warning of data.metadata.warnings) {
          sections.push(`  - ${warning}`);
        }
      }
      sections.push('');
    }

    return sections.join('\n');
  }
}

/**
 * Compressed Markdown adapter with minimal whitespace and content
 */
export class MarkdownCompressedAdapter extends BaseFormatAdapter {
  getFormatName(): string {
    return 'markdown-compressed';
  }

  format(data: ContextData, options: ContextGenerationOptions): string {
    const lines: string[] = [];
    
    // Compact title
    const queryText = this.extractQueryText(data.query);
    lines.push(`# ${queryText || 'Context'}`);
    lines.push('');

    // Compact component list
    if (data.components && data.components.length > 0) {
      lines.push('## Components');
      
      const sortedComponents = this.sortComponentsByRelevance(data.components);
      
      for (const component of sortedComponents) {
        const relevance = component.metadata?.relevanceScore 
          ? ` (${(component.metadata.relevanceScore * 100).toFixed(0)}%)`
          : '';
        
        lines.push(`**${component.name}** \`${component.type}\`${relevance}`);
        lines.push(`\`${component.filePath}\``);
        
        // Summary in one line
        if (component.metadata?.summary) {
          lines.push(this.truncateText(component.metadata.summary, 150));
        }

        // Minimal source code
        if (options.includeSourceCode !== false && component.sourceCode) {
          lines.push('```' + component.language);
          lines.push(this.truncateText(component.sourceCode, 300));
          lines.push('```');
        }
        
        lines.push('');
      }
    }

    // Compact relationships
    if (data.relationships && data.relationships.length > 0 && options.includeRelationships !== false) {
      lines.push('## Relationships');
      for (const rel of data.relationships) {
        lines.push(`${rel.sourceId} → ${rel.targetId} (${rel.type})`);
      }
      lines.push('');
    }

    // Compact rules
    if (data.applicableRules && data.applicableRules.length > 0) {
      lines.push('## Rules');
      for (const rule of data.applicableRules) {
        const confidence = rule.confidence ? ` ${(rule.confidence * 100).toFixed(0)}%` : '';
        lines.push(`**${rule.rule_type}**${confidence}: ${this.truncateText(rule.guidance_text || '', 200)}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}