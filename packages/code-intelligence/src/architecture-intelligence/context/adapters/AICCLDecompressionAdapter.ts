/**
 * AICCL Decompression Adapter - Expands compressed AICCL format back to readable formats
 * 
 * Takes AICCL compressed context and expands it to:
 * - Human-readable markdown
 * - Structured JSON
 * - Original context data structure
 */

import type { ContextData, ContextGenerationOptions } from '../types.js';
import { BaseFormatAdapter } from './IFormatAdapter.js';

interface ParsedAICCL {
  filePaths: Record<string, string>;
  compressionMap: {
    types: Record<string, string>;
    operations: Record<string, string>;
    patterns: Record<string, string>;
  };
  systems: Array<{
    id: string;
    name: string;
    summary?: string;
    relevance?: number;
    fileId: string;
    location?: string;
    type: string;
    signature: string;
  }>;
  compressedCode: Array<{
    fileId: string;
    componentName: string;
    code: string;
  }>;
  relationships: Array<{
    source: string;
    target: string;
    type: string;
    confidence?: number;
  }>;
  rules: Array<{
    id: string;
    type: string;
    confidence?: number;
    guidance?: string;
    why?: string;
  }>;
  flows: Record<string, string[]>;
}

export class AICCLDecompressionAdapter extends BaseFormatAdapter {
  getFormatName(): string {
    return 'aiccl-decompression';
  }

  format(data: ContextData, options: ContextGenerationOptions): string {
    // This adapter expects the input to be AICCL compressed format in data.content
    const aiccl = this.parseAICCL((data as any).content || '');
    
    const outputFormat = options.outputFormat || 'markdown';
    
    switch (outputFormat) {
      case 'json':
        return this.expandToJSON(aiccl);
      case 'markdown':
      default:
        return this.expandToMarkdown(aiccl);
    }
  }

  /**
   * Parse AICCL compressed format into structured data
   */
  private parseAICCL(content: string): ParsedAICCL {
    const sections = this.splitIntoSections(content);
    
    return {
      filePaths: this.parseFilePaths(sections['FILE_PATHS'] || ''),
      compressionMap: this.parseCompressionMap(sections['COMPRESSION_MAP'] || ''),
      systems: this.parseSystems(sections['SYSTEMS'] || ''),
      compressedCode: this.parseCompressedCode(sections['COMPRESSED_CODE'] || ''),
      relationships: this.parseRelationships(sections['RELATIONSHIPS'] || ''),
      rules: this.parseRules(sections['RULES'] || ''),
      flows: this.parseFlows(sections['FLOWS'] || '')
    };
  }

  private splitIntoSections(content: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = content.split('\n');
    
    let currentSection = '';
    let currentContent: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n');
        }
        currentSection = line.substring(2);
        currentContent = [];
      } else if (line.trim()) {
        currentContent.push(line);
      }
    }
    
    if (currentSection) {
      sections[currentSection] = currentContent.join('\n');
    }
    
    return sections;
  }

  private parseFilePaths(content: string): Record<string, string> {
    const filePaths: Record<string, string> = {};
    
    content.split('\n').forEach(line => {
      const match = line?.match(/^(F\d+):(.+)$/);
      if (match && match[1] && match[2]) {
        filePaths[match[1]] = match[2];
      }
    });
    
    return filePaths;
  }

  private parseCompressionMap(content: string): ParsedAICCL['compressionMap'] {
    const map = {
      types: {} as Record<string, string>,
      operations: {} as Record<string, string>,
      patterns: {} as Record<string, string>
    };
    
    content.split('\n').forEach(line => {
      if (!line.includes('=')) return;
      
      line.split('|').forEach(mapping => {
        const [short, full] = mapping.split('=');
        if (short && full) {
          // Categorize based on common patterns
          if (['c', 'f', 'm', 'p', 'i', 'v', 's', 'n', 'b', 'P', 'A', 'O'].includes(short)) {
            map.types[short] = full;
          } else if (['a', 'w', 'r', 't', 'exp', 'imp', '?', ':'].includes(short)) {
            map.operations[short] = full;
          } else {
            map.patterns[short] = full;
          }
        }
      });
    });
    
    return map;
  }

  private parseSystems(content: string): ParsedAICCL['systems'] {
    const systems: ParsedAICCL['systems'] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i += 2) {
      const headerLine = lines[i];
      const detailLine = lines[i + 1];
      
      if (!headerLine || !detailLine) continue;
      
      const headerMatch = headerLine?.match(/^(S\d+):([^|]+)(?:\|([^|]+))?(?:\|(.+))?$/);
      const detailMatch = detailLine?.match(/^([^>]+)(?:>([^:]+))?:([^{]+)\{([^}]*)\}$/);
      
      if (headerMatch && detailMatch) {
        systems.push({
          id: headerMatch[1] || '',
          name: headerMatch[2] || '',
          summary: headerMatch[3],
          relevance: headerMatch[4] ? parseFloat(headerMatch[4].replace('%', '')) : undefined,
          fileId: detailMatch[1] || '',
          location: detailMatch[2],
          type: detailMatch[3] || '',
          signature: detailMatch[4] || ''
        });
      }
    }
    
    return systems;
  }

  private parseCompressedCode(content: string): ParsedAICCL['compressedCode'] {
    const code: ParsedAICCL['compressedCode'] = [];
    
    content.split('\n').forEach(line => {
      const match = line?.match(/^([^>]+)>([^:]+):(.+)$/);
      if (match) {
        code.push({
          fileId: match[1] || '',
          componentName: match[2] || '',
          code: match[3] || ''
        });
      }
    });
    
    return code;
  }

  private parseRelationships(content: string): ParsedAICCL['relationships'] {
    const relationships: ParsedAICCL['relationships'] = [];
    
    content.split('\n').forEach(line => {
      const match = line?.match(/^([^>]+)>([^:]+):([^|]+)(?:\|(.+))?$/);
      if (match) {
        relationships.push({
          source: match[1] || '',
          target: match[2] || '',
          type: match[3] || '',
          confidence: match[4] ? parseFloat(match[4].replace('%', '')) : undefined
        });
      }
    });
    
    return relationships;
  }

  private parseRules(content: string): ParsedAICCL['rules'] {
    const rules: ParsedAICCL['rules'] = [];
    
    content.split('\n').forEach(line => {
      const match = line?.match(/^(R\d+):([^|]+)(?:\|([^|]+))?(?:\|([^|]+))?(?:\|(.+))?$/);
      if (match) {
        rules.push({
          id: match[1] || '',
          type: match[2] || '',
          confidence: match[3] ? parseFloat(match[3].replace('%', '')) : undefined,
          guidance: match[4],
          why: match[5]
        });
      }
    });
    
    return rules;
  }

  private parseFlows(content: string): Record<string, string[]> {
    const flows: Record<string, string[]> = {};
    
    content.split('\n').forEach(line => {
      const match = line?.match(/^([^:]+):\s*(.+)$/);
      if (match && match[1] && match[2]) {
        flows[match[1]] = match[2].split('>').map(s => s.trim());
      }
    });
    
    return flows;
  }

  /**
   * Expand to human-readable markdown
   */
  private expandToMarkdown(aiccl: ParsedAICCL): string {
    const sections: string[] = [];
    
    // Title
    sections.push('# Expanded AICCL Context\n');
    
    // Summary
    sections.push('## Summary\n');
    sections.push(`- **Files**: ${Object.keys(aiccl.filePaths).length}`);
    sections.push(`- **Components**: ${aiccl.systems.length}`);
    sections.push(`- **Relationships**: ${aiccl.relationships.length}`);
    sections.push(`- **Rules**: ${aiccl.rules.length}`);
    sections.push(`- **Flows**: ${Object.keys(aiccl.flows).length}\n`);
    
    // Compression mappings
    if (Object.keys(aiccl.compressionMap.types).length > 0) {
      sections.push('## Compression Mappings\n');
      sections.push('### Type Mappings');
      Object.entries(aiccl.compressionMap.types).forEach(([short, full]) => {
        sections.push(`- \`${short}\` = ${full}`);
      });
      sections.push('');
      
      if (Object.keys(aiccl.compressionMap.operations).length > 0) {
        sections.push('### Operation Mappings');
        Object.entries(aiccl.compressionMap.operations).forEach(([short, full]) => {
          sections.push(`- \`${short}\` = ${full}`);
        });
        sections.push('');
      }
      
      if (Object.keys(aiccl.compressionMap.patterns).length > 0) {
        sections.push('### Pattern Mappings');
        Object.entries(aiccl.compressionMap.patterns).forEach(([short, full]) => {
          sections.push(`- \`${short}\` = ${full}`);
        });
        sections.push('');
      }
    }
    
    // Components
    if (aiccl.systems.length > 0) {
      sections.push('## Components\n');
      
      aiccl.systems.forEach(system => {
        const filePath = aiccl.filePaths[system.fileId] || system.fileId;
        const expandedType = this.expandCompressedText(system.type, aiccl.compressionMap);
        const expandedName = this.expandCompressedText(system.name, aiccl.compressionMap);
        const expandedSignature = this.expandCompressedText(system.signature, aiccl.compressionMap);
        
        sections.push(`### ${expandedName} (${expandedType})`);
        sections.push(`**Path**: \`${filePath}\``);
        
        if (system.location) {
          sections.push(`**Location**: Lines ${system.location}`);
        }
        
        if (system.relevance !== undefined) {
          sections.push(`**Relevance**: ${system.relevance.toFixed(1)}%`);
        }
        
        if (system.summary) {
          const expandedSummary = this.expandCompressedText(system.summary, aiccl.compressionMap);
          sections.push(`**Summary**: ${expandedSummary}`);
        }
        
        if (expandedSignature) {
          sections.push(`**Signature**: \`${expandedSignature}\``);
        }
        
        // Add expanded code if available
        const codeEntry = aiccl.compressedCode.find(c => 
          c.fileId === system.fileId && c.componentName === system.name
        );
        if (codeEntry) {
          const expandedCode = this.expandCompressedText(codeEntry.code, aiccl.compressionMap);
          sections.push('\n**Expanded Code**:');
          sections.push('```typescript');
          sections.push(expandedCode);
          sections.push('```');
        }
        
        sections.push('');
      });
    }
    
    // Relationships
    if (aiccl.relationships.length > 0) {
      sections.push('## Relationships\n');
      
      aiccl.relationships.forEach(rel => {
        const sourceSystem = aiccl.systems.find(s => s.id === rel.source);
        const targetSystem = aiccl.systems.find(s => s.id === rel.target);
        const sourceName = sourceSystem ? sourceSystem.name : rel.source;
        const targetName = targetSystem ? targetSystem.name : rel.target;
        
        const confidence = rel.confidence ? ` (${rel.confidence.toFixed(0)}% confidence)` : '';
        sections.push(`- **${sourceName}** → **${targetName}** (${rel.type})${confidence}`);
      });
      sections.push('');
    }
    
    // Rules
    if (aiccl.rules.length > 0) {
      sections.push('## Applicable Rules\n');
      
      aiccl.rules.forEach(rule => {
        sections.push(`### ${rule.type.toUpperCase()}: ${rule.id}`);
        
        if (rule.confidence !== undefined) {
          sections.push(`**Confidence**: ${rule.confidence.toFixed(0)}%`);
        }
        
        if (rule.guidance) {
          const expandedGuidance = this.expandCompressedText(rule.guidance, aiccl.compressionMap);
          sections.push(`**Guidance**: ${expandedGuidance}`);
        }
        
        if (rule.why) {
          const expandedWhy = this.expandCompressedText(rule.why, aiccl.compressionMap);
          sections.push(`**Why Applicable**: ${expandedWhy}`);
        }
        
        sections.push('');
      });
    }
    
    // Execution flows
    if (Object.keys(aiccl.flows).length > 0) {
      sections.push('## Execution Flows\n');
      
      Object.entries(aiccl.flows).forEach(([flowName, flow]) => {
        const expandedFlowName = this.expandCompressedText(flowName, aiccl.compressionMap);
        const expandedFlow = flow.map(step => {
          const system = aiccl.systems.find(s => s.id === step);
          return system ? system.name : step;
        }).join(' → ');
        
        sections.push(`### ${expandedFlowName}`);
        sections.push(expandedFlow);
        sections.push('');
      });
    }
    
    return sections.join('\n');
  }

  /**
   * Expand to structured JSON
   */
  private expandToJSON(aiccl: ParsedAICCL): string {
    const expanded = {
      metadata: {
        format: 'aiccl-expanded',
        timestamp: Date.now(),
        compressionStats: {
          files: Object.keys(aiccl.filePaths).length,
          components: aiccl.systems.length,
          relationships: aiccl.relationships.length,
          rules: aiccl.rules.length,
          flows: Object.keys(aiccl.flows).length
        }
      },
      compressionMappings: aiccl.compressionMap,
      files: Object.entries(aiccl.filePaths).map(([id, path]) => ({
        id,
        path,
        components: aiccl.systems.filter(s => s.fileId === id).map(s => s.id)
      })),
      components: aiccl.systems.map(system => ({
        id: system.id,
        name: this.expandCompressedText(system.name, aiccl.compressionMap),
        type: this.expandCompressedText(system.type, aiccl.compressionMap),
        filePath: aiccl.filePaths[system.fileId] || system.fileId,
        location: system.location,
        relevanceScore: system.relevance ? system.relevance / 100 : undefined,
        summary: system.summary ? this.expandCompressedText(system.summary, aiccl.compressionMap) : undefined,
        signature: system.signature ? this.expandCompressedText(system.signature, aiccl.compressionMap) : undefined,
        expandedCode: this.getExpandedCodeForComponent(system, aiccl)
      })),
      relationships: aiccl.relationships.map(rel => ({
        sourceId: rel.source,
        targetId: rel.target,
        type: rel.type,
        confidence: rel.confidence ? rel.confidence / 100 : undefined
      })),
      applicableRules: aiccl.rules.map(rule => ({
        rule_id: rule.id,
        rule_type: rule.type,
        confidence: rule.confidence ? rule.confidence / 100 : undefined,
        guidance_text: rule.guidance ? this.expandCompressedText(rule.guidance, aiccl.compressionMap) : undefined,
        why_applicable: rule.why ? this.expandCompressedText(rule.why, aiccl.compressionMap) : undefined
      })),
      executionFlows: Object.entries(aiccl.flows).map(([name, flow]) => ({
        name: this.expandCompressedText(name, aiccl.compressionMap),
        steps: flow,
        expandedSteps: flow.map(step => {
          const system = aiccl.systems.find(s => s.id === step);
          return system ? system.name : step;
        })
      }))
    };
    
    return JSON.stringify(expanded, null, 2);
  }

  /**
   * Expand to original ContextData structure
   */
  private expandToContextData(aiccl: ParsedAICCL): ContextData {
    return {
      components: aiccl.systems.map(system => ({
        id: system.id,
        name: this.expandCompressedText(system.name, aiccl.compressionMap),
        type: this.expandCompressedText(system.type, aiccl.compressionMap) as any,
        language: 'typescript', // Default, could be inferred
        filePath: aiccl.filePaths[system.fileId] || system.fileId,
        location: {
          startLine: 1,
          endLine: 1,
          startColumn: 0,
          endColumn: 0
        },
        metadata: {
          relevanceScore: system.relevance ? system.relevance / 100 : undefined,
          summary: system.summary ? this.expandCompressedText(system.summary, aiccl.compressionMap) : undefined
        }
      })),
      relationships: aiccl.relationships.map(rel => ({
        id: `${rel.source}_${rel.target}_${rel.type}`,
        sourceId: rel.source,
        targetId: rel.target,
        type: rel.type as any,
        metadata: {
          confidence: rel.confidence ? rel.confidence / 100 : undefined
        }
      })),
      applicableRules: aiccl.rules.map(rule => ({
        rule_id: rule.id,
        rule_type: rule.type,
        confidence: rule.confidence ? rule.confidence / 100 : 0.5,
        guidance_text: rule.guidance ? this.expandCompressedText(rule.guidance, aiccl.compressionMap) : '',
        why_applicable: rule.why ? this.expandCompressedText(rule.why, aiccl.compressionMap) : ''
      })),
      query: {},
      timestamp: Date.now(),
      source: {
        totalComponents: aiccl.systems.length,
        totalRelationships: aiccl.relationships.length
      },
      metadata: {
        generationTime: 0,
        processingSteps: ['aiccl-decompression'],
        warnings: []
      }
    };
  }

  private expandCompressedText(text: string | undefined, compressionMap: ParsedAICCL['compressionMap']): string {
    if (!text) return '';
    
    let expanded = text;
    
    // Expand patterns first (longest first to avoid partial matches)
    const allMappings = {
      ...compressionMap.patterns,
      ...compressionMap.operations,
      ...compressionMap.types
    };
    
    const sortedMappings = Object.entries(allMappings)
      .sort(([a], [b]) => b.length - a.length);
    
    sortedMappings.forEach(([short, full]) => {
      expanded = expanded.replace(new RegExp(`\\b${short}\\b`, 'g'), full);
    });
    
    return expanded;
  }

  private getExpandedCodeForComponent(system: ParsedAICCL['systems'][0], aiccl: ParsedAICCL): string | undefined {
    const codeEntry = aiccl.compressedCode.find(c => 
      c.fileId === system.fileId && c.componentName === system.name
    );
    
    if (!codeEntry) return undefined;
    
    return this.expandCompressedText(codeEntry.code, aiccl.compressionMap);
  }

  private parseLocation(location: string | undefined): { startLine: number; endLine: number } | undefined {
    if (!location) return undefined;
    const match = location.match(/(\d+)-(\d+)/);
    if (match && match[1] && match[2]) {
      return {
        startLine: parseInt(match[1]),
        endLine: parseInt(match[2])
      };
    }
    return undefined;
  }
}