import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import path from 'node:path';

async function main() {
  const cwd = process.cwd();
  const projectPath = path.resolve(cwd, '..'); // repo root as default project

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/stdio.js'],
    cwd: cwd
  });

  const client = new Client({ name: 'smoke-client', version: '0.0.1' });
  await client.connect(transport);

  const tools = await client.listTools();
  console.log('[smoke] tools:', tools.tools.map(t => t.name).join(', '));

  const listRes = await client.request({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'projects', arguments: { action: 'list' } } }, CallToolResultSchema, { timeout: 120000 });
  console.log('[smoke] projects.list =>', JSON.stringify(listRes, null, 2));

  const setRes = await client.request({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'projects', arguments: { action: 'set', path: projectPath } } }, CallToolResultSchema, { timeout: 120000 });
  console.log('[smoke] projects.set =>', JSON.stringify(setRes, null, 2));

  const searchArgs = { project: projectPath, action: 'search', query: 'CodeIndexer', entity_types: ['component'], max_results: 3, output_format: 'json' };
  const searchRes = await client.request({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'search', arguments: searchArgs } }, CallToolResultSchema, { timeout: 180000, resetTimeoutOnProgress: true });
  console.log('[smoke] search.search =>', JSON.stringify(searchRes, null, 2));

  const tasksList = await client.request({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'tasks', arguments: { project: projectPath, action: 'list', view: 'summary', output_format: 'json', limit: 5 } } }, CallToolResultSchema, { timeout: 120000 });
  console.log('[smoke] tasks.list =>', JSON.stringify(tasksList, null, 2));

  await transport.close();
}

main().catch(err => { console.error('[smoke] failed', err); process.exit(1); });
