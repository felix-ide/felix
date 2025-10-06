/**
 * Felix MCP stdio Server Command
 */

import { Command } from 'commander';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create the serve-stdio command
 */
export function createServeStdioCommand(): Command {
  return new Command('serve-stdio')
    .description('Start Felix MCP server over stdio (no HTTP)')
    .action(async () => {
      console.error('🚀 Starting Felix MCP stdio server...');
      
      const codeIndexerDir = path.join(__dirname, '../..');
      const child = spawn('npm', ['run', 'start:stdio'], {
        cwd: codeIndexerDir,
        env: { ...process.env },
        stdio: 'inherit'
      });

      // Forward signals to child process
      process.on('SIGINT', () => child.kill('SIGINT'));
      process.on('SIGTERM', () => child.kill('SIGTERM'));

      child.on('exit', (code) => process.exit(code ?? 0));
      child.on('error', (error) => {
        console.error('❌ Error starting stdio server:', error);
        process.exit(1);
      });
    });
}
