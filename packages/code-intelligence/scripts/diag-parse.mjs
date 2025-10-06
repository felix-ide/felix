// Parser-only diagnostics: no DB, no embeddings.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ParserFactory } from '../dist/code-parser/ParserFactory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function diagOne(factory, filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const res = await factory.parseDocument(filePath, content, {
    enableSegmentation: true,
    enableInitialLinking: true,
    enableAggregation: true,
    confidenceThreshold: 0.0,
  });
  return {
    file: filePath,
    blocks: res.segmentation?.blocks?.length ?? 0,
    components: res.components?.length ?? 0,
    relationships: res.relationships?.length ?? 0,
    languages: res.metadata?.languagesDetected ?? [],
    backend: res.metadata?.backend,
    parseMs: res.metadata?.processingTimeMs,
  };
}

async function main() {
  const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '../test-files');
  const files = fs.readdirSync(targetDir)
    .filter(f => /\.(js|ts|tsx|py|php|java|html|css|md)$/i.test(f))
    .map(f => path.join(targetDir, f));

  const factory = new ParserFactory();
  const out = [];
  for (const f of files) {
    try {
      out.push(await diagOne(factory, f));
    } catch (e) {
      out.push({ file: f, error: String(e) });
    }
  }
  console.log(JSON.stringify(out, null, 2));
}

main().catch(e => {
  console.error('[diag-parse] Failed:', e);
  process.exit(1);
});

