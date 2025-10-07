import { readdirSync, statSync } from 'fs';
import { join, sep, extname, basename, dirname } from 'path';
import ignore from 'ignore';
import { readFileSync, existsSync } from 'fs';

const projectRoot = process.cwd();

console.log('🔍 Windows Path Bug Diagnostic\n');
console.log(`📁 Project root: ${projectRoot}`);
console.log(`🔧 Path separator: "${sep}"\n`);

// Setup ignore patterns
const ig = ignore();
if (existsSync('.gitignore')) {
  const content = readFileSync('.gitignore', 'utf8');
  const patterns = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  ig.add(patterns);
}
if (existsSync('.indexignore')) {
  const content = readFileSync('.indexignore', 'utf8');
  const patterns = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  ig.add(patterns);
  console.log('.indexignore patterns loaded:');
  patterns.forEach(p => console.log(`  - ${p}`));
  console.log('');
}

const EXCLUDE_DIRECTORIES = ['node_modules', '.git', 'dist', 'build'];
const JS_TS_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];

function shouldIgnoreViaPatterns(fullPath) {
  const relative = fullPath.replace(projectRoot + '\\', '').replace(projectRoot + '/', '');
  const normalized = relative.replace(/\\/g, '/');
  return ig.ignores(normalized);
}

function isExcludedDir(fullPath) {
  return EXCLUDE_DIRECTORIES.some(dir =>
    fullPath.includes(`${sep}${dir}${sep}`) ||
    fullPath.includes(`${sep}${dir}/`) ||
    fullPath.endsWith(`${sep}${dir}`)
  );
}

const issues = [];
const accepted = [];
let totalScanned = 0;

function walkAndCheck(dir, depth = 0) {
  if (depth > 20) return;

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
      const ignoredByPatterns = shouldIgnoreViaPatterns(fullPath);
      const excludedByConfig = EXCLUDE_DIRECTORIES.includes(entry);

      if (ignoredByPatterns || excludedByConfig) continue;

      walkAndCheck(fullPath, depth + 1);
      continue;
    }

    if (!entryStat.isFile()) continue;

    const ext = extname(fullPath).toLowerCase();
    if (!JS_TS_EXTENSIONS.includes(ext)) continue;

    const fileName = basename(fullPath);
    const parentDir = basename(dirname(fullPath));
    const isTest = fileName.includes('.test.') || fileName.includes('.spec.') ||
                   parentDir === '__tests__' || parentDir === '__test__';

    if (isTest) continue;

    totalScanned++;

    const ignoredByPatterns = shouldIgnoreViaPatterns(fullPath);
    const excludedByDir = isExcludedDir(fullPath);

    if (ignoredByPatterns) {
      const relative = fullPath.replace(projectRoot + sep, '');
      issues.push({ path: relative, reason: 'IGNORED_BY_PATTERN' });
    } else if (excludedByDir) {
      const relative = fullPath.replace(projectRoot + sep, '');
      issues.push({ path: relative, reason: 'EXCLUDED_BY_DIR_CHECK' });
    } else {
      accepted.push(fullPath.replace(projectRoot + sep, ''));
    }
  }
}

console.log('🚀 Scanning...\n');
walkAndCheck(projectRoot);

console.log(`📊 Results:`);
console.log(`  Total JS/TS files (non-test): ${totalScanned}`);
console.log(`  ✅ Would be indexed: ${accepted.length}`);
console.log(`  ❌ Would be filtered: ${issues.length}\n`);

if (issues.length > 0) {
  console.log(`🚫 FILES BEING INCORRECTLY FILTERED (showing first 50):`);
  issues.slice(0, 50).forEach(({ path, reason }) => {
    console.log(`  ${reason}: ${path}`);
  });
  if (issues.length > 50) {
    console.log(`  ... and ${issues.length - 50} more`);
  }
}

console.log(`\n🔍 Testing specific paths:\n`);
const testPaths = [
  'apps\\server\\src\\features\\indexing\\discovery\\FileDiscovery.ts',
  'packages\\code-intelligence\\src\\index.ts',
  'apps\\server\\dist\\index.js',
  'apps\\client\\src\\features\\admin\\index.ts'
];

for (const p of testPaths) {
  const full = join(projectRoot, p);
  const ignoredByPatterns = shouldIgnoreViaPatterns(full);
  const excludedByDir = isExcludedDir(full);
  const relative = full.replace(projectRoot + '\\', '').replace(projectRoot + '/', '');
  const normalized = relative.replace(/\\/g, '/');

  console.log(`Path: ${p}`);
  console.log(`  Normalized: ${normalized}`);
  console.log(`  Ignored by patterns: ${ignoredByPatterns}`);
  console.log(`  Excluded by dir check: ${excludedByDir}`);
  console.log(`  Contains \\dist\\: ${full.includes(sep + 'dist' + sep)}`);
  console.log('');
}
