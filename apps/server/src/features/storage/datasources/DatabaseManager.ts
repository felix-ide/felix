/**
 * Database Connection Manager
 * Manages TypeORM DataSource instances for both index and metadata databases
 */

import { DataSource } from 'typeorm';
import { logger } from '../../../shared/logger.js';
import { indexDatabaseConfig, metadataDatabaseConfig, validateDatabaseConfig, getDatabaseConfigSummary } from '../config/database.config.js';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private indexDataSource?: DataSource;
  private metadataDataSource?: DataSource;
  private isInitialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize database connections
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info('🔌 Initializing database connections...');
    validateDatabaseConfig();

    try {
      // Initialize index database (SQLite)
      this.indexDataSource = new DataSource(indexDatabaseConfig);
      await this.indexDataSource.initialize();
      logger.info('✅ Index database connected');

      // Initialize metadata database (SQLite or PostgreSQL)
      this.metadataDataSource = new DataSource(metadataDatabaseConfig);
      await this.metadataDataSource.initialize();
      logger.info('✅ Metadata database connected');

      const config = getDatabaseConfigSummary();
      logger.debug('📊 Database configuration:');
      logger.debug(`Index DB: ${config.index.type} - ${config.index.database}`);
      logger.debug(`Metadata DB: ${config.metadata.type} - ${config.metadata.database}`);

      this.isInitialized = true;
    } catch (error) {
      logger.error('❌ Failed to initialize databases:', error);
      throw error;
    }
  }

  /**
   * Get index database DataSource
   */
  public getIndexDataSource(): DataSource {
    if (!this.indexDataSource || !this.indexDataSource.isInitialized) {
      throw new Error('Index database not initialized. Call initialize() first.');
    }
    return this.indexDataSource;
  }

  /**
   * Get metadata database DataSource
   */
  public getMetadataDataSource(): DataSource {
    if (!this.metadataDataSource || !this.metadataDataSource.isInitialized) {
      throw new Error('Metadata database not initialized. Call initialize() first.');
    }
    return this.metadataDataSource;
  }

  /**
   * Check if databases are initialized
   */
  public isReady(): boolean {
    return this.isInitialized && 
           this.indexDataSource?.isInitialized === true && 
           this.metadataDataSource?.isInitialized === true;
  }

  /**
   * Run migrations
   */
  public async runMigrations(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Databases not initialized. Call initialize() first.');
    }

    logger.info('🔄 Running migrations...');
    
    try {
      // Run index database migrations
      const indexMigrations = await this.indexDataSource!.runMigrations();
      logger.info(`✅ Index DB: ${indexMigrations.length} migrations executed`);

      // Run metadata database migrations
      const metadataMigrations = await this.metadataDataSource!.runMigrations();
      logger.info(`✅ Metadata DB: ${metadataMigrations.length} migrations executed`);
    } catch (error) {
      logger.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Close database connections
   */
  public async close(): Promise<void> {
    logger.info('🔌 Closing database connections...');

    try {
      if (this.indexDataSource?.isInitialized) {
        await this.indexDataSource.destroy();
        logger.info('✅ Index database disconnected');
      }

      if (this.metadataDataSource?.isInitialized) {
        await this.metadataDataSource.destroy();
        logger.info('✅ Metadata database disconnected');
      }

      this.isInitialized = false;
    } catch (error) {
      logger.error('❌ Error closing databases:', error);
      throw error;
    }
  }

  /**
   * Execute raw query on index database
   */
  public async executeIndexQuery(query: string, parameters?: any[]): Promise<any> {
    const dataSource = this.getIndexDataSource();
    return dataSource.query(query, parameters);
  }

  /**
   * Execute raw query on metadata database
   */
  public async executeMetadataQuery(query: string, parameters?: any[]): Promise<any> {
    const dataSource = this.getMetadataDataSource();
    return dataSource.query(query, parameters);
  }

  /**
   * Start a transaction on the index database
   */
  public async indexTransaction<T>(work: (manager: any) => Promise<T>): Promise<T> {
    const dataSource = this.getIndexDataSource();
    return dataSource.transaction(work);
  }

  /**
   * Start a transaction on the metadata database
   */
  public async metadataTransaction<T>(work: (manager: any) => Promise<T>): Promise<T> {
    const dataSource = this.getMetadataDataSource();
    return dataSource.transaction(work);
  }

  /**
   * Get database type for metadata database
   */
  public getMetadataDbType(): 'sqlite' | 'postgres' {
    return metadataDatabaseConfig.type as 'sqlite' | 'postgres';
  }

  /**
   * Check if using PostgreSQL for metadata
   */
  public isPostgresMetadata(): boolean {
    return this.getMetadataDbType() === 'postgres';
  }
}
