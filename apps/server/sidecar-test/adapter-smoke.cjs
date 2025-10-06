/* Smoke test EmbeddingServiceAdapter using python sidecar */
process.env.FELIX_EMBEDDINGS_ENGINE = 'python-sidecar';
process.env.SIDE_CAR_BASE_URL = process.env.SIDE_CAR_BASE_URL || 'http://127.0.0.1:8088';

async function load() {
  return await import('../dist/nlp/EmbeddingServiceAdapter.js');
}

async function main() {
  const { EmbeddingService } = await load();
  const svc = new EmbeddingService();
  const r = await svc.getEmbedding('adapter smoke test');
  console.log('dims', r.dimensions, 'model', r.model, 'norm~1', Math.hypot(...r.embedding).toFixed(3));
}

main().catch((e) => { console.error(e); process.exit(1); });
