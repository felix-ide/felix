import { readdirSync, statSync } from 'fs';
import { join, extname, basename, dirname } from 'path';
import ignore from 'ignore';
import { readFileSync, existsSync } from 'fs';

const projectRoot = process.cwd();

// Setup ignore patterns
const ig = ignore();
const dbPatterns = [
  '*.db', '*.db-wal', '*.db-shm', '*.db-journal', '*.sqlite', '*.sqlite3',
  '.felix.index.db', '.felix.index.db-*', '.felix.metadata.db', '.felix.metadata.db-*',
  'index.db', 'metadata.db', '**/*.db', '**/*.db-wal', '**/*.db-shm', '**/*.db-journal',
  '**/*.sqlite', '**/*.sqlite3', '**/.felix.index.db', '**/.felix.index.db-*',
  '**/.felix.metadata.db', '**/.felix.metadata.db-*'
];
ig.add(dbPatterns);

if (existsSync('.gitignore')) {
  const content = readFileSync('.gitignore', 'utf8');
  const patterns = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  ig.add(patterns);
}

if (existsSync('.indexignore')) {
  const content = readFileSync('.indexignore', 'utf8');
  const patterns = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  ig.add(patterns);
}

// Supported extensions from the parser
const SUPPORTED_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.pyw', '.pyi',
  '.php', '.phtml', '.php3', '.php4', '.php5', '.phar',
  '.java',
  '.cs', '.csx',
  '.md', '.markdown', '.mdown', '.mkd', '.mkdn', '.mdx',
  '.rst', '.txt',
  '.html', '.htm', '.xhtml', '.vue',
  '.css', '.scss', '.sass', '.less',
  '.json', '.webmanifest'
].map(e => e.toLowerCase()));

const FALLBACK_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.pyw', '.php', '.phtml', '.php3', '.php4', '.php5', '.php7',
  '.java', '.html', '.htm', '.xhtml', '.css', '.scss', '.sass', '.less',
  '.md', '.markdown', '.mdx', '.json', '.jsonc', '.json5'
];

const EXCLUDE_DIRECTORIES = ['node_modules', '.git', 'dist', 'build'];
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

const stats = {
  scanned: 0,
  ignoredByPatterns: 0,
  ignoredByExcludeDir: 0,
  ignoredByTestPatterns: 0,
  ignoredOversize: 0,
  ignoredUnsupportedExt: 0,
  accepted: 0,
  acceptedViaFallback: 0
};

function shouldIgnore(fullPath) {
  const relative = fullPath.replace(projectRoot + '\\', '').replace(projectRoot + '/', '');
  const normalized = relative.replace(/\\/g, '/');
  return ig.ignores(normalized);
}

function walkDirectory(dir, depth = 0) {
  if (depth > 20) return; // Safety limit

  let entries;
  try {
    entries = readdirSync(dir);
  } catch (err) {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);

    let entryStat;
    try {
      entryStat = statSync(fullPath);
    } catch (err) {
      continue;
    }

    if (entryStat.isDirectory()) {
      if (shouldIgnore(fullPath)) {
        continue;
      }
      if (EXCLUDE_DIRECTORIES.includes(entry)) {
        continue;
      }
      walkDirectory(fullPath, depth + 1);
      continue;
    }

    if (!entryStat.isFile()) {
      continue;
    }

    stats.scanned++;

    if (shouldIgnore(fullPath)) {
      stats.ignoredByPatterns++;
      continue;
    }

    if (entryStat.size > MAX_FILE_SIZE) {
      stats.ignoredOversize++;
      continue;
    }

    const fileName = basename(fullPath);
    const parentDir = basename(dirname(fullPath));
    if (fileName.includes('.test.') || fileName.includes('.spec.') ||
        parentDir === '__tests__' || parentDir === '__test__') {
      stats.ignoredByTestPatterns++;
      continue;
    }

    const ext = extname(fullPath).toLowerCase();

    if (SUPPORTED_EXTENSIONS.has(ext)) {
      stats.accepted++;
      continue;
    }

    if (FALLBACK_EXTENSIONS.includes(ext)) {
      stats.acceptedViaFallback++;
      stats.accepted++;
      continue;
    }

    stats.ignoredUnsupportedExt++;
  }
}

console.log('🔍 File Discovery Simulation\n');
console.log(`📁 Project root: ${projectRoot}\n`);
console.log('🚀 Starting walk...\n');

walkDirectory(projectRoot);

console.log('📊 Discovery Statistics:\n');
console.log(`  Total scanned:                ${stats.scanned}`);
console.log(`  ✅ Accepted:                   ${stats.accepted}`);
console.log(`     - Via supported extensions: ${stats.accepted - stats.acceptedViaFallback}`);
console.log(`     - Via fallback extensions:  ${stats.acceptedViaFallback}`);
console.log(`  ❌ Ignored:                    ${stats.scanned - stats.accepted}`);
console.log(`     - By ignore patterns:       ${stats.ignoredByPatterns}`);
console.log(`     - By test patterns:         ${stats.ignoredByTestPatterns}`);
console.log(`     - Oversize files:           ${stats.ignoredOversize}`);
console.log(`     - Unsupported extensions:   ${stats.ignoredUnsupportedExt}`);
