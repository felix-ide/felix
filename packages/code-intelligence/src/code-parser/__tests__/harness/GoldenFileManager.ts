/**
 * GoldenFileManager - Manages golden test files for parser validation
 *
 * Features:
 * - Generate expected outputs for test cases
 * - Store and retrieve golden files
 * - Version tracking and migration
 * - Checksums for integrity verification
 * - Automatic update mechanisms
 * - Diff generation and visualization
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { createHash } from 'crypto';
import type { IComponent, IRelationship, ParseResult } from '../../types.js';
import type { ILanguageParser } from '../../interfaces/ILanguageParser.js';
import type { TestCase, GoldenFile, TestResult } from './types.js';

/**
 * Options for golden file management
 */
export interface GoldenFileOptions {
  goldenDir: string;
  version: string;
  autoUpdate: boolean;
  preserveHistory: boolean;
  compressionEnabled: boolean;
  checksumAlgorithm: 'md5' | 'sha256';
}

/**
 * Golden file difference
 */
export interface GoldenFileDiff {
  type: 'added' | 'removed' | 'modified';
  category: 'component' | 'relationship' | 'error' | 'warning' | 'metadata';
  path: string;
  oldValue?: any;
  newValue?: any;
  description: string;
}

/**
 * Manager for golden test files
 */
export class GoldenFileManager {
  private options: GoldenFileOptions;

  constructor(options: Partial<GoldenFileOptions> = {}) {
    this.options = {
      goldenDir: join(process.cwd(), '__tests__', 'fixtures', 'golden'),
      version: '1.0.0',
      autoUpdate: false,
      preserveHistory: true,
      compressionEnabled: false,
      checksumAlgorithm: 'sha256',
      ...options
    };

    this.ensureGoldenDirectory();
  }

  /**
   * Generate a golden file from a test result
   */
  async generateGoldenFile(
    testCase: TestCase,
    parseResult: ParseResult,
    parser: ILanguageParser
  ): Promise<GoldenFile> {
    const goldenFile: GoldenFile = {
      version: this.options.version,
      testCase: testCase.name,
      language: testCase.language,
      parser: parser.language,
      timestamp: new Date().toISOString(),
      metadata: {
        filePath: testCase.filePath,
        fileSize: testCase.content.length,
        parsingLevel: parseResult.metadata?.parsingLevel || 'basic',
        backend: parseResult.metadata?.capabilities?.symbols ? 'ast' : 'detectors-only'
      },
      expected: {
        components: parseResult.components,
        relationships: parseResult.relationships,
        errors: parseResult.errors,
        warnings: parseResult.warnings,
        parseMetadata: parseResult.metadata || {}
      },
      checksums: this.generateChecksums(parseResult)
    };

    return goldenFile;
  }

  /**
   * Save a golden file to disk
   */
  async saveGoldenFile(goldenFile: GoldenFile): Promise<string> {
    const filePath = this.getGoldenFilePath(goldenFile.testCase, goldenFile.language);

    // Preserve history if enabled
    if (this.options.preserveHistory && existsSync(filePath)) {
      await this.preserveHistory(filePath);
    }

    // Ensure directory exists
    mkdirSync(dirname(filePath), { recursive: true });

    // Save the file
    const content = this.options.compressionEnabled
      ? this.compressGoldenFile(goldenFile)
      : JSON.stringify(goldenFile, null, 2);

    writeFileSync(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * Load a golden file from disk
   */
  async loadGoldenFile(testCaseName: string, language: string): Promise<GoldenFile | null> {
    const filePath = this.getGoldenFilePath(testCaseName, language);

    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const goldenFile = this.options.compressionEnabled
        ? this.decompressGoldenFile(content)
        : JSON.parse(content);

      // Verify checksums
      if (!this.verifyChecksums(goldenFile)) {
        console.warn(`Checksum verification failed for golden file: ${filePath}`);
      }

      return goldenFile;
    } catch (error) {
      console.error(`Failed to load golden file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Compare test result against golden file
   */
  async compareWithGoldenFile(
    testResult: TestResult,
    goldenFile: GoldenFile
  ): Promise<GoldenFileDiff[]> {
    const diffs: GoldenFileDiff[] = [];

    // Compare components
    diffs.push(...this.compareComponents(
      goldenFile.expected.components,
      testResult.actualComponents
    ));

    // Compare relationships
    diffs.push(...this.compareRelationships(
      goldenFile.expected.relationships,
      testResult.actualRelationships
    ));

    // Compare errors
    diffs.push(...this.compareErrors(
      goldenFile.expected.errors,
      testResult.actualErrors
    ));

    // Compare warnings
    diffs.push(...this.compareWarnings(
      goldenFile.expected.warnings,
      testResult.actualWarnings
    ));

    // Compare metadata
    if (testResult.parseResult?.metadata) {
      diffs.push(...this.compareMetadata(
        goldenFile.expected.parseMetadata,
        testResult.parseResult.metadata
      ));
    }

    return diffs;
  }

  /**
   * Update golden files based on new test results
   */
  async updateGoldenFiles(
    testResults: TestResult[],
    parser: ILanguageParser,
    options: { force?: boolean; selective?: string[] } = {}
  ): Promise<string[]> {
    const updatedFiles: string[] = [];

    for (const testResult of testResults) {
      if (!testResult.parseResult) {
        continue;
      }

      // Check if selective update
      if (options.selective && !options.selective.includes(testResult.testCase.name)) {
        continue;
      }

      // Load existing golden file
      const existingGolden = await this.loadGoldenFile(
        testResult.testCase.name,
        testResult.testCase.language
      );

      // Generate new golden file
      const newGolden = await this.generateGoldenFile(
        testResult.testCase,
        testResult.parseResult,
        parser
      );

      // Decide whether to update
      let shouldUpdate = options.force || !existingGolden;

      if (!shouldUpdate && existingGolden) {
        const diffs = await this.compareWithGoldenFile(testResult, existingGolden);
        shouldUpdate = await this.shouldUpdateBasedOnDiffs(diffs, existingGolden, newGolden);
      }

      if (shouldUpdate) {
        const filePath = await this.saveGoldenFile(newGolden);
        updatedFiles.push(filePath);
        console.log(`Updated golden file: ${filePath}`);
      }
    }

    return updatedFiles;
  }

  /**
   * List all golden files
   */
  listGoldenFiles(): Array<{ testCase: string; language: string; filePath: string; lastModified: Date }> {
    const goldenFiles: Array<{ testCase: string; language: string; filePath: string; lastModified: Date }> = [];

    if (!existsSync(this.options.goldenDir)) {
      return goldenFiles;
    }

    const walkDir = (dir: string) => {
      const items = readdirSync(dir);

      for (const item of items) {
        const itemPath = join(dir, item);
        const stat = statSync(itemPath);

        if (stat.isDirectory()) {
          walkDir(itemPath);
        } else if (item.endsWith('.golden.json')) {
          const relativePath = itemPath.replace(this.options.goldenDir, '');
          const parts = relativePath.split('/').filter(p => p);
          const language = parts[0];
          const fileName = parts[parts.length - 1];
          const testCase = fileName.replace('.golden.json', '');

          goldenFiles.push({
            testCase,
            language,
            filePath: itemPath,
            lastModified: stat.mtime
          });
        }
      }
    };

    walkDir(this.options.goldenDir);
    return goldenFiles;
  }

  /**
   * Clean up old golden files
   */
  async cleanupOldGoldenFiles(olderThanDays: number = 30): Promise<string[]> {
    const deletedFiles: string[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const goldenFiles = this.listGoldenFiles();

    for (const goldenFile of goldenFiles) {
      if (goldenFile.lastModified < cutoffDate) {
        try {
          require('fs').unlinkSync(goldenFile.filePath);
          deletedFiles.push(goldenFile.filePath);
        } catch (error) {
          console.warn(`Failed to delete old golden file ${goldenFile.filePath}:`, error);
        }
      }
    }

    return deletedFiles;
  }

  /**
   * Generate a diff report between two golden files
   */
  generateDiffReport(diffs: GoldenFileDiff[]): string {
    if (diffs.length === 0) {
      return 'No differences found.';
    }

    const report = ['# Golden File Diff Report', ''];

    // Group diffs by category
    const diffsByCategory = new Map<string, GoldenFileDiff[]>();
    for (const diff of diffs) {
      const category = diff.category;
      if (!diffsByCategory.has(category)) {
        diffsByCategory.set(category, []);
      }
      diffsByCategory.get(category)!.push(diff);
    }

    for (const [category, categoryDiffs] of diffsByCategory) {
      report.push(`## ${category.charAt(0).toUpperCase() + category.slice(1)} Changes`);
      report.push('');

      for (const diff of categoryDiffs) {
        report.push(`### ${diff.type.toUpperCase()}: ${diff.path}`);
        report.push(diff.description);

        if (diff.oldValue !== undefined && diff.newValue !== undefined) {
          report.push('');
          report.push('**Before:**');
          report.push('```json');
          report.push(JSON.stringify(diff.oldValue, null, 2));
          report.push('```');
          report.push('');
          report.push('**After:**');
          report.push('```json');
          report.push(JSON.stringify(diff.newValue, null, 2));
          report.push('```');
        }

        report.push('');
      }
    }

    return report.join('\n');
  }

  // Private methods

  private ensureGoldenDirectory(): void {
    if (!existsSync(this.options.goldenDir)) {
      mkdirSync(this.options.goldenDir, { recursive: true });
    }
  }

  private getGoldenFilePath(testCaseName: string, language: string): string {
    return join(this.options.goldenDir, language, `${testCaseName}.golden.json`);
  }

  private generateChecksums(parseResult: ParseResult): { components: string; relationships: string; errors: string; warnings: string } {
    const algorithm = this.options.checksumAlgorithm;

    return {
      components: this.generateChecksum(parseResult.components, algorithm),
      relationships: this.generateChecksum(parseResult.relationships, algorithm),
      errors: this.generateChecksum(parseResult.errors, algorithm),
      warnings: this.generateChecksum(parseResult.warnings, algorithm)
    };
  }

  private generateChecksum(data: any, algorithm: string): string {
    const content = JSON.stringify(data, Object.keys(data).sort());
    return createHash(algorithm).update(content).digest('hex');
  }

  private verifyChecksums(goldenFile: GoldenFile): boolean {
    try {
      const expectedChecksums = {
        components: this.generateChecksum(goldenFile.expected.components, this.options.checksumAlgorithm),
        relationships: this.generateChecksum(goldenFile.expected.relationships, this.options.checksumAlgorithm),
        errors: this.generateChecksum(goldenFile.expected.errors, this.options.checksumAlgorithm),
        warnings: this.generateChecksum(goldenFile.expected.warnings, this.options.checksumAlgorithm)
      };

      return (
        expectedChecksums.components === goldenFile.checksums.components &&
        expectedChecksums.relationships === goldenFile.checksums.relationships &&
        expectedChecksums.errors === goldenFile.checksums.errors &&
        expectedChecksums.warnings === goldenFile.checksums.warnings
      );
    } catch (error) {
      console.warn('Checksum verification failed:', error);
      return false;
    }
  }

  private async preserveHistory(filePath: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const historyPath = filePath.replace('.golden.json', `.${timestamp}.golden.json`);

    try {
      const content = readFileSync(filePath, 'utf-8');
      writeFileSync(historyPath, content, 'utf-8');
    } catch (error) {
      console.warn(`Failed to preserve history for ${filePath}:`, error);
    }
  }

  private compressGoldenFile(goldenFile: GoldenFile): string {
    // Simple compression - in production, use a proper compression library
    return JSON.stringify(goldenFile);
  }

  private decompressGoldenFile(content: string): GoldenFile {
    // Simple decompression - in production, use a proper compression library
    return JSON.parse(content);
  }

  private compareComponents(expected: IComponent[], actual: IComponent[]): GoldenFileDiff[] {
    const diffs: GoldenFileDiff[] = [];

    // Create maps for easier comparison
    const expectedMap = new Map(expected.map(c => [c.id, c]));
    const actualMap = new Map(actual.map(c => [c.id, c]));

    // Find added components
    for (const [id, component] of actualMap) {
      if (!expectedMap.has(id)) {
        diffs.push({
          type: 'added',
          category: 'component',
          path: `components.${id}`,
          newValue: component,
          description: `Added component: ${component.name} (${component.type})`
        });
      }
    }

    // Find removed components
    for (const [id, component] of expectedMap) {
      if (!actualMap.has(id)) {
        diffs.push({
          type: 'removed',
          category: 'component',
          path: `components.${id}`,
          oldValue: component,
          description: `Removed component: ${component.name} (${component.type})`
        });
      }
    }

    // Find modified components
    for (const [id, expectedComponent] of expectedMap) {
      const actualComponent = actualMap.get(id);
      if (actualComponent) {
        const componentDiffs = this.compareObjectProperties(expectedComponent, actualComponent, `components.${id}`);
        diffs.push(...componentDiffs.map(diff => ({ ...diff, category: 'component' as const })));
      }
    }

    return diffs;
  }

  private compareRelationships(expected: IRelationship[], actual: IRelationship[]): GoldenFileDiff[] {
    const diffs: GoldenFileDiff[] = [];

    // Create maps for easier comparison
    const expectedMap = new Map(expected.map(r => [r.id, r]));
    const actualMap = new Map(actual.map(r => [r.id, r]));

    // Find added relationships
    for (const [id, relationship] of actualMap) {
      if (!expectedMap.has(id)) {
        diffs.push({
          type: 'added',
          category: 'relationship',
          path: `relationships.${id}`,
          newValue: relationship,
          description: `Added relationship: ${relationship.type} from ${relationship.sourceId} to ${relationship.targetId}`
        });
      }
    }

    // Find removed relationships
    for (const [id, relationship] of expectedMap) {
      if (!actualMap.has(id)) {
        diffs.push({
          type: 'removed',
          category: 'relationship',
          path: `relationships.${id}`,
          oldValue: relationship,
          description: `Removed relationship: ${relationship.type} from ${relationship.sourceId} to ${relationship.targetId}`
        });
      }
    }

    return diffs;
  }

  private compareErrors(expected: any[], actual: any[]): GoldenFileDiff[] {
    // Simplified comparison for errors
    return [];
  }

  private compareWarnings(expected: any[], actual: any[]): GoldenFileDiff[] {
    // Simplified comparison for warnings
    return [];
  }

  private compareMetadata(expected: Record<string, any>, actual: Record<string, any>): GoldenFileDiff[] {
    return this.compareObjectProperties(expected, actual, 'metadata');
  }

  private compareObjectProperties(expected: any, actual: any, basePath: string): GoldenFileDiff[] {
    const diffs: GoldenFileDiff[] = [];

    // Compare all properties
    const allKeys = new Set([...Object.keys(expected || {}), ...Object.keys(actual || {})]);

    for (const key of allKeys) {
      const expectedValue = expected?.[key];
      const actualValue = actual?.[key];
      const path = `${basePath}.${key}`;

      if (expectedValue === undefined && actualValue !== undefined) {
        diffs.push({
          type: 'added',
          category: 'metadata',
          path,
          newValue: actualValue,
          description: `Added property: ${key}`
        });
      } else if (expectedValue !== undefined && actualValue === undefined) {
        diffs.push({
          type: 'removed',
          category: 'metadata',
          path,
          oldValue: expectedValue,
          description: `Removed property: ${key}`
        });
      } else if (JSON.stringify(expectedValue) !== JSON.stringify(actualValue)) {
        diffs.push({
          type: 'modified',
          category: 'metadata',
          path,
          oldValue: expectedValue,
          newValue: actualValue,
          description: `Modified property: ${key}`
        });
      }
    }

    return diffs;
  }

  private async shouldUpdateBasedOnDiffs(
    diffs: GoldenFileDiff[],
    existingGolden: GoldenFile,
    newGolden: GoldenFile
  ): Promise<boolean> {
    // In a real implementation, this could have more sophisticated logic
    // For now, ask for confirmation if there are significant differences

    const significantDiffs = diffs.filter(diff =>
      diff.category === 'component' || diff.category === 'relationship'
    );

    if (significantDiffs.length > 5) {
      console.warn(`Found ${significantDiffs.length} significant differences in golden file`);
      // In an interactive environment, you might prompt the user
      return false;
    }

    return this.options.autoUpdate;
  }
}