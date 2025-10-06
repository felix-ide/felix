import { readdir, stat } from 'fs/promises';
import { basename, dirname, extname, join } from 'path';
import { ParserFactory } from '@felix/code-intelligence';
import { logger } from '../../../shared/logger.js';
import { DEFAULT_CONFIG } from '../../../cli/helpers.js';
import { IgnorePatterns } from '../../../utils/IgnorePatterns.js';
import type { DiscoveryOptions, FileIndexingOptions } from '../types.js';

const FALLBACK_EXTENSIONS = [
  '.ts','.tsx','.js','.jsx','.mjs','.cjs',
  '.py','.pyw','.php','.phtml','.php3','.php4','.php5','.php7',
  '.java','.html','.htm','.xhtml','.css','.scss','.sass','.less',
  '.md','.markdown','.mdx','.json','.jsonc','.json5'
];

interface DiscoverySummary {
  scanned: number;
  ignored: number;
  oversize: number;
  accepted: number;
}

export class FileDiscovery {
  constructor(
    private readonly parserFactory: ParserFactory,
    private readonly options: FileIndexingOptions,
    private readonly ignorePatterns: IgnorePatterns | null
  ) {
    this.supportedExtensions = new Set(
      this.parserFactory.getSupportedExtensions().map((ext: string) => ext.toLowerCase())
    );
  }

  private readonly supportedExtensions: Set<string>;

  async collect(directoryPath: string, options: DiscoveryOptions = {}): Promise<string[]> {
    const files: string[] = [];
    const summary: DiscoverySummary = { scanned: 0, ignored: 0, oversize: 0, accepted: 0 };

    await this.walk(directoryPath, options, files, summary);

    logger.info(`🧭 Discovery summary: scanned=${summary.scanned}, ignored=${summary.ignored}, oversize=${summary.oversize}, accepted=${summary.accepted}`);
    return files;
  }

  async collectAll(directoryPath: string): Promise<string[]> {
    const files: string[] = [];
    await this.walkAll(directoryPath, files);
    return files;
  }

  private async walk(
    directoryPath: string,
    options: DiscoveryOptions,
    files: string[],
    summary: DiscoverySummary
  ): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(directoryPath);
    } catch (error) {
      logger.warn(`Failed to read directory ${directoryPath}:`, error);
      return;
    }

    const maxFileSize = this.options.maxFileSize ?? DEFAULT_CONFIG.maxFileSize;

    for (const entry of entries) {
      const fullPath = join(directoryPath, entry);

      let entryStat;
      try {
        entryStat = await stat(fullPath);
      } catch (error) {
        logger.warn(`Failed to stat ${fullPath}:`, error);
        continue;
      }

      if (entryStat.isDirectory()) {
        if (this.ignorePatterns?.shouldIgnore(fullPath)) {
          summary.ignored++;
          continue;
        }
        if (this.options.excludeDirectories?.includes(entry)) {
          summary.ignored++;
          continue;
        }
        await this.walk(fullPath, options, files, summary);
        continue;
      }

      if (!entryStat.isFile()) {
        continue;
      }

      summary.scanned++;

      if (this.ignorePatterns?.shouldIgnore(fullPath)) {
        summary.ignored++;
        continue;
      }

      if (entryStat.size > maxFileSize) {
        summary.oversize++;
        continue;
      }

      if (!options.includeTests) {
        const fileName = basename(fullPath);
        const parentDir = basename(dirname(fullPath));
        if (
          fileName.includes('.test.') ||
          fileName.includes('.spec.') ||
          parentDir === '__tests__' ||
          parentDir === '__test__'
        ) {
          summary.ignored++;
          continue;
        }
      }

      const ext = extname(fullPath).toLowerCase();
      if (this.options.excludeExtensions?.some(e => e.toLowerCase() === ext)) {
        summary.ignored++;
        continue;
      }

      if (this.options.includeExtensions && !this.options.includeExtensions.some(e => e.toLowerCase() === ext)) {
        summary.ignored++;
        continue;
      }

      if (this.supportedExtensions.has(ext)) {
        files.push(fullPath);
        summary.accepted++;
        continue;
      }

      if (FALLBACK_EXTENSIONS.includes(ext)) {
        files.push(fullPath);
        summary.accepted++;
      }
    }
  }

  private async walkAll(currentPath: string, files: string[]): Promise<void> {
    let items: string[];
    try {
      items = await readdir(currentPath);
    } catch (error) {
      logger.warn(`Failed to read directory ${currentPath}:`, error);
      return;
    }

    for (const item of items) {
      const fullPath = join(currentPath, item);

      try {
        const stats = await stat(fullPath);
        if (stats.isDirectory()) {
          if (this.ignorePatterns?.shouldIgnore(fullPath)) {
            continue;
          }
          await this.walkAll(fullPath, files);
        } else if (stats.isFile()) {
          const ext = extname(fullPath).toLowerCase();
          if (this.options.excludeExtensions?.some(e => e.toLowerCase() === ext)) {
            continue;
          }
          if (this.options.includeExtensions && !this.options.includeExtensions.some(e => e.toLowerCase() === ext)) {
            continue;
          }
          files.push(fullPath);
        }
      } catch (error) {
        logger.warn(`Failed to stat ${fullPath}:`, error);
      }
    }
  }
}
