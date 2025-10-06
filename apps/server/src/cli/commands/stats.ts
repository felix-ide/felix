/**
 * Stats Command - Show indexing statistics
 */

import { Command } from 'commander';
import { CodeIndexer } from '../../features/indexing/api/CodeIndexer.js';
import { DatabaseManager } from '../../features/storage/DatabaseManager.js';
import type { StatsOptions } from '../types.js';
import { loadConfig, handleError, formatStats, outputContent, DATABASE_PREFIX } from '../helpers.js';

export function createStatsCommand(): Command {
  return new Command('stats')
    .description('Show code indexing statistics')
    .option('-b, --breakdown', 'show detailed language breakdown')
    .option('-d, --detailed', 'show detailed statistics')
    .option('-o, --output <path>', 'output file for results')
    .option('-f, --format <type>', 'output format (json|text|markdown)', 'text')
    .option('-c, --config <path>', 'config file path')
    .option('-v, --verbose', 'verbose output')
    .option('-q, --quiet', 'quiet output')
    .action(async (options: StatsOptions) => {
      try {
        await statsCommand(options);
      } catch (error) {
        handleError(error, options.verbose);
      }
    });
}

export async function statsCommand(options: StatsOptions): Promise<void> {
  const config = loadConfig(options.config);
  
  if (!options.quiet) {
    console.log('📊 Gathering statistics...');
  }
  
  // Initialize database
  const dbManager = DatabaseManager.getInstance();
  await dbManager.initialize();
  
  // Configure indexer (read-only mode)
  const indexer = new CodeIndexer(dbManager);
  
  try {
    // Initialize indexer
    await indexer.initialize();
    
    // Get statistics
    const stats = await indexer.getStats();
    
    // Format and output statistics
    const formattedOutput = formatStats(
      stats, 
      options.format, 
      options.detailed || options.breakdown
    );
    
    outputContent(formattedOutput, options.output);
    
    // Show additional details if requested
    if ((options.breakdown || options.detailed) && !options.quiet && options.format === 'text') {
      console.log('\n🔍 Additional Details:');
      
      if (stats.componentCount > 0) {
        // Get some sample components for type breakdown
        const allComponents = await indexer.searchComponents({ limit: 1000 });
        const typeBreakdown = new Map<string, number>();
        
        for (const component of allComponents.items) {
          typeBreakdown.set(component.type, (typeBreakdown.get(component.type) || 0) + 1);
        }
        
        console.log('\n📋 Component Types:');
        for (const [type, count] of Array.from(typeBreakdown.entries()).sort((a, b) => b[1] - a[1])) {
          const percentage = ((count / stats.componentCount) * 100).toFixed(1);
          console.log(`   ${type}: ${count} (${percentage}%)`);
        }
      }
      
      // Show supported languages
      const supportedLanguages = indexer.getSupportedLanguages();
      const supportedExtensions = indexer.getSupportedExtensions();
      
      console.log('\n🌍 Language Support:');
      console.log(`   Supported languages: ${supportedLanguages.join(', ')}`);
      console.log(`   Supported extensions: ${supportedExtensions.join(', ')}`);
    }
    
    await indexer.close();
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('no such table')) {
      console.error('❌ No index found. Run "felix create-index" first.');
      process.exit(1);
    }
    throw error;
  }
}