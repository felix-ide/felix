/**
 * Update Index Command - Update existing index
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { CodeIndexer } from '../../features/indexing/api/CodeIndexer.js';
import { DatabaseManager } from '../../features/storage/DatabaseManager.js';
import type { UpdateIndexOptions } from '../types.js';
import { loadConfig, CLIProgressReporter, handleError, formatStats, DATABASE_PREFIX } from '../helpers.js';

export function createUpdateIndexCommand(): Command {
  return new Command('update-index')
    .description('Update an existing code index')
    .argument('[path]', 'directory path to update', '.')
    .option('-i, --incremental', 'incremental update (only changed files)')
    .option('-f, --force', 'force full rebuild')
    .option('-o, --output <path>', 'output file for results')
    .option('--format <type>', 'output format (json|text|markdown)', 'text')
    .option('-c, --config <path>', 'config file path')
    .option('-v, --verbose', 'verbose output')
    .option('-q, --quiet', 'quiet output')
    .option('--batch-limit <n>', 'max files to reindex in one pass (incremental)', (v) => parseInt(v, 10))
    .option('--since <ts>', 'only reindex files modified since timestamp (ms or ISO)')
    .action(async (path: string, options: UpdateIndexOptions) => {
      try {
        await updateIndexCommand(path, options);
      } catch (error) {
        handleError(error, options.verbose);
      }
    });
}

export async function updateIndexCommand(path: string, options: UpdateIndexOptions): Promise<void> {
  const config = loadConfig(options.config);
  const targetPath = resolve(path);
  
  if (!options.quiet) {
    console.log('🔄 Updating code index...');
    console.log(`📁 Target directory: ${targetPath}`);
  }
  
  // Set up progress reporting
  const progressReporter = new CLIProgressReporter(options.verbose && !options.quiet);
  
  // Initialize database
  const dbManager = DatabaseManager.getInstance();
  await dbManager.initialize();
  
  // Configure indexer
  const indexer = new CodeIndexer(dbManager);
  
  try {
    // Initialize indexer
    if (!options.quiet) {
      console.log('💾 Connecting to existing index...');
    }
    await indexer.initialize();
    
    // Get current stats
    const beforeStats = await indexer.getStats();
    
    if (!options.quiet) {
      console.log(`📊 Current index: ${beforeStats.components} components, ${beforeStats.relationships} relationships`);
    }
    
    // Determine update strategy
    if (options.force || !options.incremental) {
      // Full rebuild
      if (!options.quiet) {
        console.log('🔄 Performing full rebuild...');
      }
      
      // Clear existing index
      await indexer.clearIndex();
      
      // Re-index everything
      const result = await indexer.indexDirectory(targetPath, {
        onProgress: (message: string) => progressReporter.onProgress('Processing', message)
      });
      progressReporter.finish(result.filesProcessed);
      
      if (!options.quiet) {
        console.log('\n📊 Update Results:');
        console.log(`📁 Files processed: ${result.filesProcessed}`);
        console.log(`🧩 Components found: ${result.componentCount}`);
        console.log(`🔗 Relationships found: ${result.relationshipCount}`);
        
        if (result.errors.length > 0) {
          console.log(`❌ Errors: ${result.errors.length}`);
        }
        
      }
    } else {
      // Restore original behavior: non-force update performs a full rebuild (clear + index)
      if (!options.quiet) {
        console.log('🔄 Performing full rebuild...');
      }

      await indexer.clearIndex();
      const result = await indexer.indexDirectory(targetPath, {
        onProgress: (message: string) => progressReporter.onProgress('Processing', message)
      });
      progressReporter.finish(result.filesProcessed);
    }
    
    // Get updated stats
    const afterStats = await indexer.getStats();
    
    if (!options.quiet) {
      console.log('\n📈 Changes:');
      console.log(`🧩 Components: ${beforeStats.components} → ${afterStats.components} (${afterStats.components - beforeStats.components >= 0 ? '+' : ''}${afterStats.components - beforeStats.components})`);
      console.log(`🔗 Relationships: ${beforeStats.relationships} → ${afterStats.relationships} (${afterStats.relationships - beforeStats.relationships >= 0 ? '+' : ''}${afterStats.relationships - beforeStats.relationships})`);
    }
    
    // Output final statistics if requested
    if (options.output) {
      const statsContent = formatStats(afterStats, options.format, true);
      const fs = await import('fs');
      fs.writeFileSync(options.output, statsContent);
      console.log(`📄 Statistics written to ${options.output}`);
    }
    
    await indexer.close();
    
    if (!options.quiet) {
      console.log('\n✅ Index update completed successfully');
    }
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('no such table')) {
      console.error('❌ No existing index found. Run "felix create-index" first.');
      process.exit(1);
    }
    throw error;
  }
}
