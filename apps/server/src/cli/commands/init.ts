/**
 * Init Command - Initialize configuration
 */

import { Command } from 'commander';
import { existsSync } from 'fs';
import { join } from 'path';
import type { InitOptions, CLIConfig } from '../types.js';
import { DEFAULT_CONFIG, CONFIG_FILE_NAME, saveConfig, handleError } from '../helpers.js';

export function createInitCommand(): Command {
  return new Command('init')
    .description('Initialize Felix configuration')
    .option('-f, --force', 'overwrite existing configuration')
    .option('-t, --template <type>', 'configuration template (basic|advanced)', 'basic')
    .option('-c, --config <path>', 'config file path')
    .option('-v, --verbose', 'verbose output')
    .action(async (options: InitOptions) => {
      try {
        await initCommand(options);
      } catch (error) {
        handleError(error, options.verbose);
      }
    });
}

export async function initCommand(options: InitOptions): Promise<void> {
  const configPath = options.config || join(process.cwd(), CONFIG_FILE_NAME);
  
  // Check if config already exists
  if (existsSync(configPath) && !options.force) {
    console.error(`❌ Configuration file already exists at ${configPath}`);
    console.error('Use --force to overwrite, or specify a different path with --config');
    process.exit(1);
  }
  
  console.error('🚀 Initializing Felix configuration...');
  
  // Create configuration based on template
  let config: CLIConfig;
  
  switch (options.template) {
    case 'advanced':
      config = {
        ...DEFAULT_CONFIG,
        defaultStorage: 'sql.js',
        maxFileSize: 2048 * 1024, // 2MB
        verbose: true
      };
      break;
      
    case 'basic':
    default:
      config = DEFAULT_CONFIG;
      break;
  }
  
  // Save configuration
  saveConfig(config, configPath);
  
  console.error(`✅ Configuration initialized at ${configPath}`);
  console.error(`📋 Template: ${options.template}`);
  console.error(`💾 Default storage: ${config.defaultStorage}`);
  console.error(`📁 Excluded patterns: ${config.defaultExcludes.length} patterns`);
  console.error(`📏 Max file size: ${Math.round(config.maxFileSize / 1024)}KB`);
  
  console.error('\n🎯 Next steps:');
  console.error('  1. Review and customize the configuration file');
  console.error('  2. Run "felix create-index" to create your first index');
  console.error('  3. Use "felix search" to explore your codebase');
}
