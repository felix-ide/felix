import { DatabaseManager } from '../../storage/DatabaseManager.js';
import { RelationshipInverter } from '../../../core/RelationshipInverter.js';
import { IRelationship } from '@felix/code-intelligence';
import { logger } from '../../../shared/logger.js';

/**
 * Configuration for batch processing
 */
const BATCH_CONFIG = {
  // Optimal batch size for TypeORM bulk operations (tested for best performance)
  RELATIONSHIP_BATCH_SIZE: 500,
  COMPONENT_BATCH_SIZE: 200,
  // Enable parallel batch processing
  ENABLE_PARALLEL_BATCHES: true,
  // Maximum parallel batches to prevent overwhelming the database
  MAX_PARALLEL_BATCHES: 3,
};

export class IndexPersistence {
  constructor(private readonly dbManager: DatabaseManager) {}

  /**
   * Persist components and relationships with optimized batch processing
   */
  async persist(filePath: string, components: any[], relationships: any[]): Promise<void> {
    const startTime = Date.now();

    // Process components in optimized batches
    if (components.length > 0) {
      await this.persistComponentsBatched(components);
    }

    // Process relationships with semantic data flow optimization
    if (relationships.length > 0) {
      await this.persistRelationshipsBatched(relationships);
    }

    const duration = Date.now() - startTime;
    logger.debug(`Persisted ${components.length} components and ${relationships.length} relationships in ${duration}ms`, {
      file: filePath,
      componentsPerSec: Math.round((components.length / duration) * 1000),
      relationshipsPerSec: Math.round((relationships.length / duration) * 1000),
    });
  }

  /**
   * Persist components in optimized batches
   */
  private async persistComponentsBatched(components: any[]): Promise<void> {
    const batches = this.chunkArray(components, BATCH_CONFIG.COMPONENT_BATCH_SIZE);

    if (BATCH_CONFIG.ENABLE_PARALLEL_BATCHES && batches.length > 1) {
      // Process batches in parallel with concurrency limit
      await this.processInParallel(batches, async (batch) => {
        await this.dbManager.runWrite(async () => {
          await this.dbManager.getComponentRepository().storeComponents(batch);
        });
      }, BATCH_CONFIG.MAX_PARALLEL_BATCHES);
    } else {
      // Process sequentially for small datasets
      for (const batch of batches) {
        await this.dbManager.runWrite(async () => {
          await this.dbManager.getComponentRepository().storeComponents(batch);
        });
      }
    }
  }

  /**
   * Persist relationships with semantic relationship optimization
   */
  private async persistRelationshipsBatched(relationships: any[]): Promise<void> {
    const startTime = Date.now();

    // Generate inverse relationships for bidirectional navigation
    const inverseRelationships = RelationshipInverter.generateInverses(relationships as IRelationship[]);
    const allRelationships = [...relationships, ...inverseRelationships];

    logger.debug(`Generated ${inverseRelationships.length} inverse relationships`, {
      original: relationships.length,
      total: allRelationships.length,
    });

    // Separate semantic data flow relationships for prioritized processing
    const { semanticRels, structuralRels } = this.categorizeRelationships(allRelationships as IRelationship[]);

    // Process structural relationships first (faster, establish base graph)
    if (structuralRels.length > 0) {
      await this.processBatchedRelationships(structuralRels, 'structural');
    }

    // Then process semantic relationships (may be slower due to metadata)
    if (semanticRels.length > 0) {
      await this.processBatchedRelationships(semanticRels, 'semantic');
    }

    const duration = Date.now() - startTime;
    logger.debug(`Persisted ${allRelationships.length} relationships in ${duration}ms`, {
      structural: structuralRels.length,
      semantic: semanticRels.length,
      throughput: Math.round((allRelationships.length / duration) * 1000),
    });
  }

  /**
   * Process relationships in optimized batches
   */
  private async processBatchedRelationships(
    relationships: IRelationship[],
    category: 'structural' | 'semantic'
  ): Promise<void> {
    const batches = this.chunkArray(relationships, BATCH_CONFIG.RELATIONSHIP_BATCH_SIZE);

    if (BATCH_CONFIG.ENABLE_PARALLEL_BATCHES && batches.length > 1) {
      // Process batches in parallel with concurrency limit
      await this.processInParallel(batches, async (batch) => {
        await this.dbManager.runWrite(async () => {
          await this.dbManager.getRelationshipRepository().storeRelationships(batch);
        });
      }, BATCH_CONFIG.MAX_PARALLEL_BATCHES);
    } else {
      // Process sequentially for small datasets
      for (const batch of batches) {
        await this.dbManager.runWrite(async () => {
          await this.dbManager.getRelationshipRepository().storeRelationships(batch);
        });
      }
    }
  }

  /**
   * Categorize relationships into structural vs semantic
   * Semantic relationships include data flow and pattern detection
   */
  private categorizeRelationships(relationships: IRelationship[]): {
    semanticRels: IRelationship[];
    structuralRels: IRelationship[];
  } {
    const semanticTypes = new Set([
      'uses_field',
      'transforms_data',
      'passes_to',
      'returns_from',
      'reads_from',
      'writes_to',
      'derives_from',
      'modifies',
      'awaits',
      'yields',
      'observes_pattern',
    ]);

    const semanticRels: IRelationship[] = [];
    const structuralRels: IRelationship[] = [];

    for (const rel of relationships) {
      if (semanticTypes.has(rel.type)) {
        semanticRels.push(rel);
      } else {
        structuralRels.push(rel);
      }
    }

    return { semanticRels, structuralRels };
  }

  /**
   * Split array into chunks of specified size
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Process items in parallel with concurrency limit
   */
  private async processInParallel<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    concurrencyLimit: number
  ): Promise<void> {
    const executing: Promise<void>[] = [];

    for (const item of items) {
      const promise = processor(item);
      executing.push(promise);

      if (executing.length >= concurrencyLimit) {
        await Promise.race(executing);
        // Remove completed promises
        executing.splice(
          executing.findIndex((p) => p === promise),
          1
        );
      }
    }

    // Wait for remaining promises
    await Promise.all(executing);
  }
}
