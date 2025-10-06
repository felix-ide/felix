/* Simple smoke test against the Python sidecar */
/* Usage: node felix/sidecar-test/sidecar-smoke.cjs */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE = process.env.SIDE_CAR_BASE_URL || 'http://127.0.0.1:8088';

function req(method, urlStr, body) {
  const url = new URL(urlStr);
  const lib = url.protocol === 'https:' ? https : http;
  const payload = body ? Buffer.from(JSON.stringify(body)) : null;
  const options = {
    method,
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    headers: payload ? { 'content-type': 'application/json', 'content-length': String(payload.length) } : {}
  };
  return new Promise((resolve, reject) => {
    const req = lib.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        try {
          resolve({ status: res.statusCode, json: JSON.parse(text) });
        } catch {
          resolve({ status: res.statusCode, json: text });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  const health = await req('POST', `${BASE}/v1/health`);
  console.log('health status', health.status, health.json);

  const res = await req('POST', `${BASE}/v1/embeddings`, { inputs: ['hello', 'world'], normalize: true });
  const data = res.json;
  console.log('embeddings status', res.status);
  console.log('dimensions', data.dimensions, 'device', data.device, 'model', data.model);
  const norm = Math.sqrt(data.embeddings[0].reduce((s, x) => s + x * x, 0));
  console.log('first vector norm ~1:', norm.toFixed(3));
}

main().catch((e) => {
  console.error('smoke test failed:', e);
  process.exit(1);
});
