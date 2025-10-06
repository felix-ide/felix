/**
 * Get Component Command - Get detailed component information
 */

import { Command } from 'commander';
import { CodeIndexer } from '../../features/indexing/api/CodeIndexer.js';
import { DatabaseManager } from '../../features/storage/DatabaseManager.js';
import type { GetComponentOptions } from '../types.js';
import { loadConfig, handleError, formatComponents, formatRelationships, outputContent, DATABASE_PREFIX } from '../helpers.js';

export function createGetComponentCommand(): Command {
  return new Command('get-component')
    .description('Get detailed information about a specific component')
    .argument('<id>', 'component ID')
    .option('-r, --relationships', 'include relationships')
    .option('-n, --neighbors', 'include neighbor components')
    .option('-p, --path', 'show path to other components')
    .option('-o, --output <path>', 'output file for results')
    .option('-f, --format <type>', 'output format (json|text|markdown)', 'text')
    .option('-c, --config <path>', 'config file path')
    .option('-v, --verbose', 'verbose output')
    .option('-q, --quiet', 'quiet output')
    .action(async (id: string, options: GetComponentOptions) => {
      try {
        await getComponentCommand(id, options);
      } catch (error) {
        handleError(error, options.verbose);
      }
    });
}

export async function getComponentCommand(id: string, options: GetComponentOptions): Promise<void> {
  const config = loadConfig(options.config);
  
  if (!options.quiet) {
    console.log(`🔍 Getting component: ${id}`);
  }
  
  // Initialize database
  const dbManager = DatabaseManager.getInstance();
  await dbManager.initialize();
  
  // Configure indexer (read-only mode)
  const indexer = new CodeIndexer(dbManager);
  
  try {
    // Initialize indexer
    await indexer.initialize();
    
    // Get the component
    const component = await indexer.getComponent(id);
    
    if (!component) {
      console.error(`❌ Component not found: ${id}`);
      process.exit(1);
    }
    
    // Build output content
    const lines: string[] = [];
    
    if (options.format === 'markdown') {
      lines.push(`# Component: ${component.name}\n`);
      lines.push(`- **ID**: \`${component.id}\``);
      lines.push(`- **Type**: ${component.type}`);
      lines.push(`- **Language**: ${component.language}`);
      lines.push(`- **File**: \`${component.filePath}\``);
      lines.push(`- **Location**: Line ${component.location.startLine}:${component.location.startColumn} - ${component.location.endLine}:${component.location.endColumn}`);
      
      if (Object.keys(component.metadata).length > 0) {
        lines.push('\n## Metadata\n');
        for (const [key, value] of Object.entries(component.metadata)) {
          lines.push(`- **${key}**: ${JSON.stringify(value)}`);
        }
      }
      
    } else if (options.format === 'json') {
      const output: any = { component };
      
      if (options.relationships) {
        const relationships = await indexer.getComponentRelationships(id);
        output.relationships = relationships;
      }
      
      if (options.neighbors) {
        const neighbors = await indexer.getNeighbors(id);
        output.neighbors = neighbors;
      }
      
      lines.push(JSON.stringify(output, null, 2));
      
    } else {
      // Text format
      lines.push(`📋 Component: ${component.name}`);
      lines.push(`   ID: ${component.id}`);
      lines.push(`   Type: ${component.type}`);
      lines.push(`   Language: ${component.language}`);
      lines.push(`   File: ${component.filePath}`);
      lines.push(`   Location: Line ${component.location.startLine}:${component.location.startColumn} - ${component.location.endLine}:${component.location.endColumn}`);
      
      if (Object.keys(component.metadata).length > 0) {
        lines.push('\n📊 Metadata:');
        for (const [key, value] of Object.entries(component.metadata)) {
          lines.push(`   ${key}: ${JSON.stringify(value)}`);
        }
      }
    }
    
    // Add relationships if requested
    if (options.relationships && options.format !== 'json') {
      const relationships = await indexer.getComponentRelationships(id);
      
      if (options.format === 'markdown') {
        if (relationships.outgoing.length > 0) {
          lines.push('\n## Outgoing Relationships\n');
          for (const rel of relationships.outgoing) {
            lines.push(`- **${rel.type}**: \`${rel.sourceId}\` → \`${rel.targetId}\``);
          }
        }
        
        if (relationships.incoming.length > 0) {
          lines.push('\n## Incoming Relationships\n');
          for (const rel of relationships.incoming) {
            lines.push(`- **${rel.type}**: \`${rel.sourceId}\` → \`${rel.targetId}\``);
          }
        }
      } else {
        if (relationships.outgoing.length > 0) {
          lines.push('\n🔗 Outgoing Relationships:');
          for (const rel of relationships.outgoing) {
            lines.push(`   ${rel.type}: ${rel.sourceId} → ${rel.targetId}`);
          }
        }
        
        if (relationships.incoming.length > 0) {
          lines.push('\n🔗 Incoming Relationships:');
          for (const rel of relationships.incoming) {
            lines.push(`   ${rel.type}: ${rel.sourceId} → ${rel.targetId}`);
          }
        }
      }
    }
    
    // Add neighbors if requested
    if (options.neighbors && options.format !== 'json') {
      const neighbors = await indexer.getNeighbors(id);
      
      if (neighbors.length > 0) {
        if (options.format === 'markdown') {
          lines.push('\n## Neighbors\n');
          for (const neighborId of neighbors) {
            lines.push(`- \`${neighborId}\``);
          }
        } else {
          lines.push('\n👥 Neighbors:');
          for (const neighborId of neighbors) {
            lines.push(`   ${neighborId}`);
          }
        }
      }
    }
    
    // Output the content
    const content = lines.join('\n');
    outputContent(content, options.output);
    
    await indexer.close();
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('no such table')) {
      console.error('❌ No index found. Run "felix create-index" first.');
      process.exit(1);
    }
    throw error;
  }
}