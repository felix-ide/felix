/**
 * Get Context Command - Generate contextual information for components
 * 
 * This command generates rich contextual information about components,
 * including related components, relationships, and code context.
 */

import { Command } from 'commander';
import { CodeIndexer } from '../../features/indexing/api/CodeIndexer.js';
import { formatOutput, handleCommandError, DATABASE_PREFIX } from '../helpers.js';
import { ContextGenerationAPI, createDefaultOptions, createContextQuery } from '../../context/index.js';
import type { ContextGenerationOptions } from '../../context/types.js';
import type { IComponent } from '@felix/code-intelligence';
import { DatabaseManager } from '../../features/storage/DatabaseManager.js';

export interface GetContextOptions {
  component?: string;
  depth?: number;
  includeSource?: boolean;
  includeRelationships?: boolean;
  includeDocumentation?: boolean;
  targetTokens?: number;
  language?: string[];
  format?: 'markdown' | 'json' | 'text';
  output?: string;
  verbose?: boolean;
}

export function createGetContextCommand(): Command {
  return new Command('get-context')
    .description('Generate contextual information for components')
    .argument('<component>', 'component ID or search pattern')
    .option('-d, --depth <number>', 'relationship traversal depth', '3')
    .option('--no-source', 'exclude source code from context')
    .option('--no-relationships', 'exclude relationships from context')
    .option('--no-documentation', 'exclude documentation from context')
    .option('-t, --target-tokens <number>', 'target token count', '8000')
    .option('-f, --format <type>', 'output format (markdown|json)', 'markdown')
    .option('-o, --output <path>', 'output file path')
    .option('-v, --verbose', 'verbose output')
    .action(async (component: string, options: GetContextOptions) => {
      try {
        await getContextCommand({ ...options, component });
      } catch (error) {
        handleCommandError(error, options.verbose);
      }
    });
}

export async function getContextCommand(options: GetContextOptions): Promise<void> {
  try {
    // Initialize database
    const dbManager = DatabaseManager.getInstance();
    await dbManager.initialize();
    
    const indexer = new CodeIndexer(dbManager);

    if (!options.component) {
      throw new Error('Component ID or pattern is required');
    }

    // Initialize indexer
    await indexer.initialize();

    // Create context generation options
    const contextOptions = createDefaultOptions({
      targetTokenSize: options.targetTokens || 8000,
      maxDepth: options.depth || 3,
      includeSourceCode: options.includeSource ?? true,
      includeRelationships: options.includeRelationships ?? true,
      includeDocumentation: options.includeDocumentation ?? true,
      outputFormat: options.format || 'markdown',
      priorityComponents: []
    });

    // Find component - try exact name match first, then search
    let targetComponent: IComponent | undefined;
    
    // First try to find by exact name match (case-insensitive)
    const componentName = options.component!;
    const searchResults = await indexer.searchComponents({ query: componentName, limit: 100 });
    targetComponent = searchResults.items.find(c => 
      c.name.toLowerCase() === componentName.toLowerCase()
    );
    
    // If no exact match, look for partial matches prioritizing classes and interfaces
    if (!targetComponent) {
      const priorityTypes = ['class', 'interface', 'function', 'method'];
      for (const type of priorityTypes) {
        targetComponent = searchResults.items.find(c => 
          c.type === type && c.name.toLowerCase().includes(componentName.toLowerCase())
        );
        if (targetComponent) break;
      }
    }
    
    // If still no match, take the first result
    if (!targetComponent && searchResults.items.length > 0) {
      targetComponent = searchResults.items[0];
    }
    
    if (!targetComponent) {
      throw new Error(`No component found matching: ${componentName}`);
    }
    console.log(`🎯 Found component: ${targetComponent.name} (${targetComponent.type})`);

    // Get the knowledge graph from indexer
    const knowledgeGraph = await indexer.getKnowledgeGraph();
    
    // Map context options to architectural-intelligence format
    const archContextOptions = {
      ...contextOptions,
      outputFormat: contextOptions.outputFormat === 'index' ? 'json' : contextOptions.outputFormat
    };
    
    // Create context generator with the real knowledge graph
    const contextGenerator = new ContextGenerationAPI(knowledgeGraph, [], archContextOptions);

    // Generate context using the component ID
    const result = await contextGenerator.generateContext({ 
      query: targetComponent.id,
      componentId: targetComponent.id 
    }, archContextOptions);

    // Output result - format it based on the format option
    const output = options.format === 'json' 
      ? JSON.stringify(result, null, 2)
      : `Components: ${result.components.length}, Relationships: ${result.relationships.length}`;
      
    if (options.output) {
      const fs = await import('fs');
      fs.writeFileSync(options.output, output);
      console.log(`📄 Context written to ${options.output}`);
    } else {
      console.log(output);
    }

    // Show statistics
    if (options.verbose && result.metadata) {
      console.log('\n📊 Context Statistics:');
      console.log(`  Components: ${result.metadata.totalComponents}`);
      console.log(`  Relationships: ${result.metadata.totalRelationships}`);
      console.log(`  Token count: ${result.metadata.tokenCount}`);
      console.log(`  Relevance score: ${result.metadata.relevanceScore}`);
      if (result.metadata.truncated) {
        console.log('  ⚠️  Output was truncated to fit token limit');
      }
    }

    await indexer.close();

  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error));
  }
}