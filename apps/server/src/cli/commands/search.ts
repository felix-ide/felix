/**
 * Search Command - Search for components
 */

import { Command } from 'commander';
import { CodeIndexer } from '../../features/indexing/api/CodeIndexer.js';
import { DatabaseManager } from '../../features/storage/DatabaseManager.js';
import type { SearchOptions } from '../types.js';
import { loadConfig, handleError, formatComponents, outputContent, DATABASE_PREFIX } from '../helpers.js';

export function createSearchCommand(): Command {
  return new Command('search')
    .description('Search for components in the index')
    .argument('[query]', 'search query (component name pattern)')
    .option('-t, --type <type>', 'filter by component type (class|function|method|property|variable|interface|enum)')
    .option('-l, --language <language>', 'filter by programming language')
    .option('-p, --pattern <pattern>', 'name pattern to match')
    .option('--limit <number>', 'maximum number of results', parseInt, 50)
    .option('-d, --details', 'show detailed information')
    .option('-o, --output <path>', 'output file for results')
    .option('-f, --format <type>', 'output format (json|text|markdown)', 'text')
    .option('-c, --config <path>', 'config file path')
    .option('-v, --verbose', 'verbose output')
    .option('-q, --quiet', 'quiet output')
    .action(async (query: string, options: SearchOptions) => {
      try {
        await searchCommand(query, options);
      } catch (error) {
        handleError(error, options.verbose);
      }
    });
}

export async function searchCommand(query: string, options: SearchOptions): Promise<void> {
  const config = loadConfig(options.config);
  
  if (!options.quiet) {
    console.error('🔍 Searching components...');
  }
  
  // Initialize database
  const dbManager = DatabaseManager.getInstance();
  await dbManager.initialize();
  
  // Configure indexer (read-only mode)
  const indexer = new CodeIndexer(dbManager);
  
  try {
    // Initialize indexer
    await indexer.initialize();
    
    // Build search criteria
    const searchOptions: any = {
      limit: options.limit
    };
    
    if (options.type) {
      searchOptions.type = options.type;
    }
    
    if (options.language) {
      searchOptions.language = options.language;
    }
    
    if (query || options.pattern) {
      searchOptions.query = query || options.pattern;
    }
    
    // Perform search
    const result = await indexer.searchComponents(searchOptions);
    
    if (!options.quiet) {
      console.error(`📋 Found ${result.total} components`);
      if (result.total > result.items.length) {
        console.error(`📄 Showing first ${result.items.length} results`);
      }
    }
    
    // Format and output results
    const formattedOutput = formatComponents(result.items, options.format, options.details);
    outputContent(formattedOutput, options.output);
    
    // Show search summary
    if (!options.quiet && result.items.length > 0) {
      const typeBreakdown = new Map<string, number>();
      const languageBreakdown = new Map<string, number>();
      
      for (const component of result.items) {
        typeBreakdown.set(component.type, (typeBreakdown.get(component.type) || 0) + 1);
        languageBreakdown.set(component.language, (languageBreakdown.get(component.language) || 0) + 1);
      }
      
      console.error('\n📊 Search Summary:');
      console.error('Types:', Array.from(typeBreakdown.entries()).map(([type, count]) => `${type}(${count})`).join(', '));
      console.error('Languages:', Array.from(languageBreakdown.entries()).map(([lang, count]) => `${lang}(${count})`).join(', '));
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