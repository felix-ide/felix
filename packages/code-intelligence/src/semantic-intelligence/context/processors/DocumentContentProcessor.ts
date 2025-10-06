/**
 * Content processor for document-related items
 */

import { BaseContentProcessor, type IReductionStrategy } from './interfaces.js';
import type { ContextItem, ContextData } from '../interfaces.js';

/**
 * Paragraph summarization strategy
 */
class ParagraphSummarizer implements IReductionStrategy {
  name = 'summarizeParagraphs';
  description = 'Summarize long paragraphs while preserving key information';
  
  canApply(item: ContextItem): boolean {
    return !!item.content && item.content.length > 500;
  }
  
  apply(item: ContextItem, targetReduction: number): ContextItem {
    if (!item.content) return item;
    
    const paragraphs = item.content.split(/\n\n+/);
    const targetParagraphs = Math.max(1, Math.floor(paragraphs.length * (1 - targetReduction)));
    
    if (paragraphs.length <= targetParagraphs) return item;
    
    // Keep first and last paragraphs, sample from middle
    const kept: string[] = [];
    if (targetParagraphs >= 2) {
      if (paragraphs[0]) kept.push(paragraphs[0]); // Introduction
      
      // Sample middle paragraphs
      const middleCount = targetParagraphs - 2;
      const step = Math.floor((paragraphs.length - 2) / middleCount);
      for (let i = 0; i < middleCount; i++) {
        const para = paragraphs[1 + i * step];
        if (para) kept.push(para);
      }
      
      const lastPara = paragraphs[paragraphs.length - 1];
      if (lastPara) kept.push(lastPara); // Conclusion
    } else {
      // Just keep the first paragraph
      if (paragraphs[0]) kept.push(paragraphs[0]);
    }
    
    return {
      ...item,
      content: kept.join('\n\n') + '\n\n[... content truncated ...]'
    };
  }
}

/**
 * Preserve headings strategy
 */
class HeadingPreserver implements IReductionStrategy {
  name = 'preserveHeadings';
  description = 'Keep document structure by preserving headings';
  
  canApply(item: ContextItem): boolean {
    return !!item.content && /^#{1,6}\s/m.test(item.content);
  }
  
  apply(item: ContextItem, targetReduction: number): ContextItem {
    if (!item.content) return item;
    
    const lines = item.content.split('\n');
    const outline: string[] = [];
    let lastHeadingIndex = -1;
    
    lines.forEach((line, index) => {
      if (/^#{1,6}\s/.test(line)) {
        // Add heading
        outline.push(line);
        
        // Add first paragraph after heading (if exists)
        for (let i = index + 1; i < lines.length; i++) {
          const nextLine = lines[i]?.trim();
          if (nextLine && !nextLine.startsWith('#')) {
            outline.push(nextLine.substring(0, 200) + (nextLine.length > 200 ? '...' : ''));
            break;
          }
        }
        
        lastHeadingIndex = index;
      }
    });
    
    if (outline.length === 0) {
      // No headings found, fall back to simple truncation
      return item;
    }
    
    return {
      ...item,
      content: outline.join('\n\n')
    };
  }
}

/**
 * List truncation strategy
 */
class ListTruncator implements IReductionStrategy {
  name = 'truncateLists';
  description = 'Truncate long lists while showing examples';
  
  canApply(item: ContextItem): boolean {
    return !!item.content && /^[\*\-\+]\s/m.test(item.content);
  }
  
  apply(item: ContextItem, targetReduction: number): ContextItem {
    if (!item.content) return item;
    
    const lines = item.content.split('\n');
    const processed: string[] = [];
    let inList = false;
    let listItems: string[] = [];
    const maxListItems = Math.max(3, Math.floor(10 * (1 - targetReduction)));
    
    const flushList = () => {
      if (listItems.length > maxListItems) {
        processed.push(...listItems.slice(0, maxListItems));
        processed.push(`... and ${listItems.length - maxListItems} more items`);
      } else {
        processed.push(...listItems);
      }
      listItems = [];
      inList = false;
    };
    
    lines.forEach(line => {
      if (/^[\*\-\+]\s/.test(line)) {
        inList = true;
        listItems.push(line);
      } else {
        if (inList) flushList();
        processed.push(line);
      }
    });
    
    if (inList) flushList();
    
    return {
      ...item,
      content: processed.join('\n')
    };
  }
}

/**
 * Processor for document content
 */
export class DocumentContentProcessor extends BaseContentProcessor {
  name = 'DocumentContentProcessor';
  description = 'Handles documents, articles, markdown files, and text content';
  supportedTypes = [
    'document',
    'article',
    'section',
    'paragraph',
    'chapter',
    'page',
    'markdown',
    'text',
    'note',
    'readme'
  ];
  priority = 90;
  
  private strategies: IReductionStrategy[] = [
    new HeadingPreserver(),
    new ParagraphSummarizer(),
    new ListTruncator()
  ];
  
  /**
   * Document-aware token estimation
   */
  estimateTokens(item: ContextItem): number {
    let tokens = super.estimateTokens(item);
    
    // Documents typically have natural language with lower token density
    if (item.content) {
      // Override base estimation with document-specific calculation
      const contentTokens = Math.ceil(item.content.length / 4.5); // Natural language is less dense
      tokens = tokens - Math.ceil(item.content.length / 4) + contentTokens;
    }
    
    return tokens;
  }
  
  /**
   * Calculate priority based on document structure
   */
  calculatePriority(item: ContextItem, context: ContextData): number {
    let score = super.calculatePriority(item, context);
    
    // Type-based scoring
    const typeScores: Record<string, number> = {
      'document': 8.0,
      'chapter': 7.0,
      'section': 6.0,
      'article': 5.0,
      'page': 5.0,
      'paragraph': 3.0,
      'note': 4.0,
      'readme': 9.0, // README files are usually important
      'markdown': 4.0,
      'text': 2.0
    };
    
    const typeScore = typeScores[item.type] || 1.0;
    score *= typeScore;
    
    // Boost if it's a heading/title
    if (item.metadata?.isHeading || item.metadata?.level) {
      score *= 2.0;
    }
    
    // Boost if it's an introduction or summary
    if (item.metadata?.isIntroduction || item.metadata?.isSummary) {
      score *= 1.5;
    }
    
    // Boost if has table of contents
    if (item.content && item.content.includes('## Table of Contents')) {
      score *= 1.3;
    }
    
    return score;
  }
  
  /**
   * Apply document-aware reduction
   */
  reduceContent(item: ContextItem, targetReduction: number): ContextItem {
    let reduced = { ...item };
    
    // Apply strategies in order of preference
    for (const strategy of this.strategies) {
      if (strategy.canApply(reduced)) {
        reduced = strategy.apply(reduced, targetReduction);
        
        // Check if we've achieved enough reduction
        const newTokens = this.estimateTokens(reduced);
        const originalTokens = this.estimateTokens(item);
        const actualReduction = 1 - (newTokens / originalTokens);
        
        if (actualReduction >= targetReduction * 0.9) {
          break;
        }
      }
    }
    
    // Fall back to simple truncation if needed
    if (reduced.content && reduced.content === item.content) {
      const targetLength = Math.floor(item.content.length * (1 - targetReduction));
      reduced.content = item.content.substring(0, targetLength) + '\n\n[... truncated ...]';
    }
    
    return reduced;
  }
  
  getReductionStrategies(): IReductionStrategy[] {
    return this.strategies;
  }
}