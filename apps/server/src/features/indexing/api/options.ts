import { DatabaseManager } from '../../storage/DatabaseManager.js';
import { EmbeddingService } from '../../../nlp/EmbeddingServiceAdapter.js';
import { ParserFactory } from '@felix/code-intelligence';
import { DEFAULT_CONFIG } from '../../../cli/helpers.js';

export interface CodeIndexerLegacyOptions {
  sourceDirectory?: string;
  storage?: { path?: string };
  parser?: {
    excludeExtensions?: string[];
    includeExtensions?: string[];
  };
  ignore?: {
    respectGitignore?: boolean;
    useIndexIgnore?: boolean;
    customPatterns?: string[];
    additionalIgnoreFiles?: string[];
    respectGlobalGitignore?: boolean;
  };
  processing?: {
    maxFileSize?: number;
    excludeDirectories?: string[];
    includeDirectories?: string[];
    followSymlinks?: boolean;
  };
}

export interface CodeIndexerEnvironment {
  dbManager: DatabaseManager;
  embeddingService: EmbeddingService;
  parserFactory: ParserFactory;
  ignoreConfig: {
    respectGitignore: boolean;
    useIndexIgnore: boolean;
    respectGlobalGitignore: boolean;
    customPatterns: string[];
    additionalIgnoreFiles: string[];
  };
  serviceOptions: {
    maxFileSize: number;
    excludeDirectories: string[];
    includeDirectories?: string[];
    followSymlinks?: boolean;
    excludeExtensions: string[];
    includeExtensions?: string[];
  };
}

type EnvironmentArgs = {
  dbManagerOrOptions?: DatabaseManager | CodeIndexerLegacyOptions;
  embeddingService?: EmbeddingService;
  parserFactory?: ParserFactory;
};

function isLegacyOptions(value: unknown): value is CodeIndexerLegacyOptions {
  if (!value || typeof value !== 'object') return false;
  const cast = value as CodeIndexerLegacyOptions;
  return (
    !!cast.sourceDirectory ||
    !!cast.storage ||
    !!cast.parser ||
    !!cast.ignore ||
    !!cast.processing
  );
}

let sharedParserFactory: ParserFactory | null = null;

export function createCodeIndexerEnvironment(args: EnvironmentArgs): CodeIndexerEnvironment {
  const { dbManagerOrOptions, embeddingService, parserFactory } = args;

  const legacyOptions = isLegacyOptions(dbManagerOrOptions) ? dbManagerOrOptions : undefined;

  const dbManager = legacyOptions
    ? DatabaseManager.getInstance(legacyOptions.storage?.path || legacyOptions.sourceDirectory || process.cwd())
    : (dbManagerOrOptions instanceof DatabaseManager
        ? dbManagerOrOptions
        : DatabaseManager.getInstance());

  const resolvedEmbedding = embeddingService || new EmbeddingService();
  const resolvedFactory = parserFactory || (sharedParserFactory ||= new ParserFactory());

  const ignoreConfig = {
    respectGitignore: legacyOptions?.ignore?.respectGitignore ?? true,
    useIndexIgnore: legacyOptions?.ignore?.useIndexIgnore ?? true,
    respectGlobalGitignore: legacyOptions?.ignore?.respectGlobalGitignore ?? false,
    customPatterns: [...(legacyOptions?.ignore?.customPatterns || [])],
    additionalIgnoreFiles: legacyOptions?.ignore?.additionalIgnoreFiles || []
  };

  const serviceOptions = {
    maxFileSize: legacyOptions?.processing?.maxFileSize ?? DEFAULT_CONFIG.maxFileSize,
    excludeDirectories: legacyOptions?.processing?.excludeDirectories ?? DEFAULT_CONFIG.defaultExcludes,
    includeDirectories: legacyOptions?.processing?.includeDirectories,
    followSymlinks: legacyOptions?.processing?.followSymlinks,
    excludeExtensions: legacyOptions?.parser?.excludeExtensions ?? DEFAULT_CONFIG.excludeExtensions,
    includeExtensions: legacyOptions?.parser?.includeExtensions
  };

  return {
    dbManager,
    embeddingService: resolvedEmbedding,
    parserFactory: resolvedFactory,
    ignoreConfig,
    serviceOptions
  };
}
