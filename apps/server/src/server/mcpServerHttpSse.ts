/**
 * MCP HTTP SSE Server - legacy SSE transport
 */

import express from 'express';
import { logger } from '../shared/logger.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getAllTools } from '../mcp/tools.js';
import { handleToolCall as mcpHandleToolCall } from '../mcp/handlers.js';

// MCP transports - simplified without session mapping
export const transports = new Map<string, any>();

// Create a new MCP server instance for each connection
function createMCPServerInstance(): Server {
  const server = new Server(
    {
      name: 'felix',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: getAllTools(),
    };
  });

  // Handle tool calls - stateless, no session management
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;
    logger.info(`Tool call: ${name}`);
    return await mcpHandleToolCall(name, args);
  });

  return server;
}

/**
 * Setup MCP SSE routes (COPIED from serve.ts)
 */
export function setupMCPRoutesHttpSse(app: express.Application): void {
  // Root endpoint that handles MCP connections (COPIED from serve.ts)
  app.get('/', async (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    
    // If it's a browser, show info page
    if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Felix MCP Server</title></head>
        <body>
          <h1>Felix MCP Server</h1>
          <p>Running on http://localhost:9000</p>
          <p>SSE endpoint: http://localhost:9000/sse</p>
          <p>Tools: ${getAllTools().map(t => t.name).join(', ')}</p>
        </body>
        </html>
      `);
      return;
    }

    // Otherwise, handle as MCP SSE connection
    await handleSSEConnection(req, res);
  });

  // SSE endpoint for MCP (COPIED from serve.ts)
  app.get('/sse', async (req, res) => {
    await handleSSEConnection(req, res);
  });

  // Messages endpoint for MCP (COPIED from serve.ts)
  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    logger.debug(`POST /messages for sessionId: ${sessionId}`);
    
    if (!sessionId) {
      logger.warn('No session ID provided in request URL');
      res.status(400).end('Missing sessionId parameter');
      return;
    }
    
    const transport = transports.get(sessionId);
    
    if (transport) {
      try {
        await transport.handlePostMessage(req, res, req.body);
      } catch (error) {
        logger.error('Error handling POST message:', error);
        res.status(500).end();
      }
    } else {
      logger.warn(`No transport found for sessionId: ${sessionId}`);
      res.status(400).end();
    }
  });
}

/**
 * Handle SSE connection (COPIED from serve.ts)
 */
async function handleSSEConnection(req: express.Request, res: express.Response): Promise<void> {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');

  const transport = new SSEServerTransport('/messages', res);
  const sessionId = transport.sessionId;
  
  transports.set(sessionId, transport);
  logger.info(`New MCP session connected: ${sessionId}`);
  
  res.on('close', () => {
    logger.info(`MCP session disconnected: ${sessionId}`);
    transports.delete(sessionId);
  });

  try {
    // Create a new server instance for this connection
    const server = createMCPServerInstance();
    await server.connect(transport);
    logger.info(`Server connected to transport for session: ${sessionId}`);
    logger.debug(`Available tools: ${getAllTools().map(t => t.name).join(', ')}`);
    
    // Send initial connection event
    res.write('event: connected\ndata: {"status":"connected"}\n\n');
    
    // Keep connection alive with heartbeats every 30 seconds
    const heartbeat = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(heartbeat);
        return;
      }
      res.write('event: heartbeat\ndata: {}\n\n');
    }, 30000);
    
    res.on('close', () => {
      clearInterval(heartbeat);
    });
  } catch (error) {
    logger.error(`Error connecting to transport: ${error}`);
    res.status(500).end();
  }
}
