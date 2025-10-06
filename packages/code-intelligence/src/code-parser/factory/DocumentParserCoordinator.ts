import { readFileSync } from 'fs';
import type { ILanguageParser } from '../interfaces/ILanguageParser.js';
import type { IComponent, IRelationship } from '../types.js';
import type { SegmentationResult } from '../services/BlockScanner.js';
import type { LinkingResult, InitialRelationship } from '../services/InitialLinker.js';
import type { AggregatedRelationship, RelationshipAggregator } from '../services/RelationshipAggregator.js';
import type { InitialLinker } from '../services/InitialLinker.js';
import type { BlockScanner } from '../services/BlockScanner.js';
import { Relationship } from '../../code-analysis-types/components/Relationship.js';
import type { LanguageDetectionResult } from './LanguageDetector.js';
import type { ParseDocumentOptions, DocumentParsingResult } from './types.js';

interface Dependencies {
  blockScanner: BlockScanner;
  initialLinker: InitialLinker;
  relationshipAggregator: RelationshipAggregator;
  detectLanguage(filePath: string, content?: string): LanguageDetectionResult | null;
  detectPrimaryLanguage(filePath: string, content: string): string;
  getParser(language: string): ILanguageParser | null;
  readFile?(filePath: string): string;
}

interface InternalOptions extends ParseDocumentOptions {
  enableSegmentation: boolean;
  enableInitialLinking: boolean;
  enableAggregation: boolean;
  confidenceThreshold: number;
  _startTimeMs: number;
}

interface ParseContext {
  filePath: string;
  content: string;
  options: InternalOptions;
}

export class DocumentParserCoordinator {
  private readonly readFile: (filePath: string) => string;

  constructor(private readonly deps: Dependencies) {
    this.readFile = deps.readFile ?? ((path) => readFileSync(path, 'utf-8'));
  }

  async parseDocument(filePath: string, content?: string, options: ParseDocumentOptions = {}): Promise<DocumentParsingResult> {
    const ctx = await this.prepareContext(filePath, content, options);
    const { relationshipAggregator } = this.deps;

    relationshipAggregator.clear();

    const segmentation = await this.getSegmentation(ctx);
    const primaryParse = await this.runPrimaryParse(ctx, segmentation);

    const linking = await this.extractInitialRelationships(ctx);
    const aggregatedRelationships = this.aggregateRelationships(
      primaryParse.relationships,
      linking.relationships,
      primaryParse.parsingLevel,
      ctx.options.confidenceThreshold
    );

    const processingTimeMs = Date.now() - ctx.options._startTimeMs;

    return {
      components: primaryParse.components,
      relationships: aggregatedRelationships,
      segmentation,
      linking,
      metadata: {
        filePath,
        totalBlocks: segmentation.blocks.length,
        languagesDetected: Array.from(primaryParse.languagesDetected),
        parsingLevel: primaryParse.parsingLevel,
        backend: this.determineBackend(segmentation.metadata.backend, primaryParse.parsingMethods),
        processingTimeMs,
        warnings: primaryParse.warnings,
        segmentation: {
          backend: segmentation.metadata.backend,
          confidence: segmentation.metadata.confidence
        }
      }
    };
  }

  private async prepareContext(filePath: string, content: string | undefined, options: ParseDocumentOptions): Promise<ParseContext> {
    const opts: InternalOptions = {
      enableSegmentation: options.enableSegmentation ?? true,
      enableInitialLinking: options.enableInitialLinking ?? true,
      enableAggregation: options.enableAggregation ?? true,
      confidenceThreshold: options.confidenceThreshold ?? 0.5,
      workspaceRoot: options.workspaceRoot,
      forceParser: options.forceParser,
      segmentationOnly: options.segmentationOnly,
      _startTimeMs: Date.now()
    };

    const resolvedContent = content ?? this.readFile(filePath);

    return { filePath, content: resolvedContent, options: opts };
  }

  private async getSegmentation(ctx: ParseContext): Promise<SegmentationResult> {
    const { options, filePath, content } = ctx;

    if (!options.enableSegmentation) {
      return {
        blocks: [{
          language: this.deps.detectLanguage(filePath, content)?.language || 'unknown',
          startLine: 1,
          startColumn: 1,
          endLine: content.split('\n').length,
          endColumn: 1,
          startByte: 0,
          endByte: Buffer.byteLength(content, 'utf8'),
          confidence: 0.8,
          source: 'detector'
        }],
        metadata: {
          backend: 'detectors-only',
          confidence: 0.8,
          detectorsUsed: ['fallback'],
          processingTimeMs: 0
        }
      };
    }

    return this.deps.blockScanner.scanFile(filePath, content);
  }

  private async runPrimaryParse(ctx: ParseContext, segmentation: SegmentationResult) {
    const { filePath, content, options } = ctx;
    const languagesDetected = new Set<string>();
    const parsingMethods: string[] = [];
    const warnings: string[] = [];
    const components: IComponent[] = [];
    const relationships: IRelationship[] = [];

    segmentation.blocks.forEach(block => {
      if (block.language && block.language !== 'unknown') {
        languagesDetected.add(block.language);
      }
    });

    if (languagesDetected.size === 0) {
      const detection = this.deps.detectLanguage(filePath, content);
      if (detection) {
        languagesDetected.add(detection.language);
      }
    }

    const primaryLanguage = options.forceParser ?? this.deps.detectPrimaryLanguage(filePath, content);
    const mappedLanguage = primaryLanguage === 'typescript' ? 'javascript' : primaryLanguage;
    const parser = this.deps.getParser(mappedLanguage);

    if (parser && 'parseContent' in parser) {
      try {
        const result = await parser.parseContent(content, filePath);
        components.push(...(result.components || []));
        relationships.push(...(result.relationships || []));
        parsingMethods.push(mappedLanguage);
        this.addSegmentationMetadata(components, segmentation);
      } catch (error) {
        warnings.push(`${mappedLanguage} parser failed: ${error}`);
      }
    } else {
      warnings.push(`No parser available for ${mappedLanguage}`);
    }

    let parsingLevel: 'semantic' | 'structural' | 'basic' = 'basic';
    if (parsingMethods.length > 0) {
      parsingLevel = 'structural';
    }

    return {
      components,
      relationships,
      languagesDetected,
      parsingMethods,
      parsingLevel,
      warnings
    };
  }

  private async extractInitialRelationships(ctx: ParseContext): Promise<LinkingResult> {
    const { options, filePath, content } = ctx;
    if (!options.enableInitialLinking) {
      return {
        relationships: [],
        metadata: { linkerTypes: [], filesProcessed: 0, relationshipsFound: 0, processingTimeMs: 0, errors: [] }
      };
    }

    if (options.workspaceRoot) {
      this.deps.initialLinker.setWorkspaceRoot(options.workspaceRoot);
    }

    return this.deps.initialLinker.extractRelationships(filePath, content);
  }

  private aggregateRelationships(
    parserRelationships: IRelationship[],
    initialRelationships: InitialRelationship[],
    parsingLevel: 'semantic' | 'structural' | 'basic',
    confidenceThreshold: number
  ): AggregatedRelationship[] {
    if (parserRelationships.length === 0 && initialRelationships.length === 0) {
      return [];
    }

    const { relationshipAggregator } = this.deps;

    const parserBase = this.convertToBaseRelationships(parserRelationships);
    if (parserBase.length > 0) {
      const tier = parsingLevel === 'semantic' ? 'semantic' : 'structural';
      relationshipAggregator.addRelationships(parserBase, tier);
    }

    const initialBase = this.convertInitialToBaseRelationships(initialRelationships);
    if (initialBase.length > 0) {
      relationshipAggregator.addRelationships(initialBase, 'initial');
    }

    return relationshipAggregator.getAllRelationships({ confidenceThreshold }).relationships;
  }

  private addSegmentationMetadata(components: IComponent[], segmentation: SegmentationResult): void {
    for (const component of components) {
      component.metadata = {
        ...component.metadata,
        segmentation: {
          backend: segmentation.metadata.backend,
          confidence: segmentation.metadata.confidence,
          detectorsUsed: segmentation.metadata.detectorsUsed
        }
      };
    }
  }

  private determineBackend(
    segmentationBackend: SegmentationResult['metadata']['backend'],
    parsingMethods: string[]
  ): DocumentParsingResult['metadata']['backend'] {

    if (parsingMethods.some(method => ['javascript', 'typescript', 'python'].includes(method))) {
      return 'ast';
    }

    if (segmentationBackend === 'textmate' && parsingMethods.some(method => !['segmentation-basic', 'fallback'].includes(method))) {
      return 'textmate-hybrid';
    }

    return segmentationBackend;
  }

  private convertToBaseRelationships(relationships: IRelationship[]) {
    return relationships.map(rel => ({
      id: (rel as any).id || Relationship.computeId(rel.type as any, rel.sourceId, rel.targetId, rel.location),
      sourceId: rel.sourceId,
      targetId: rel.targetId,
      type: rel.type,
      confidence: rel.metadata?.confidence || 0.8,
      metadata: rel.metadata
    }));
  }

  private convertInitialToBaseRelationships(relationships: InitialRelationship[]) {
    return relationships.map(rel => ({
      sourceId: rel.sourceFile,
      targetId: rel.targetFile,
      type: rel.type,
      confidence: rel.confidence,
      metadata: rel.metadata
    }));
  }
}
