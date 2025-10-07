import { readdirSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();

const DEFAULT_EXCLUDES = [
  'node_modules', '.git', 'dist', 'build', 'coverage', 'coverage-integration',
  'lcov-report', '.nyc_output', 'tmp', 'temp', '.cache', '.parcel-cache',
  '.next', '.nuxt', '.vuepress', '.serverless', '.fusebox', '.dynamodb',
  '.vscode-test', '.yarn', '.pnp.*', '__pycache__', 'venv', 'env', '.venv',
  '.env', '.pytest_cache', 'htmlcov', 'target', '.gradle', '.felix',
  '*.db', '*.db-wal', '*.db-shm', '*.sqlite', '*.sqlite3'
];

console.log('🔍 Testing directory exclusion logic\n');

const rootEntries = readdirSync(projectRoot);
console.log(`Root entries: ${rootEntries.length}\n`);

for (const entry of rootEntries) {
  const excluded = DEFAULT_EXCLUDES.includes(entry);
  if (entry.startsWith('.') || excluded || ['apps', 'packages', 'node_modules'].includes(entry)) {
    console.log(`${excluded ? '❌ EXCLUDED' : '✅ NOT EXCLUDED'}: ${entry}`);
  }
}

// Test the specific check used in the code
console.log('\n🔍 Specific directory checks:');
const testDirs = ['apps', 'packages', '.felix', 'src', 'dist'];
for (const dir of testDirs) {
  const excluded = DEFAULT_EXCLUDES.includes(dir);
  console.log(`  ${dir}: ${excluded ? 'EXCLUDED' : 'OK'}`);
}
