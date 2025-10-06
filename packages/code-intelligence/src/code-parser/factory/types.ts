import type { SegmentationResult } from '../services/BlockScanner.js';
import type { LinkingResult } from '../services/InitialLinker.js';
import type { AggregatedRelationship } from '../services/RelationshipAggregator.js';
import type { IComponent } from '../types.js';

export interface DocumentParsingResult {
  components: IComponent[];
  relationships: AggregatedRelationship[];
  segmentation: SegmentationResult;
  linking: LinkingResult;
  metadata: {
    filePath: string;
    totalBlocks: number;
    languagesDetected?: string[];
    parsingLevel: 'semantic' | 'structural' | 'basic';
    backend: 'ast' | 'tree-sitter' | 'detectors-only' | 'hybrid' | 'textmate' | 'textmate-hybrid';
    processingTimeMs: number;
    warnings: string[];
    segmentation?: {
      backend: 'detectors-only' | 'tree-sitter' | 'hybrid' | 'textmate' | 'textmate-hybrid';
      confidence: number;
    };
  };
}

export interface ParseDocumentOptions {
  enableSegmentation?: boolean;
  enableInitialLinking?: boolean;
  enableAggregation?: boolean;
  confidenceThreshold?: number;
  workspaceRoot?: string;
  forceParser?: string;
  segmentationOnly?: boolean;
  _startTimeMs?: number;
}
