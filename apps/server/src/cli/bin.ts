#!/usr/bin/env node --experimental-sqlite

/**
 * CLI Binary Entry Point
 */

import { runCLI } from './index.js';

// Run the CLI
runCLI().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});