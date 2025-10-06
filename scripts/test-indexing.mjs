// Lightweight indexing smoke test that skips embeddings
import { DatabaseManager } from "../apps/server/dist/features/storage/DatabaseManager.js";
import { CodeIndexer } from "../apps/server/dist/features/indexing/api/CodeIndexer.js";
import path from "node:path";

async function main() {
  const target = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve("packages/code-intelligence/test-files");
  console.log("[test-indexing] Target:", target);

  const db = DatabaseManager.getInstance();
  await db.initialize();

  const indexer = new CodeIndexer(db);
  await indexer.initialize();

  const result = await indexer.indexDirectory(target, {
    onProgress: (msg) => process.stdout.write(`.. ${msg}\n`),
  });

  console.log("\n[test-indexing] Files:", result.filesProcessed);
  console.log("[test-indexing] Components:", result.componentCount);
  console.log("[test-indexing] Relationships:", result.relationshipCount);

  const stats = await indexer.getStats();
  console.log("[test-indexing] DB Stats:", stats);

  // Quick sanity: fetch small sample and count, avoid full-table scan
  const relRepo = db.getRelationshipRepository();
  const totalRels = await relRepo.countRelationships();
  console.log("[test-indexing] Relationship count (DB):", totalRels);
  const sample = await relRepo.searchRelationships({ limit: 5, offset: 0 });
  console.log("[test-indexing] Sample relationships:", sample.items);

  // Cleanly close to allow process to exit
  await indexer.close();
}

main().catch((err) => {
  console.error("[test-indexing] Error:", err);
  process.exit(1);
});
