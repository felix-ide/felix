import { readdirSync, statSync } from 'fs';
import { join, sep, extname, basename, dirname } from 'path';
import ignore from 'ignore';
import { readFileSync, existsSync } from 'fs';

const projectRoot = process.cwd();

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
}

const EXCLUDE_DIRECTORIES = ['node_modules', '.git', 'dist', 'build'];

// ALL supported extensions from the parser
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
]);

function shouldIgnoreViaPatterns(fullPath) {
  const relative = fullPath.replace(projectRoot + '\\', '').replace(projectRoot + '/', '');
  const normalized = relative.replace(/\\/g, '/');
  return ig.ignores(normalized);
}

const stats = {
  byExtension: new Map(),
  withTests: 0,
  withoutTests: 0,
  testFiles: 0
};

function walk(dir, depth = 0) {
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
      if (shouldIgnoreViaPatterns(fullPath) || EXCLUDE_DIRECTORIES.includes(entry)) {
        continue;
      }
      walk(fullPath, depth + 1);
      continue;
    }

    if (!entryStat.isFile()) continue;

    const ext = extname(fullPath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

    const fileName = basename(fullPath);
    const parentDir = basename(dirname(fullPath));
    const isTest = fileName.includes('.test.') || fileName.includes('.spec.') ||
                   parentDir === '__tests__' || parentDir === '__test__';

    if (shouldIgnoreViaPatterns(fullPath)) continue;
    if (entryStat.size > 1024 * 1024) continue; // 1MB limit

    stats.withTests++;
    if (!isTest) {
      stats.withoutTests++;
      const count = stats.byExtension.get(ext) || 0;
      stats.byExtension.set(ext, count + 1);
    } else {
      stats.testFiles++;
    }
  }
}

console.log('📊 Full File Count (All Supported Extensions)\n');
walk(projectRoot);

console.log(`Total files (excluding tests): ${stats.withoutTests}`);
console.log(`Total files (including tests): ${stats.withTests}`);
console.log(`Test files: ${stats.testFiles}\n`);

console.log('By extension (non-test files):');
const sorted = Array.from(stats.byExtension.entries()).sort((a, b) => b[1] - a[1]);
for (const [ext, count] of sorted) {
  console.log(`  ${ext}: ${count}`);
}
