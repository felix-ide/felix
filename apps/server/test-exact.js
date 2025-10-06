// Test with the EXACT text from server logs
import { EmbeddingService } from './dist/nlp/EmbeddingServiceAdapter.js';

async function test() {
  const service = new EmbeddingService();
  await service.initialize();
  
  // The exact text from server logs
  const exactRuleText = "Component Organization pattern Rule for standardizing component file organization and naming Each component should have: ComponentName.tsx (component file), ComponentName.test.tsx (test file), ComponentName.types.ts (if complex props), index.ts (barrel export)";
  
  const query = await service.getEmbedding("tell me about creating a new component");
  const ruleEmbedding = await service.getEmbedding(exactRuleText);
  
  function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  const similarity = cosineSimilarity(query.embedding, ruleEmbedding.embedding);
  console.log("EXACT text similarity:", similarity);
  console.log("Server shows:", 0.2661687304838425);
  console.log("Match?", Math.abs(similarity - 0.2661687304838425) < 0.001);
}

test().catch(console.error);