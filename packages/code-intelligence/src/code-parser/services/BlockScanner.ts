/**
 * BlockScanner - Service for segmenting files into CodeBlocks using a universal
 * TextMate scope scanner with detector-based fallback.
 *
 * This service handles:
 * - Loading and applying detector rules from detectors.yml
 * - Clustering and merging detector-derived segments
 * - Producing CodeBlocks with absolute line/byte ranges and confidence scores
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import { UniversalScopeScanner } from './UniversalScopeScanner.js';

export interface CodeBlock {
  language: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  startByte: number;
  endByte: number;
  confidence: number;
  source: 'detector' | 'merged' | 'textmate';
  metadata?: {
    kind?: string;
    name?: string;
    scope?: string;
    pattern?: string;
    detector?: string;
    priority?: number;
    isEmbedded?: boolean;
    isGapFill?: boolean;
    [key: string]: any;  // Allow additional properties
  };
}

export interface SegmentationResult {
  blocks: CodeBlock[];
  metadata: {
    backend: 'detectors-only' | 'textmate' | 'textmate-hybrid';
    confidence: number;
    detectorsUsed: string[];
    languagesDetected?: string[];
    processingTimeMs: number;
  };
}

interface DetectorRule {
  pattern: string;
  language: string;
  confidence: number;
  priority: number;
  block_start?: string;
  block_end?: string;
  extract_content?: boolean;
  content_group?: number;
  multiline?: boolean;
}

interface DetectorConfig {
  shebangs?: DetectorRule[];
  markdown_fences?: DetectorRule[];
  mdx_blocks?: DetectorRule[];
  html_scripts?: DetectorRule[];
  html_styles?: DetectorRule[];
  vue_sfc?: DetectorRule[];
  php_blocks?: DetectorRule[];
  sql_heredocs?: DetectorRule[];
  shell_heredocs?: DetectorRule[];
  templating?: DetectorRule[];
  css_in_js?: DetectorRule[];
  graphql_queries?: DetectorRule[];
  yaml_frontmatter?: DetectorRule[];
  json_blocks?: DetectorRule[];
  multiline_config?: {
    max_lines: number;
    timeout_ms: number;
  };
  confidence_thresholds?: {
    high: number;
    medium: number;
    low: number;
  };
  language_mappings?: Record<string, string>;
}

export class BlockScanner {
  private static instance: BlockScanner | null = null;
  private detectorConfig: DetectorConfig | null = null;
  constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): BlockScanner {
    if (!this.instance) {
      this.instance = new BlockScanner();
    }
    return this.instance;
  }

  /**
   * Scan a file and return code blocks
   */
  async scanFile(filePath: string, content?: string): Promise<SegmentationResult> {
    const startTime = Date.now();

    // Read content if not provided
    if (!content) {
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch (error) {
        throw new Error(`Failed to read file ${filePath}: ${error}`);
      }
    }

    // Try universal TextMate scope scanner first
    try {
      const scope = await UniversalScopeScanner.getInstance().scanFile(filePath, content);
      if (scope && scope.blocks.length > 0) {
        return {
          blocks: scope.blocks,
          metadata: {
            backend: 'textmate',
            confidence: this.calculateOverallConfidence(scope.blocks),
            languagesDetected: scope.languagesDetected,
            detectorsUsed: [],
            processingTimeMs: Date.now() - startTime
          }
        };
      }
    } catch (e) {
      console.debug('Universal scope scanner failed, falling back to detectors:', e);
    }

    // Load detector config if not already loaded
    if (!this.detectorConfig) {
      await this.loadDetectorConfig();
    }

    // Run detectors
    const detectorBlocks = await this.runDetectors(filePath, content);

    const mergedBlocks = detectorBlocks;
    const backend: SegmentationResult['metadata']['backend'] = mergedBlocks.length > 0 ? 'detectors-only' : 'textmate';

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(mergedBlocks);

    const processingTimeMs = Date.now() - startTime;

    return {
      blocks: mergedBlocks,
      metadata: {
        backend,
        confidence,
        detectorsUsed: this.getUsedDetectors(mergedBlocks),
        processingTimeMs
      }
    };
  }

  /**
   * Load detector configuration from YAML file
   */
  private async loadDetectorConfig(): Promise<void> {
    try {
      // Resolve both dist and src locations relative to this file, independent of cwd
      const currentDir = dirname(fileURLToPath(import.meta.url)); // .../dist/code-parser/services
      const distRoot = join(currentDir, '..', '..');             // .../dist
      const srcRoot = join(distRoot, '..', 'src');               // .../src
      const candidates = [
        join(distRoot, 'code-parser', 'resources', 'detectors.yml'),
        join(srcRoot, 'code-parser', 'resources', 'detectors.yml')
      ];

      let pathFound = '';
      for (const p of candidates) { try { readFileSync(p); pathFound = p; break; } catch {} }
      if (!pathFound) throw new Error('detectors.yml not found');

      const yamlContent = readFileSync(pathFound, 'utf-8');
      this.detectorConfig = yaml.load(yamlContent) as DetectorConfig;
    } catch (error) {
      console.warn('Failed to load detector config, using minimal fallback:', error);
      this.detectorConfig = this.getMinimalDetectorConfig();
    }
  }

  /**
   * Estimate the end line of a code block
   */
  private estimateBlockEnd(startLine: number, lines: string[], kind: string): number {
    const maxLookAhead = kind === 'class' ? 200 : 50;
    let braceCount = 0;
    let inFunction = false;

    for (let i = startLine - 1; i < Math.min(lines.length, startLine - 1 + maxLookAhead); i++) {
      const line = lines[i];

      // Count braces for block detection
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          inFunction = true;
        } else if (char === '}') {
          braceCount--;
          if (inFunction && braceCount === 0) {
            return i + 1;
          }
        }
      }

      // For Python, look for unindented lines
      if (kind === 'function' && inFunction) {
        const indentMatch = line.match(/^(\s*)/);
        const currentIndent = indentMatch ? indentMatch[1].length : 0;

        if (line.trim() && currentIndent === 0 && i > startLine) {
          return i;
        }
      }
    }

    return Math.min(startLine + 20, lines.length); // Fallback
  }

  /**
   * Run detector rules on file content
   */
  private async runDetectors(filePath: string, content: string): Promise<CodeBlock[]> {
    if (!this.detectorConfig) {
      return [];
    }

    const blocks: CodeBlock[] = [];
    const lines = content.split('\n');

    // Apply each detector category
    const detectorCategories = [
      'shebangs', 'markdown_fences', 'mdx_blocks', 'html_scripts',
      'html_styles', 'vue_sfc', 'php_blocks', 'sql_heredocs',
      'shell_heredocs', 'templating', 'css_in_js', 'graphql_queries',
      'yaml_frontmatter', 'json_blocks'
    ];

    for (const category of detectorCategories) {
      const rules = this.detectorConfig[category as keyof DetectorConfig] as DetectorRule[] | undefined;
      if (!rules) continue;

      for (const rule of rules) {
        const detectedBlocks = this.applyDetectorRule(rule, content, lines, category);
        blocks.push(...detectedBlocks);
      }
    }

    // Sort by priority and confidence
    blocks.sort((a, b) => {
      const aPriority = a.metadata?.priority || 0;
      const bPriority = b.metadata?.priority || 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      return b.confidence - a.confidence;
    });

    return this.deduplicateDetectorBlocks(blocks);
  }

  /**
   * Apply a single detector rule
   */
  private applyDetectorRule(rule: DetectorRule, content: string, lines: string[], category: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];

    try {
      const flags = rule.multiline ? 'gm' : 'g';
      const regex = new RegExp(rule.pattern, flags);
      let match;

      while ((match = regex.exec(content)) !== null) {
        const startByte = match.index;
        const endByte = match.index + match[0].length;

        // Convert byte positions to line/column
        const startPos = this.byteToLineColumn(startByte, content);
        const endPos = this.byteToLineColumn(endByte, content);

        // Resolve language (handle capture groups)
        let language = rule.language;
        if (language.startsWith('$') && match.length > 1) {
          const groupIndex = parseInt(language.substring(1));
          language = match[groupIndex] || 'unknown';
        }

        // Normalize language name
        language = this.normalizeLanguage(language);

        const block: CodeBlock = {
          language,
          startLine: startPos.line,
          startColumn: startPos.column,
          endLine: endPos.line,
          endColumn: endPos.column,
          startByte,
          endByte,
          confidence: rule.confidence,
          source: 'detector',
          metadata: {
            detector: category,
            pattern: rule.pattern,
            priority: rule.priority
          }
        };

        blocks.push(block);

        // Prevent infinite loops
        if (!rule.multiline && regex.lastIndex === match.index) {
          regex.lastIndex++;
        }
      }
    } catch (error) {
      console.debug(`Detector rule failed for ${category}:`, error);
    }

    return blocks;
  }

  /**
   * Convert byte position to line/column
   */
  private byteToLineColumn(bytePos: number, content: string): { line: number; column: number } {
    const beforeByte = content.substring(0, bytePos);
    const lines = beforeByte.split('\n');

    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    };
  }

  /**
   * Normalize language name using mappings
   */
  private normalizeLanguage(language: string): string {
    if (!this.detectorConfig?.language_mappings) {
      return language.toLowerCase();
    }

    return this.detectorConfig.language_mappings[language.toLowerCase()] || language.toLowerCase();
  }

  /**
   * Remove duplicate detector blocks
   */
  private deduplicateDetectorBlocks(blocks: CodeBlock[]): CodeBlock[] {
    const seen = new Set<string>();
    const deduped: CodeBlock[] = [];

    for (const block of blocks) {
      const key = `${block.language}:${block.startLine}:${block.endLine}`;

      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(block);
      } else {
        // Keep the higher confidence block
        const existingIndex = deduped.findIndex(b =>
          b.language === block.language &&
          b.startLine === block.startLine &&
          b.endLine === block.endLine
        );

        if (existingIndex >= 0 && block.confidence > deduped[existingIndex].confidence) {
          deduped[existingIndex] = block;
        }
      }
    }

    return deduped;
  }

  /**
   * Calculate overall confidence for a set of blocks
   */
  private calculateOverallConfidence(blocks: CodeBlock[]): number {
    if (blocks.length === 0) return 0;

    const avgConfidence = blocks.reduce((sum, block) => sum + block.confidence, 0) / blocks.length;

    return avgConfidence;
  }

  /**
   * Get list of detector categories that were used
   */
  private getUsedDetectors(blocks: CodeBlock[]): string[] {
    const detectors = new Set<string>();

    for (const block of blocks) {
      if (block.metadata?.detector) {
        detectors.add(block.metadata.detector);
      }
    }

    return Array.from(detectors);
  }

  /**
   * Get minimal detector config as fallback
   */
  private getMinimalDetectorConfig(): DetectorConfig {
    return {
      shebangs: [
        { pattern: '^#!.*?/bin/bash', language: 'bash', confidence: 0.95, priority: 100 },
        { pattern: '^#!.*?/usr/bin/env\\s+python', language: 'python', confidence: 0.95, priority: 100 }
      ],
      confidence_thresholds: {
        high: 0.85,
        medium: 0.70,
        low: 0.50
      },
      language_mappings: {
        'js': 'javascript',
        'ts': 'typescript',
        'py': 'python'
      }
    };
  }
}

// Export default instance for convenience
export const blockScanner = BlockScanner.getInstance();
