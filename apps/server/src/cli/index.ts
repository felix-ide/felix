/**
 * CLI Entry Point
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import command creators
import { createInitCommand } from './commands/init.js';
import { createCreateIndexCommand } from './commands/create-index.js';
import { createUpdateIndexCommand } from './commands/update-index.js';
import { createSearchCommand } from './commands/search.js';
import { createGetComponentCommand } from './commands/get-component.js';
import { createGetContextCommand } from './commands/getContext.js';
import { createStatsCommand } from './commands/stats.js';
import { createServeCommand } from './commands/serve.js';
import { createServeStdioCommand } from './commands/serve-stdio.js';
import { createDocsCommand } from './commands/docs.js';

// Get package.json info
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

/**
 * Create the main CLI program
 */
export function createCLI(): Command {
  const program = new Command();
  
  program
    .name('felix')
    .description('Felix — analyze, index, and generate context from codebases')
    .version(packageJson.version);
  
  // Add all commands
  program.addCommand(createInitCommand());
  program.addCommand(createCreateIndexCommand());
  program.addCommand(createUpdateIndexCommand());
  program.addCommand(createSearchCommand());
  program.addCommand(createGetComponentCommand());
  program.addCommand(createGetContextCommand());
  program.addCommand(createStatsCommand());
  program.addCommand(createServeCommand());
  program.addCommand(createServeStdioCommand());
  program.addCommand(createDocsCommand());
  
  // Add global error handler
  program.configureOutput({
    writeErr: (str) => process.stderr.write(str)
  });
  
  return program;
}

/**
 * Run the CLI with provided arguments
 */
export async function runCLI(argv: string[] = process.argv): Promise<void> {
  const program = createCLI();
  
  try {
    await program.parseAsync(argv);
  } catch (error) {
    console.error('❌ CLI Error:', error);
    process.exit(1);
  }
}

// Export command creators for testing
export {
  createInitCommand,
  createCreateIndexCommand,
  createUpdateIndexCommand,
  createSearchCommand,
  createGetComponentCommand,
  createGetContextCommand,
  createStatsCommand,
  createServeCommand,
  createServeStdioCommand,
  createDocsCommand
};
