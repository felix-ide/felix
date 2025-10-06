/**
 * Adapter for the semantic-intelligence EmbeddingService from @felix/code-intelligence
 * Provides type-specific converters for Felix entities
 */

import { EmbeddingService as BaseEmbeddingService } from '@felix/code-intelligence';
import type { EmbeddingServiceOptions, EmbeddingResult, TextConverter } from '@felix/code-intelligence';
import type { IComponent } from '@felix/code-intelligence';
import type { ITask } from '@felix/code-intelligence';
import type { INote } from '@felix/code-intelligence';
import type { IRule } from '@felix/code-intelligence';
import { TextConverters } from '../features/embeddings/domain/converters/TextConverters.js';
import { SidecarEmbeddingClient } from './clients/SidecarEmbeddingClient.js';

// Re-export TextConverters for clean imports
export { TextConverters };

/**
 * Extended EmbeddingService with Felix specific methods
 */
export class EmbeddingService extends BaseEmbeddingService {
  private engine: 'js-local' | 'python-sidecar';
  private sidecar?: SidecarEmbeddingClient;

  constructor(options: EmbeddingServiceOptions = {}) {
    super(options);
    this.engine = (process.env.FELIX_EMBEDDINGS_ENGINE as any) || 'python-sidecar';
    if (this.engine === 'python-sidecar') {
      const baseUrl = process.env.SIDE_CAR_BASE_URL || 'http://127.0.0.1:8088';
      const timeoutMs = Number(process.env.SIDE_CAR_TIMEOUT_MS || 20000);
      const retries = Number(process.env.SIDE_CAR_RETRY_MAX || 3);
      const batchSize = Number(process.env.EMBED_BATCH_SIZE || 128);
      const authToken = process.env.SIDECAR_AUTH_TOKEN;
      this.sidecar = new SidecarEmbeddingClient({ baseUrl, timeoutMs, retries, batchSize, authToken });
    }
  }

  async getEmbedding(text: string): Promise<EmbeddingResult> {
    if (this.engine === 'python-sidecar' && this.sidecar) {
      return await this.sidecar.getEmbedding(text);
    }
    return super.getEmbedding(text);
  }

  async getEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (this.engine === 'python-sidecar' && this.sidecar) {
      // Process individually to isolate failures
      const results: EmbeddingResult[] = [];
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        if (!text) {
          console.error(`[Embeddings] Skipping empty/undefined text at index ${i}`);
          continue;
        }
        try {
          const result = await this.sidecar.getEmbedding(text);
          results.push(result);
        } catch (err) {
          console.error(`[Embeddings] Failed to embed item ${i}/${texts.length}:`, {
            textPreview: text.substring(0, 100),
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined
          });
          // Skip this item - don't switch engines
          throw err; // Re-throw to fail the whole batch
        }
      }
      return results;
    }
    const results: EmbeddingResult[] = [];
    for (const t of texts) {
      results.push(await super.getEmbedding(t));
    }
    return results;
  }

  /**
   * Generic method to generate embedding for any entity
   */
  private async _generateEntityEmbedding<T>(entity: T, converter: TextConverter<T>): Promise<EmbeddingResult> {
    const text = converter(entity);
    return this.getEmbedding(text);
  }

  /**
   * Generic method to generate embeddings for multiple entities
   */
  private async _generateEntityEmbeddings<T>(entities: T[], converter: TextConverter<T>): Promise<EmbeddingResult[]> {
    const texts = entities.map(entity => converter(entity));
    return this.getEmbeddings(texts);
  }

  /**
   * Generate embedding for a component
   */
  async generateComponentEmbedding(component: IComponent): Promise<EmbeddingResult> {
    return this._generateEntityEmbedding(component, TextConverters.component);
  }

  /**
   * Generate embeddings for multiple components in batch
   */
  async generateComponentEmbeddings(components: IComponent[]): Promise<EmbeddingResult[]> {
    return this._generateEntityEmbeddings(components, TextConverters.component);
  }

  /**
   * Generate embedding for a task
   */
  async generateTaskEmbedding(task: ITask): Promise<EmbeddingResult> {
    return this._generateEntityEmbedding(task, TextConverters.task);
  }

  /**
   * Generate embeddings for multiple tasks in batch
   */
  async generateTaskEmbeddings(tasks: ITask[]): Promise<EmbeddingResult[]> {
    return this._generateEntityEmbeddings(tasks, TextConverters.task);
  }

  /**
   * Generate embedding for a note
   */
  async generateNoteEmbedding(note: INote): Promise<EmbeddingResult> {
    return this._generateEntityEmbedding(note, TextConverters.note);
  }

  /**
   * Generate embeddings for multiple notes in batch
   */
  async generateNoteEmbeddings(notes: INote[]): Promise<EmbeddingResult[]> {
    return this._generateEntityEmbeddings(notes, TextConverters.note);
  }

  /**
   * Generate embedding for a rule
   */
  async generateRuleEmbedding(rule: IRule): Promise<EmbeddingResult> {
    return this._generateEntityEmbedding(rule, TextConverters.rule);
  }

  /**
   * Generate embeddings for multiple rules in batch
   */
  async generateRuleEmbeddings(rules: IRule[]): Promise<EmbeddingResult[]> {
    return this._generateEntityEmbeddings(rules, TextConverters.rule);
  }
}
