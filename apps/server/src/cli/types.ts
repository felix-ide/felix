/**
 * CLI Types and Interfaces
 */

export interface CLIOptions {
  verbose?: boolean;
  quiet?: boolean;
  config?: string;
  output?: string;
  format?: 'json' | 'text' | 'markdown';
}

export interface InitOptions extends CLIOptions {
  force?: boolean;
  template?: string;
}

export interface CreateIndexOptions extends CLIOptions {
  path?: string;
  storage?: 'memory' | 'sql.js' | 'native-sqlite';
  exclude?: string[];
  include?: string[];
  maxFileSize?: number;
}

export interface UpdateIndexOptions extends CLIOptions {
  path?: string;
  incremental?: boolean;
  force?: boolean;
  batchLimit?: number;
  since?: string;
}

export interface SearchOptions extends CLIOptions {
  type?: string;
  language?: string;
  pattern?: string;
  limit?: number;
  details?: boolean;
}

export interface GetComponentOptions extends CLIOptions {
  relationships?: boolean;
  neighbors?: boolean;
  path?: boolean;
}

export interface GetContextOptions extends CLIOptions {
  maxTokens?: number;
  includeRelationships?: boolean;
  depth?: number;
}

export interface StatsOptions extends CLIOptions {
  breakdown?: boolean;
  detailed?: boolean;
}

export interface CLIConfig {
  defaultStorage: 'memory' | 'sql.js' | 'native-sqlite';
  defaultExcludes: string[];
  excludeExtensions: string[];
  maxFileSize: number;
  outputFormat: 'json' | 'text' | 'markdown';
  verbose: boolean;
}
