/**
 * Query expansion for improving search results
 */

import type { EmbeddingService } from '../EmbeddingService.js';
import { extractWordsFromIdentifier, extractWordsFromText, isCommonWord } from '../text/processing.js';

/**
 * Configuration for query expansion
 */
export interface QueryExpansionConfig {
  /** Maximum number of expanded terms to return */
  maxTerms?: number;
  /** Minimum similarity threshold for related terms */
  minSimilarity?: number;
  /** Whether to include synonyms */
  includeSynonyms?: boolean;
  /** Whether to include related concepts */
  includeRelatedConcepts?: boolean;
  /** Custom term filter */
  termFilter?: (term: string) => boolean;
}

/**
 * Suggested term with metadata
 */
export interface SuggestedTerm {
  term: string;
  score: number;
  source: 'synonym' | 'related' | 'context' | 'embedding';
  confidence: number;
}

/**
 * Query expansion result
 */
export interface QueryExpansionResult {
  originalQuery: string;
  expandedTerms: string[];
  suggestedTerms: SuggestedTerm[];
  relatedConcepts: string[];
}

/**
 * Query expander for semantic search
 */
export class QueryExpander {
  private embeddingService?: EmbeddingService;
  private synonymMap: Map<string, string[]>;
  private conceptMap: Map<string, string[]>;

  constructor(embeddingService?: EmbeddingService) {
    this.embeddingService = embeddingService;
    this.synonymMap = this.buildSynonymMap();
    this.conceptMap = this.buildConceptMap();
  }

  /**
   * Expand a query with related terms
   */
  async expand(
    query: string,
    config: QueryExpansionConfig = {}
  ): Promise<QueryExpansionResult> {
    const {
      maxTerms = 10,
      minSimilarity = 0.5,
      includeSynonyms = true,
      includeRelatedConcepts = true,
      termFilter
    } = config;

    const result: QueryExpansionResult = {
      originalQuery: query,
      expandedTerms: [],
      suggestedTerms: [],
      relatedConcepts: []
    };

    // Extract base terms from query
    const queryTerms = this.extractQueryTerms(query);

    // Add synonyms
    if (includeSynonyms) {
      const synonyms = this.findSynonyms(queryTerms);
      for (const synonym of synonyms) {
        if (!termFilter || termFilter(synonym)) {
          result.suggestedTerms.push({
            term: synonym,
            score: 0.9,
            source: 'synonym',
            confidence: 0.9
          });
        }
      }
    }

    // Add related concepts
    if (includeRelatedConcepts) {
      const concepts = this.findRelatedConcepts(queryTerms);
      result.relatedConcepts = concepts.filter(c => !termFilter || termFilter(c));
      
      // Add concepts as suggested terms
      for (const concept of result.relatedConcepts) {
        result.suggestedTerms.push({
          term: concept,
          score: 0.7,
          source: 'related',
          confidence: 0.7
        });
      }
    }

    // Use embeddings for semantic expansion if available
    if (this.embeddingService) {
      const embeddingTerms = await this.expandWithEmbeddings(query, minSimilarity);
      for (const term of embeddingTerms) {
        if (!termFilter || termFilter(term)) {
          result.suggestedTerms.push({
            term,
            score: 0.8,
            source: 'embedding',
            confidence: 0.8
          });
        }
      }
    }

    // Sort by score and deduplicate
    result.suggestedTerms = this.deduplicateAndSort(result.suggestedTerms);
    
    // Extract top expanded terms
    result.expandedTerms = result.suggestedTerms
      .slice(0, maxTerms)
      .map(t => t.term);

    return result;
  }

  /**
   * Extract meaningful terms from a query
   */
  private extractQueryTerms(query: string): string[] {
    const terms = new Set<string>();
    
    // Split on common separators
    const parts = query.split(/[\s,;.()[\]{}]+/);
    
    for (const part of parts) {
      // Handle identifiers (camelCase, snake_case)
      const identifierWords = extractWordsFromIdentifier(part);
      identifierWords.forEach(w => terms.add(w));
      
      // Handle regular words
      const words = extractWordsFromText(part);
      words.forEach(w => {
        if (!isCommonWord(w)) {
          terms.add(w);
        }
      });
    }
    
    return Array.from(terms);
  }

  /**
   * Find synonyms for terms
   */
  private findSynonyms(terms: string[]): string[] {
    const synonyms = new Set<string>();
    
    for (const term of terms) {
      const termLower = term.toLowerCase();
      const termSynonyms = this.synonymMap.get(termLower) || [];
      termSynonyms.forEach(s => synonyms.add(s));
    }
    
    return Array.from(synonyms);
  }

  /**
   * Find related concepts
   */
  private findRelatedConcepts(terms: string[]): string[] {
    const concepts = new Set<string>();
    
    for (const term of terms) {
      const termLower = term.toLowerCase();
      const relatedConcepts = this.conceptMap.get(termLower) || [];
      relatedConcepts.forEach(c => concepts.add(c));
    }
    
    return Array.from(concepts);
  }

  /**
   * Expand using embeddings (placeholder for actual implementation)
   */
  private async expandWithEmbeddings(
    query: string,
    minSimilarity: number
  ): Promise<string[]> {
    // This would use the embedding service to find semantically similar terms
    // For now, return empty array
    return [];
  }

  /**
   * Deduplicate and sort suggested terms
   */
  private deduplicateAndSort(terms: SuggestedTerm[]): SuggestedTerm[] {
    const seen = new Set<string>();
    const unique: SuggestedTerm[] = [];
    
    // Sort by score descending
    terms.sort((a, b) => b.score - a.score);
    
    for (const term of terms) {
      const termLower = term.term.toLowerCase();
      if (!seen.has(termLower)) {
        seen.add(termLower);
        unique.push(term);
      }
    }
    
    return unique;
  }

  /**
   * Build synonym map for common programming terms
   */
  private buildSynonymMap(): Map<string, string[]> {
    const map = new Map<string, string[]>();
    
    // Common programming synonyms
    map.set('function', ['method', 'procedure', 'routine', 'func']);
    map.set('method', ['function', 'procedure', 'routine', 'func']);
    map.set('class', ['type', 'object', 'entity']);
    map.set('interface', ['contract', 'api', 'protocol']);
    map.set('variable', ['var', 'field', 'property', 'attribute']);
    map.set('property', ['attribute', 'field', 'prop']);
    map.set('parameter', ['param', 'argument', 'arg']);
    map.set('return', ['result', 'output', 'response']);
    map.set('error', ['exception', 'fault', 'failure']);
    map.set('test', ['spec', 'check', 'verify', 'validate']);
    map.set('config', ['configuration', 'settings', 'options']);
    map.set('init', ['initialize', 'setup', 'start']);
    map.set('auth', ['authentication', 'authorization', 'login']);
    map.set('db', ['database', 'storage', 'datastore']);
    map.set('api', ['interface', 'endpoint', 'service']);
    map.set('util', ['utility', 'helper', 'tool']);
    map.set('component', ['module', 'widget', 'element']);
    map.set('handler', ['processor', 'listener', 'callback']);
    map.set('manager', ['controller', 'service', 'coordinator']);
    map.set('factory', ['builder', 'creator', 'generator']);
    map.set('repository', ['repo', 'store', 'dao']);
    map.set('dto', ['model', 'entity', 'data']);
    
    return map;
  }

  /**
   * Build concept map for related terms
   */
  private buildConceptMap(): Map<string, string[]> {
    const map = new Map<string, string[]>();
    
    // Related concepts
    map.set('search', ['query', 'find', 'filter', 'match', 'lookup']);
    map.set('cache', ['memory', 'store', 'buffer', 'storage']);
    map.set('parse', ['analyze', 'process', 'extract', 'tokenize']);
    map.set('render', ['display', 'draw', 'paint', 'show']);
    map.set('validate', ['check', 'verify', 'test', 'ensure']);
    map.set('encrypt', ['encode', 'cipher', 'secure', 'hash']);
    map.set('compress', ['zip', 'pack', 'reduce', 'minify']);
    map.set('route', ['path', 'endpoint', 'url', 'navigate']);
    map.set('middleware', ['interceptor', 'filter', 'hook', 'plugin']);
    map.set('stream', ['flow', 'pipe', 'channel', 'buffer']);
    map.set('async', ['promise', 'callback', 'concurrent', 'parallel']);
    map.set('queue', ['buffer', 'fifo', 'stack', 'list']);
    map.set('index', ['catalog', 'directory', 'registry', 'lookup']);
    map.set('transform', ['convert', 'map', 'translate', 'modify']);
    map.set('aggregate', ['combine', 'merge', 'collect', 'sum']);
    
    return map;
  }
}

/**
 * Create a query expander instance with optional embedding service
 */
export function createQueryExpander(embeddingService?: EmbeddingService): QueryExpander {
  return new QueryExpander(embeddingService);
}