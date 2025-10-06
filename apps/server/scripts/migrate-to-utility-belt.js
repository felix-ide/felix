#!/usr/bin/env node

/**
 * Migration script to transfer data from experimental node:sqlite to utility-belt better-sqlite3
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, renameSync, copyFileSync } from 'fs';
import { NativeSQLiteAdapter } from '../dist/storage/adapters/NativeSQLiteAdapter.js';
import { UtilityBeltAdapter } from '../dist/storage/adapters/UtilityBeltAdapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptDir = join(__dirname, '..');

// Find the actual project root (go up until we find the database files)
let projectRoot = process.cwd();
let INDEX_DB_PATH = join(projectRoot, '.felix.index.db');
let METADATA_DB_PATH = join(projectRoot, '.felix.metadata.db');

// If not found in current directory, try parent directory
if (!existsSync(INDEX_DB_PATH) || !existsSync(METADATA_DB_PATH)) {
  projectRoot = dirname(projectRoot);
  INDEX_DB_PATH = join(projectRoot, '.felix.index.db');
  METADATA_DB_PATH = join(projectRoot, '.felix.metadata.db');
}

const BACKUP_SUFFIX = '.backup-before-utility-belt-migration';

async function main() {
  console.log('🚀 Starting migration from experimental SQLite to utility-belt better-sqlite3');
  
  // Check if databases exist
  const indexExists = existsSync(INDEX_DB_PATH);
  const metadataExists = existsSync(METADATA_DB_PATH);
  
  if (!indexExists && !metadataExists) {
    console.log('✅ No existing databases found. Migration not needed.');
    return;
  }
  
  console.log(`📋 Found databases: index=${indexExists}, metadata=${metadataExists}`);
  
  try {
    // Step 1: Create backups
    console.log('📦 Creating backups...');
    if (indexExists) {
      copyFileSync(INDEX_DB_PATH, INDEX_DB_PATH + BACKUP_SUFFIX);
      console.log(`✅ Backed up index.db`);
    }
    if (metadataExists) {
      copyFileSync(METADATA_DB_PATH, METADATA_DB_PATH + BACKUP_SUFFIX);
      console.log(`✅ Backed up metadata.db`);
    }
    
    // Step 2: Initialize old adapter (experimental SQLite)
    console.log('🔧 Initializing experimental SQLite adapter...');
    const oldAdapter = new NativeSQLiteAdapter(INDEX_DB_PATH, METADATA_DB_PATH);
    await oldAdapter.initialize();
    
    // Step 3: Export all data
    console.log('📤 Exporting data from experimental SQLite...');
    const exportedData = await oldAdapter.exportToJSON();
    console.log(`📊 Exported ${exportedData.components.length} components, ${exportedData.relationships.length} relationships`);
    
    // Export metadata separately using direct SQL queries to bypass any manager limitations
    const db = oldAdapter.getDatabase();
    
    console.log('🔍 Checking database contents directly...');
    
    // Direct SQL queries to count everything
    const notesCount = db.prepare('SELECT COUNT(*) as count FROM meta.notes').get();
    const tasksCount = db.prepare('SELECT COUNT(*) as count FROM meta.tasks').get();
    const rulesCount = db.prepare('SELECT COUNT(*) as count FROM meta.rules').get();
    
    console.log(`📊 Direct counts: ${notesCount.count} notes, ${tasksCount.count} tasks, ${rulesCount.count} rules`);
    
    // Export using direct SQL
    const notes = db.prepare('SELECT * FROM meta.notes').all();
    const tasks = db.prepare('SELECT * FROM meta.tasks').all();
    const rules = db.prepare('SELECT * FROM meta.rules').all();
    
    console.log(`📊 Exported ${notes.length} notes, ${tasks.length} tasks, ${rules.length} rules`);
    
    // Step 4: Close old adapter
    await oldAdapter.close();
    
    // Step 5: Initialize new adapter with new database names (utility-belt better-sqlite3)
    console.log('🔧 Initializing utility-belt adapter with new database files...');
    const newIndexPath = INDEX_DB_PATH.replace('.db', '.utility-belt.db');
    const newMetadataPath = METADATA_DB_PATH.replace('.db', '.utility-belt.db');
    
    console.log(`📁 New database paths: ${newIndexPath}, ${newMetadataPath}`);
    
    const newAdapter = new UtilityBeltAdapter(newIndexPath, newMetadataPath);
    await newAdapter.initialize();
    
    // Step 7: Import all data
    console.log('📥 Importing data to utility-belt better-sqlite3...');
    
    // Import components and relationships
    if (exportedData.components.length > 0) {
      await newAdapter.storeComponents(exportedData.components);
      console.log(`✅ Imported ${exportedData.components.length} components`);
    }
    
    if (exportedData.relationships.length > 0) {
      await newAdapter.storeRelationships(exportedData.relationships);
      console.log(`✅ Imported ${exportedData.relationships.length} relationships`);
    }
    
    // Import metadata
    for (const note of notes) {
      await newAdapter.storeNote(note);
    }
    console.log(`✅ Imported ${notes.length} notes`);
    
    for (const task of tasks) {
      await newAdapter.storeTask(task);
    }
    console.log(`✅ Imported ${tasks.length} tasks`);
    
    for (const rule of rules) {
      await newAdapter.storeRule(rule);
    }
    console.log(`✅ Imported ${rules.length} rules`);
    
    // Step 8: Verify migration
    console.log('🔍 Verifying migration...');
    const newStats = await newAdapter.getStats();
    console.log(`📊 New database stats: ${newStats.componentCount} components, ${newStats.relationshipCount} relationships`);
    
    const newNotes = await newAdapter.listNotes({});
    const newTasks = await newAdapter.listTasks({});
    const newRules = await newAdapter.getAllRules();
    
    console.log(`📊 New metadata counts: ${newNotes.length} notes, ${newTasks.length} tasks, ${newRules.length} rules`);
    
    // Verify counts match
    const componentsMatch = exportedData.components.length === newStats.componentCount;
    const relationshipsMatch = exportedData.relationships.length === newStats.relationshipCount;
    const notesMatch = notes.length === newNotes.length;
    const tasksMatch = tasks.length === newTasks.length;
    const rulesMatch = rules.length === newRules.length;
    
    if (componentsMatch && relationshipsMatch && notesMatch && tasksMatch && rulesMatch) {
      console.log('✅ Migration verified successfully!');
      
      // Step 9: Rename databases - move old to .bak and new to current names
      console.log('🔄 Finalizing migration - renaming databases...');
      
      // Move original databases to .bak extension
      const bakIndexPath = INDEX_DB_PATH + '.bak';
      const bakMetadataPath = METADATA_DB_PATH + '.bak';
      
      if (existsSync(INDEX_DB_PATH)) {
        renameSync(INDEX_DB_PATH, bakIndexPath);
        console.log(`📦 Moved original index database to: ${bakIndexPath}`);
      }
      if (existsSync(METADATA_DB_PATH)) {
        renameSync(METADATA_DB_PATH, bakMetadataPath);
        console.log(`📦 Moved original metadata database to: ${bakMetadataPath}`);
      }
      
      // Move new databases to current names
      renameSync(newIndexPath, INDEX_DB_PATH);
      renameSync(newMetadataPath, METADATA_DB_PATH);
      console.log(`✅ New utility-belt databases now active: ${INDEX_DB_PATH}, ${METADATA_DB_PATH}`);
      
      console.log('🎉 Migration completed successfully!');
      console.log('💡 Your felix is now using utility-belt better-sqlite3!');
      console.log(`📦 Original databases backed up as: ${bakIndexPath}, ${bakMetadataPath}`);
      console.log(`📦 Emergency backups available at: ${INDEX_DB_PATH}${BACKUP_SUFFIX}, ${METADATA_DB_PATH}${BACKUP_SUFFIX}`);
      console.log('');
      console.log('✅ Next steps:');
      console.log('1. Remove the --experimental-sqlite flag from package.json start script');
      console.log('2. Test that your server starts correctly with the new databases');
      console.log('3. If everything works, you can delete the backup files after testing');
      
    } else {
      throw new Error('Migration verification failed - data counts do not match');
    }
    
    await newAdapter.close();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('🔄 Attempting to restore from backups...');
    
    try {
      // Restore backups
      if (existsSync(INDEX_DB_PATH + BACKUP_SUFFIX)) {
        copyFileSync(INDEX_DB_PATH + BACKUP_SUFFIX, INDEX_DB_PATH);
        console.log('✅ Restored index.db from backup');
      }
      if (existsSync(METADATA_DB_PATH + BACKUP_SUFFIX)) {
        copyFileSync(METADATA_DB_PATH + BACKUP_SUFFIX, METADATA_DB_PATH);
        console.log('✅ Restored metadata.db from backup');
      }
      console.log('🔄 Rollback completed');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError);
      console.log(`📦 Manual restore needed from: ${INDEX_DB_PATH}${BACKUP_SUFFIX}, ${METADATA_DB_PATH}${BACKUP_SUFFIX}`);
    }
    
    process.exit(1);
  }
}

// Handle CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
}

export { main as migrateToUtilityBelt };