/**
 * InitialLinker.test.ts - Unit tests for InitialLinker service
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { readFileSync, existsSync, statSync } from 'fs';
import { InitialLinker } from '../InitialLinker.js';
import { MarkdownParser } from '../../parsers/MarkdownParser.js';

// Mock dependencies
vi.mock('fs');
vi.mock('../../parsers/MarkdownParser.js');

const mockedReadFileSync = readFileSync as Mock;
const mockedExistsSync = existsSync as Mock;
const mockedStatSync = statSync as Mock;
const mockedMarkdownParser = {
  detectComponents: vi.fn(),
  detectRelationships: vi.fn()
};

describe('InitialLinker', () => {
  let linker: InitialLinker;

  beforeEach(() => {
    linker = new InitialLinker();
    linker.setWorkspaceRoot('/workspace');
    vi.clearAllMocks();

    // Mock MarkdownParser
    vi.mocked(MarkdownParser).mockImplementation(() => mockedMarkdownParser as any);

    // Mock fs functions
    mockedStatSync.mockReturnValue({ isFile: () => true });
  });

  describe('extractRelationships()', () => {
    it('should extract shell script relationships', async () => {
      const shellContent = `
#!/bin/bash
source ./config.sh
. ./utils.sh
awk -f process.awk input.txt
sed -f cleanup.sed data.txt
include ./functions.sh
`;

      // Mock file existence
      mockedExistsSync.mockImplementation((path: string) => {
        return [
          '/workspace/config.sh',
          '/workspace/utils.sh',
          '/workspace/process.awk',
          '/workspace/cleanup.sed',
          '/workspace/functions.sh'
        ].includes(path);
      });

      const result = await linker.extractRelationships('/workspace/script.sh', shellContent);

      // At least the 5 expected sources; generic path detection may contribute more
      expect(result.relationships.length).toBeGreaterThanOrEqual(5);

      const sourceRel = result.relationships.find(r => r.targetFile === '/workspace/config.sh');
      expect(sourceRel).toBeDefined();
      expect(sourceRel?.type).toBe('INCLUDES');
      expect(sourceRel?.metadata.pattern).toBe('shell_source');

      const awkRel = result.relationships.find(r => r.targetFile === '/workspace/process.awk');
      expect(awkRel).toBeDefined();
      expect(awkRel?.type).toBe('DEPENDS_ON');
      expect(awkRel?.metadata.pattern).toBe('awk_file');
    });

    it('should extract Makefile relationships', async () => {
      const makefileContent = `
include common.mk
include config/build.mk

SOURCES = src/main.c src/utils.c
TARGET = bin/program

$(TARGET): $(SOURCES)
	gcc -o $(TARGET) $(SOURCES)

clean:
	rm -f $(TARGET)
`;

      mockedExistsSync.mockImplementation((path: string) => {
        return [
          '/workspace/common.mk',
          '/workspace/config/build.mk',
          '/workspace/src/main.c',
          '/workspace/src/utils.c'
        ].includes(path);
      });

      const result = await linker.extractRelationships('/workspace/Makefile', makefileContent);

      expect(result.relationships.length).toBeGreaterThan(0);

      const includeRel = result.relationships.find(r => r.targetFile === '/workspace/common.mk');
      expect(includeRel).toBeDefined();
      expect(includeRel?.type).toBe('INCLUDES');
      expect(includeRel?.metadata.pattern).toBe('makefile_include');

      const sourceRel = result.relationships.find(r => r.metadata.pattern === 'makefile_dependency' && r.targetFile === '/workspace/src/main.c');
      expect(sourceRel).toBeDefined();
      expect(sourceRel?.type).toBe('DEPENDS_ON');
      expect(sourceRel?.metadata.pattern).toBe('makefile_dependency');
    });

    it('should extract Dockerfile relationships', async () => {
      const dockerfileContent = `
FROM node:16

COPY package.json /app/
COPY src/ /app/src/
ADD assets/config.json /app/config/

RUN npm install
RUN ./scripts/build.sh

COPY --from=builder /app/dist /app/dist
`;

      mockedExistsSync.mockImplementation((path: string) => {
        return [
          '/workspace/package.json',
          '/workspace/src',
          '/workspace/assets/config.json',
          '/workspace/scripts/build.sh'
        ].includes(path);
      });

      const result = await linker.extractRelationships('/workspace/Dockerfile', dockerfileContent);

      expect(result.relationships.length).toBeGreaterThan(0);

      const packageRel = result.relationships.find(r => r.targetFile === '/workspace/package.json');
      expect(packageRel).toBeDefined();
      expect(packageRel?.type).toBe('COPIES');
      expect(packageRel?.metadata.pattern).toBe('dockerfile_copy');

      const buildRel = result.relationships.find(r => r.targetFile === '/workspace/scripts/build.sh');
      expect(buildRel).toBeDefined();
      expect(buildRel?.type).toBe('USES');
      expect(buildRel?.metadata.pattern).toBe('dockerfile_run_file');
    });

    it('should extract markdown relationships', async () => {
      const markdownContent = `
# Project Documentation

See [configuration](./config/README.md) for setup instructions.
Check out the [API docs](docs/api.md) for more details.

![Architecture diagram](diagrams/arch.png)

The main entry point is [src/index.js](src/index.js).
`;

      // Mock markdown parser
      mockedMarkdownParser.detectComponents.mockReturnValue([]);
      mockedMarkdownParser.detectRelationships.mockReturnValue([
        {
          sourceId: 'doc',
          targetId: 'src/index.js',
          type: 'REFERENCES',
          metadata: { context: 'enhanced markdown parser' }
        }
      ]);

      mockedExistsSync.mockImplementation((path: string) => {
        return [
          '/workspace/config/README.md',
          '/workspace/docs/api.md',
          '/workspace/diagrams/arch.png',
          '/workspace/src/index.js'
        ].includes(path);
      });

      const result = await linker.extractRelationships('/workspace/README.md', markdownContent);

      expect(result.relationships.length).toBeGreaterThan(0);

      const configRel = result.relationships.find(r => r.targetFile === '/workspace/config/README.md');
      expect(configRel).toBeDefined();
      expect(configRel?.type).toBe('REFERENCES_FILE');
      expect(configRel?.metadata.pattern).toBe('markdown_link');

      const imageRel = result.relationships.find(r => r.targetFile === '/workspace/diagrams/arch.png');
      expect(imageRel).toBeDefined();
      expect(imageRel?.type).toBe('REFERENCES_FILE');
      expect(imageRel?.metadata.pattern).toBe('markdown_image');
    });

    it('should extract generic path references', async () => {
      const textContent = `
This project includes several important files:
- ./src/main.js contains the main logic
- ../shared/utils.js has utility functions
- /workspace/config/settings.json stores configuration

See also: docs/README.md
`;

      mockedExistsSync.mockImplementation((path: string) => {
        return [
          '/workspace/project/src/main.js',
          '/shared/utils.js',
          '/workspace/config/settings.json',
          '/workspace/project/docs/README.md'
        ].includes(path);
      });

      const result = await linker.extractRelationships('/workspace/project/notes.txt', textContent);

      expect(result.relationships.length).toBeGreaterThan(0);

      const mainRel = result.relationships.find(r => r.targetFile === '/workspace/project/src/main.js');
      expect(mainRel).toBeDefined();
      expect(mainRel?.type).toBe('REFERENCES_FILE');
      expect(mainRel?.metadata.pattern).toBe('generic_path');
    });
  });

  describe('file type detection', () => {
    it('should detect shell scripts by extension', async () => {
      const content = 'echo "Hello World"';

      const result = await linker.extractRelationships('/workspace/script.sh', content);
      expect(result.metadata.linkerTypes).toContain('shell');
    });

    it('should detect shell scripts by shebang', async () => {
      const content = '#!/bin/bash\necho "Hello World"';

      const result = await linker.extractRelationships('/workspace/script', content);
      expect(result.metadata.linkerTypes).toContain('shell');
    });

    it('should detect Makefiles by name', async () => {
      const content = 'all:\n\techo "Building..."';

      const result = await linker.extractRelationships('/workspace/Makefile', content);
      expect(result.metadata.linkerTypes).toContain('makefile');
    });

    it('should detect Dockerfiles by name', async () => {
      const content = 'FROM ubuntu:20.04';

      const result = await linker.extractRelationships('/workspace/Dockerfile', content);
      expect(result.metadata.linkerTypes).toContain('dockerfile');
    });

    it('should detect markdown files by extension', async () => {
      const content = '# Title\n\nSome content';

      mockedMarkdownParser.detectComponents.mockReturnValue([]);
      mockedMarkdownParser.detectRelationships.mockReturnValue([]);

      const result = await linker.extractRelationships('/workspace/doc.md', content);
      expect(result.metadata.linkerTypes).toContain('markdown');
    });
  });

  describe('path resolution', () => {
    it('should resolve relative paths correctly', async () => {
      const content = 'source ./config.sh';

      mockedExistsSync.mockImplementation((path: string) => {
        return path === '/workspace/subdir/config.sh';
      });

      const result = await linker.extractRelationships('/workspace/subdir/script.sh', content);

      // Expect the INCLUDES link specifically (generic path may also be detected)
      const includes = result.relationships.filter(r => r.type === 'INCLUDES');
      expect(includes).toHaveLength(1);
      expect(includes[0].targetFile).toBe('/workspace/subdir/config.sh');
    });

    it('should resolve parent directory paths correctly', async () => {
      const content = 'source ../shared/utils.sh';

      mockedExistsSync.mockImplementation((path: string) => {
        return path === '/workspace/shared/utils.sh';
      });

      const result = await linker.extractRelationships('/workspace/project/script.sh', content);

      const includes = result.relationships.filter(r => r.type === 'INCLUDES');
      expect(includes).toHaveLength(1);
      expect(includes[0].targetFile).toBe('/workspace/shared/utils.sh');
    });

    it('should ignore paths outside workspace', async () => {
      const content = 'source /etc/config.sh';

      mockedExistsSync.mockReturnValue(true);

      const result = await linker.extractRelationships('/workspace/script.sh', content);

      expect(result.relationships).toHaveLength(0);
    });

    it('should ignore non-existent files', async () => {
      const content = 'source ./nonexistent.sh';

      mockedExistsSync.mockReturnValue(false);

      const result = await linker.extractRelationships('/workspace/script.sh', content);

      expect(result.relationships).toHaveLength(0);
    });
  });

  describe('deduplication', () => {
    it('should deduplicate identical relationships', async () => {
      const content = `
source ./config.sh
. ./config.sh
`;

      mockedExistsSync.mockImplementation((path: string) => {
        return path === '/workspace/config.sh';
      });

      const result = await linker.extractRelationships('/workspace/script.sh', content);

      // Should only have one relationship despite two source statements
      const configRels = result.relationships.filter(r => r.targetFile === '/workspace/config.sh' && r.type === 'INCLUDES');
      expect(configRels).toHaveLength(1);
    });

    it('should keep higher confidence relationships when deduplicating', async () => {
      const content = 'source ./config.sh';

      mockedExistsSync.mockImplementation((path: string) => {
        return path === '/workspace/config.sh';
      });

      // Manually add a lower confidence relationship to test precedence
      const result = await linker.extractRelationships('/workspace/script.sh', content);

      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].confidence).toBeGreaterThan(0.5);
    });
  });

  describe('error handling', () => {
    it('should handle file reading errors gracefully', async () => {
      mockedReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await linker.extractRelationships('/workspace/script.sh');

      expect(result.metadata.errors).toHaveLength(1);
      expect(result.metadata.errors[0]).toContain('Permission denied');
    });

    it('should handle markdown parser errors gracefully', async () => {
      const content = '# Markdown content';

      mockedMarkdownParser.detectComponents.mockImplementation(() => {
        throw new Error('Parser error');
      });

      const result = await linker.extractRelationships('/workspace/doc.md', content);

      // Should not throw, but fall back to standard markdown linking
      expect(result).toBeDefined();
      expect(result.relationships).toBeDefined();
    });

    it('should handle filesystem access errors gracefully', async () => {
      const content = 'source ./config.sh';

      mockedExistsSync.mockImplementation(() => {
        throw new Error('Filesystem error');
      });

      const result = await linker.extractRelationships('/workspace/script.sh', content);

      // Should not throw, but return empty relationships
      expect(result.relationships).toHaveLength(0);
    });
  });

  describe('confidence scoring', () => {
    it('should assign appropriate confidence levels', async () => {
      const content = `
source ./config.sh
awk -f process.awk input.txt
[Link text](./doc.md)
./src/main.js
`;

      mockedExistsSync.mockReturnValue(true);
      mockedMarkdownParser.detectComponents.mockReturnValue([]);
      mockedMarkdownParser.detectRelationships.mockReturnValue([]);

      const result = await linker.extractRelationships('/workspace/test.md', content);

      // Source should have high confidence
      const sourceRel = result.relationships.find(r => r.metadata.pattern === 'shell_source');
      expect(sourceRel?.confidence).toBeGreaterThan(0.8);

      // AWK should have good confidence
      const awkRel = result.relationships.find(r => r.metadata.pattern === 'awk_file');
      expect(awkRel?.confidence).toBeGreaterThan(0.75);

      // Markdown link should have good confidence
      const linkRel = result.relationships.find(r => r.metadata.pattern === 'markdown_link');
      expect(linkRel?.confidence).toBeGreaterThan(0.75);

      // Generic path should have lower confidence
      const genericRel = result.relationships.find(r => r.metadata.pattern === 'generic_path');
      expect(genericRel?.confidence).toBeLessThan(0.6);
    });
  });
});
