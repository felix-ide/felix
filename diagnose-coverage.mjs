import { readdirSync, statSync } from 'fs';
import { join, sep } from 'path';
import ignore from 'ignore';
import { readFileSync, existsSync } from 'fs';

const projectRoot = process.cwd();

// Setup ignore patterns exactly as the system does
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

const EXCLUDE_DIRECTORIES = ['node_modules', '.git', 'dist', 'build'];

function shouldIgnore(fullPath) {
  const relative = fullPath.replace(projectRoot + '\\', '').replace(projectRoot + '/', '');
  const normalized = relative.replace(/\\/g, '/');
  return ig.ignores(normalized);
}

const directoriesFound = {
  scanned: [],
  ignored: [],
  excluded: []
};

function walkAndReport(dir, depth = 0) {
  if (depth > 4) return; // Just check top-level structure

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

    if (!entryStat.isDirectory()) continue;

    const relative = fullPath.replace(projectRoot + sep, '');

    if (shouldIgnore(fullPath)) {
      directoriesFound.ignored.push(relative);
      continue;
    }

    if (EXCLUDE_DIRECTORIES.includes(entry)) {
      directoriesFound.excluded.push(relative);
      continue;
    }

    directoriesFound.scanned.push(relative);
    walkAndReport(fullPath, depth + 1);
  }
}

console.log('🔍 Directory Coverage Analysis\n');
walkAndReport(projectRoot);

console.log(`📁 Scanned directories (${directoriesFound.scanned.length}):`);
directoriesFound.scanned.slice(0, 50).forEach(d => console.log(`  ✅ ${d}`));
if (directoriesFound.scanned.length > 50) {
  console.log(`  ... and ${directoriesFound.scanned.length - 50} more`);
}

console.log(`\n🚫 Ignored by patterns (${directoriesFound.ignored.length}):`);
directoriesFound.ignored.slice(0, 30).forEach(d => console.log(`  ❌ ${d}`));
if (directoriesFound.ignored.length > 30) {
  console.log(`  ... and ${directoriesFound.ignored.length - 30} more`);
}

console.log(`\n⛔ Excluded by config (${directoriesFound.excluded.length}):`);
directoriesFound.excluded.slice(0, 30).forEach(d => console.log(`  ⛔ ${d}`));
if (directoriesFound.excluded.length > 30) {
  console.log(`  ... and ${directoriesFound.excluded.length - 30} more`);
}

// Count files in some excluded directories to see what we're missing
console.log('\n📊 Files in key directories:');
const checkDirs = ['apps', 'packages', 'apps/server', 'apps/client', 'packages/code-intelligence'];
for (const dir of checkDirs) {
  try {
    const count = readdirSync(dir).length;
    console.log(`  ${dir}: ${count} items`);
  } catch (e) {
    // Directory doesn't exist
  }
}
