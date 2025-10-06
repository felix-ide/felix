/**
 * Simple migration runner for database schema updates
 */

import type { Database } from 'better-sqlite3';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export class MigrationRunner {
  constructor(private db: Database) {}

  /**
   * Run all pending migrations
   */
  async runMigrations(migrationsPath: string): Promise<void> {
    // Create migrations table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of migration files
    const migrationFiles = readdirSync(migrationsPath)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Ensures migrations run in order

    // Get applied migrations
    const appliedMigrations = new Set(
      this.db.prepare('SELECT id FROM migrations').all().map((row: any) => row.id)
    );

    // Run pending migrations
    for (const file of migrationFiles) {
      const migrationId = file.replace('.sql', '');
      
      if (!appliedMigrations.has(migrationId)) {
        console.log(`Running migration: ${migrationId}`);
        
        try {
          const sql = readFileSync(join(migrationsPath, file), 'utf-8');
          
          // Run migration in a transaction
          this.db.transaction(() => {
            // Execute the migration
            this.db.exec(sql);
            
            // Record that migration was applied
            this.db.prepare('INSERT INTO migrations (id) VALUES (?)').run(migrationId);
          })();
          
          console.log(`Migration ${migrationId} completed successfully`);
        } catch (error) {
          console.error(`Migration ${migrationId} failed:`, error);
          throw error;
        }
      }
    }
  }
}