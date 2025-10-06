/**
 * Content processor for code-related items
 */

import { BaseContentProcessor, type IReductionStrategy } from './interfaces.js';
import type { ContextItem, ContextData } from '../interfaces.js';
import { ComponentType } from '../types.js';

/**
 * Code block summarization strategy
 */
class CodeBlockSummarizer implements IReductionStrategy {
  name = 'summarizeCodeBlocks';
  description = 'Summarize large code blocks while preserving signatures';
  
  canApply(item: ContextItem): boolean {
    return !!item.code && item.code.length > 500;
  }
  
  apply(item: ContextItem, targetReduction: number): ContextItem {
    if (!item.code) return item;
    
    const lines = item.code.split('\n');
    const maxLines = Math.max(10, Math.floor(lines.length * (1 - targetReduction)));
    
    if (lines.length <= maxLines) return item;
    
    // Keep first 5 lines and last 3 lines
    const summarized = [
      ...lines.slice(0, 5),
      '// ... [code truncated] ...',
      ...lines.slice(-3)
    ].join('\n');
    
    return {
      ...item,
      code: summarized
    };
  }
}

/**
 * Documentation truncation strategy
 */
class DocStringTruncator implements IReductionStrategy {
  name = 'truncateDocumentation';
  description = 'Truncate long documentation and comments';
  
  canApply(item: ContextItem): boolean {
    return !!(item.metadata?.documentation || item.metadata?.description);
  }
  
  apply(item: ContextItem, targetReduction: number): ContextItem {
    if (!item.metadata) return item;
    
    const maxLength = Math.max(100, Math.floor(200 * (1 - targetReduction)));
    const truncated = { ...item, metadata: { ...item.metadata } };
    
    ['documentation', 'description', 'comment', 'docstring'].forEach(field => {
      if (typeof truncated.metadata![field] === 'string' && 
          truncated.metadata![field].length > maxLength) {
        truncated.metadata![field] = truncated.metadata![field].substring(0, maxLength) + '...';
      }
    });
    
    return truncated;
  }
}

/**
 * Preserve function/class signatures strategy
 */
class SignaturePreserver implements IReductionStrategy {
  name = 'preserveSignatures';
  description = 'Keep function and class signatures when reducing';
  
  canApply(item: ContextItem): boolean {
    return ['function', 'method', 'class', 'interface'].includes(item.type) && !!item.code;
  }
  
  apply(item: ContextItem, targetReduction: number): ContextItem {
    if (!item.code) return item;
    
    // Extract signature (first line for functions, first few for classes)
    const lines = item.code.split('\n');
    let signatureLines = 1;
    
    if (item.type === 'class' || item.type === 'interface') {
      // Find opening brace
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        signatureLines = i + 1;
        if (lines[i]?.includes('{')) break;
      }
    }
    
    const signature = lines.slice(0, signatureLines).join('\n');
    const reduced = {
      ...item,
      code: signature + '\n  // ... implementation truncated ...\n}'
    };
    
    return reduced;
  }
}

/**
 * Processor for code-related content
 */
export class CodeContentProcessor extends BaseContentProcessor {
  name = 'CodeContentProcessor';
  description = 'Handles code files, classes, functions, and programming constructs';
  supportedTypes = [
    ComponentType.CLASS,
    ComponentType.FUNCTION,
    ComponentType.METHOD,
    ComponentType.INTERFACE,
    ComponentType.VARIABLE,
    ComponentType.PROPERTY,
    ComponentType.ENUM,
    ComponentType.FILE,
    ComponentType.MODULE,
    ComponentType.NAMESPACE
  ];
  priority = 100;
  
  private strategies: IReductionStrategy[] = [
    new CodeBlockSummarizer(),
    new DocStringTruncator(),
    new SignaturePreserver()
  ];
  
  /**
   * Code-aware token estimation
   */
  estimateTokens(item: ContextItem): number {
    let tokens = super.estimateTokens(item);
    
    // Code typically has higher token density due to syntax
    if (item.code) {
      // Override base estimation with more accurate code-specific calculation
      const codeTokens = Math.ceil(item.code.length / 3.5); // Code is denser
      tokens = tokens - Math.ceil(item.code.length / 4) + codeTokens;
    }
    
    return tokens;
  }
  
  /**
   * Calculate priority based on code importance
   */
  calculatePriority(item: ContextItem, context: ContextData): number {
    let score = super.calculatePriority(item, context);
    
    // Type-based scoring (higher scores for more important types)
    const typeScores: Record<string, number> = {
      [ComponentType.CLASS]: 10.0,
      [ComponentType.INTERFACE]: 9.0,
      [ComponentType.FUNCTION]: 8.0,
      [ComponentType.METHOD]: 6.0,
      [ComponentType.ENUM]: 7.0,
      [ComponentType.MODULE]: 9.0,
      [ComponentType.NAMESPACE]: 8.0,
      [ComponentType.PROPERTY]: 5.0,
      [ComponentType.VARIABLE]: 4.0,
      [ComponentType.FILE]: 3.0
    };
    
    const typeScore = typeScores[item.type] || 1.0;
    score *= typeScore;
    
    // Boost exported/public items
    if (item.metadata?.isExported || item.metadata?.visibility === 'public') {
      score *= 1.5;
    }
    
    // Boost if has many relationships (highly connected)
    const relationshipCount = context.relationships.filter(rel =>
      rel.sourceId === item.id || rel.targetId === item.id
    ).length;
    if (relationshipCount > 5) score *= 1.2;
    
    return score;
  }
  
  /**
   * Check if code item can be reduced
   */
  canReduce(item: ContextItem): boolean {
    // Don't reduce if explicitly marked as critical
    if (item.metadata?.critical || item.metadata?.doNotReduce) {
      return false;
    }
    
    // Don't reduce tiny items
    if (item.code && item.code.length < 100) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Apply code-aware reduction
   */
  reduceContent(item: ContextItem, targetReduction: number): ContextItem {
    let reduced = { ...item };
    
    // Apply strategies in order
    for (const strategy of this.strategies) {
      if (strategy.canApply(reduced)) {
        reduced = strategy.apply(reduced, targetReduction);
        
        // Stop if we've achieved enough reduction
        const newTokens = this.estimateTokens(reduced);
        const originalTokens = this.estimateTokens(item);
        const actualReduction = 1 - (newTokens / originalTokens);
        
        if (actualReduction >= targetReduction * 0.9) {
          break;
        }
      }
    }
    
    return reduced;
  }
  
  getReductionStrategies(): IReductionStrategy[] {
    return this.strategies;
  }
}