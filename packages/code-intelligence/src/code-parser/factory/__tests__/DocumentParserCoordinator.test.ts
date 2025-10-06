import { describe, expect, it, vi } from '@jest/globals';
import type { ILanguageParser } from '../../interfaces/ILanguageParser.js';
import type { IComponent, IRelationship } from '../../types.js';
import type { SegmentationResult } from '../../services/BlockScanner.js';
import type { LinkingResult } from '../../services/InitialLinker.js';
import type { AggregatedRelationship } from '../../services/RelationshipAggregator.js';
import { DocumentParserCoordinator } from '../DocumentParserCoordinator.js';
import type { LanguageDetectionResult } from '../LanguageDetector.js';
import type { ParseDocumentOptions } from '../types.js';

const createParser = (language: string, components: IComponent[], relationships: IRelationship[]): ILanguageParser => ({
  language,
  getSupportedExtensions: () => ['.js'],
  getIgnorePatterns: () => [],
  parseContent: vi.fn(async () => ({ components, relationships, metadata: { parsingLevel: 'structural', backend: 'ast' } }))
} as unknown as ILanguageParser);

describe('DocumentParserCoordinator', () => {
  const segmentation: SegmentationResult = {
    blocks: [
      {
        language: 'javascript',
        startLine: 1,
        startColumn: 1,
        endLine: 3,
        endColumn: 1,
        startByte: 0,
        endByte: 42,
        confidence: 0.9,
        source: 'detector',
        metadata: {}
      }
    ],
    metadata: {
      backend: 'tree-sitter',
      confidence: 0.9,
      detectorsUsed: ['detector'],
      processingTimeMs: 2
    }
  };

  const createCoordinator = (overrides: Partial<{
    detection: LanguageDetectionResult | null;
    parser: ILanguageParser;
    options: ParseDocumentOptions;
  }> = {}) => {
    const components: IComponent[] = [{
      id: 'comp-1',
      name: 'Thing',
      type: 'function' as any,
      language: 'javascript',
      filePath: '/tmp/file.js',
      location: { startLine: 1, endLine: 2, startColumn: 1, endColumn: 1 },
      metadata: {}
    }];
    const relationships: IRelationship[] = [{
      type: 'uses',
      sourceId: 'comp-1',
      targetId: 'comp-2',
      metadata: { confidence: 0.7 }
    } as any];

    const parser = overrides.parser ?? createParser('javascript', components, relationships);
    const detection = overrides.detection ?? ({
      language: 'javascript',
      confidence: 0.95,
      parser,
      detectionMethod: 'extension'
    } satisfies LanguageDetectionResult);

    const blockScanner = { scanFile: vi.fn(async () => segmentation) } as any;
    const linkingResult: LinkingResult = {
      relationships: [{
        sourceFile: '/tmp/file.js',
        targetFile: '/tmp/other.js',
        type: 'imports',
        confidence: 0.6
      } as any],
      metadata: { linkerTypes: ['imports'], filesProcessed: 1, relationshipsFound: 1, processingTimeMs: 1, errors: [] }
    };
    const initialLinker = {
      setWorkspaceRoot: vi.fn(),
      extractRelationships: vi.fn(async () => linkingResult)
    } as any;

    const added: Array<{ kind: string; payload: unknown }> = [];
    const relationshipAggregator = {
      clear: vi.fn(),
      addRelationships: vi.fn((rels: unknown, kind: string) => added.push({ kind, payload: rels })),
      getAllRelationships: vi.fn((): { relationships: AggregatedRelationship[] } => ({
        relationships: [{ id: 'agg-1', sourceId: 'comp-1', targetId: 'comp-2', type: 'uses', confidence: 0.7 } as any]
      }))
    } as any;

    const deps = {
      blockScanner,
      initialLinker,
      relationshipAggregator,
      detectLanguage: vi.fn(() => detection),
      detectPrimaryLanguage: vi.fn(() => detection?.language ?? 'javascript'),
      getParser: vi.fn(() => parser),
      readFile: vi.fn(() => 'const x = 1;')
    };

    const coordinator = new DocumentParserCoordinator(deps);

    return { coordinator, deps, components, relationships, added };
  };

  it('parses and aggregates relationships', async () => {
    const { coordinator, deps, added } = createCoordinator();

    const result = await coordinator.parseDocument('/tmp/file.js');

    expect(deps.relationshipAggregator.clear).toHaveBeenCalled();
    expect(result.components).toHaveLength(1);
    expect(result.relationships).toHaveLength(1);
    expect(added.find(entry => entry.kind === 'structural')).toBeDefined();
  });
});
