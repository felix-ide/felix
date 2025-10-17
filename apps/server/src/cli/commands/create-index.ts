/**
 * Create Index Command - Create new index from directory
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { CodeIndexer } from '../../features/indexing/api/CodeIndexer.js';
import type { IndexingResult } from '../../features/indexing/services/FileIndexingService.js';
import { DatabaseManager } from '../../features/storage/DatabaseManager.js';
import type { CreateIndexOptions } from '../types.js';
import { loadConfig, CLIProgressReporter, handleError, formatStats, DATABASE_PREFIX } from '../helpers.js';

export function createCreateIndexCommand(): Command {
  return new Command('create-index')
    .description('Create a new code index from a directory')
    .argument('[path]', 'directory path to index', '.')
    .option('-s, --storage <type>', 'storage type (memory|sql.js|native-sqlite)')
    .option('-e, --exclude <patterns...>', 'patterns to exclude')
    .option('-i, --include <patterns...>', 'patterns to include')
    .option('--max-file-size <size>', 'maximum file size in KB', parseInt)
    .option('-o, --output <path>', 'output file for results')
    .option('-f, --format <type>', 'output format (json|text|markdown)', 'text')
    .option('-c, --config <path>', 'config file path')
    .option('-v, --verbose', 'verbose output')
    .option('-q, --quiet', 'quiet output')
    .action(async (path: string, options: CreateIndexOptions) => {
      try {
        await createIndexCommand(path, options);
      } catch (error) {
        handleError(error, options.verbose);
      }
    });
}

export async function createIndexCommand(path: string, options: CreateIndexOptions): Promise<void> {
  const config = loadConfig(options.config);
  const targetPath = resolve(path);
  
  if (!options.quiet) {
    console.error('🏗️  Creating code index...');
    console.error(`📁 Target directory: ${targetPath}`);
  }
  
  // Initialize database
  const dbManager = DatabaseManager.getInstance();
  await dbManager.initialize();
  
  // Set up progress reporting
  const progressReporter = new CLIProgressReporter(options.verbose && !options.quiet);
  
  // Configure indexer
  const indexer = new CodeIndexer(dbManager);
  
  // Initialize indexer
  if (!options.quiet) {
    console.error(`💾 Initializing storage...`);
  }
  await indexer.initialize();
  
  // Index the directory
  if (!options.quiet) {
    console.error('🔍 Scanning and parsing files...');
  }
  
  const startTime = Date.now();
  const result = await indexer.indexDirectory(targetPath, {
    includeTests: options.include?.includes('test'),
    filePattern: options.include?.[0],
    onProgress: (message: string) => progressReporter.onProgress('Processing', message)
  });
  const endTime = Date.now();
  
  progressReporter.finish(result.filesProcessed);
  
  // Display results
  if (!options.quiet) {
    console.error('\n📊 Indexing Results:');
    console.error(`📁 Files processed: ${result.filesProcessed}`);
    console.error(`🧩 Components found: ${result.componentCount}`);
    console.error(`🔗 Relationships found: ${result.relationshipCount}`);
    console.error(`⏱️  Processing time: ${endTime - startTime}ms`);
    
    if (result.errors.length > 0) {
      console.error(`\n❌ Errors (${result.errors.length}):`);
      result.errors.slice(0, 5).forEach((error: any) => {
        console.error(`  ${error.filePath}: ${error.error}`);
      });
      if (result.errors.length > 5) {
        console.error(`  ... and ${result.errors.length - 5} more`);
      }
    }
    
    if (result.warnings.length > 0) {
      console.error(`\n⚠️  Warnings (${result.warnings.length}):`);
      result.warnings.slice(0, 5).forEach((warning: any) => {
        console.error(`  ${warning.filePath}: ${warning.message}`);
      });
      if (result.warnings.length > 5) {
        console.error(`  ... and ${result.warnings.length - 5} more`);
      }
    }
  }
  
  // Get final statistics
  const stats = await indexer.getStats();
  
  if (options.output) {
    const statsContent = formatStats(stats, options.format, true);
    const fs = await import('fs');
    fs.writeFileSync(options.output, statsContent);
    console.error(`📄 Statistics written to ${options.output}`);
  }
  
  // Clean up
  await indexer.close();
  
  if (result.success === false) {
    console.error('❌ Indexing completed with errors');
    process.exit(1);
  }
  
  if (!options.quiet) {
    console.error('\n🎯 Next steps:');
    console.error('  • Use "felix search" to explore components');
    console.error('  • Use "felix stats" to view detailed statistics');
    console.error('  • Use "felix get-component <id>" to inspect specific components');
  }
}
