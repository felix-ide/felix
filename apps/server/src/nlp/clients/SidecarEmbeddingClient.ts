import type { EmbeddingResult } from '@felix/code-intelligence';

export interface SidecarOptions {
  baseUrl: string;
  timeoutMs?: number;
  retries?: number;
  batchSize?: number;
  authToken?: string;
}

export class SidecarEmbeddingClient {
  private baseUrl: string;
  private timeoutMs: number;
  private retries: number;
  private batchSize: number;
  private authToken?: string;

  constructor(opts: SidecarOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.timeoutMs = opts.timeoutMs ?? 20000;
    this.retries = opts.retries ?? 3;
    this.batchSize = typeof opts.batchSize === 'number'
      ? opts.batchSize
      : parseInt(process.env.EMBED_BATCH_SIZE || '128', 10);
    this.authToken = opts.authToken;
  }

  async getEmbedding(text: string): Promise<EmbeddingResult> {
    const results = await this.getEmbeddings([text]);
    return results[0]!;
  }

  async getEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    const chunks: string[][] = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      chunks.push(texts.slice(i, i + this.batchSize));
    }
    const outputs: EmbeddingResult[] = [];
    for (const batch of chunks) {
      const data = await this.call('/v1/embeddings', { inputs: batch, normalize: true });
      const { embeddings, model, dimensions } = data;
      for (const e of embeddings as number[][]) {
        outputs.push({ embedding: e, version: 1 as any, dimensions, model } as any);
      }
    }
    return outputs;
  }

  private async call(path: string, body: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    let attempt = 0;
    let lastErr: any;
    while (attempt <= this.retries) {
      try {
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), this.timeoutMs);
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(this.authToken ? { authorization: `Bearer ${this.authToken}` } : {})
          },
          body: JSON.stringify(body),
          signal: ac.signal as any
        } as any);
        clearTimeout(to);
        if (!res.ok) {
          const text = await res.text();
          // Retry on 429/5xx
          if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
            throw new Error(`sidecar ${res.status}: ${text}`);
          }
          throw new Error(`sidecar ${res.status}: ${text}`);
        }
        return await res.json();
      } catch (err: any) {
        lastErr = err;
        attempt++;
        if (attempt > this.retries) break;
        // Exponential backoff with jitter
        const delay = Math.min(2000, 200 * Math.pow(2, attempt)) + Math.random() * 200;
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastErr;
  }
}
