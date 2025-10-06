/**
 * MCP HTTP Streaming Server - Supports both SSE (deprecated) and Streamable HTTP transports
 * 
 * This implementation is compatible with:
 * 1. The deprecated HTTP+SSE transport (protocol version 2024-11-05)
 * 2. The Streamable HTTP transport (protocol version 2025-03-26)
 */

import express from 'express';
import { logger } from '../shared/logger.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getAllTools } from '../mcp/tools.js';
import { handleToolCall as mcpHandleToolCall } from '../mcp/handlers.js';
import { randomUUID } from 'crypto';
import { saveSession, loadSession, cleanupOldSessions } from '../mcp/session-persistence.js';

// Store transports and their associated MCP server instances by session ID
interface SessionData {
  transport: SSEServerTransport | StreamableHTTPServerTransport;
  server: Server;
  lastActivity: number;
  transportType: 'sse' | 'streamable';
  lastProject?: string;
}
const sessions = new Map<string, SessionData>();

// Clean up old session files on startup
cleanupOldSessions();

// Session timeout in milliseconds (for display only - not enforced)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Don't automatically clean up sessions - let them persist until explicitly closed
// This prevents the "No valid session ID" errors when the client thinks it's still connected

// Create a new MCP server instance for each connection
function createMCPServerInstance(sessionId: string): Server {
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

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;
    logger.info(`Tool call: ${name}`);

    // Save project to session if it's a project set operation
    if (name === 'projects' && args?.action === 'set' && args?.path && typeof args.path === 'string') {
      const sessionData = sessions.get(sessionId);
      if (sessionData) {
        sessionData.lastProject = args.path;
        saveSession(sessionId, args.path);
        logger.info(`[Session] Saved project ${args.path} for session ${sessionId}`);
      }
    }

    return await mcpHandleToolCall(name, args);
  });

  return server;
}

/**
 * Check if a request body is an initialize request
 */
function isInitializeRequest(body: any): boolean {
  return body?.method === 'initialize';
}

/**
 * Setup MCP routes with both SSE and Streamable HTTP support
 */
export function setupMCPRoutesHttpStreaming(app: express.Application): void {
  // Enable JSON body parsing
  app.use(express.json());

  //=============================================================================
  // STREAMABLE HTTP TRANSPORT (NEW - Protocol version 2025-03-26)
  //=============================================================================
  
  // Handle all MCP Streamable HTTP requests on /mcp endpoint
  app.all('/mcp', async (req, res) => {
    logger.debug(`[Streamable HTTP] Received ${req.method} request to /mcp`);
    logger.debug(`[Streamable HTTP] Headers: ${JSON.stringify(req.headers, null, 2)}`);
    logger.debug(`[Streamable HTTP] Body: ${JSON.stringify(req.body, null, 2)}`);
    
    try {
      // Check for existing session ID
      const sessionId = req.headers['mcp-session-id'] as string;
      logger.debug(`[Streamable HTTP] Session ID from header: ${sessionId || 'none'}`);
      logger.debug(`[Streamable HTTP] Active sessions: ${Array.from(sessions.keys()).join(', ')}`);
      let transport: StreamableHTTPServerTransport | undefined;

      if (sessionId && sessions.has(sessionId)) {
        // Check if the transport is of the correct type
        const sessionData = sessions.get(sessionId)!;
        if (sessionData.transport instanceof StreamableHTTPServerTransport) {
          transport = sessionData.transport;
          logger.info(`[Streamable HTTP] Restoring session ${sessionId}`);
          
          // Verify the server is still connected
          if (!sessionData.server) {
            logger.warn(`[Streamable HTTP] Session ${sessionId} has no server, creating new one`);
            sessionData.server = createMCPServerInstance(sessionId);
            await sessionData.server.connect(transport);

            // If we had a persisted project, restore it
            if (!sessionData.lastProject) {
              const persistedSession = loadSession(sessionId);
              if (persistedSession?.lastProject) {
                sessionData.lastProject = persistedSession.lastProject;
                logger.info(`[Session] Restored project ${persistedSession.lastProject} for reconnected session ${sessionId}`);
              }
            }
          }
          // Update last activity
          sessionData.lastActivity = Date.now();
        } else {
          // Transport exists but is not a StreamableHTTPServerTransport
          res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Bad Request: Session exists but uses a different transport protocol',
            },
            id: null,
          });
          return;
        }
      } else if (sessionId && !sessions.has(sessionId)) {
        // Client presented a stale/unknown session ID (likely after a server restart)
        logger.warn(`[Streamable HTTP] Unknown session ID '${sessionId}'. Handling based on method...`);
        if (req.method === 'POST' && isInitializeRequest(req.body)) {
          // Be forgiving: treat this as a fresh initialize and mint a new session
          const server = createMCPServerInstance(sessionId || randomUUID());

          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            enableJsonResponse: false,
            onsessioninitialized: (newId: string) => {
              logger.info(`[Streamable HTTP] Replaced stale session ${sessionId} with new ID ${newId}`);

              // Load persisted session data if available
              const persistedSession = loadSession(newId);

              sessions.set(newId, {
                transport: transport!,
                server,
                lastActivity: Date.now(),
                transportType: 'streamable',
                lastProject: persistedSession?.lastProject
              });
              // Hint to clients to update
              res.setHeader('mcp-session-id', newId);
              res.setHeader('mcp-session-replaced', 'true');
              res.setHeader('mcp-previous-session-id', sessionId);
            }
          });

          transport.onclose = () => {
            const sid = transport!.sessionId;
            if (sid && sessions.has(sid)) {
              logger.info(`[Streamable HTTP] Transport closed for session ${sid}`);
              sessions.delete(sid);
            }
          };

          await server.connect(transport);
        } else if (req.method === 'GET') {
          // Client tried to open SSE for a dead session; instruct re-initialize
          res.setHeader('mcp-session-expired', 'true');
          res.status(410).json({
            jsonrpc: '2.0',
            error: {
              code: -32001,
              message: 'Session expired or invalid. Please reinitialize with POST /mcp.'
            },
            id: null
          });
          return;
        } else if (req.method === 'DELETE') {
          // Idempotent close; treat as success
          res.status(200).json({ ok: true, message: 'Session already closed' });
          return;
        } else {
          // Non-initialize POST (or other) with bad session
          res.setHeader('mcp-session-expired', 'true');
          res.status(409).json({
            jsonrpc: '2.0',
            error: {
              code: -32002,
              message: 'Invalid session. Reinitialize with POST /mcp (initialize).'
            },
            id: null
          });
          return;
        }
      } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
        // Create new transport for initialization request
        // Create the server instance first
        const newSessionId = randomUUID();
        const server = createMCPServerInstance(newSessionId);

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,  // USE THE SAME SESSION ID!
          enableJsonResponse: false, // Always use SSE for streaming
          onsessioninitialized: (sessionId: string) => {
            logger.info(`[Streamable HTTP] Session initialized with ID: ${sessionId}`);

            // Load persisted session data if available
            const persistedSession = loadSession(sessionId);
            if (persistedSession?.lastProject) {
              logger.info(`[Session] Restored project ${persistedSession.lastProject} for session ${sessionId}`);
            }

            // Store the session when it's initialized
            sessions.set(sessionId, {
              transport: transport!,
              server,
              lastActivity: Date.now(),
              transportType: 'streamable',
              lastProject: persistedSession?.lastProject
            });
            logger.debug(`[Streamable HTTP] Session ${sessionId} stored with server instance`);
            logger.debug(`[Streamable HTTP] Total active sessions: ${sessions.size}`);
            
            // Log session ID in response for debugging
            res.setHeader('mcp-session-id', sessionId);
          }
        });

        // Set up onclose handler to clean up both transport and server
        transport.onclose = () => {
          const sid = transport!.sessionId;
          if (sid && sessions.has(sid)) {
            logger.info(`[Streamable HTTP] Transport closed for session ${sid}`);
            sessions.delete(sid);
          }
        };

        // Connect the transport to the server
        await server.connect(transport);
      } else {
        // Invalid request - no session ID or not initialization request
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided or not an initialization request',
          },
          id: null,
        });
        return;
      }

      // Update last activity for existing sessions
      if (sessionId && sessions.has(sessionId)) {
        sessions.get(sessionId)!.lastActivity = Date.now();
      }
      
      // Handle the request with the transport
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error('[Streamable HTTP] Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  //=============================================================================
  // DEPRECATED HTTP+SSE TRANSPORT (OLD - Protocol version 2024-11-05)
  //=============================================================================

  // Root endpoint that handles MCP connections
  app.get('/', async (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    
    // If it's a browser, show info page
    if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>The Felix MCP Server</title></head>
        <body>
          <h1>The Felix MCP Server</h1>
          <h2>Transport Options:</h2>
          <h3>1. Streamable HTTP (NEW - Recommended)</h3>
          <ul>
            <li>Endpoint: /mcp</li>
            <li>Protocol version: 2025-03-26</li>
            <li>Methods: POST (initialize/requests), GET (SSE stream), DELETE (close)</li>
          </ul>
          <h3>2. HTTP+SSE (Deprecated)</h3>
          <ul>
            <li>SSE endpoint: /sse</li>
            <li>Messages endpoint: /messages</li>
            <li>Protocol version: 2024-11-05</li>
          </ul>
          <h3>Available Tools:</h3>
          <ul>
            ${getAllTools().map(t => `<li>${t.name}</li>`).join('')}
          </ul>
        </body>
        </html>
      `);
      return;
    }

    // Otherwise, handle as SSE connection
    await handleSSEConnection(req, res);
  });

  // Health check endpoint for MCP
  app.get('/mcp/health', (req, res) => {
    const sessionStats = {
      totalSessions: sessions.size,
      sessionTypes: {
        sse: 0,
        streamable: 0
      },
      sessions: [] as any[]
    };
    
    const now = Date.now();
    for (const [sessionId, sessionData] of sessions) {
      sessionStats.sessionTypes[sessionData.transportType]++;
      sessionStats.sessions.push({
        id: sessionId,
        type: sessionData.transportType,
        lastActivitySeconds: Math.round((now - sessionData.lastActivity) / 1000),
        isStale: now - sessionData.lastActivity > SESSION_TIMEOUT
      });
    }
    
    res.json({
      status: 'healthy',
      mcp: {
        protocolVersions: ['2024-11-05', '2025-03-26'],
        transports: ['sse', 'streamable-http']
      },
      sessions: sessionStats,
      config: {
        sessionTimeoutMinutes: SESSION_TIMEOUT / 60000,
        sseHeartbeatSeconds: 15,
        serverKeepAliveSeconds: 65,
        sessionCleanupIntervalMinutes: 5
      }
    });
  });

  // SSE endpoint for deprecated transport
  app.get('/sse', async (req, res) => {
    logger.info('[SSE] Received GET request to /sse (deprecated transport)');
    await handleSSEConnection(req, res);
  });

  // Messages endpoint for deprecated transport
  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    logger.debug(`[SSE] POST /messages for sessionId: ${sessionId}`);
    
    if (!sessionId) {
      logger.warn('[SSE] No session ID provided');
      res.status(400).end('Missing sessionId parameter');
      return;
    }
    
    const sessionData = sessions.get(sessionId);
    
    if (sessionData && sessionData.transport instanceof SSEServerTransport) {
      try {
        await sessionData.transport.handlePostMessage(req, res, req.body);
      } catch (error) {
        logger.error('[SSE] Error handling POST message:', error);
        res.status(500).end();
      }
    } else {
      logger.warn(`[SSE] No SSE transport found for sessionId: ${sessionId}`);
      res.status(400).end('No transport found for sessionId');
    }
  });

  // Add info about supported transports at startup
  logger.info(`
==============================================
MCP SERVER V2 - TRANSPORT OPTIONS:

1. Streamable HTTP (Protocol version: 2025-03-26) - RECOMMENDED
   Endpoint: /mcp
   Methods: GET, POST, DELETE
   Usage: 
     - Initialize with POST to /mcp
     - Establish SSE stream with GET to /mcp
     - Send requests with POST to /mcp
     - Terminate session with DELETE to /mcp

2. HTTP+SSE (Protocol version: 2024-11-05) - DEPRECATED
   Endpoints: /sse (GET) and /messages (POST)
   Usage:
     - Establish SSE stream with GET to /sse
     - Send requests with POST to /messages?sessionId=<id>
==============================================
`);
}

/**
 * Handle SSE connection for deprecated transport
 */
async function handleSSEConnection(req: express.Request, res: express.Response): Promise<void> {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');

  const transport = new SSEServerTransport('/messages', res);
  const sessionId = transport.sessionId;

  logger.info(`[SSE] New session connected: ${sessionId}`);

  // Load persisted session data if available
  const persistedSession = loadSession(sessionId);
  if (persistedSession?.lastProject) {
    logger.info(`[Session] Restored project ${persistedSession.lastProject} for session ${sessionId}`);
  }

  try {
    // Create a new server instance for this connection
    const server = createMCPServerInstance(sessionId);
    await server.connect(transport);
    logger.info(`[SSE] Server connected to transport for session: ${sessionId}`);
    logger.debug(`[SSE] Available tools: ${getAllTools().map(t => t.name).join(', ')}`);

    // Store both transport and server
    sessions.set(sessionId, {
      transport,
      server,
      lastActivity: Date.now(),
      transportType: 'sse',
      lastProject: persistedSession?.lastProject
    });
    
    // Send initial connection event
    res.write('event: connected\ndata: {"status":"connected"}\n\n');
    
    // Keep connection alive with heartbeats every 15 seconds
    const heartbeat = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(heartbeat);
        return;
      }
      try {
        res.write('event: heartbeat\ndata: {}\n\n');
      } catch (error) {
        logger.warn(`[SSE] Error sending heartbeat: ${error}`);
        clearInterval(heartbeat);
      }
    }, 15000); // Reduced to 15 seconds for better connection stability
    
    // Single close handler for cleanup
    res.on('close', () => {
      logger.info(`[SSE] Session disconnected: ${sessionId}`);
      clearInterval(heartbeat);
      sessions.delete(sessionId);
      // Clean up transport
      if (transport) {
        transport.close().catch(err => 
          logger.warn(`[SSE] Error closing transport: ${err}`)
        );
      }
    });
  } catch (error) {
    logger.error(`[SSE] Error connecting to transport: ${error}`);
    res.status(500).end();
  }
}

// Handle server shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down MCP server...');
  
  // Close all active sessions
  for (const [sessionId, sessionData] of sessions) {
    try {
      logger.info(`Closing session ${sessionId}`);
      if (sessionData.transport) {
        await sessionData.transport.close();
      }
      sessions.delete(sessionId);
    } catch (error) {
      logger.warn(`Error closing session ${sessionId}:`, error);
    }
  }
  
  logger.info('MCP server shutdown complete');
  process.exit(0);
});
