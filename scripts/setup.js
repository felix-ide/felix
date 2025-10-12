#!/usr/bin/env node

/**
 * Felix Setup Script
 *
 * This script verifies and installs all required dependencies for the
 * Felix parser stack to work at full capacity.
 */

import { execSync, spawn, spawnSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import https from 'https';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import readline from 'readline';

const MIN_PYTHON_MAJOR = 3;
const MIN_PYTHON_MINOR = 10;

const pythonCandidates = () => {
  const candidates = [];
  const seen = new Set();

  const addCandidate = (command, args = []) => {
    if (!command) return;
    const key = `${command} ${args.join(' ')}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ command, args });
  };

  const envPython = process.env.FELIX_PYTHON || process.env.PYTHON_BIN || process.env.PYTHON;
  if (envPython) {
    const parts = envPython.trim().split(/\s+/);
    addCandidate(parts[0], parts.slice(1));
  }

  if (process.platform === 'win32') {
    addCandidate('py', ['-3.13']);
    addCandidate('py', ['-3.12']);
    addCandidate('py', ['-3.11']);
    addCandidate('py', ['-3']);
    addCandidate('python3.13');
    addCandidate('python3.12');
    addCandidate('python3.11');
    addCandidate('python3');
    addCandidate('python');
  } else {
    const versioned = ['python3.13', 'python3.12', 'python3.11', 'python3.10', 'python3'];
    versioned.forEach(cmd => addCandidate(cmd));
    ['/opt/homebrew/bin/python3.13', '/opt/homebrew/bin/python3.12', '/opt/homebrew/bin/python3', '/usr/local/bin/python3.13', '/usr/local/bin/python3.12', '/usr/local/bin/python3'].forEach(path => addCandidate(path));
    addCandidate('python');
  }

  return candidates;
};

const parsePythonVersion = (text) => {
  if (!text) return null;
  const match = text.match(/Python\s+(\d+)\.(\d+)\.(\d+)/i);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    micro: Number(match[3])
  };
};

const comparePythonVersions = (a, b) => {
  if (!a || !b) return 0;
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return (a.micro || 0) - (b.micro || 0);
};

const findSystemPython = () => {
  let best = null;
  let bestVersion = null;
  let fallback = null;
  let fallbackVersion = null;

  for (const candidate of pythonCandidates()) {
    try {
      const result = spawnSync(candidate.command, [...candidate.args, '--version'], { stdio: 'pipe' });
      if (result.error || result.status !== 0) continue;
      const output = `${result.stdout?.toString() ?? ''}${result.stderr?.toString() ?? ''}`;
      const version = parsePythonVersion(output);
      const candidateWithVersion = { ...candidate, version };
      if (version && (version.major > MIN_PYTHON_MAJOR || (version.major === MIN_PYTHON_MAJOR && version.minor >= MIN_PYTHON_MINOR))) {
        if (!bestVersion || comparePythonVersions(version, bestVersion) > 0) {
          best = candidateWithVersion;
          bestVersion = version;
        }
      }
      if (!fallbackVersion || (version && comparePythonVersions(version, fallbackVersion) > 0)) {
        fallback = candidateWithVersion;
        fallbackVersion = version;
      }
    } catch {
      // ignore candidate failure
    }
  }

  if (best) return best;
  if (fallback) return fallback;
  throw new Error('Python interpreter not found. Install Python 3 and try again.');
};

const runPython = (python, args, options = {}) => {
  const result = spawnSync(python.command, [...python.args, ...args], { stdio: 'pipe', ...options });
  if (result.error || result.status !== 0) {
    const error = result.error ?? new Error(result.stderr?.toString() || `Command failed with exit code ${result.status}`);
    if (result.stdout) error.stdout = result.stdout.toString();
    if (result.stderr) error.stderr = result.stderr.toString();
    throw error;
  }
  return result;
};

const getVenvPythonPath = (venvPath) => (process.platform === 'win32'
  ? join(venvPath, 'Scripts', 'python.exe')
  : join(venvPath, 'bin', 'python'));

const runVenvPython = (venvPath, args, options = {}) => {
  const absVenvPath = join(process.cwd(), venvPath);
  const pythonPath = getVenvPythonPath(absVenvPath);
  const result = spawnSync(pythonPath, args, { stdio: 'pipe', ...options });
  if (result.error || result.status !== 0) {
    const error = result.error ?? new Error(result.stderr?.toString() || `Command failed with exit code ${result.status}`);
    if (result.stdout) error.stdout = result.stdout.toString();
    if (result.stderr) error.stderr = result.stderr.toString();
    throw error;
  }
  return result;
};

const resolvePythonDetails = (python) => {
  try {
    const script = 'import sys, os, json; sys.stdout.write(json.dumps({"executable": sys.executable, "realpath": os.path.realpath(sys.executable)}))';
    const result = spawnSync(python.command, [...python.args, '-c', script], { stdio: 'pipe' });
    if (result.error || result.status !== 0) return null;
    return JSON.parse(result.stdout.toString() || '{}');
  } catch {
    return null;
  }
};

class SetupValidator {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.successes = [];
    this.criticalErrors = []; // Errors that will prevent app from running
    const autoInstallEnv = process.env.FELIX_AUTO_INSTALL ?? process.env.FELIX_AUTO_INSTALL;
    this.autoInstall = process.argv.includes('--auto') || autoInstallEnv === '1';
    this.runningPostinstall = process.env.npm_lifecycle_event === 'postinstall';
    this.isInteractive = process.stdin.isTTY === true;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async prompt(question) {
    if (this.autoInstall || this.runningPostinstall) return true;
    if (!this.isInteractive) return false; // default to "no" in non-interactive (CI)

    return new Promise((resolve) => {
      this.rl.question(chalk.cyan(question + ' (y/N): '), (answer) => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  log(message) {
    console.log(message);
  }

  success(message) {
    this.successes.push(message);
    console.log(chalk.green('✅ ' + message));
  }

  warning(message) {
    this.warnings.push(message);
    console.log(chalk.yellow('⚠️  ' + message));
  }

  error(message) {
    this.issues.push(message);
    console.log(chalk.red('❌ ' + message));
  }

  critical(message) {
    this.criticalErrors.push(message);
    this.issues.push(message);
    console.log(chalk.red.bold('🚨 CRITICAL: ' + message));
  }

  info(message) {
    console.log(chalk.blue('ℹ️  ' + message));
  }

  header(title) {
    console.log('\n' + chalk.bold.underline(title));
  }

  formatPythonError(error, fallback = 'Unknown Python error') {
    if (!error) return fallback;

    const segments = [];
    if (typeof error.message === 'string' && error.message.trim()) {
      segments.push(error.message);
    }
    if (error.stderr) {
      const stderrText = typeof error.stderr === 'string' ? error.stderr : error.stderr.toString();
      if (stderrText.trim()) segments.push(stderrText);
    }
    if (error.stdout) {
      const stdoutText = typeof error.stdout === 'string' ? error.stdout : error.stdout.toString();
      if (stdoutText.trim()) segments.push(stdoutText);
    }

    const trimmed = segments
      .join('\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .slice(-20)
      .join('\n');

    return trimmed || fallback;
  }

  analyzeDependencyIssues(details = {}) {
    if (!details) return [];

    const hints = [];
    const torch = details.torch;
    if (torch?.status === 'error') {
      const message = (torch.message || '').toLowerCase();
      if (message.includes('mach-o') || message.includes('wrong architecture') || message.includes('no suitable image found')) {
        hints.push('Torch import failed due to an architecture mismatch. Install an ARM64 Python 3.11+ (for example, via Homebrew `brew install python@3.11` or python.org) and rerun setup.');
      }
      if (message.includes('libressl')) {
        hints.push('Torch import failed because the current Python is linked against LibreSSL. Install Python from python.org (built with OpenSSL) and rerun setup.');
      }
    }

    const sentenceTx = details.sentence_transformers;
    if (sentenceTx?.status === 'error' && sentenceTx?.type === 'VersionMismatch') {
      const version = sentenceTx.version || 'unknown';
      hints.push(`sentence-transformers ${version} detected, but >=5.0 is required. Delete python-sidecar/.venv and rerun setup.`);
    }

    const numpy = details.numpy;
    if (numpy?.status === 'error') {
      const msg = (numpy.message || '').toLowerCase();
      if (msg.includes('not a supported wheel on this platform')) {
        hints.push('NumPy wheel is not available for this Python build. Install Python 3.10+ (ARM64) and rerun setup.');
      }
    }

    return hints;
  }

  async run() {
    console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════════════════╗
║        Felix Parser Stack Setup Validator         ║
╚═══════════════════════════════════════════════════╝
`));

    if (this.autoInstall) {
      console.log(chalk.green('🚀 Auto-install mode enabled\n'));
    } else if (this.runningPostinstall) {
      console.log(chalk.green('🚀 Postinstall detected: continuing with automatic dependency fixes\n'));
    } else {
      console.log(chalk.dim('Tip: Use --auto flag or set FELIX_AUTO_INSTALL=1 (legacy: FELIX_AUTO_INSTALL=1) to auto-install missing components\n'));
    }

    await this.checkNodeVersion();
    await this.checkPhpRuntime();
    await this.fixWindowsRollup();
    await this.checkNpmPackages();
    await this.checkTreeSitterGrammars();
    await this.checkTextMateScanner();
    await this.checkCSharpSupport();
    await this.checkPythonSidecar();
    await this.checkDatabaseSetup();
    await this.printSummary();
  }

  async checkTextMateScanner() {
    this.header('TextMate Grammars');

    const grammarDir = join('packages','code-intelligence','src','code-parser','grammars');
    if (!existsSync(grammarDir)) {
      try { mkdirSync(grammarDir, { recursive: true }); this.success(`Created grammar directory: ${grammarDir}`); }
      catch { this.warning(`Could not create grammar directory: ${grammarDir}`); return; }
    }

    // Curated grammar list (MIT or permissive licenses)
    const grammars = [
      { scope: 'text.html.basic', file: 'html.tmLanguage.json', url: 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/html/syntaxes/html.tmLanguage.json' },
      { scope: 'text.html.markdown', file: 'markdown.tmLanguage.json', url: 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/markdown-basics/syntaxes/markdown.tmLanguage.json' },
      { scope: 'source.css', file: 'css.tmLanguage.json', url: 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/css/syntaxes/css.tmLanguage.json' },
      { scope: 'source.css.scss', file: 'scss.tmLanguage.json', url: 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/scss/syntaxes/scss.tmLanguage.json' },
      { scope: 'source.less', file: 'less.tmLanguage.json', url: 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/less/syntaxes/less.tmLanguage.json' },
      { scope: 'source.js', file: 'javascript.tmLanguage.json', url: 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/javascript/syntaxes/JavaScript.tmLanguage.json' },
      { scope: 'source.jsx', file: 'javascriptreact.tmLanguage.json', url: 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/javascript/syntaxes/JavaScriptReact.tmLanguage.json' },
      { scope: 'source.ts', file: 'typescript.tmLanguage.json', url: 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/typescript-basics/syntaxes/TypeScript.tmLanguage.json' },
      { scope: 'source.tsx', file: 'typescriptreact.tmLanguage.json', url: 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/typescript-basics/syntaxes/TypeScriptReact.tmLanguage.json' },
      { scope: 'source.json', file: 'json.tmLanguage.json', url: 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/json/syntaxes/JSON.tmLanguage.json' },
      { scope: 'text.html.php', file: 'php.tmLanguage.json', url: 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/php/syntaxes/php.tmLanguage.json' },
      { scope: 'source.python', file: 'python.tmLanguage.json', url: 'https://raw.githubusercontent.com/MagicStack/MagicPython/master/grammars/MagicPython.tmLanguage.json' },
      { scope: 'source.shell', file: 'shell.tmLanguage.json', url: 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/shellscript/syntaxes/shell-unix-bash.tmLanguage.json' },
      { scope: 'source.sql', file: 'sql.tmLanguage.json', url: 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/sql/syntaxes/sql.tmLanguage.json' },
      { scope: 'source.dockerfile', file: 'docker.tmLanguage.json', url: 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/docker/syntaxes/docker.tmLanguage.json' },
      { scope: 'source.yaml', file: 'yaml.tmLanguage.json', url: 'https://raw.githubusercontent.com/redhat-developer/vscode-yaml/main/syntaxes/yaml.tmLanguage.json' }
    ];

    // Download missing grammars
    const downloads = [];
    for (const g of grammars) {
      const dest = join(grammarDir, g.file);
      if (!existsSync(dest)) downloads.push(g);
    }

    if (downloads.length === 0) {
      this.success('All core grammars present');
    } else if (await this.prompt(`Download ${downloads.length} TextMate grammars now?`)) {
      for (const g of downloads) {
        const dest = join(grammarDir, g.file);
        const spinner = ora(`Downloading ${g.file}...`).start();
        try {
          await new Promise((resolve, reject) => {
            const req = https.get(g.url, res => {
              if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // handle redirect
                https.get(res.headers.location, r2 => {
                  const chunks = [];
                  r2.on('data', c => chunks.push(c));
                  r2.on('end', () => { try { writeFileSync(dest, Buffer.concat(chunks)); resolve(null); } catch (e) { reject(e); } });
                  r2.on('error', reject);
                }).on('error', reject);
                return;
              }
              if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
              const chunks = [];
              res.on('data', c => chunks.push(c));
              res.on('end', () => { try { writeFileSync(dest, Buffer.concat(chunks)); resolve(null); } catch (e) { reject(e); } });
              res.on('error', reject);
            });
            req.on('error', reject);
          });
          spinner.succeed(`Saved ${g.file}`);
        } catch (e) {
          spinner.fail(`Failed ${g.file} (${e.message || e})`);
        }
      }
    }

    // Write/refresh registry.json
    try {
      const registry = Object.fromEntries(grammars.map(g => [g.scope, g.file]));
      writeFileSync(join(grammarDir, 'registry.json'), JSON.stringify(registry, null, 2));
      this.success('Updated grammar registry.json');
    } catch {
      this.warning('Failed to write registry.json');
    }
  }

  async checkNodeVersion() {
    this.header('Node.js Version');

    try {
      const nodeVersion = process.version;
      const major = parseInt(nodeVersion.split('.')[0].substring(1));

      if (major >= 18) {
        this.success(`Node.js ${nodeVersion} installed`);
      } else {
        this.error(`Node.js ${nodeVersion} is too old. Please install Node.js 18 or later.`);
      }
    } catch (error) {
      this.error('Could not determine Node.js version');
    }
  }

  async checkPhpRuntime() {
    this.header('PHP Runtime');

    try {
      const phpVersion = execSync('php --version', { encoding: 'utf8' }).split('\n')[0];
      this.success(`PHP installed: ${phpVersion}`);
      return true;
    } catch (error) {
      this.critical('PHP is not installed or not in PATH - app will crash when parsing PHP files');
      this.info('PHP is required for parsing PHP code');

      if (process.platform === 'darwin') {
        this.info('Install PHP with: brew install php');
      } else if (process.platform === 'win32') {
        this.info('Install PHP from: https://windows.php.net/download/');
      } else {
        this.info('Install PHP with: sudo apt install php-cli');
      }

      if (this.autoInstall || await this.prompt('Install PHP now?')) {
        const spinner = ora('Installing PHP...').start();
        try {
          if (process.platform === 'darwin') {
            execSync('brew install php', { encoding: 'utf8', stdio: 'pipe' });
          } else if (process.platform === 'linux') {
            execSync('sudo apt-get install -y php-cli', { encoding: 'utf8', stdio: 'pipe' });
          } else {
            spinner.fail('Automatic installation not supported on this platform');
            return false;
          }
          spinner.succeed('PHP installed successfully');
          this.successes.push('Installed PHP');
          this.criticalErrors = this.criticalErrors.filter(e => !e.includes('PHP'));
          return true;
        } catch (installError) {
          spinner.fail('Failed to install PHP');
          this.error('Please install PHP manually before running the app');
          return false;
        }
      }
      return false;
    }
  }

  async fixWindowsRollup() {
    // Fix Windows Rollup optionalDependencies bug
    if (process.platform === 'win32') {
      this.header('Windows Rollup Fix');
      const spinner = ora('Installing Rollup Windows binary...').start();

      try {
        execSync('npm install @rollup/rollup-win32-x64-msvc --no-save', { stdio: 'ignore' });
        spinner.succeed('Installed Rollup Windows binary');
        this.success('Fixed Windows Rollup dependency');
      } catch (error) {
        spinner.fail('Failed to install Rollup Windows binary');
        this.warning('You may need to manually run: npm install @rollup/rollup-win32-x64-msvc --no-save');
      }
    }
  }

  async checkNpmPackages() {
    this.header('NPM Packages');

    const spinner = ora('Checking npm packages...').start();

    // Native node bindings for Tree-sitter
    const requiredPackages = [
      { name: 'tree-sitter', where: ['packages/code-intelligence', '.'] },
      { name: 'tree-sitter-javascript', where: ['packages/code-intelligence', '.'] },
      { name: 'tree-sitter-python', where: ['packages/code-intelligence', '.'] },
      { name: 'tree-sitter-c-sharp', where: ['packages/code-intelligence', '.'] },
      { name: 'tree-sitter-html', where: ['packages/code-intelligence', '.'] },
      { name: 'tree-sitter-css', where: ['packages/code-intelligence', '.'] }
    ];

    const missing = [];
    for (const pkg of requiredPackages) {
      let found = false;
      for (const base of pkg.where) {
        const paths = [
          join(base, 'node_modules', pkg.name),
          join(base, 'node_modules', '.pnpm', `${pkg.name}@*/node_modules/${pkg.name}`)
        ];
        if (paths.some(p => existsSync(p))) {
          found = true;
          break;
        }
      }

      if (found) {
        spinner.succeed(`${pkg.name} installed`);
      } else {
        spinner.fail(`${pkg.name} NOT installed`);
        this.error(`Missing package: ${pkg.name}`);
        missing.push(pkg.name);
      }
    }

    spinner.stop();
    this.info('Note: Using native Tree-sitter bindings (no WASM).');

    // Offer to install missing native parsers
    for (const name of missing) {
      if (await this.prompt(`Install missing package "${name}" now?`)) {
        const s = ora(`Installing ${name}...`).start();
        try {
          execSync(`npm install ${name} --no-save`, { encoding: 'utf8', stdio: 'pipe' });
          s.succeed(`${name} installed`);
          this.successes.push(`Installed ${name}`);
        } catch (e) {
          s.fail(`Failed to install ${name}`);
          this.warning(`If this is a native build error, ensure build tools are installed.`);
          if (process.platform === 'darwin') this.info('  macOS: xcode-select --install');
          if (process.platform === 'linux') this.info('  Linux: sudo apt-get install -y build-essential python3 make g++');
          if (process.platform === 'win32') this.info('  Windows: Install Visual Studio Build Tools (for node-gyp)');
        }
      }
    }

    // TextMate scope scanner dependencies
    this.header('TextMate Scope Scanner');
    const scannerDeps = ['vscode-textmate', 'vscode-oniguruma'];
    const missingScanner = [];
    for (const dep of scannerDeps) {
      const paths = [
        join('packages','code-intelligence','node_modules', dep),
        join('node_modules', dep)
      ];
      if (paths.some(p => existsSync(p))) {
        this.success(`${dep} installed`);
      } else {
        this.warning(`${dep} NOT installed`);
        missingScanner.push(dep);
      }
    }
    for (const dep of missingScanner) {
      if (await this.prompt(`Install ${dep} for scope scanner?`)) {
        const s = ora(`Installing ${dep}...`).start();
        try { execSync(`npm install ${dep} --no-save`, { encoding: 'utf8', stdio: 'pipe' }); s.succeed(`${dep} installed`); }
        catch { s.fail(`Failed to install ${dep}`); }
      }
    }
    const onig = join('node_modules','vscode-oniguruma','release','onig.wasm');
    if (existsSync(onig)) this.success(`Oniguruma WASM present (${onig})`);
    else this.warning('Oniguruma WASM not found — scope scanner will be disabled');

    const grammarDir = join('packages','code-intelligence','src','code-parser','grammars');
    if (existsSync(grammarDir)) this.success(`Grammar directory present (${grammarDir})`);
    else this.info('Grammar directory missing — add grammars or configure FELIX_GRAMMAR_DIR');
  }
  async checkTreeSitterGrammars() {
    this.header('Tree-sitter Native Parsers');

    // Verify core native binding plus at least one grammar is resolvable
    const critical = ['tree-sitter', 'tree-sitter-javascript'];
    let ok = true;

    for (const name of critical) {
      // Check presence in node_modules paths
      const paths = [
        join('node_modules', name),
        join('packages', 'code-intelligence', 'node_modules', name),
        join('node_modules', '.pnpm', `${name}@*/node_modules/${name}`)
      ];
      if (paths.some(p => existsSync(p))) {
        this.success(`${name} available`);
      } else {
        this.warning(`${name} may not be properly installed`);
        ok = false;
      }
    }

    if (!ok) this.info('Run: npm install to ensure all Tree-sitter packages are installed');
  }

  async checkCSharpSupport() {
    this.header('C# Language Support');

    let hasDotNet = false;
    let hasTreeSitter = false;
    let hasRoslyn = false;

    // Check for .NET SDK
    try {
      const dotnetVersion = execSync('dotnet --version', { encoding: 'utf8' }).trim();
      const major = parseInt(dotnetVersion.split('.')[0]);

      if (major >= 6) {
        this.success(`.NET ${dotnetVersion} installed`);
        hasDotNet = true;
      } else {
        this.warning(`.NET ${dotnetVersion} is older than recommended. .NET 6.0+ is recommended.`);
        hasDotNet = true;
      }
    } catch {
      this.warning('.NET SDK not installed - C# support will use Tree-sitter only');
      this.info('Install .NET SDK from: https://dotnet.microsoft.com/download');
    }

    // Check native Tree-sitter C# package
    try {
      const paths = [
        join('node_modules', 'tree-sitter-c-sharp'),
        join('packages', 'code-intelligence', 'node_modules', 'tree-sitter-c-sharp'),
        join('node_modules', '.pnpm', 'tree-sitter-c-sharp@*/node_modules/tree-sitter-c-sharp')
      ];
      if (paths.some(p => existsSync(p))) {
        this.success('C# Tree-sitter native parser installed');
        hasTreeSitter = true;
      } else {
        throw new Error('not found');
      }
    } catch {
      this.warning('tree-sitter-c-sharp package not installed');
      if (await this.prompt('Install C# Tree-sitter native parser?')) {
        const spinner = ora('Installing tree-sitter-c-sharp...').start();
        try {
          execSync('npm install tree-sitter-c-sharp', { encoding: 'utf8', stdio: 'pipe' });
          spinner.succeed('C# Tree-sitter parser installed');
          hasTreeSitter = true;
        } catch (error) {
          spinner.fail('Failed to install C# parser');
          this.warning('Run: npm install tree-sitter-c-sharp');
        }
      }
    }

    if (hasDotNet) {
      const sidecarDir = 'packages/code-intelligence/src/code-parser/sidecars/roslyn';
      const sidecarProject = `${sidecarDir}/RoslynSidecar.csproj`;

      if (existsSync(sidecarProject)) {
        // Detect .NET SDK version and update csproj to match
        try {
          const dotnetVersion = execSync('dotnet --version', { encoding: 'utf8' }).trim();
          const sdkMajor = parseInt(dotnetVersion.split('.')[0]);

          const { readFileSync } = await import('fs');
          let csprojContent = readFileSync(sidecarProject, 'utf8');

          // Update TargetFramework based on SDK version
          if (sdkMajor >= 9 && !csprojContent.includes('<TargetFrameworks>')) {
            // Has SDK 9+, support both
            csprojContent = csprojContent.replace(
              /<TargetFramework>net8\.0<\/TargetFramework>/,
              '<TargetFrameworks>net8.0;net9.0</TargetFrameworks>'
            );
            writeFileSync(sidecarProject, csprojContent);
            this.info('Configured Roslyn sidecar for .NET 8 & 9');
          } else if (sdkMajor < 9 && csprojContent.includes('<TargetFrameworks>')) {
            // Has SDK 8 only, use single target
            csprojContent = csprojContent.replace(
              /<TargetFrameworks>net8\.0;net9\.0<\/TargetFrameworks>/,
              '<TargetFramework>net8.0</TargetFramework>'
            );
            writeFileSync(sidecarProject, csprojContent);
            this.info('Configured Roslyn sidecar for .NET 8 only');
          }
        } catch {}

        // Auto-build the sidecar DLL files for faster startup
        const spinner = ora('Building Roslyn sidecar...').start();
        try {
          execSync('dotnet build -c Debug', { cwd: sidecarDir, encoding: 'utf8', stdio: 'pipe' });
          spinner.succeed('Roslyn sidecar built');
          hasRoslyn = true;
        } catch (error) {
          spinner.fail('Failed to build Roslyn sidecar');
          this.warning('Will fall back to dotnet run mode (slower startup)');
          // Try restore as fallback
          try {
            execSync('dotnet restore', { cwd: sidecarDir, encoding: 'utf8', stdio: 'pipe' });
            this.success('Roslyn sidecar ready (dotnet run mode)');
            hasRoslyn = true;
          } catch {
            this.warning('Roslyn sidecar not available');
          }
        }
      }
    }

    // Summary
    const capabilities = [];
    if (hasTreeSitter) capabilities.push('Tree-sitter');
    if (hasRoslyn) capabilities.push('Roslyn');

    if (capabilities.length > 0) {
      this.info(`C# support available via: ${capabilities.join(', ')}`);
    } else {
      this.error('No C# support available');
    }
  }

  async checkParserSidecars() {
    this.header('Parser Sidecars (Bundled Executables)');

    // Check for bundled executables
    const platform = process.platform;
    const pythonExe = platform === 'win32' ? 'python_ast_helper.exe' : 'python_ast_helper';
    let rid = 'linux-x64';
    if (platform === 'win32') rid = 'win-x64';
    else if (platform === 'darwin') rid = 'osx-x64';
    const roslynExe = platform === 'win32' ? 'RoslynSidecar.exe' : 'RoslynSidecar';

    const pythonSidecarPath = join('packages', 'code-intelligence', 'dist', 'sidecars', 'python', pythonExe);
    const roslynSidecarPath = join('packages', 'code-intelligence', 'dist', 'sidecars', 'roslyn', rid, roslynExe);

    const hasPythonSidecar = existsSync(pythonSidecarPath);
    const hasRoslynSidecar = existsSync(roslynSidecarPath);

    if (hasPythonSidecar) {
      this.success('Python AST Helper executable found');
    }

    if (hasRoslynSidecar) {
      this.success('Roslyn Sidecar executable found');
    }

    // Build missing sidecars if user approves
    if (!hasPythonSidecar || !hasRoslynSidecar) {
      this.info('Bundled executables eliminate the need for Python/dotnet on user machines');

      if (!hasPythonSidecar) {
        // Check if we can build Python executable
        let canBuildPython = false;
        try {
          const python = findSystemPython();
          canBuildPython = true;
        } catch {}

        if (!canBuildPython) {
          this.warning('Python AST Helper executable not found');
          this.info('Will fall back to system Python when parsing Python files');
        } else {
          // On Windows, check for Visual C++ Redistributable (required for PyTorch)
          if (platform === 'win32') {
            try {
              // Check if vcruntime140.dll exists (indicates VC++ Redistributable is installed)
              const vcCheck = spawnSync('where', ['vcruntime140.dll'], { stdio: 'pipe' });
              if (vcCheck.status !== 0) {
                this.warning('Visual C++ Redistributable not detected');
                this.info('Visual C++ Redistributable is required for PyTorch on Windows');
                this.info('Download and install from: https://aka.ms/vs/17/release/vc_redist.x64.exe');
                this.info('After installing, restart your terminal and rerun setup');
              } else {
                this.success('Visual C++ Redistributable is installed');
              }
            } catch {
              // Can't check, but don't block - user might have it installed
              this.info('Note: Visual C++ Redistributable is required for PyTorch on Windows');
              this.info('If PyInstaller build fails, install from: https://aka.ms/vs/17/release/vc_redist.x64.exe');
            }
          }
          // Check for PyInstaller
          const hasPyInstaller = spawnSync('pip', ['show', 'pyinstaller'], { stdio: 'ignore' }).status === 0 ||
                                  spawnSync('pip3', ['show', 'pyinstaller'], { stdio: 'ignore' }).status === 0;

          if (!hasPyInstaller && (await this.prompt('Build Python AST Helper executable? (requires PyInstaller)'))) {
            const spinner = ora('Installing PyInstaller...').start();
            try {
              execSync('pip install pyinstaller', { encoding: 'utf8', stdio: 'pipe' });
              spinner.succeed('PyInstaller installed');
            } catch (error) {
              spinner.fail('Failed to install PyInstaller');
              this.warning('Skipping Python executable build');
            }
          }

          if (hasPyInstaller || spawnSync('pip', ['show', 'pyinstaller'], { stdio: 'ignore' }).status === 0) {
            if (await this.prompt('Build Python AST Helper executable now? (takes 1-2 minutes)')) {
              const spinner = ora('Building Python AST Helper executable...').start();
              try {
                const scriptPath = join('packages', 'code-intelligence', 'scripts', 'build-python-executable.sh');
                if (existsSync(scriptPath)) {
                  if (platform === 'win32') {
                    // On Windows, run the commands directly since bash might not be available
                    const cwd = join('packages', 'code-intelligence');
                    const srcFile = join('src', 'code-parser', 'parsers', 'python_ast_helper.py');
                    const distDir = join('dist', 'sidecars', 'python');

                    mkdirSync(distDir, { recursive: true });

                    execSync(`pyinstaller --onefile --name ${pythonExe} --distpath ${distDir} ${srcFile}`, {
                      cwd,
                      encoding: 'utf8',
                      stdio: 'pipe'
                    });
                  } else {
                    execSync(`bash ${scriptPath}`, { encoding: 'utf8', stdio: 'pipe' });
                  }
                  spinner.succeed('Python AST Helper executable built!');
                  this.successes.push('Built Python AST Helper executable');
                } else {
                  spinner.fail('Build script not found');
                  this.warning(`Expected script at: ${scriptPath}`);
                }
              } catch (error) {
                spinner.fail('Failed to build Python executable');
                this.warning('Python parsing will use system Python as fallback');
              }
            }
          }
        }
      }

      if (!hasRoslynSidecar) {
        // Check if we can build Roslyn executable
        const hasDotnet = spawnSync('dotnet', ['--version'], { stdio: 'ignore' }).status === 0;

        if (!hasDotnet) {
          this.warning('Roslyn Sidecar executable not found');
          this.warning('.NET SDK not installed - cannot build Roslyn sidecar');
          this.info('Install .NET SDK 8.0+ from: https://dotnet.microsoft.com/download');
          if (platform === 'win32') {
            this.info('Windows: Download and install .NET 8.0 SDK, then add to PATH');
            this.info('  After install, you may need to restart your terminal or add to PATH:');
            this.info('  C:\\Program Files\\dotnet');
          } else if (platform === 'darwin') {
            this.info('macOS: Download .NET SDK from the link above or use Homebrew:');
            this.info('  brew install dotnet');
          } else {
            this.info('Linux: Follow instructions at https://learn.microsoft.com/en-us/dotnet/core/install/linux');
          }
          this.info('Will fall back to system dotnet when parsing C# files (if available)');
        } else {
          if (await this.prompt('Build Roslyn Sidecar executable now? (takes 2-3 minutes)')) {
            const spinner = ora('Building Roslyn Sidecar executable...').start();
            try {
              const sidecarDir = join('packages', 'code-intelligence', 'src', 'code-parser', 'sidecars', 'roslyn');
              const outputDir = join('packages', 'code-intelligence', 'dist', 'sidecars', 'roslyn', rid);

              mkdirSync(outputDir, { recursive: true });

              // Use absolute path from cwd, quote it for Windows paths with spaces
              const absoluteOutputPath = join(process.cwd(), outputDir);
              execSync(`dotnet publish -c Release -r ${rid} --self-contained true -p:PublishSingleFile=true -p:PublishTrimmed=true -p:IncludeNativeLibrariesForSelfExtract=true -o "${absoluteOutputPath}"`, {
                cwd: sidecarDir,
                encoding: 'utf8',
                stdio: 'pipe'
              });

              spinner.succeed('Roslyn Sidecar executable built!');
              this.successes.push('Built Roslyn Sidecar executable');
            } catch (error) {
              spinner.fail('Failed to build Roslyn executable');
              this.warning('C# parsing will use dotnet fallback');
            }
          }
        }
      }

      // Summary
      const recheckhass = existsSync(pythonSidecarPath);
      const recheckRoslyn = existsSync(roslynSidecarPath);

      if (hasPythonSidecar && hasRoslynSidecar) {
        this.success('All parser sidecars available');
      } else if (hasPythonSidecar || hasRoslynSidecar) {
        this.info('Some sidecars built, others will use system fallbacks');
      } else {
        this.info('No sidecars built - will use system Python/dotnet as fallbacks');
      }
    } else {
      this.success('All parser sidecars available');
    }
  }

  async checkPythonSidecar() {
    this.header('Python Sidecar (Embedding Service)');

    const sidecarDir = 'python-sidecar';

    if (!existsSync(sidecarDir)) {
      this.warning('Python sidecar directory not found');
      return;
    }

    // Check if virtual environment exists
    const venvPath = join(sidecarDir, '.venv');
    let venvExists = existsSync(venvPath);

    const createVenv = () => {
      const spinner = ora('Creating Python virtual environment...').start();

      try {
        let python;
        try {
          python = findSystemPython();
        } catch (error) {
          spinner.fail('Python not found. Please install Python 3.10+');
          this.critical('Python 3.10+ is required - app will crash when parsing Python files or using embeddings');
          this.info('Install Python from: https://www.python.org/downloads/');
          if (process.platform === 'darwin') {
            this.info('Or install via Homebrew: brew install python@3.13');
          }
          return false;
        }

        const details = resolvePythonDetails(python);
        if (details?.realpath) {
          this.info(`Using Python interpreter: ${details.realpath}`);
        } else if (python.version) {
          this.info(`Using Python interpreter command: ${python.command} (version ${python.version.major}.${python.version.minor}.${python.version.micro ?? 0})`);
        } else {
          this.info(`Using Python interpreter command: ${python.command}`);
        }

        runPython(python, ['-m', 'venv', '--copies', '.venv'], { cwd: sidecarDir });
        spinner.succeed('Python virtual environment created');
        venvExists = true;
        return true;
      } catch (error) {
        spinner.fail('Failed to create virtual environment');
        this.error(`Virtual environment creation failed: ${error.message}`);
        return false;
      }
    };

    if (!venvExists) {
      const shouldCreate = await this.prompt('Python virtual environment not found. Create it now?');

      if (shouldCreate || this.autoInstall || this.runningPostinstall) {
        if (!createVenv()) {
          return;
        }
      } else {
        this.warning('Python virtual environment missing; embeddings disabled');
        return;
      }
    } else {
      this.success('Python virtual environment exists');
    }

    const venvPythonPath = getVenvPythonPath(venvPath);
    if (!existsSync(venvPythonPath)) {
      this.warning('Python virtual environment is missing its interpreter; recreating...');
      try {
        rmSync(venvPath, { recursive: true, force: true });
      } catch {}
      venvExists = false;
      if (!createVenv()) {
        return;
      }
    }

    let pythonVersion = null;
    try {
      const versionResult = runVenvPython(venvPath, [
        '-c',
        'import sys, json; sys.stdout.write(json.dumps({"major": sys.version_info.major, "minor": sys.version_info.minor, "micro": sys.version_info.micro}))'
      ], { cwd: sidecarDir });
      pythonVersion = JSON.parse(versionResult.stdout.toString());
      this.info(`Python sidecar interpreter: ${pythonVersion.major}.${pythonVersion.minor}.${pythonVersion.micro}`);
    } catch (error) {
      this.warning('Unable to determine Python version for sidecar environment');
    }

    if (pythonVersion && pythonVersion.major === 3 && pythonVersion.minor < 10) {
      const detected = `${pythonVersion.major}.${pythonVersion.minor}.${pythonVersion.micro ?? 0}`;
      this.error(`Python ${detected} detected, but embeddings require Python 3.10 or newer.`);
      if (process.platform === 'darwin') {
        this.info('Install a newer Python with Homebrew: brew install python@3.11 && brew link python@3.11 --overwrite');
        this.info('Alternatively, download Python 3.11+ from https://www.python.org/downloads/');
      } else if (process.platform === 'win32') {
        this.info('Install Python 3.11+ from https://www.python.org/downloads/windows/ and rerun setup.');
      } else {
        this.info('Install Python 3.11+ using your package manager (for example: sudo apt install python3.11) and rerun setup.');
      }
      this.info('After upgrading, delete python-sidecar/.venv and rerun npm install (or node scripts/setup.js --auto).');
      return;
    }

    // Check and install dependencies
    if (venvExists) {
      // On Windows, check for Visual C++ Redistributable (required for PyTorch)
      if (process.platform === 'win32') {
        try {
          // Check if vcruntime140.dll exists (indicates VC++ Redistributable is installed)
          const vcCheck = spawnSync('where', ['vcruntime140.dll'], { stdio: 'pipe' });
          if (vcCheck.status !== 0) {
            this.warning('Visual C++ Redistributable not detected');
            this.warning('Visual C++ Redistributable is REQUIRED for PyTorch on Windows');
            this.info('Download and install from: https://aka.ms/vs/17/release/vc_redist.x64.exe');
            this.info('After installing, restart your terminal and rerun setup');
            this.info('Skipping Python dependency installation until VC++ Redistributable is installed');
            return;
          } else {
            this.success('Visual C++ Redistributable is installed');
          }
        } catch {
          this.info('Note: Visual C++ Redistributable is required for PyTorch on Windows');
          this.info('If PyTorch installation fails, install from: https://aka.ms/vs/17/release/vc_redist.x64.exe');
        }
      }

      let requirementsFile = 'requirements.txt';
      let requirementNote = 'default dependency set';

      const requirementsPath = join(sidecarDir, requirementsFile);

      if (existsSync(requirementsPath)) {
        this.info(`Using ${requirementsFile} for Python dependency installation (${requirementNote}).`);

        let lastVerification = null;

        const verifyDependencies = ({ logStatus = true } = {}) => {
          const verifyScript = `
import json, sys, platform, ssl
mods = ["fastapi", "uvicorn", "numpy", "torch", "sentence_transformers"]
details = {}
missing = []
for name in mods:
  record = {"status": "ok"}
  try:
    module = __import__(name)
    record["version"] = getattr(module, "__version__", None)
    if name == "sentence_transformers":
      version = record["version"]
      if version is not None:
        try:
          major = int(str(version).split(".")[0])
          if major < 5:
            record["status"] = "error"
            record["type"] = "VersionMismatch"
            record["message"] = f"sentence-transformers {version} detected, need >=5.0"
            missing.append(name)
        except Exception:
          pass
  except Exception as exc:
    record["status"] = "error"
    record["type"] = exc.__class__.__name__
    record["message"] = str(exc)
    missing.append(name)
  details[name] = record

payload = {
  "missing": missing,
  "details": details,
  "python_version": platform.python_version(),
  "platform": platform.platform(),
  "architecture": platform.machine(),
  "ssl": getattr(ssl, "OPENSSL_VERSION", "unknown")
}
sys.stdout.write(json.dumps(payload))
sys.exit(1 if missing else 0)
`;

          const parsePayload = (buffer) => {
            if (!buffer) return null;
            try {
              return JSON.parse(buffer.toString() || '');
            } catch {
              return null;
            }
          };

          const logCompatibilityHints = (details) => {
            const hints = this.analyzeDependencyIssues(details);
            if (hints.length > 0) {
              hints.forEach((hint) => this.warning(hint));
            }
          };

          try {
            const result = runVenvPython(venvPath, ['-c', verifyScript], { cwd: sidecarDir });
            const payload = parsePayload(result.stdout) || {};
            const missing = Array.isArray(payload.missing) ? payload.missing : [];
            if (missing.length > 0) {
              if (logStatus) {
                this.warning(`Python dependencies not installed (missing ${missing.join('/')})`);
              }
              logCompatibilityHints(payload.details);
              lastVerification = { ok: false, missing, details: payload.details, payload };
              return lastVerification;
            }
            if (logStatus) {
              this.success('Python dependencies installed (sentence-transformers 5.x)');
            }
            lastVerification = { ok: true, missing: [], details: payload.details, payload };
            return lastVerification;
          } catch (error) {
            const payload = parsePayload(error?.stderr) || parsePayload(error?.stdout);
            const missing = Array.isArray(payload?.missing) ? payload.missing : [];
            const display = missing.length > 0
              ? missing.join('/')
              : 'fastapi/uvicorn/numpy/torch/sentence-transformers';
            if (logStatus) {
              this.warning(`Python dependencies not installed (missing ${display})`);
            }
            if (payload?.details) {
              logCompatibilityHints(payload.details);
            }
            lastVerification = { ok: false, missing, details: payload?.details, payload, error };
            return lastVerification;
          }
        };

        const installDependencies = (attempt = 1) => {
          const attemptLabel = attempt > 1 ? ` (retry ${attempt})` : '';
          const spinner = ora(`Installing Python dependencies${attemptLabel} (this may take a while)...`).start();

          const safeRunVenv = (args, options) => {
            try {
              return runVenvPython(venvPath, args, options);
            } catch (error) {
              if (error?.code === 'ENOENT') {
                this.warning('Virtual environment Python interpreter missing; recreating environment...');
                try {
                  rmSync(venvPath, { recursive: true, force: true });
                } catch {}
                if (!createVenv()) {
                  throw error;
                }
                return runVenvPython(venvPath, args, options);
              }
              throw error;
            }
          };

          try {
            spinner.text = 'Upgrading pip and build tooling...';
            safeRunVenv(['-m', 'pip', 'install', '--upgrade', 'pip', 'setuptools', 'wheel'], { cwd: sidecarDir });

            spinner.text = 'Detecting GPU support...';
            let torchIndex = 'https://download.pytorch.org/whl/cpu';
            let macArchMessage;

            if (process.platform === 'win32' || process.platform === 'linux') {
              try {
                execSync('nvidia-smi', { encoding: 'utf8', stdio: 'ignore' });
                torchIndex = 'https://download.pytorch.org/whl/cu124';
                this.info('✨ NVIDIA GPU detected! Installing CUDA-enabled PyTorch...');
              } catch {
                this.info('No NVIDIA GPU detected, installing CPU-only PyTorch');
              }
            } else if (process.platform === 'darwin') {
              try {
                const arch = execSync('uname -m', { encoding: 'utf8' }).trim();
                if (arch === 'arm64') {
                  macArchMessage = '✨ Apple Silicon detected! PyTorch will use Metal (MPS)...';
                } else {
                  macArchMessage = 'Intel macOS detected. Installing CPU-only PyTorch...';
                }
              } catch {
                macArchMessage = 'Installing PyTorch from the default macOS index...';
              }
              if (macArchMessage) {
                this.info(macArchMessage);
              }
            }

            spinner.text = 'Installing PyTorch...';
            const torchArgs = ['-m', 'pip', 'install', 'torch>=2.3.0'];
            let usedCustomIndex = false;

            if (process.platform === 'win32' || process.platform === 'linux') {
              usedCustomIndex = true;
              torchArgs.push('--index-url', torchIndex);
            } else if (process.platform === 'darwin' && !macArchMessage) {
              this.info('Installing PyTorch from the default macOS index...');
            }

            const reinstallTorchFromDefault = (reason) => {
              if (reason) {
                this.warning(reason);
              }
              spinner.text = 'Cleaning up previous PyTorch install...';
              try {
                safeRunVenv(['-m', 'pip', 'uninstall', '-y', 'torch'], { cwd: sidecarDir });
              } catch {}
              try {
                safeRunVenv(['-m', 'pip', 'cache', 'purge'], { cwd: sidecarDir });
              } catch {}
              spinner.text = 'Installing PyTorch from PyPI...';
              safeRunVenv([
                '-m', 'pip', 'install',
                '--no-cache-dir',
                '--force-reinstall',
                'torch>=2.3.0'
              ], { cwd: sidecarDir });
            };

            try {
              safeRunVenv(torchArgs, { cwd: sidecarDir });
            } catch {
              if (usedCustomIndex) {
                reinstallTorchFromDefault('PyTorch install via custom index failed, retrying with a clean install from the default PyPI index');
              } else {
                reinstallTorchFromDefault('PyTorch install failed, attempting clean reinstall from the default PyPI index');
              }
            }

            try {
              safeRunVenv(['-c', 'import torch'], { cwd: sidecarDir });
              this.success('PyTorch installed successfully');
            } catch {
              reinstallTorchFromDefault('PyTorch verification failed, performing clean reinstall');
              safeRunVenv(['-c', 'import torch'], { cwd: sidecarDir });
              this.success('PyTorch installed successfully');
            }

            spinner.text = `Installing other Python dependencies from ${requirementsFile}...`;
            safeRunVenv(['-m', 'pip', 'install', '-r', requirementsFile], { cwd: sidecarDir });

            const verifyResult = verifyDependencies({ logStatus: false });
            if (!verifyResult.ok) {
              const err = new Error('Dependency verification failed');
              err.missing = verifyResult.missing;
              err.details = verifyResult.details;
              err.payload = verifyResult.payload;
              throw err;
            }

            spinner.succeed('Python dependencies installed successfully');
            this.successes.push('Installed Python sidecar dependencies');
            this.success('Python dependencies installed (sentence-transformers 5.x)');
            return true;
          } catch (error) {
            spinner.fail('Failed to install Python dependencies');
            const missingInfo = error?.missing?.length ? `Missing after install: ${error.missing.join('/')}\n` : '';
            const detail = this.formatPythonError(error, `${missingInfo}Unknown Python error`);
            this.error(`Python dependency installation failed:\n${detail}`);
            if (error?.details) {
              this.analyzeDependencyIssues(error.details).forEach((hint) => this.warning(hint));
            }
            return false;
          }
        };

        let verification = verifyDependencies({ logStatus: true });
        if (!verification.ok) {
          const shouldInstall = await this.prompt('Install Python sidecar dependencies? (Required for embeddings)');

          if (shouldInstall || this.autoInstall || this.runningPostinstall) {
            let attempt = 1;
            let installSuccess = false;

            while (attempt <= 2) {
              if (installDependencies(attempt)) {
                installSuccess = true;
                verification = lastVerification || verification;
                break;
              }

              if (attempt === 1) {
                this.info('Recreating Python virtual environment and retrying (python-sidecar/.venv)...');
                try {
                  rmSync(venvPath, { recursive: true, force: true });
                } catch {}
                venvExists = false;
                if (!createVenv()) {
                  break;
                }
              }

              attempt += 1;
            }

            if (!installSuccess) {
              this.warning('Embeddings will not work without Python dependencies');
              if (lastVerification?.details) {
                this.analyzeDependencyIssues(lastVerification.details).forEach((hint) => this.warning(hint));
              }
              this.info(`  Manual install: cd ${sidecarDir} && source .venv/bin/activate && pip install -r ${requirementsFile}`);
            }
          } else {
            this.info(`  Manual install: cd ${sidecarDir} && source .venv/bin/activate && pip install -r ${requirementsFile}`);
          }
        }
      }

      // Check if sidecar is running
      try {
        const sidecarHost = process.env.SIDECAR_BIND_HOST || '127.0.0.1';
        const sidecarPort = process.env.SIDECAR_BIND_PORT || '8088';
        const healthCheck = `import urllib.request, sys
try:
  req = urllib.request.Request('http://${sidecarHost}:${sidecarPort}/v1/health', method='POST')
  with urllib.request.urlopen(req, timeout=1) as r:
    sys.exit(0 if r.status == 200 else 1)
except: sys.exit(1)`;
        let healthy = false;
        for (const candidate of pythonCandidates()) {
          const res = spawnSync(candidate.command, [...candidate.args, '-c', healthCheck], { stdio: 'ignore' });
          if (!res.error && res.status === 0) {
            healthy = true;
            break;
          }
        }
        if (healthy) {
          this.success(`Python sidecar is running at http://${sidecarHost}:${sidecarPort}`);
        } else {
          throw new Error('health-check failed');
        }
      } catch {
        this.info('Python sidecar is not running. It will start automatically when needed.');
        this.info('  Manual start: npm run sidecar');
      }
    }
  }

  async checkDatabaseSetup() {
    this.header('Database Configuration');

    // Check for database files
    const dbFiles = [
      '.felix.db',
      '.felix.metadata.db'
    ];

    for (const dbFile of dbFiles) {
      if (existsSync(dbFile)) {
        this.success(`Database file exists: ${dbFile}`);
      } else {
        this.info(`Database file will be created on first run: ${dbFile}`);
      }
    }

    // Note: We don't check for built artifacts here because:
    // 1. This runs during postinstall (before any builds)
    // 2. npm run dev handles building automatically
    // 3. Checking build artifacts would cause setup to fail unnecessarily
  }

  async printSummary() {
    console.log('\n' + chalk.bold('═══════════════════════════════════════════════════'));
    console.log(chalk.bold.cyan('SETUP SUMMARY'));
    console.log(chalk.bold('═══════════════════════════════════════════════════'));

    if (this.criticalErrors.length > 0) {
      console.log(chalk.red.bold(`\n🚨 CRITICAL ERRORS: ${this.criticalErrors.length}`));
      console.log(chalk.red.bold('THE APP WILL NOT RUN UNTIL THESE ARE FIXED:\n'));
      this.criticalErrors.forEach(e => console.log(chalk.red.bold(`   ⛔ ${e}`)));
      console.log('');
    }

    if (this.successes.length > 0) {
      console.log(chalk.green(`\n✅ Successful checks: ${this.successes.length}`));
    }

    if (this.warnings.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Warnings: ${this.warnings.length}`));
      this.warnings.forEach(w => console.log(chalk.yellow(`   - ${w}`)));
    }

    if (this.issues.length > 0) {
      console.log(chalk.red(`\n❌ Issues found: ${this.issues.length}`));
      this.issues.forEach(i => {
        if (!this.criticalErrors.includes(i)) {
          console.log(chalk.red(`   - ${i}`));
        }
      });

      console.log(chalk.yellow('\n📝 Next Steps:'));
      if (this.criticalErrors.length > 0) {
        console.log(chalk.red.bold('1. FIX THE CRITICAL ERRORS ABOVE FIRST'));
        console.log('2. Run this setup script again to verify: node scripts/setup.js --auto');
      } else {
        console.log('1. Fix the issues listed above');
        console.log('2. Run: npm install');
        console.log('3. Run: npm run build');
        console.log('4. Run this setup script again to verify');
      }
    } else {
      console.log(chalk.green('\n🎉 All checks passed! Felix is ready to use.'));
      console.log(chalk.cyan('\nTo start the development server:'));
      console.log('  npm run dev');
      console.log(chalk.cyan('\nTo start the MCP server:'));
      console.log('  npm run mcp:dev');
    }

    console.log('\n' + chalk.bold('═══════════════════════════════════════════════════'));

    // Close the readline interface
    this.rl.close();
  }
}

// Run the setup validator
const validator = new SetupValidator();
validator.run()
  .then(() => {
    const exitCode = validator.issues.length > 0 ? 1 : 0;
    process.exit(exitCode);
  })
  .catch(error => {
    console.error(chalk.red('Setup script failed:'), error);
    process.exit(1);
  });
