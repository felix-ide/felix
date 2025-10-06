/**
 * MCP Server (stdio transport)
 * Provides a stdin/stdout MCP server exposing The Felix tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { getAllTools } from '../mcp/tools.js';
import { logger } from '../shared/logger.js';
import { handleToolCall as mcpHandleToolCall } from '../mcp/handlers.js';

/**
 * Create a new MCP server instance with The Felix tools registered
 */
function createMCPServerForStdio(): Server {
  const server = new Server(
    { name: 'felix', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  // Advertise available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: getAllTools() }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info(`[MCP-stdio] Tool call: ${name}`);
    return await mcpHandleToolCall(name, args);
  });

  return server;
}

/**
 * Start the stdio MCP server
 */
export async function startMCPStdioServer(): Promise<void> {
  try {
    if (!process.env.MCP_STDIO_ALLOW_STDOUT) {
      const originalLog = console.log.bind(console);
      console.log = (...args: any[]) => {
        // Mirror console.log traffic to stderr so stdout stays clean for MCP frames
        console.error(...args);
      };
      process.once('exit', () => {
        console.log = originalLog;
      });
    }

    if (!process.env.FORCE_STDERR_LOGS) {
      process.env.FORCE_STDERR_LOGS = '1';
    }
    if (!process.env.LOG_LEVEL) {
      process.env.LOG_LEVEL = 'error';
    }

    logger.info('[MCP-stdio] Starting Felix MCP server over stdio');
    const server = createMCPServerForStdio();
    const transport = new StdioServerTransport(process.stdin, process.stdout);
    await server.connect(transport);
    logger.info('[MCP-stdio] Server connected. Ready for MCP clients.');
  } catch (err) {
    logger.error('[MCP-stdio] Failed to start MCP stdio server:', err);
    process.exit(1);
  }
}

// Allow running directly (node dist/server/mcpServerStdio.js)
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  startMCPStdioServer();
}
