#!/usr/bin/env node

// Migrate all databases from 'active' to 'is_active' column
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

async function migrateDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    console.log(`\n📦 Migrating: ${dbPath}`);
    
    const db = new sqlite3.Database(dbPath);
    
    db.serialize(() => {
      // Check if rules table exists
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='rules'", (err, row) => {
        if (err) {
          console.error(`❌ Error checking table: ${err.message}`);
          db.close();
          return reject(err);
        }
        
        if (!row) {
          console.log(`⏭️  No rules table found, skipping`);
          db.close();
          return resolve();
        }
        
        // Check which column exists
        db.get("PRAGMA table_info(rules)", (err, row) => {
          if (err) {
            console.error(`❌ Error checking columns: ${err.message}`);
            db.close();
            return reject(err);
          }
          
          // Get all column info
          db.all("PRAGMA table_info(rules)", (err, columns) => {
            if (err) {
              console.error(`❌ Error getting columns: ${err.message}`);
              db.close();
              return reject(err);
            }
            
            const hasActive = columns.some(col => col.name === 'active');
            const hasIsActive = columns.some(col => col.name === 'is_active');
            
            if (!hasActive && hasIsActive) {
              console.log(`✅ Already migrated (has is_active)`);
              db.close();
              return resolve();
            }
            
            if (hasActive && hasIsActive) {
              console.log(`⚠️  Both columns exist, dropping old 'active' column`);
              // Can't drop columns in SQLite easily, would need to recreate table
              console.log(`⏭️  Skipping cleanup for now`);
              db.close();
              return resolve();
            }
            
            if (hasActive && !hasIsActive) {
              console.log(`🔄 Migrating from 'active' to 'is_active'...`);
              
              // Add new column
              db.run("ALTER TABLE rules ADD COLUMN is_active BOOLEAN DEFAULT 1", (err) => {
                if (err) {
                  console.error(`❌ Error adding column: ${err.message}`);
                  db.close();
                  return reject(err);
                }
                
                // Copy data
                db.run("UPDATE rules SET is_active = active", (err) => {
                  if (err) {
                    console.error(`❌ Error copying data: ${err.message}`);
                    db.close();
                    return reject(err);
                  }
                  
                  // Update index
                  db.run("DROP INDEX IF EXISTS idx_meta_rules_active", (err) => {
                    if (err) console.warn(`⚠️  Could not drop old index: ${err.message}`);
                    
                    db.run("DROP INDEX IF EXISTS idx_rules_active", (err) => {
                      if (err) console.warn(`⚠️  Could not drop old index: ${err.message}`);
                      
                      db.run("CREATE INDEX IF NOT EXISTS idx_rules_active ON rules (is_active)", (err) => {
                        if (err) {
                          console.error(`❌ Error creating index: ${err.message}`);
                        }
                        
                        console.log(`✅ Migration complete!`);
                        db.close();
                        resolve();
                      });
                    });
                  });
                });
              });
            } else {
              console.log(`❓ Unexpected state - no active columns found`);
              db.close();
              resolve();
            }
          });
        });
      });
    });
  });
}

async function findAndMigrateDatabases() {
  console.log('🔍 Finding all .felix.metadata.db files...\n');
  
  const projectRoot = path.dirname(path.dirname(__dirname)); // Go up from felix/felix
  const databases = [];
  
  // Find databases recursively
  function findDatabases(dir, depth = 0) {
    if (depth > 3) return; // Don't go too deep
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.name === '.felix.metadata.db') {
          databases.push(fullPath);
        } else if (entry.isDirectory() && !entry.name.startsWith('.') && 
                   entry.name !== 'node_modules' && entry.name !== 'dist') {
          findDatabases(fullPath, depth + 1);
        }
      }
    } catch (err) {
      // Ignore permission errors
    }
  }
  
  findDatabases(projectRoot);
  
  console.log(`Found ${databases.length} metadata database(s):\n`);
  databases.forEach(db => console.log(`  - ${db}`));
  
  // Migrate each database
  for (const dbPath of databases) {
    try {
      await migrateDatabase(dbPath);
    } catch (err) {
      console.error(`❌ Failed to migrate ${dbPath}: ${err.message}`);
    }
  }
  
  console.log('\n✅ All migrations complete!');
}

// Run the migration
findAndMigrateDatabases().catch(console.error);