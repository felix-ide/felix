/**
 * CLI Helper Functions
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { CLIConfig, CLIOptions } from './types.js';
import type { IComponent, IRelationship } from '@felix/code-intelligence';
import type { StorageStats } from '../types/storage.js';
// Note: do not import parser factory here; chokidar ignores should come
// only from local defaults and CLI config to avoid over-filtering.

export const DEFAULT_CONFIG: CLIConfig = {
  defaultStorage: 'native-sqlite',
  defaultExcludes: [
    // Core directories to always exclude
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    'coverage-integration',
    'lcov-report',
    '.nyc_output',
    'tmp',
    'temp',
    '.cache',
    '.parcel-cache',
    '.next',
    '.nuxt',
    '.vuepress',
    '.serverless',
    '.fusebox',
    '.dynamodb',
    '.vscode-test',
    '.yarn',
    '.pnp.*',
    // Python
    '__pycache__',
    'venv',
    'env',
    '.venv',
    '.env',
    '.pytest_cache',
    'htmlcov',
    // Java
    'target',
    '.gradle',
    // Database files - CRITICAL to prevent infinite loops
    '.felix',
    '*.db',
    '*.db-wal',
    '*.db-shm',
    '*.sqlite',
    '*.sqlite3'
  ],
  excludeExtensions: [
    // Binary and media files
    '.exe', '.dll', '.so', '.dylib',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg',
    '.mp3', '.mp4', '.avi', '.mov', '.wmv',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    // Lock files
    '.lock',
    // Log files
    '.log'
  ],
  maxFileSize: 1024 * 1024, // 1MB
  outputFormat: 'text',
  verbose: false
};

/**
 * Get chokidar ignore patterns for file watching
 * Uses language-specific patterns from code-parser library
 */
export function getChokidarIgnorePatterns(): (string | RegExp | ((path: string) => boolean))[] {
  // Convert exclude extensions to glob patterns (if any remain)
  const excludeExtensionPatterns = DEFAULT_CONFIG.excludeExtensions.map(ext => `**/*${ext}`);
  
  // Split defaultExcludes into directory names and glob file patterns
  const dirExcludes: string[] = [];
  const globExcludes: string[] = [];
  for (const item of DEFAULT_CONFIG.defaultExcludes) {
    if (item.includes('*')) {
      globExcludes.push(item);
    } else {
      dirExcludes.push(item);
    }
  }

  // Convert exclude directories to chokidar-compatible patterns
  const excludeDirectoryPatterns = dirExcludes.flatMap(dir => [
    `**/${dir}`,
    `**/${dir}/**`,
    `${dir}/**`
  ]);

  // Convert file glob excludes to chokidar-compatible patterns
  const excludeFileGlobPatterns = globExcludes.flatMap(glob => [
    glob.startsWith('**/') ? glob : `**/${glob}`,
    glob
  ]);
  
  return [
    ...excludeExtensionPatterns,
    ...excludeDirectoryPatterns,
    ...excludeFileGlobPatterns
  ];
}

export const CONFIG_FILE_NAME = '.felix.json';
export const DATABASE_PREFIX = 'felix';

/**
 * Load configuration from file or return defaults
 */
export function loadConfig(configPath?: string): CLIConfig {
  const defaultPath = join(process.cwd(), CONFIG_FILE_NAME);
  const filePath = configPath || defaultPath;
  
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const fileConfig = JSON.parse(content);
      return { ...DEFAULT_CONFIG, ...fileConfig };
    } catch (error) {
      console.warn(`⚠️  Failed to load config from ${filePath}: ${error}`);
    }
  }
  
  return DEFAULT_CONFIG;
}

/**
 * Save configuration to file
 */
export function saveConfig(config: CLIConfig, configPath?: string): void {
  const defaultPath = join(process.cwd(), CONFIG_FILE_NAME);
  const filePath = configPath || defaultPath;
  
  try {
    writeFileSync(filePath, JSON.stringify(config, null, 2));
    console.error(`✅ Configuration saved to ${filePath}`);
  } catch (error) {
    console.error(`❌ Failed to save config to ${filePath}: ${error}`);
    process.exit(1);
  }
}

/**
 * Progress reporter for CLI operations
 */
export class CLIProgressReporter {
  private startTime: number;
  private lastUpdate: number;
  private verbose: boolean;
  
  constructor(verbose: boolean = false) {
    this.verbose = verbose;
    this.startTime = Date.now();
    this.lastUpdate = this.startTime;
  }
  
  onFileProcessed(filePath: string, componentCount: number, relationshipCount: number): void {
    if (this.verbose) {
      const now = Date.now();
      const elapsed = now - this.lastUpdate;
      console.error(`📁 ${filePath}: ${componentCount} components, ${relationshipCount} relationships (+${elapsed}ms)`);
      this.lastUpdate = now;
    } else {
      process.stdout.write('.');
    }
  }
  
  onError(filePath: string, error: Error): void {
    if (this.verbose) {
      console.error(`❌ ${filePath}: ${error.message}`);
    } else {
      process.stdout.write('E');
    }
  }
  
  onProgress(stage: string, message: string): void {
    if (this.verbose) {
      console.error(`🔄 ${stage}: ${message}`);
    }
  }
  
  finish(filesProcessed: number): void {
    if (!this.verbose) {
      console.error(); // New line after dots
    }
    const elapsed = Date.now() - this.startTime;
    console.error(`✅ Processed ${filesProcessed} files in ${elapsed}ms`);
  }
}

/**
 * Format components for output
 */
export function formatComponents(
  components: IComponent[], 
  format: 'json' | 'text' | 'markdown' = 'text',
  detailed: boolean = false
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(components, null, 2);
      
    case 'markdown':
      return formatComponentsMarkdown(components, detailed);
      
    case 'text':
    default:
      return formatComponentsText(components, detailed);
  }
}

function formatComponentsText(components: IComponent[], detailed: boolean): string {
  if (components.length === 0) {
    return 'No components found.';
  }
  
  const lines: string[] = [];
  lines.push(`Found ${components.length} components:\n`);
  
  // Group by type
  const byType = new Map<string, IComponent[]>();
  for (const component of components) {
    if (!byType.has(component.type)) {
      byType.set(component.type, []);
    }
    byType.get(component.type)!.push(component);
  }
  
  for (const [type, typeComponents] of byType) {
    lines.push(`📋 ${type.toUpperCase()} (${typeComponents.length}):`);
    for (const component of typeComponents) {
      const location = `${component.location.startLine}:${component.location.startColumn}`;
      lines.push(`  ${component.name} (${component.language}) - ${component.filePath}:${location}`);
      
      if (detailed) {
        lines.push(`    ID: ${component.id}`);
        if (Object.keys(component.metadata).length > 0) {
          lines.push(`    Metadata: ${Object.keys(component.metadata).join(', ')}`);
        }
      }
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

function formatComponentsMarkdown(components: IComponent[], detailed: boolean): string {
  if (components.length === 0) {
    return '# Components\n\nNo components found.';
  }
  
  const lines: string[] = [];
  lines.push(`# Components (${components.length})\n`);
  
  // Group by type
  const byType = new Map<string, IComponent[]>();
  for (const component of components) {
    if (!byType.has(component.type)) {
      byType.set(component.type, []);
    }
    byType.get(component.type)!.push(component);
  }
  
  for (const [type, typeComponents] of byType) {
    lines.push(`## ${type.charAt(0).toUpperCase() + type.slice(1)} (${typeComponents.length})\n`);
    
    for (const component of typeComponents) {
      const location = `${component.location.startLine}:${component.location.startColumn}`;
      lines.push(`### ${component.name}`);
      lines.push(`- **Language**: ${component.language}`);
      lines.push(`- **File**: \`${component.filePath}\``);
      lines.push(`- **Location**: Line ${location}`);
      
      if (detailed) {
        lines.push(`- **ID**: \`${component.id}\``);
        if (Object.keys(component.metadata).length > 0) {
          lines.push(`- **Metadata**: ${Object.keys(component.metadata).join(', ')}`);
        }
      }
      lines.push('');
    }
  }
  
  return lines.join('\n');
}

/**
 * Format relationships for output
 */
export function formatRelationships(
  relationships: IRelationship[], 
  format: 'json' | 'text' | 'markdown' = 'text'
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(relationships, null, 2);
      
    case 'markdown':
      return formatRelationshipsMarkdown(relationships);
      
    case 'text':
    default:
      return formatRelationshipsText(relationships);
  }
}

function formatRelationshipsText(relationships: IRelationship[]): string {
  if (relationships.length === 0) {
    return 'No relationships found.';
  }
  
  const lines: string[] = [];
  lines.push(`Found ${relationships.length} relationships:\n`);
  
  // Group by type
  const byType = new Map<string, IRelationship[]>();
  for (const relationship of relationships) {
    if (!byType.has(relationship.type)) {
      byType.set(relationship.type, []);
    }
    byType.get(relationship.type)!.push(relationship);
  }
  
  for (const [type, typeRelationships] of byType) {
    lines.push(`🔗 ${type.toUpperCase()} (${typeRelationships.length}):`);
    for (const rel of typeRelationships) {
      lines.push(`  ${rel.sourceId} → ${rel.targetId}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

function formatRelationshipsMarkdown(relationships: IRelationship[]): string {
  if (relationships.length === 0) {
    return '# Relationships\n\nNo relationships found.';
  }
  
  const lines: string[] = [];
  lines.push(`# Relationships (${relationships.length})\n`);
  
  // Group by type
  const byType = new Map<string, IRelationship[]>();
  for (const relationship of relationships) {
    if (!byType.has(relationship.type)) {
      byType.set(relationship.type, []);
    }
    byType.get(relationship.type)!.push(relationship);
  }
  
  for (const [type, typeRelationships] of byType) {
    lines.push(`## ${type.charAt(0).toUpperCase() + type.slice(1)} (${typeRelationships.length})\n`);
    
    for (const rel of typeRelationships) {
      lines.push(`- \`${rel.sourceId}\` → \`${rel.targetId}\``);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Format statistics for output
 */
export function formatStats(
  stats: StorageStats, 
  format: 'json' | 'text' | 'markdown' = 'text',
  detailed: boolean = false
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(stats, null, 2);
      
    case 'markdown':
      return formatStatsMarkdown(stats, detailed);
      
    case 'text':
    default:
      return formatStatsText(stats, detailed);
  }
}

function formatStatsText(stats: StorageStats, detailed: boolean): string {
  const lines: string[] = [];
  lines.push('📊 Felix Statistics\n');
  
  lines.push(`Components: ${stats.componentCount}`);
  lines.push(`Relationships: ${stats.relationshipCount}`);
  lines.push(`Files: ${stats.fileCount}`);
  lines.push(`Index Size: ${formatBytes(stats.indexSize)}`);
  lines.push(`Last Updated: ${stats.lastUpdated.toLocaleString()}`);
  
  if (detailed && Object.keys(stats.languageBreakdown).length > 0) {
    lines.push('\n🌍 Language Breakdown:');
    for (const [language, count] of Object.entries(stats.languageBreakdown)) {
      lines.push(`  ${language}: ${count} components`);
    }
  }
  
  return lines.join('\n');
}

function formatStatsMarkdown(stats: StorageStats, detailed: boolean): string {
  const lines: string[] = [];
  lines.push('# Felix Statistics\n');
  
  lines.push(`- **Components**: ${stats.componentCount}`);
  lines.push(`- **Relationships**: ${stats.relationshipCount}`);
  lines.push(`- **Files**: ${stats.fileCount}`);
  lines.push(`- **Index Size**: ${formatBytes(stats.indexSize)}`);
  lines.push(`- **Last Updated**: ${stats.lastUpdated.toLocaleString()}`);
  
  if (detailed && Object.keys(stats.languageBreakdown).length > 0) {
    lines.push('\n## Language Breakdown\n');
    for (const [language, count] of Object.entries(stats.languageBreakdown)) {
      lines.push(`- **${language}**: ${count} components`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Format bytes for human reading
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Handle CLI errors consistently
 */
export function handleError(error: unknown, verbose: boolean = false): void {
  if (error instanceof Error) {
    console.error(`❌ Error: ${error.message}`);
    if (verbose && error.stack) {
      console.error(error.stack);
    }
  } else {
    console.error(`❌ Unknown error: ${error}`);
  }
  process.exit(1);
}

/**
 * Output content to file or console
 */
export function outputContent(content: string, outputPath?: string): void {
  if (outputPath) {
    try {
      writeFileSync(outputPath, content);
      console.error(`📄 Output written to ${outputPath}`);
    } catch (error) {
      console.error(`❌ Failed to write to ${outputPath}: ${error}`);
      process.exit(1);
    }
  } else {
    console.error(content);
  }
}

/**
 * Format output for display
 */
export function formatOutput(data: any, format: 'json' | 'text' | 'markdown' = 'text'): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'markdown':
      return formatAsMarkdown(data);
    case 'text':
    default:
      return formatAsText(data);
  }
}

function formatAsMarkdown(data: any): string {
  if (Array.isArray(data)) {
    return data.map(item => `- ${JSON.stringify(item)}`).join('\n');
  }
  return `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
}

function formatAsText(data: any): string {
  if (typeof data === 'string') return data;
  return JSON.stringify(data, null, 2);
}

/**
 * Handle command errors
 */
export function handleCommandError(error: any, verbose?: boolean): void {
  if (verbose && error.stack) {
    console.error('❌ Error:', error.stack);
  } else {
    console.error('❌ Error:', error.message || error);
  }
  process.exit(1);
}
