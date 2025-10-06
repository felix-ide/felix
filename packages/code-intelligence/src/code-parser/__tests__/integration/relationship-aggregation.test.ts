/**
 * relationship-aggregation.test.ts - Integration tests for relationship aggregation across different sources
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ParserFactory } from '../../ParserFactory.js';

describe('Relationship Aggregation Integration', () => {
  let tempDir: string;
  let parserFactory: ParserFactory;

  beforeEach(() => {
    tempDir = join(tmpdir(), `relationship-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    parserFactory = new ParserFactory();
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  const createTestFile = (filename: string, content: string): string => {
    const filePath = join(tempDir, filename);
    mkdirSync(join(tempDir, filename.split('/').slice(0, -1).join('/')), { recursive: true });
    writeFileSync(filePath, content, 'utf-8');
    return filePath;
  };

  describe('Multi-source relationship aggregation', () => {
    it('should merge relationships from semantic, structural, and initial sources', async () => {
      // Create a shell script that sources another file
      const mainScript = createTestFile('main.sh', `
#!/bin/bash
source ./utils.sh
source ./config.sh

function main() {
  echo "Starting application"
  load_config
  process_data
}

main "$@"
`);

      const utilsScript = createTestFile('utils.sh', `
#!/bin/bash

function process_data() {
  echo "Processing data..."
}

function load_config() {
  if [ -f "./config.sh" ]; then
    echo "Config loaded"
  fi
}
`);

      const configScript = createTestFile('config.sh', `
#!/bin/bash
export APP_NAME="Test App"
export DEBUG=true
`);

      const result = await parserFactory.parseDocument(mainScript, undefined, {
        workspaceRoot: tempDir,
        enableSegmentation: true,
        enableInitialLinking: true,
        enableAggregation: true
      });

      expect(result.relationships.length).toBeGreaterThan(0);

      // Should have initial relationships from shell source statements
      const sourceRelationships = result.relationships.filter(r =>
        r.type === 'INCLUDES' && r.precedenceLevel === 'initial'
      );
      expect(sourceRelationships.length).toBeGreaterThan(0);

      // Should find relationships to both utils.sh and config.sh
      const utilsRel = result.relationships.find(r =>
        r.targetId.endsWith('utils.sh')
      );
      expect(utilsRel).toBeDefined();
      expect(utilsRel?.type).toBe('INCLUDES');

      const configRel = result.relationships.find(r =>
        r.targetId.endsWith('config.sh')
      );
      expect(configRel).toBeDefined();
      expect(configRel?.type).toBe('INCLUDES');

      // Relationships should have aggregation metadata
      expect(utilsRel?.aggregationMetadata).toBeDefined();
      expect(utilsRel?.sources.length).toBeGreaterThan(0);
      expect(utilsRel?.finalConfidence).toBeGreaterThan(0);
    });

    it('should prioritize higher precedence relationships', async () => {
      // Create a JavaScript file that exercises segmentation and parser precedence
      const jsFile = createTestFile('module.js', `
import { helper } from './utils.js';
import config from './config.json';

class DataProcessor {
  constructor() {
    this.config = config;
  }

  process(data) {
    return helper.transform(data);
  }
}

export default DataProcessor;
`);

      const utilsFile = createTestFile('utils.js', `
export const helper = {
  transform: (data) => data.map(x => x * 2)
};
`);

      const configFile = createTestFile('config.json', `{
  "version": "1.0.0",
  "debug": true
}`);

      const result = await parserFactory.parseDocument(jsFile, undefined, {
        workspaceRoot: tempDir,
        enableSegmentation: true,
        enableInitialLinking: true,
        enableAggregation: true
      });

      // Should have relationships with different precedence levels
      expect(result.relationships.length).toBeGreaterThan(0);

      // If the JavaScript parser creates semantic relationships,
      // they should have higher precedence than initial linking
      const semanticRels = result.relationships.filter(r =>
        r.precedenceLevel === 'semantic'
      );

      const initialRels = result.relationships.filter(r =>
        r.precedenceLevel === 'initial'
      );

      // At least initial relationships should exist from file references
      expect(initialRels.length).toBeGreaterThan(0);

      // Check that confidence values reflect precedence
      if (semanticRels.length > 0) {
        const avgSemanticConfidence = semanticRels.reduce((sum, r) => sum + r.finalConfidence, 0) / semanticRels.length;
        const avgInitialConfidence = initialRels.reduce((sum, r) => sum + r.finalConfidence, 0) / initialRels.length;

        expect(avgSemanticConfidence).toBeGreaterThan(avgInitialConfidence);
      }
    });

    it('should handle relationship deduplication correctly', async () => {
      // Create a Makefile that references the same files multiple ways
      const makefile = createTestFile('Makefile', `
include common.mk
include config/common.mk

SOURCES = src/main.c src/utils.c
HEADERS = src/main.h src/utils.h

all: $(TARGET)

$(TARGET): $(SOURCES) $(HEADERS)
	gcc -o $(TARGET) $(SOURCES)

clean:
	rm -f $(TARGET)

.PHONY: all clean
`);

      // Create referenced files
      const commonMk = createTestFile('common.mk', 'CC=gcc\nCFLAGS=-Wall');
      const configCommonMk = createTestFile('config/common.mk', 'CFLAGS+=-O2');
      const mainC = createTestFile('src/main.c', '#include "main.h"\nint main() { return 0; }');
      const utilsC = createTestFile('src/utils.c', '#include "utils.h"\nvoid helper() {}');
      const mainH = createTestFile('src/main.h', '#ifndef MAIN_H\n#define MAIN_H\n#endif');
      const utilsH = createTestFile('src/utils.h', '#ifndef UTILS_H\n#define UTILS_H\n#endif');

      const result = await parserFactory.parseDocument(makefile, undefined, {
        workspaceRoot: tempDir,
        enableInitialLinking: true,
        enableAggregation: true
      });

      expect(result.relationships.length).toBeGreaterThan(0);

      // Should have unique relationships (no duplicates)
      const relationshipKeys = result.relationships.map(r =>
        `${r.sourceId}:${r.targetId}:${r.type}`
      );
      const uniqueKeys = new Set(relationshipKeys);
      expect(relationshipKeys.length).toBe(uniqueKeys.size);

      // Should have includes for common.mk
      const commonMkRels = result.relationships.filter(r =>
        r.targetId.endsWith('common.mk')
      );
      expect(commonMkRels.length).toBeGreaterThan(0);

      // Should track multiple sources if the same relationship is found multiple ways
      const mergedRel = commonMkRels.find(r => r.sources.length > 1);
      if (mergedRel) {
        expect(mergedRel.aggregationMetadata.mergedFromCount).toBeGreaterThan(1);
      }
    });
  });

  describe('Confidence calculation and consensus', () => {
    it('should boost confidence for relationships found by multiple sources', async () => {
      // Create a Python script that imports a module
      const mainPy = createTestFile('main.py', `
#!/usr/bin/env python3
import utils
from config import settings

def main():
    utils.process_data(settings.DATA_FILE)

if __name__ == "__main__":
    main()
`);

      const utilsPy = createTestFile('utils.py', `
def process_data(filename):
    with open(filename, 'r') as f:
        return f.read()
`);

      const configPy = createTestFile('config.py', `
settings = {
    'DATA_FILE': 'data.txt'
}
`);

      const result = await parserFactory.parseDocument(mainPy, undefined, {
        workspaceRoot: tempDir,
        enableSegmentation: true,
        enableInitialLinking: true,
        enableAggregation: true
      });

      // Should have relationships to both utils.py and config.py
      const utilsRel = result.relationships.find(r =>
        r.targetId.endsWith('utils.py')
      );
      const configRel = result.relationships.find(r =>
        r.targetId.endsWith('config.py')
      );

      expect(utilsRel).toBeDefined();
      expect(configRel).toBeDefined();

      // If found by multiple sources, should have higher confidence
      if (utilsRel && utilsRel.sources.length > 1) {
        expect(utilsRel.finalConfidence).toBeGreaterThan(0.8);
        expect(utilsRel.aggregationMetadata.consensusScore).toBeGreaterThan(0.5);
      }
    });

    it('should handle conflicting confidence scores appropriately', async () => {
      // This test simulates a scenario where different sources
      // report different confidence levels for the same relationship

      const testFile = createTestFile('test.md', `
# Documentation

See [utils.js](./utils.js) for utilities.
Also check file: ./utils.js in the source.
Reference: utils.js
`);

      const utilsFile = createTestFile('utils.js', 'export function helper() {}');

      const result = await parserFactory.parseDocument(testFile, undefined, {
        workspaceRoot: tempDir,
        enableInitialLinking: true,
        enableAggregation: true
      });

      // Should find the utils.js reference
      const utilsRel = result.relationships.find(r =>
        r.targetId.endsWith('utils.js')
      );

      expect(utilsRel).toBeDefined();

      if (utilsRel && utilsRel.sources.length > 1) {
        // Should have merged multiple detection methods
        expect(utilsRel.aggregationMetadata.mergedFromCount).toBeGreaterThan(1);

        // Final confidence should be reasonable
        expect(utilsRel.finalConfidence).toBeGreaterThan(0.3);
        expect(utilsRel.finalConfidence).toBeLessThanOrEqual(1.0);

        // Should track highest and lowest original confidence
        expect(utilsRel.aggregationMetadata.highestOriginalConfidence).toBeGreaterThanOrEqual(
          utilsRel.aggregationMetadata.lowestOriginalConfidence
        );
      }
    });
  });

  describe('Time-based confidence decay', () => {
    it('should apply time decay to relationship confidence', async () => {
      const testFile = createTestFile('script.sh', `
#!/bin/bash
source ./config.sh
`);

      const configFile = createTestFile('config.sh', 'export TEST=1');

      // Mock an old timestamp for initial relationship
      const originalNow = Date.now;
      const oldTime = Date.now() - (1000 * 60 * 60 * 24 * 10); // 10 days ago

      vi.spyOn(Date, 'now').mockReturnValue(oldTime);

      const result1 = await parserFactory.parseDocument(testFile, undefined, {
        workspaceRoot: tempDir,
        enableInitialLinking: true,
        enableAggregation: true
      });

      // Restore current time and parse again (simulating new analysis)
      vi.spyOn(Date, 'now').mockReturnValue(originalNow());

      const result2 = await parserFactory.parseDocument(testFile, undefined, {
        workspaceRoot: tempDir,
        enableInitialLinking: true,
        enableAggregation: true
      });

      const oldRel = result1.relationships.find(r => r.targetId.endsWith('config.sh'));
      const newRel = result2.relationships.find(r => r.targetId.endsWith('config.sh'));

      if (oldRel && newRel) {
        // Newer relationship should have higher confidence due to less time decay
        expect(newRel.finalConfidence).toBeGreaterThanOrEqual(oldRel.finalConfidence);
      }

      Date.now = originalNow;
    });
  });

  describe('Complex project structure', () => {
    it('should handle multi-file project with various relationship types', async () => {
      // Create a complex project structure
      const packageJson = createTestFile('package.json', JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        main: 'src/index.js',
        scripts: {
          build: './scripts/build.sh',
          test: 'npm run test:unit'
        }
      }));

      const indexJs = createTestFile('src/index.js', `
const config = require('./config.js');
const utils = require('./utils/helpers.js');

function main() {
  console.log('Starting', config.APP_NAME);
  utils.initialize();
}

module.exports = { main };
`);

      const configJs = createTestFile('src/config.js', `
module.exports = {
  APP_NAME: 'Test App',
  DEBUG: process.env.NODE_ENV !== 'production'
};
`);

      const helpersJs = createTestFile('src/utils/helpers.js', `
function initialize() {
  console.log('Initializing...');
}

module.exports = { initialize };
`);

      const buildScript = createTestFile('scripts/build.sh', `
#!/bin/bash
echo "Building project..."
cd "$(dirname "$0")/.."
npm run compile
cp package.json dist/
`);

      const dockerfile = createTestFile('Dockerfile', `
FROM node:16
WORKDIR /app
COPY package.json .
COPY src/ ./src/
COPY scripts/ ./scripts/
RUN npm install
RUN ./scripts/build.sh
EXPOSE 3000
CMD ["node", "src/index.js"]
`);

      const readme = createTestFile('README.md', `
# Test Project

## Getting Started

1. Install dependencies: \`npm install\`
2. Build the project: \`npm run build\`
3. Start the application: \`node src/index.js\`

## Configuration

See [src/config.js](src/config.js) for configuration options.

## Build Process

The build is handled by [scripts/build.sh](scripts/build.sh).
`);

      // Parse the main entry point
      const result = await parserFactory.parseDocument(indexJs, undefined, {
        workspaceRoot: tempDir,
        enableSegmentation: true,
        enableInitialLinking: true,
        enableAggregation: true
      });

      expect(result.relationships.length).toBeGreaterThan(0);

      // Should find relationships to config and helpers
      const configRel = result.relationships.find(r =>
        r.targetId.endsWith('config.js')
      );
      const helpersRel = result.relationships.find(r =>
        r.targetId.endsWith('helpers.js')
      );

      expect(configRel).toBeDefined();
      expect(helpersRel).toBeDefined();

      // Parse the Dockerfile to see copy relationships
      const dockerResult = await parserFactory.parseDocument(dockerfile, undefined, {
        workspaceRoot: tempDir,
        enableInitialLinking: true,
        enableAggregation: true
      });

      expect(dockerResult.relationships.length).toBeGreaterThan(0);

      // Should find COPY relationships
      const copyRels = dockerResult.relationships.filter(r => r.type === 'COPIES');
      expect(copyRels.length).toBeGreaterThan(0);

      // Parse the README for documentation relationships
      const readmeResult = await parserFactory.parseDocument(readme, undefined, {
        workspaceRoot: tempDir,
        enableInitialLinking: true,
        enableAggregation: true
      });

      expect(readmeResult.relationships.length).toBeGreaterThan(0);

      // Should find markdown link relationships
      const linkRels = readmeResult.relationships.filter(r => r.type === 'REFERENCES_FILE');
      expect(linkRels.length).toBeGreaterThan(0);
    });
  });

  describe('Aggregation statistics and metadata', () => {
    it('should provide comprehensive aggregation statistics', async () => {
      const mainFile = createTestFile('main.sh', `
#!/bin/bash
source ./lib1.sh
source ./lib2.sh
include ./common.sh
`);

      const lib1 = createTestFile('lib1.sh', 'function lib1_func() { echo "lib1"; }');
      const lib2 = createTestFile('lib2.sh', 'function lib2_func() { echo "lib2"; }');
      const common = createTestFile('common.sh', 'export COMMON_VAR=1');

      const result = await parserFactory.parseDocument(mainFile, undefined, {
        workspaceRoot: tempDir,
        enableInitialLinking: true,
        enableAggregation: true
      });

      expect(result.relationships.length).toBeGreaterThan(0);

      // Check aggregation metadata on relationships
      for (const rel of result.relationships) {
        expect(rel.aggregationMetadata).toBeDefined();
        expect(rel.aggregationMetadata.mergedFromCount).toBeGreaterThan(0);
        expect(rel.aggregationMetadata.lastUpdated).toBeGreaterThan(0);
        expect(rel.aggregationMetadata.consensusScore).toBeGreaterThanOrEqual(0);
        expect(rel.aggregationMetadata.consensusScore).toBeLessThanOrEqual(1);

        expect(rel.sources).toBeDefined();
        expect(rel.sources.length).toBeGreaterThan(0);
        expect(rel.finalConfidence).toBeGreaterThan(0);
        expect(rel.finalConfidence).toBeLessThanOrEqual(1);
      }

      // Should have precedence levels assigned
      const precedenceLevels = new Set(result.relationships.map(r => r.precedenceLevel));
      expect(precedenceLevels.size).toBeGreaterThan(0);
      expect(precedenceLevels.has('initial')).toBe(true);
    });
  });

  describe('Precedence Behavior', () => {
    it('should prioritize semantic > structural > basic > initial', async () => {
      // Test that semantic parsers take precedence over structural and basic
      const jsFile = createTestFile('test.js', `
import { utils } from './utils.js';

class TestClass {
  method() {
    return utils.helper();
  }
}
      `);

      const utilsFile = createTestFile('utils.js', `
export const utils = {
  helper() {
    return "test";
  }
};
      `);

      const result = await parserFactory.parseDocument(jsFile, undefined, {
        workspaceRoot: tempDir,
        enableInitialLinking: true,
        enableAggregation: true
      });

      // Should have relationships with semantic precedence
      const semanticRels = result.relationships.filter(r => r.precedenceLevel === 'semantic');
      const structuralRels = result.relationships.filter(r => r.precedenceLevel === 'structural');
      const initialRels = result.relationships.filter(r => r.precedenceLevel === 'initial');

      // Semantic relationships should have higher confidence
      if (semanticRels.length > 0 && initialRels.length > 0) {
        const avgSemanticConfidence = semanticRels.reduce((sum, r) => sum + r.finalConfidence, 0) / semanticRels.length;
        const avgInitialConfidence = initialRels.reduce((sum, r) => sum + r.finalConfidence, 0) / initialRels.length;
        expect(avgSemanticConfidence).toBeGreaterThan(avgInitialConfidence);
      }

      // Check that relationships have proper provenance
      for (const rel of result.relationships) {
        expect(rel.sources).toBeDefined();
        expect(rel.sources.length).toBeGreaterThan(0);

        for (const source of rel.sources) {
          expect(['semantic', 'structural', 'basic', 'initial']).toContain(source.source);
          expect(source.confidence).toBeGreaterThan(0);
          expect(source.timestamp).toBeGreaterThan(0);
        }
      }
    });

    it('should upgrade precedence when higher-quality sources are added', async () => {
      // This tests the internal aggregator behavior
      const { RelationshipAggregator } = await import('../../services/RelationshipAggregator.js');
      const aggregator = RelationshipAggregator.getInstance();

      // Clear any existing relationships
      aggregator.clear();

      // Add an initial relationship
      aggregator.addRelationships([
        {
          sourceId: 'file1',
          targetId: 'file2',
          type: 'imports',
          confidence: 0.6,
          metadata: {}
        }
      ], 'initial');

      // Check initial state
      let result = aggregator.getAllRelationships();
      expect(result.relationships.length).toBe(1);
      expect(result.relationships[0].precedenceLevel).toBe('initial');
      expect(result.relationships[0].finalConfidence).toBeCloseTo(0.6, 1);

      // Add a semantic relationship for the same source/target/type
      aggregator.addRelationships([
        {
          sourceId: 'file1',
          targetId: 'file2',
          type: 'imports',
          confidence: 0.9,
          metadata: { parser: 'javascript' }
        }
      ], 'semantic', { parser: 'javascript' });

      // Check upgraded state
      result = aggregator.getAllRelationships();
      expect(result.relationships.length).toBe(1); // Still one relationship (merged)
      expect(result.relationships[0].precedenceLevel).toBe('semantic'); // Upgraded precedence
      expect(result.relationships[0].finalConfidence).toBeGreaterThan(0.8); // Higher confidence
      expect(result.relationships[0].sources.length).toBe(2); // Two sources merged
      expect(result.relationships[0].aggregationMetadata.mergedFromCount).toBe(2);

      // Check that metadata is preserved from both sources
      expect(result.relationships.length).toBeGreaterThan(0);
      expect(result.relationships[0]?.metadata?.parser).toBe('javascript');
    });

    it('should not downgrade precedence when lower-quality sources are added', async () => {
      const { RelationshipAggregator } = await import('../../services/RelationshipAggregator.js');
      const aggregator = RelationshipAggregator.getInstance();

      // Clear any existing relationships
      aggregator.clear();

      // Add a semantic relationship first
      aggregator.addRelationships([
        {
          sourceId: 'class1',
          targetId: 'class2',
          type: 'extends',
          confidence: 0.95,
          metadata: { parser: 'javascript' }
        }
      ], 'semantic', { parser: 'javascript' });

      // Add an initial relationship for the same source/target/type
      aggregator.addRelationships([
        {
          sourceId: 'class1',
          targetId: 'class2',
          type: 'extends',
          confidence: 0.5,
          metadata: {}
        }
      ], 'initial');

      // Check that precedence remains semantic
      const result = aggregator.getAllRelationships();
      expect(result.relationships.length).toBe(1);
      expect(result.relationships[0].precedenceLevel).toBe('semantic'); // Should stay semantic
      expect(result.relationships[0].finalConfidence).toBeGreaterThan(0.9); // Should maintain high confidence
      expect(result.relationships[0].sources.length).toBe(2); // Both sources preserved
    });

    it('should handle confidence thresholds correctly', async () => {
      const { RelationshipAggregator } = await import('../../services/RelationshipAggregator.js');
      const aggregator = RelationshipAggregator.getInstance();

      // Clear any existing relationships
      aggregator.clear();

      // Add relationships with different confidence levels
      aggregator.addRelationships([
        { sourceId: 'a', targetId: 'b', type: 'calls', confidence: 0.9, metadata: {} },
        { sourceId: 'b', targetId: 'c', type: 'calls', confidence: 0.4, metadata: {} },
        { sourceId: 'c', targetId: 'd', type: 'calls', confidence: 0.7, metadata: {} }
      ], 'semantic');

      // Get relationships with different confidence thresholds
      const allResults = aggregator.getAllRelationships({ confidenceThreshold: 0.0 });
      const highConfidenceResults = aggregator.getAllRelationships({ confidenceThreshold: 0.8 });
      const mediumConfidenceResults = aggregator.getAllRelationships({ confidenceThreshold: 0.6 });

      expect(allResults.relationships.length).toBe(3);
      expect(highConfidenceResults.relationships.length).toBe(1); // Only 0.9 confidence
      expect(mediumConfidenceResults.relationships.length).toBe(2); // 0.9 and 0.7 confidence

      // Check that filtered relationships maintain their metadata
      for (const rel of highConfidenceResults.relationships) {
        expect(rel.finalConfidence).toBeGreaterThanOrEqual(0.8);
      }
    });
  });
});
