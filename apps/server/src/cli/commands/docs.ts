#!/usr/bin/env node

/**
 * Documentation bundle management commands
 */

import { Command } from 'commander';
import { CodeIndexer } from '../../features/indexing/api/CodeIndexer.js';
import { DocumentationService } from '../../features/metadata/services/DocumentationService.js';
import { 
  DEFAULT_CONFIG, 
  DATABASE_PREFIX
} from '../helpers.js';
import { DatabaseManager } from '../../features/storage/DatabaseManager.js';
import path, { join } from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Helper functions
const resolveProjectPath = (p: string) => path.resolve(p);
const validateProjectPath = async (p: string) => {
  if (!existsSync(p)) throw new Error(`Path does not exist: ${p}`);
  return true;
};
const formatError = (msg: string) => `❌ ${msg}`;
const formatSuccess = (msg: string) => `✅ ${msg}`;
const formatInfo = (msg: string) => `ℹ️  ${msg}`;
const formatWarning = (msg: string) => `⚠️  ${msg}`;

/**
 * Create documentation commands
 */
export function createDocsCommand(): Command {
  const docsCommand = new Command('docs')
    .description('Manage documentation bundles');

  // Attach bundle command
  docsCommand
    .command('attach <bundle-path>')
    .description('Attach a documentation bundle SQLite file')
    .option('-p, --project <path>', 'Project directory (default: current directory)')
    .action(async (bundlePath: string, options: { project?: string }) => {
      try {
        const projectPath = resolveProjectPath(options.project || process.cwd());
        await validateProjectPath(projectPath);

        console.log(formatInfo(`Attaching documentation bundle: ${bundlePath}`));

        // Initialize database
        const dbManager = DatabaseManager.getInstance();
        await dbManager.initialize();
        
        // Initialize CodeIndexer
        const codeIndexer = new CodeIndexer(dbManager);
        await codeIndexer.initialize();

        // Create documentation service
        const bundleDir = path.join(projectPath, '.felix', 'doc-bundles');
        const docService = new DocumentationService(
          bundleDir,
          (codeIndexer as any).embeddingService
        );
        await docService.initialize();

        // Attach the bundle
        const bundleId = await docService.attachBundle(bundlePath);
        
        console.log(formatSuccess(`✅ Successfully attached bundle: ${bundleId}`));

        await codeIndexer.close();
      } catch (error) {
        console.error(formatError(`Failed to attach bundle: ${error}`));
        process.exit(1);
      }
    });

  // Detach bundle command
  docsCommand
    .command('detach <bundle-id>')
    .description('Detach a documentation bundle')
    .option('-p, --project <path>', 'Project directory (default: current directory)')
    .action(async (bundleId: string, options: { project?: string }) => {
      try {
        const projectPath = resolveProjectPath(options.project || process.cwd());
        await validateProjectPath(projectPath);

        console.log(formatInfo(`Detaching documentation bundle: ${bundleId}`));

        // Initialize database
        const dbManager = DatabaseManager.getInstance();
        await dbManager.initialize();
        
        // Initialize CodeIndexer
        const codeIndexer = new CodeIndexer(dbManager);
        await codeIndexer.initialize();

        // Create documentation service
        const bundleDir = path.join(projectPath, '.felix', 'doc-bundles');
        const docService = new DocumentationService(
          bundleDir,
          (codeIndexer as any).embeddingService
        );
        await docService.initialize();

        // Detach the bundle
        await docService.detachBundle(bundleId);
        
        console.log(formatSuccess(`✅ Successfully detached bundle: ${bundleId}`));

        await codeIndexer.close();
      } catch (error) {
        console.error(formatError(`Failed to detach bundle: ${error}`));
        process.exit(1);
      }
    });

  // List bundles command
  docsCommand
    .command('list')
    .description('List all attached documentation bundles')
    .option('-p, --project <path>', 'Project directory (default: current directory)')
    .action(async (options: { project?: string }) => {
      try {
        const projectPath = resolveProjectPath(options.project || process.cwd());
        await validateProjectPath(projectPath);

        // Initialize database
        const dbManager = DatabaseManager.getInstance();
        await dbManager.initialize();
        
        // Initialize CodeIndexer
        const codeIndexer = new CodeIndexer(dbManager);
        await codeIndexer.initialize();

        // Create documentation service
        const bundleDir = path.join(projectPath, '.felix', 'doc-bundles');
        const docService = new DocumentationService(
          bundleDir,
          (codeIndexer as any).embeddingService
        );
        await docService.initialize();

        // List bundles
        const bundles = docService.listBundles();
        
        if (bundles.length === 0) {
          console.log(formatWarning('No documentation bundles attached'));
        } else {
          console.log(formatInfo(`Found ${bundles.length} documentation bundle(s):\n`));
          
          for (const bundle of bundles) {
            console.log(`📚 ${bundle.id}`);
            console.log(`   Name: ${bundle.name}`);
            console.log(`   Path: ${bundle.path}`);
            console.log(`   Documents: ${bundle.metadata.total_documents}`);
            if (bundle.metadata.library_version) {
              console.log(`   Version: ${bundle.metadata.library_version}`);
            }
            console.log('');
          }
        }

        await codeIndexer.close();
      } catch (error) {
        console.error(formatError(`Failed to list bundles: ${error}`));
        process.exit(1);
      }
    });

  // Search documentation command
  docsCommand
    .command('search <query>')
    .description('Search documentation bundles')
    .option('-p, --project <path>', 'Project directory (default: current directory)')
    .option('-l, --library <ids...>', 'Limit search to specific library IDs')
    .option('-n, --limit <number>', 'Maximum number of results (default: 20)', '20')
    .option('-t, --types <types...>', 'Filter by section types')
    .option('-s, --similarity <threshold>', 'Similarity threshold 0.0-1.0 (default: 0.3)', '0.3')
    .action(async (query: string, options: {
      project?: string;
      library?: string[];
      limit: string;
      types?: string[];
      similarity: string;
    }) => {
      try {
        const projectPath = resolveProjectPath(options.project || process.cwd());
        await validateProjectPath(projectPath);

        console.log(formatInfo(`Searching documentation for: "${query}"`));

        // Initialize database
        const dbManager = DatabaseManager.getInstance();
        await dbManager.initialize();
        
        // Initialize CodeIndexer
        const codeIndexer = new CodeIndexer(dbManager);
        await codeIndexer.initialize();

        // Create documentation service
        const bundleDir = path.join(projectPath, '.felix', 'doc-bundles');
        const docService = new DocumentationService(
          bundleDir,
          (codeIndexer as any).embeddingService
        );
        await docService.initialize();

        // Search documentation
        const results = await docService.searchDocumentation({
          query,
          library_ids: options.library,
          limit: parseInt(options.limit),
          section_types: options.types,
          similarity_threshold: parseFloat(options.similarity)
        });

        if (results.results.length === 0) {
          console.log(formatWarning('No results found'));
        } else {
          console.log(formatSuccess(`\nFound ${results.total} result(s), showing top ${results.results.length}:\n`));
          
          for (const result of results.results) {
            console.log(`📄 ${result.title}`);
            console.log(`   Library: ${result.library_name}`);
            console.log(`   Type: ${result.section_type}`);
            console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`);
            console.log(`   URL: ${result.url}`);
            
            if (result.highlights && result.highlights.length > 0) {
              console.log(`   Highlights:`);
              for (const highlight of result.highlights) {
                console.log(`   - ${highlight}`);
              }
            }
            console.log('');
          }
          
          console.log(formatInfo(`Searched ${results.bundles_searched.length} bundle(s): ${results.bundles_searched.join(', ')}`));
        }

        await codeIndexer.close();
      } catch (error) {
        console.error(formatError(`Failed to search documentation: ${error}`));
        process.exit(1);
      }
    });

  // Install unified documentation bundle
  docsCommand
    .command('install <bundle-file>')
    .description('Install unified documentation bundle as .felix.docs.db')
    .option('-p, --project <path>', 'Project directory (default: current directory)')
    .action(async (bundleFile: string, options: { project?: string }) => {
      try {
        const projectPath = resolveProjectPath(options.project || process.cwd());
        await validateProjectPath(projectPath);

        console.log(formatInfo(`Installing documentation bundle: ${bundleFile}`));

        const bundlePath = path.resolve(bundleFile);
        const targetPath = path.join(projectPath, '.felix.docs.db');

        // Check if bundle file exists
        try {
          await fs.access(bundlePath);
        } catch {
          throw new Error(`Bundle file not found: ${bundlePath}`);
        }

        // Copy bundle to project directory with correct name
        await fs.copyFile(bundlePath, targetPath);

        console.log(formatSuccess(`Documentation installed: ${targetPath}`));
        console.log(formatInfo('The documentation database will be automatically loaded when you use the project.'));

      } catch (error) {
        console.error(formatError(`Failed to install documentation: ${error}`));
        process.exit(1);
      }
    });

  // Auto-attach command
  docsCommand
    .command('auto-attach')
    .description('Auto-attach documentation bundles based on package.json dependencies')
    .option('-p, --project <path>', 'Project directory (default: current directory)')
    .option('-f, --package-file <path>', 'Path to package.json (default: project root)')
    .action(async (options: { project?: string; packageFile?: string }) => {
      try {
        const projectPath = resolveProjectPath(options.project || process.cwd());
        await validateProjectPath(projectPath);

        const packageJsonPath = options.packageFile || path.join(projectPath, 'package.json');
        
        // Check if package.json exists
        try {
          await fs.access(packageJsonPath);
        } catch {
          throw new Error(`package.json not found at: ${packageJsonPath}`);
        }

        console.log(formatInfo('Auto-attaching documentation bundles based on package.json...'));

        // Initialize database
        const dbManager = DatabaseManager.getInstance();
        await dbManager.initialize();
        
        // Initialize CodeIndexer
        const codeIndexer = new CodeIndexer(dbManager);
        await codeIndexer.initialize();

        // Create documentation service
        const bundleDir = path.join(projectPath, '.felix', 'doc-bundles');
        const docService = new DocumentationService(
          bundleDir,
          (codeIndexer as any).embeddingService
        );
        await docService.initialize();

        // Auto-attach bundles
        const attachedBundles = await docService.autoAttachFromPackageJson(packageJsonPath);
        
        if (attachedBundles.length === 0) {
          console.log(formatWarning('No documentation bundles found for package.json dependencies'));
        } else {
          console.log(formatSuccess(`✅ Auto-attached ${attachedBundles.length} bundle(s):`));
          for (const bundleId of attachedBundles) {
            console.log(`   - ${bundleId}`);
          }
        }

        await codeIndexer.close();
      } catch (error) {
        console.error(formatError(`Failed to auto-attach bundles: ${error}`));
        process.exit(1);
      }
    });

  return docsCommand;
}