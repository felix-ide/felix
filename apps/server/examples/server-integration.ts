/**
 * Example: Integrating The Felix into an existing Express application
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { StorageFactory, StorageType } from '@felix/utility-belt/storage';
import { 
  createFelixRoutes, 
  mountFelix,
  setCurrentProject 
} from '../src/server/integration.js';

async function main() {
  // 1. Create your main Express app
  const app = express();
  const server = createServer(app);
  
  // 2. Setup Socket.io for real-time features (optional)
  const io = new SocketServer(server, {
    cors: {
      origin: '*',
      credentials: true
    }
  });

  // 3. Create a shared storage instance (optional - will use internal if not provided)
  const storage = await StorageFactory.createStorage(StorageType.UTILITY_BELT_SQLITE, {
    databasePath: './my-app.db'
  });

  // 4. Create Felix routes with your configuration
  const felixRoutes = await createFelixRoutes({
    basePath: '/felix',
    storage,               // Use your app's storage
    io,                   // Share Socket.io instance
    enableMCP: true,      // Enable MCP server
    enableProjectEditor: true,
    logging: true
  });

  // 5. Add your app's middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // 6. Mount your app's routes
  app.get('/', (req, res) => {
    res.json({ message: 'My app with integrated Felix backend!' });
  });

  // 7. Mount The Felix routes
  mountFelix(app, felixRoutes, {
    basePath: '/felix'  // All routes will be under /Felix/*
  });

  // 8. Setup WebSocket handlers if using Socket.io
  if (felixRoutes.socketHandlers) {
    io.on('connection', felixRoutes.socketHandlers.onConnection);
  }

  // 9. Initialize with a project (optional)
  const projectPath = process.argv[2] || process.cwd();
  await felixRoutes.projectManager.setProject(projectPath);
  setCurrentProject(projectPath);

  // 10. Start your server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Felix API: http://localhost:${PORT}/Felix/api`);
    console.log(`Felix MCP: http://localhost:${PORT}/Felix/mcp`);
  });
}

main().catch(console.error);

/**
 * Alternative: Minimal integration without Socket.io or custom storage
 */
async function minimalIntegration() {
  const app = express();
  
  // Create routes with defaults
  const routes = await createFelixRoutes();
  
  // Mount on app
  mountFelix(app, routes);
  
  app.listen(3000);
}

/**
 * Alternative: Integration with custom route handling
 */
async function customIntegration() {
  const app = express();
  
  // Create routes
  const routes = await createFelixRoutes({
    enableMCP: false,  // Disable MCP if not needed
    enableProjectEditor: false  // Handle file operations yourself
  });
  
  // Mount only the API router with custom prefix
  app.use('/my-api/indexer', routes.apiRouter);
  
  // Add custom middleware for authentication
  app.use('/my-api/indexer', (req, res, next) => {
    // Your auth logic here
    next();
  });
  
  app.listen(3000);
}
