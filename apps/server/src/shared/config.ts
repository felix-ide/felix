export type AppConfig = {
  search: {
    similarityThreshold: number;
    rerank: { pathDemotePatterns: RegExp[]; pathDemoteAmount: number };
  };
  embeddings: { batchSize: number };
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent';
};

const toNumber = (v: string | undefined, fallback: number) => {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

const toLevel = (v: string | undefined): AppConfig['logLevel'] => {
  const lvl = (v || '').toLowerCase();
  return (['debug','info','warn','error','silent'] as const).includes(lvl as any)
    ? (lvl as AppConfig['logLevel'])
    : 'info';
};

export const appConfig: AppConfig = {
  search: {
    similarityThreshold: toNumber(process.env.SIMILARITY_THRESHOLD, 0.2),
    rerank: {
      pathDemotePatterns: [/coverage\//i, /coverage-integration\//i, /lcov-report\//i, /node_modules\//i, /vendor\//i],
      pathDemoteAmount: 0.25
    }
  },
  embeddings: {
    batchSize: toNumber(process.env.EMBED_BATCH_SIZE, 64)
  },
  logLevel: toLevel(process.env.LOG_LEVEL)
};
