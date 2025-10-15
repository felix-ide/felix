/**
 * Felix Server
 */
// Load .env defaults early so all downstream modules see them.
// This avoids requiring shell exports for common tuning flags.
import 'dotenv/config';

import express from 'express';
import { logger } from './shared/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execFile } from 'child_process';
import { createServer } from 'http';
import type { Socket } from 'net';
import { WebSocketServer } from 'ws';

// Project management
import { projectManager } from './mcp/project-manager.js';
import { getCurrentProject, setCurrentProject } from './server/routes/projectContext.js';

// Route imports
import projectRoutes from './server/routes/projectRoutes.js';
import notesRoutes from './server/routes/notesRoutes.js';
import tasksRoutes from './server/routes/tasksRoutes.js';
import rulesRoutes from './server/routes/rulesRoutes.js';
import searchRoutes from './server/routes/searchRoutes.js';
import componentRoutes from './server/routes/componentRoutes.js';
import relationshipRoutes from './server/routes/relationshipRoutes.js';
import fileRoutes from './server/routes/fileRoutes.js';
import degradationRoutes from './server/routes/degradationRoutes.js';
import knowledgeGraphRoutes from './server/routes/knowledgeGraphRoutes.js';
import embeddingRoutes from './server/routes/embeddingRoutes.js';
import workflowRoutes from './server/routes/workflowRoutes.js';
import helpRoutes from './server/routes/helpRoutes.js';
import kbRoutes from './server/routes/kbRoutes.js';

// MCP server setup
import { setupMCPRoutesHttpStreaming } from './server/mcpServerHttpStreaming.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
let shuttingDown = false;
const sockets = new Set<Socket>();
server.on('connection', (socket: Socket) => {
  sockets.add(socket);
  socket.on('close', () => sockets.delete(socket));
});

// Configure server keepalive and timeouts for better connection stability
server.keepAliveTimeout = 65000; // 65 seconds (should be higher than client keepalive)
server.headersTimeout = 66000; // Slightly higher than keepAliveTimeout
server.timeout = 0; // Disable request timeout for long-running operations

let wss: WebSocketServer | null = null;

const PORT = process.env.PORT || 9000;

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// JSON parsing for all routes (needed for MCP and API)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  // Allow project + MCP session headers for cross-origin clients
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-project-id, x-project-path, mcp-session-id');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// ============================================================================
// API ROUTES
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    uptime: process.uptime(),
    activeProjects: projectManager.getProjects().length
  });
});

// Mount route modules
app.use('/api', projectRoutes);
app.use('/api', notesRoutes);
app.use('/api', tasksRoutes);
app.use('/api', rulesRoutes);
app.use('/api', searchRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/relationships', relationshipRoutes);
app.use('/api/files', fileRoutes);
app.use('/api', degradationRoutes);
app.use('/api', knowledgeGraphRoutes);
app.use('/api', embeddingRoutes);
app.use('/api', workflowRoutes);
app.use('/api', helpRoutes);
app.use('/api', kbRoutes);

// Project API
app.post('/api/project', async (req, res) => {
  const { projectPath } = req.body;
  
  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }
  
  logger.info(`📁 Setting project: ${projectPath}`);
  
  try {
    // Use the existing ProjectManager with race condition protection
    const project = await projectManager.setProject(projectPath);
    setCurrentProject(projectPath);
    
    return res.json({ 
      success: true, 
      project: projectPath
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to set project',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/project', (req, res) => {
  const currentProjectPath = getCurrentProject();
  const name = currentProjectPath ? path.basename(currentProjectPath) : null;
  res.json({ 
    current_project: currentProjectPath,
    name: name
  });
});

// ============================================================================
// MCP ROUTES (Both SSE and Streamable HTTP)
// ============================================================================

setupMCPRoutesHttpStreaming(app);

// ============================================================================
// WEBSOCKET HANDLING
// ============================================================================
// Note: Actual WebSocketServer is created only AFTER HTTP is listening.
// This informational log is emitted on 'listening' to avoid confusion during restarts.

// ============================================================================
// STATIC FILE SERVING (for Web UI)
// ============================================================================

const webUIPath = path.join(__dirname, '../client/dist');
app.use(express.static(webUIPath));

// Fallback to index.html for SPA routing
// app.get('*', (req, res) => {
//   if (req.path.startsWith('/api') || req.path.startsWith('/sse') || req.path === '/messages') {
//     res.status(404).json({ error: 'Not found' });
//     return;
//   }
//   res.sendFile(path.join(webUIPath, 'index.html'));
// });

// ============================================================================
// START SERVER
// ============================================================================

let started = false;
function startServer() {
  if (started) return;
  started = true;

  // Resilient port binding with limited retries to avoid nodemon thrash
  // Simple bind; let the watcher handle restarts

  server.removeAllListeners('error');
  server.once('error', (err: any) => {
    if (err && err.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} in use; exiting.`);
      process.exit(0);
    }
    logger.error('HTTP server error:', err);
    process.exit(1);
  });

  server.once('listening', () => {
    // Create WebSocket server only after HTTP is listening
    try {
      wss = new WebSocketServer({ server, path: '/ws' });
    } catch (e) {
      logger.warn('Failed to init WebSocket server:', e);
    }
    logger.info(`🌐 WebSocket server ready on path /ws`);
    logger.info(`🚀 Felix server running on http://localhost:${PORT}`);
    logger.info(`🌐 Web UI: http://localhost:${PORT}`);
    logger.info(`🔗 MCP Endpoints:`);
    logger.info(`  - Root (auto-detect): http://localhost:${PORT}`);
    logger.info(`  - Streamable HTTP: http://localhost:${PORT}/mcp`);
    logger.info(`  - SSE (deprecated): http://localhost:${PORT}/sse`);
    logger.info(`📡 API endpoints:`);
    logger.info(`  - Felix API: http://localhost:${PORT}/api`);
    logger.info(`  - Files (project-editor): http://localhost:${PORT}/api/files`);
    logger.info(`  - Git: http://localhost:${PORT}/api/git`);
    logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
    logger.info(`✅ Server ready for connections`);
  });

  if (!shuttingDown) {
    server.listen(PORT as number);
  }
}

// Start the server
startServer();

// Graceful shutdown
async function closeHttpServer(timeoutMs = 5000): Promise<void> {
  try {
    // Terminate WS clients quickly
    try {
      if (wss) {
        wss.clients.forEach((c: any) => { try { c.terminate(); } catch {} });
        await new Promise<void>((res) => (wss as WebSocketServer).close(() => res()));
        wss = null;
      }
    } catch {}
    // Destroy any open sockets so the port frees immediately
    sockets.forEach((s) => { try { s.destroy(); } catch {} });
    await new Promise<void>((res) => {
      const timer = setTimeout(() => res(), timeoutMs);
      try {
        server.close(() => { clearTimeout(timer); res(); });
      } catch {
        clearTimeout(timer); res();
      }
    });
  } catch {}
}

const fullShutdown = async () => {
  if (shuttingDown) return; // prevent re-entry
  shuttingDown = true;
  logger.info('🔄 Shutting down server...');
  await closeHttpServer(7000);
  // Cleanup all projects (heavy) only on full shutdown
  try {
    await projectManager.cleanup();
  } catch {}
  try {
    const stopScript = path.join(__dirname, '../../../scripts/stop-sidecar.sh');
    execFile('bash', [stopScript], () => {});
  } catch {}
  logger.info('✅ Server stopped');
  process.exit(0);
};

// Ctrl+C or nodemon restart
process.on('SIGINT', fullShutdown);
process.once('SIGUSR2', async () => {
  await fullShutdown();
});
