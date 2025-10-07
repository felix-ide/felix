import { DatabaseManager } from './apps/server/src/features/storage/DatabaseManager.js';
import { CodeIndexer } from './apps/server/src/features/indexing/api/CodeIndexer.js';
import { IgnorePatterns } from './apps/server/src/utils/IgnorePatterns.js';
import { ParserFactory } from '@felix/code-intelligence';
import { readFileSync } from 'fs';

const projectPath = process.cwd();

console.log('🔍 Indexing Diagnostics\n');
console.log(`📁 Project path: ${projectPath}\n`);

// Check ignore files
console.log('📋 Checking ignore files:');
try {
  const gitignore = readFileSync('.gitignore', 'utf-8');
  console.log(`  .gitignore: ${gitignore.split('\n').length} lines`);
} catch (e) {
  console.log('  .gitignore: NOT FOUND');
}

try {
  const indexignore = readFileSync('.indexignore', 'utf-8');
  console.log(`  .indexignore: ${indexignore.split('\n').length} lines`);
  console.log(`  .indexignore contents:\n${indexignore.split('\n').map(l => `    ${l}`).join('\n')}`);
} catch (e) {
  console.log('  .indexignore: NOT FOUND');
}

console.log('\n🔧 Testing IgnorePatterns:');
const ignorePatterns = new IgnorePatterns(projectPath, {
  respectGitignore: true,
  useIndexIgnore: true,
  respectGlobalGitignore: false
});

const testPaths = [
  'apps/server/src/index.ts',
  'apps/server/dist/index.js',
  'node_modules/some-package/index.js',
  'packages/code-intelligence/test-fixtures/sample.ts',
  'packages/code-intelligence/src/index.ts',
  '.felix.index.db',
  'apps/server/.felix.index.db-wal'
];

console.log('Testing paths:');
for (const path of testPaths) {
  const ignored = ignorePatterns.shouldIgnore(path);
  console.log(`  ${ignored ? '✗' : '✓'} ${path}`);
}

console.log('\n📊 Parser Factory Info:');
const parserFactory = new ParserFactory();
const extensions = parserFactory.getSupportedExtensions();
console.log(`  Supported extensions (${extensions.length}): ${extensions.join(', ')}`);
