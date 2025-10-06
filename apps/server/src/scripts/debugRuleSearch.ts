/**
 * Debug Rule Semantic Search
 *
 * Run a rules-only semantic search directly against a project DB,
 * and print concrete counts so we can see what the pipeline sees.
 *
 * Usage (after `npm run build`):
 *   node dist/scripts/debugRuleSearch.js \
 *     --project /absolute/path/to/project \
 *     --query "User Query: testing the rules search"
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseManager } from '../features/storage/DatabaseManager.js';
import { CodeIndexer } from '../features/indexing/api/CodeIndexer.js';

function parseArgs(argv: string[]) {
  const args: Record<string, string | undefined> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--project' || a === '-p') args.project = argv[++i];
    else if (a === '--query' || a === '-q') args.query = argv[++i];
    else if (a === '--limit' || a === '-l') args.limit = argv[++i];
    else if (a === '--threshold' || a === '-t') args.threshold = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.project || !args.query) {
    console.error('Usage: node dist/scripts/debugRuleSearch.js --project <abs path> --query "..." [--limit 50] [--threshold 0.0]');
    process.exit(2);
  }

  const projectPath = path.resolve(args.project!);
  const limit = Number(args.limit ?? 50) || 50;
  const threshold = Number(args.threshold ?? 0.0);

  console.log('--- Debug Rule Semantic Search ---');
  console.log('Project:', projectPath);
  console.log('Query  :', args.query);
  console.log('Limit  :', limit);
  console.log('Thresh.:', threshold);

  // Initialize DB + Indexer bound to this project
  const db = DatabaseManager.getInstance(projectPath);
  await db.initialize();
  const indexer = new CodeIndexer(db);
  await indexer.initialize();

  // Print high-level stats
  const stats = await indexer.getStats();
  console.log('\n[Stats] rules.total           =', stats.ruleCount);
  console.log('[Stats] rules.with_embeddings =', stats.ruleEmbeddingCount);

  // Double-check raw embeddings by type directly from repository
  const embeddingRepo = db.getEmbeddingRepository();
  const rawEmbeds = await embeddingRepo.getEmbeddingsByType('rule');
  console.log('[Raw]   embeddings(rule) rows =', rawEmbeds.length);

  // Sanity-check that a few embedding IDs resolve to real rules
  const sampleIds = rawEmbeds.slice(0, 5).map(r => r.entity_id);
  if (sampleIds.length) {
    console.log('[Raw]   sample entity_ids      =', sampleIds);
    for (const id of sampleIds) {
      const r = await indexer.getRule(id);
      console.log('         resolve', id, '->', r ? (r.name || 'OK') : 'NOT FOUND');
    }
  }

  // Perform rules-only semantic search exactly like the route should
  const s = await indexer.searchSemanticUniversal(args.query!, {
    entityTypes: ['rule'],
    limit,
    similarityThreshold: threshold,
  });

  const results = s.results || [];
  console.log('\n[Search] results.count        =', results.length);
  for (const r of results.slice(0, 5)) {
    console.log('         -', r.entity?.id, '|', r.entity?.name, '| sim=', r.similarity?.toFixed?.(4));
  }

  if (results.length === 0) {
    console.log('\n[Diagnosis] 0 results. Based on the counters above, likely causes:');
    console.log('- rules.with_embeddings == 0 or raw embedding rows == 0 for entity_type=rule');
    console.log('- embeddings exist but do not resolve to rule IDs');
    console.log('- semantic scores < threshold (try --threshold 0.0)');
  }
}

main().catch(err => {
  console.error('Fatal error:', err?.stack || err?.message || err);
  process.exit(1);
});
