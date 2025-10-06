#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

async function getTableColumns(dbPath, tableName) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
      db.close();
      if (err) reject(err);
      else resolve(columns.map(col => ({
        name: col.name,
        type: col.type,
        notnull: col.notnull,
        dflt_value: col.dflt_value
      })));
    });
  });
}

async function compareSchemas() {
  const databases = [
    '/Users/epoplive/aigent-smith-clean/aigent-claude/.felix.metadata.db',
    '/Users/epoplive/aigent-smith-clean/felix/.felix.metadata.db'
  ];
  
  const tables = ['rules', 'tasks', 'notes'];
  
  console.log('📊 Comparing schemas between old and new databases:\n');
  
  for (const table of tables) {
    console.log(`\n=== TABLE: ${table} ===\n`);
    
    const schemas = {};
    for (const dbPath of databases) {
      const dbName = path.basename(path.dirname(dbPath));
      try {
        schemas[dbName] = await getTableColumns(dbPath, table);
      } catch (err) {
        console.log(`  ❌ ${dbName}: Table doesn't exist`);
        continue;
      }
    }
    
    // Find differences
    const allColumns = new Set();
    Object.values(schemas).forEach(cols => 
      cols.forEach(col => allColumns.add(col.name))
    );
    
    const differences = [];
    for (const colName of allColumns) {
      const inDbs = [];
      for (const [dbName, cols] of Object.entries(schemas)) {
        const col = cols.find(c => c.name === colName);
        if (col) {
          inDbs.push(`${dbName}: ${col.type}`);
        } else {
          differences.push(`  ⚠️  Column '${colName}' missing in ${dbName}`);
        }
      }
      if (inDbs.length === Object.keys(schemas).length) {
        // Check if types match
        const types = inDbs.map(db => db.split(': ')[1]);
        if ([...new Set(types)].length > 1) {
          differences.push(`  ⚠️  Column '${colName}' has different types: ${inDbs.join(', ')}`);
        }
      }
    }
    
    if (differences.length > 0) {
      console.log('Differences found:');
      differences.forEach(diff => console.log(diff));
    } else {
      console.log('  ✅ Schemas match');
    }
    
    // Show column counts
    for (const [dbName, cols] of Object.entries(schemas)) {
      console.log(`\n  ${dbName}: ${cols.length} columns`);
      // Show columns unique to this DB
      const unique = cols.filter(col => {
        for (const [otherDb, otherCols] of Object.entries(schemas)) {
          if (otherDb !== dbName && !otherCols.find(c => c.name === col.name)) {
            return true;
          }
        }
        return false;
      });
      if (unique.length > 0) {
        console.log(`    Unique columns: ${unique.map(c => c.name).join(', ')}`);
      }
    }
  }
  
  // Check for TypeORM-specific columns that shouldn't exist
  console.log('\n\n=== CHECKING FOR TYPEORM ARTIFACTS ===\n');
  
  for (const dbPath of databases) {
    const dbName = path.basename(path.dirname(dbPath));
    const db = new sqlite3.Database(dbPath);
    
    // Check for TypeORM metadata tables
    await new Promise((resolve) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'typeorm%'", (err, rows) => {
        if (rows && rows.length > 0) {
          console.log(`  ⚠️  ${dbName} has TypeORM tables: ${rows.map(r => r.name).join(', ')}`);
        }
        resolve();
      });
    });
    
    db.close();
  }
  
  console.log('\n✅ Schema comparison complete!');
}

compareSchemas().catch(console.error);