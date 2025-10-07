import ignore from 'ignore';
import { readFileSync, existsSync } from 'fs';
import { resolve, join, relative } from 'path';

const projectRoot = process.cwd();

console.log('🔍 Ignore Pattern Diagnostics\n');
console.log(`📁 Project root: ${projectRoot}\n`);

const ig = ignore();

// Load database patterns
const dbPatterns = [
  '*.db',
  '*.db-wal',
  '*.db-shm',
  '*.db-journal',
  '*.sqlite',
  '*.sqlite3',
  '.felix.index.db',
  '.felix.index.db-*',
  '.felix.metadata.db',
  '.felix.metadata.db-*',
  'index.db',
  'metadata.db',
  '**/*.db',
  '**/*.db-wal',
  '**/*.db-shm',
  '**/*.db-journal',
  '**/*.sqlite',
  '**/*.sqlite3',
  '**/.felix.index.db',
  '**/.felix.index.db-*',
  '**/.felix.metadata.db',
  '**/.felix.metadata.db-*'
];
ig.add(dbPatterns);
console.log('✅ Added database patterns');

// Load .gitignore
if (existsSync('.gitignore')) {
  const content = readFileSync('.gitignore', 'utf8');
  const patterns = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
  ig.add(patterns);
  console.log(`✅ Loaded .gitignore: ${patterns.length} patterns`);
}

// Load .indexignore
if (existsSync('.indexignore')) {
  const content = readFileSync('.indexignore', 'utf8');
  const patterns = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
  ig.add(patterns);
  console.log(`✅ Loaded .indexignore: ${patterns.length} patterns`);
  console.log('   Patterns:');
  patterns.forEach(p => console.log(`     - ${p}`));
}

console.log('\n📋 Testing paths:\n');

const testPaths = [
  'apps/server/src/index.ts',
  'apps/server/dist/index.js',
  'apps/client/dist/main.js',
  'node_modules/react/index.js',
  'packages/code-intelligence/test-fixtures/sample.ts',
  'packages/code-intelligence/src/index.ts',
  'packages/code-intelligence/dist/index.js',
  '.felix.index.db',
  'apps/server/.felix.index.db-wal',
  'coverage/index.html',
  'apps/client/coverage/index.html'
];

for (const path of testPaths) {
  const relativePath = relative(projectRoot, resolve(projectRoot, path));
  const normalizedPath = relativePath.replace(/\\/g, '/');
  const ignored = ig.ignores(normalizedPath);
  console.log(`  ${ignored ? '❌ IGNORED' : '✅ ACCEPTED'}: ${path}`);
}

console.log('\n🔢 Summary:');
const accepted = testPaths.filter(path => {
  const relativePath = relative(projectRoot, resolve(projectRoot, path));
  const normalizedPath = relativePath.replace(/\\/g, '/');
  return !ig.ignores(normalizedPath);
});
console.log(`  Accepted: ${accepted.length}/${testPaths.length}`);
