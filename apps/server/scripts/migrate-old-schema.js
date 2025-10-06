#!/usr/bin/env node

/**
 * Migration script to update old schema databases to new TypeORM schema
 * Preserves existing data while adding missing columns
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function migrateDatabase(dbPath) {
  console.log(`🔄 Migrating database: ${dbPath}`);
  
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  try {
    // Start transaction
    await db.exec('BEGIN TRANSACTION');

    // Check if migration is needed by checking for new columns
    const columns = await db.all(`PRAGMA table_info(rules)`);
    const columnNames = columns.map(c => c.name);
    
    if (columnNames.includes('parent_id')) {
      console.log('✅ Database already migrated');
      return;
    }

    console.log('📝 Adding missing columns to rules table...');
    
    // Add missing columns with defaults
    const alterStatements = [
      `ALTER TABLE rules ADD COLUMN parent_id TEXT`,
      `ALTER TABLE rules ADD COLUMN sort_order INTEGER DEFAULT 0`,
      `ALTER TABLE rules ADD COLUMN depth_level INTEGER DEFAULT 0`,
      `ALTER TABLE rules ADD COLUMN guidance_text TEXT DEFAULT ''`,
      `ALTER TABLE rules ADD COLUMN code_template TEXT`,
      `ALTER TABLE rules ADD COLUMN validation_script TEXT`,
      `ALTER TABLE rules ADD COLUMN trigger_patterns TEXT`,
      `ALTER TABLE rules ADD COLUMN semantic_triggers TEXT`,
      `ALTER TABLE rules ADD COLUMN context_conditions TEXT`,
      `ALTER TABLE rules ADD COLUMN exclusion_patterns TEXT`,
      `ALTER TABLE rules ADD COLUMN priority INTEGER DEFAULT 5`,
      `ALTER TABLE rules ADD COLUMN auto_apply INTEGER DEFAULT 0`,
      `ALTER TABLE rules ADD COLUMN merge_strategy TEXT DEFAULT 'replace'`,
      `ALTER TABLE rules ADD COLUMN confidence_threshold REAL DEFAULT 0.8`,
      `ALTER TABLE rules ADD COLUMN usage_count INTEGER DEFAULT 0`,
      `ALTER TABLE rules ADD COLUMN acceptance_rate REAL DEFAULT 0`,
      `ALTER TABLE rules ADD COLUMN effectiveness_score REAL DEFAULT 0`,
      `ALTER TABLE rules ADD COLUMN last_used DATETIME`,
      `ALTER TABLE rules ADD COLUMN created_by TEXT`,
      `ALTER TABLE rules ADD COLUMN entity_type TEXT`,
      `ALTER TABLE rules ADD COLUMN entity_id TEXT`,
      `ALTER TABLE rules ADD COLUMN stable_links TEXT`,
      `ALTER TABLE rules ADD COLUMN fragile_links TEXT`,
      `ALTER TABLE rules ADD COLUMN semantic_context TEXT`,
      `ALTER TABLE rules ADD COLUMN semantic_embedding BLOB`,
      `ALTER TABLE rules ADD COLUMN stable_tags TEXT`,
      `ALTER TABLE rules ADD COLUMN auto_tags TEXT`,
      `ALTER TABLE rules ADD COLUMN contextual_tags TEXT`,
      `ALTER TABLE rules ADD COLUMN entity_links TEXT`,
      `ALTER TABLE rules ADD COLUMN is_active INTEGER DEFAULT 1`
    ];

    for (const stmt of alterStatements) {
      try {
        await db.exec(stmt);
        console.log(`  ✓ ${stmt.split(' ')[4]}`);
      } catch (e) {
        if (!e.message.includes('duplicate column')) {
          throw e;
        }
      }
    }

    // Migrate guidance_text from template if it exists
    await db.exec(`UPDATE rules SET guidance_text = COALESCE(template, guidance, '') WHERE guidance_text = ''`);

    // Create indices
    console.log('📝 Creating indices...');
    const indexStatements = [
      `CREATE INDEX IF NOT EXISTS idx_rules_parent ON rules(parent_id)`,
      `CREATE INDEX IF NOT EXISTS idx_rules_priority ON rules(priority)`,
      `CREATE INDEX IF NOT EXISTS idx_rules_type ON rules(rule_type)`,
      `CREATE INDEX IF NOT EXISTS idx_rules_updated ON rules(updated_at)`,
      `CREATE INDEX IF NOT EXISTS idx_rules_active ON rules(is_active)`
    ];

    for (const stmt of indexStatements) {
      await db.exec(stmt);
    }

    // Similar for tasks table if it exists
    const tasksTables = await db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'`);
    if (tasksTables.length > 0) {
      console.log('📝 Migrating tasks table...');
      const taskAlters = [
        `ALTER TABLE tasks ADD COLUMN entity_links TEXT`,
        `ALTER TABLE tasks ADD COLUMN context_tags TEXT`,
        `ALTER TABLE tasks ADD COLUMN auto_tags TEXT`,
        `ALTER TABLE tasks ADD COLUMN stable_tags TEXT`,
        `ALTER TABLE tasks ADD COLUMN semantic_context TEXT`,
        `ALTER TABLE tasks ADD COLUMN semantic_embedding BLOB`
      ];

      for (const stmt of taskAlters) {
        try {
          await db.exec(stmt);
        } catch (e) {
          if (!e.message.includes('duplicate column')) {
            throw e;
          }
        }
      }
    }

    // Commit transaction
    await db.exec('COMMIT');
    console.log('✅ Migration completed successfully');

  } catch (error) {
    await db.exec('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run migration
const dbPath = process.argv[2];
if (!dbPath) {
  console.error('Usage: node migrate-old-schema.js <database-path>');
  process.exit(1);
}

migrateDatabase(dbPath).catch(console.error);