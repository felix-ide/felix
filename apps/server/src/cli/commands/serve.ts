/**
 * Felix Server Command - Wrapper around npm start
 */

import { Command } from 'commander';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create the serve command
 */
export function createServeCommand(): Command {
  return new Command('serve')
    .description('Start Felix server (unified HTTP API + MCP SSE)')
    .option('-p, --port <port>', 'Port to run the server on', '9000')
    .action(async (options) => {
      const port = options.port;
      
      console.error('🚀 Starting Felix server...');
      console.error(`📌 Port: ${port}`);
      console.error('');
      
      // Set environment variables
      const env = { 
        ...process.env, 
        PORT: port 
      };
      
      // Run npm start from the Felix server directory
      const felixDir = path.join(__dirname, '../..');
      
      const child = spawn('npm', ['start'], {
        cwd: felixDir,
        env,
        stdio: 'inherit' // Forward output to current terminal
      });
      
      // Forward signals to child process
      process.on('SIGINT', () => child.kill('SIGINT'));
      process.on('SIGTERM', () => child.kill('SIGTERM'));
      
      child.on('exit', (code) => {
        process.exit(code || 0);
      });
      
      child.on('error', (error) => {
        console.error('❌ Error starting server:', error);
        process.exit(1);
      });
    });
}
