#!/usr/bin/env node

// Script to generate embeddings for all existing metadata entities
// Run with: node generate-embeddings.js

import { CodeIndexer } from './dist/core/CodeIndexer.js';
import { StorageFactory } from './dist/storage/StorageFactory.js';
import path from 'path';

async function main() {
  const projectPath = process.cwd();
  const indexDbPath = path.join(projectPath, '.felix.index.db');
  const metadataDbPath = path.join(projectPath, '.felix.metadata.db');
  
  console.log('🚀 Generating embeddings for metadata entities...');
  console.log(`   Index DB: ${indexDbPath}`);
  console.log(`   Metadata DB: ${metadataDbPath}`);
  
  try {
    // Create storage adapter
    const storage = await StorageFactory.create('typeorm', {
      indexDbPath,
      metadataDbPath
    });
    
    // Initialize storage
    await storage.initialize();
    
    // Create CodeIndexer
    const indexer = new CodeIndexer(projectPath, storage);
    
    // Generate embeddings for all metadata
    console.log('📝 Starting embedding generation...');
    const result = await indexer.indexAllMetadataEntities();
    
    console.log('✅ Embedding generation complete!');
    console.log(`   Tasks indexed: ${result.tasksIndexed}`);
    console.log(`   Notes indexed: ${result.notesIndexed}`);
    console.log(`   Rules indexed: ${result.rulesIndexed}`);
    
    if (result.errors.length > 0) {
      console.log(`⚠️  ${result.errors.length} errors occurred:`);
      result.errors.forEach(err => console.log(`   - ${err}`));
    }
    
    // Close storage
    await storage.close();
    
  } catch (error) {
    console.error('❌ Error generating embeddings:', error);
    process.exit(1);
  }
}

main().catch(console.error);