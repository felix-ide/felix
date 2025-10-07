#!/usr/bin/env node

/**
 * Felix Setup Script
 *
 * This script verifies and installs all required dependencies for the
 * Felix parser stack to work at full capacity.
 */

import { execSync, spawn, spawnSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import https from 'https';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import readline from 'readline';

const pythonCandidates = () => {
  const candidates = [];
  if (process.platform === 'win32') {
    candidates.push({ command: 'py', args: ['-3'] });
  }
  candidates.push({ command: 'python3', args: [] }, { command: 'python', args: [] });
  return candidates;
};

const findSystemPython = () => {
  for (const candidate of pythonCandidates()) {
    const result = spawnSync(candidate.command, [...candidate.args, '--version'], { stdio: 'ignore' });
    if (!result.error && result.status === 0) {
      return candidate;
    }
  }
  throw new Error('Python interpreter not found. Install Python 3 and try again.');
};

const runPython = (python, args, options = {}) => {
  const result = spawnSync(python.command, [...python.args, ...args], { stdio: 'pipe', ...options });
  if (result.error || result.status !== 0) {
    const error = result.error ?? new Error(result.stderr?.toString() || `Command failed with exit code ${result.status}`);
    throw error;
  }
  return result;
};

const getVenvPythonPath = (venvPath) => (process.platform === 'win32'
  ? join(venvPath, 'Scripts', 'python.exe')
  : join(venvPath, 'bin', 'python'));

const runVenvPython = (venvPath, args, options = {}) => {
  const pythonPath = getVenvPythonPath(venvPath);
  const result = spawnSync(pythonPath, args, { stdio: 'pipe', ...options });
  if (result.error || result.status !== 0) {
    const error = result.error ?? new Error(result.stderr?.toString() || `Command failed with exit code ${result.status}`);
    throw error;
  }
  return result;
};

class SetupValidator {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.successes = [];
    const autoInstallEnv = process.env.FELIX_AUTO_INSTALL ?? process.env.FELIX_AUTO_INSTALL;
    this.autoInstall = process.argv.includes('--auto') || autoInstallEnv === '1';
    this.isInteractive = process.stdin.isTTY === true;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async prompt(question) {
    if (this.autoInstall) return true;
    if (!this.isInteractive) return false; // default to "no" in non-interactive (postinstall/CI)

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

  info(message) {
    console.log(chalk.blue('ℹ️  ' + message));
  }

  header(title) {
    console.log('\n' + chalk.bold.underline(title));
  }

  async run() {
    console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════════════════╗
║        Felix Parser Stack Setup Validator         ║
╚═══════════════════════════════════════════════════╝
`));

    if (this.autoInstall) {
      console.log(chalk.green('🚀 Auto-install mode enabled\n'));
    } else {
      console.log(chalk.dim('Tip: Use --auto flag or set FELIX_AUTO_INSTALL=1 (legacy: FELIX_AUTO_INSTALL=1) to auto-install missing components\n'));
    }

    await this.checkNodeVersion();
    await this.fixWindowsRollup();
    await this.checkNpmPackages();
    await this.checkTreeSitterGrammars();
    await this.checkTextMateScanner();
    await this.checkLSPServers();
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

  async checkLSPServers() {
    this.header('Language Server Protocol (LSP) Servers');

    const servers = [
      {
        name: 'TypeScript',
        command: 'typescript-language-server',
        install: 'npm install -g typescript-language-server typescript',
        check: 'npm list -g typescript-language-server',
        essential: true
      },
      {
        name: 'Python',
        command: 'pylsp',
        install: 'pip install python-lsp-server',
        check: 'pip show python-lsp-server',
        essential: false
      },
      {
        name: 'Rust',
        command: 'rust-analyzer',
        install: 'rustup component add rust-analyzer',
        check: 'which rust-analyzer',
        essential: false
      },
      {
        name: 'C/C++',
        command: 'clangd',
        install: process.platform === 'darwin' ? 'brew install llvm' : 'sudo apt install clangd',
        check: 'which clangd',
        essential: false
      }
    ];

    let anyInstalled = false;
    const missingServers = [];

    for (const server of servers) {
      try {
        execSync(`which ${server.command}`, { encoding: 'utf8' });
        this.success(`${server.name} LSP server installed (${server.command})`);
        anyInstalled = true;
      } catch (e) {
        missingServers.push(server);
        this.warning(`${server.name} LSP server NOT installed`);
      }
    }

    // Offer to install missing servers
    if (missingServers.length > 0) {
      this.info('\nLSP servers provide enhanced code analysis capabilities.');

      for (const server of missingServers) {
        if (server.essential || await this.prompt(`\nWould you like to install ${server.name} LSP server?`)) {
          const spinner = ora(`Installing ${server.name} LSP server...`).start();

          try {
            if (server.name === 'TypeScript') {
              // Special handling for npm global install
              execSync('npm install -g typescript-language-server typescript', {
                encoding: 'utf8',
                stdio: 'pipe'
              });
            } else if (server.name === 'Python') {
              // Check if pip is available
              try {
                execSync('which pip || which pip3', { encoding: 'utf8' });
                execSync('pip install python-lsp-server || pip3 install python-lsp-server', {
                  encoding: 'utf8',
                  stdio: 'pipe'
                });
              } catch (pipError) {
                spinner.fail(`Python pip not found. Please install Python and pip first.`);
                continue;
              }
            } else {
              execSync(server.install, { encoding: 'utf8', stdio: 'pipe' });
            }

            spinner.succeed(`${server.name} LSP server installed successfully!`);
            this.successes.push(`Installed ${server.name} LSP server`);
          } catch (error) {
            spinner.fail(`Failed to install ${server.name} LSP server`);
            this.info(`  Manual install command: ${server.install}`);
          }
        }
      }
    }

    if (!anyInstalled && missingServers.length === servers.length) {
      this.info('\nNote: The system will still work without LSP servers, falling back to AST parsing.');
    }
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
      // Check Roslyn sidecar
      const sidecarDir = 'packages/code-intelligence/src/code-parser/sidecars/roslyn';
      const sidecarProject = `${sidecarDir}/RoslynSidecar.csproj`;

      if (existsSync(sidecarProject)) {
        // Check if built
        const binaryPaths = [
          `${sidecarDir}/bin/Release/net8.0/RoslynSidecar`,
          `${sidecarDir}/bin/Release/net8.0/RoslynSidecar.exe`,
          `${sidecarDir}/bin/Debug/net8.0/RoslynSidecar`,
          `${sidecarDir}/bin/Debug/net8.0/RoslynSidecar.exe`
        ];

        let isBinary = false;
        for (const path of binaryPaths) {
          if (existsSync(path)) {
            this.success('Roslyn sidecar built');
            hasRoslyn = true;
            isBinary = true;
            break;
          }
        }

        if (!isBinary) {
          // Restore packages for dotnet run mode
          try {
            execSync(`dotnet restore`, { cwd: sidecarDir, encoding: 'utf8', stdio: 'pipe' });
            this.success('Roslyn sidecar ready (dotnet run mode)');
            hasRoslyn = true;
            this.info('Note: First run will be slower. Build for better performance:');
            this.info(`  cd ${sidecarDir} && dotnet build -c Release`);
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

  async checkPythonSidecar() {
    this.header('Python Sidecar (Embedding Service)');

    const sidecarDir = 'python-sidecar';

    if (!existsSync(sidecarDir)) {
      this.warning('Python sidecar directory not found');
      return;
    }

    // Check if virtual environment exists
    const venvPath = `${sidecarDir}/.venv`;
    let venvExists = existsSync(venvPath);

    if (!venvExists) {
      const shouldCreate = await this.prompt('Python virtual environment not found. Create it now?');

      if (shouldCreate || this.autoInstall) {
        const spinner = ora('Creating Python virtual environment...').start();

        try {
          // Check for Python
          let python;
          try {
            python = findSystemPython();
          } catch (error) {
            spinner.fail('Python not found. Please install Python 3.8+');
            this.error('Python is required for the embedding service');
            return;
          }

          // Create virtual environment
          runPython(python, ['-m', 'venv', venvPath], { cwd: sidecarDir });
          spinner.succeed('Python virtual environment created');
          venvExists = true;
        } catch (error) {
          spinner.fail('Failed to create virtual environment');
          this.error(`Virtual environment creation failed: ${error.message}`);
          return;
        }
      }
    } else {
      this.success('Python virtual environment exists');
    }

    // Check and install dependencies
    if (venvExists) {
      const requirementsPath = `${sidecarDir}/requirements.txt`;

      if (existsSync(requirementsPath)) {
        // Check if packages are installed and at correct versions
        let needsInstall = false;
        let needsRebuild = false;

        try {
          // Check for key packages
          const checkScript = `
import importlib, sys
mods = ["fastapi", "uvicorn", "numpy"]
missing = [m for m in mods if importlib.util.find_spec(m) is None]
sys.exit(1 if missing else 0)
`;
          runVenvPython(venvPath, ['-c', checkScript], { cwd: sidecarDir });

          // Check sentence-transformers version (must be 5.x for compatibility)
          try {
            const versionCheck = `
import importlib.metadata
version = importlib.metadata.version("sentence-transformers")
major = int(version.split('.')[0])
sys.exit(0 if major >= 5 else 1)
`;
            runVenvPython(venvPath, ['-c', versionCheck], { cwd: sidecarDir });
            this.success('Python dependencies installed (sentence-transformers 5.x)');
          } catch {
            this.warning('sentence-transformers is outdated (need 5.x), will reinstall dependencies');
            needsInstall = true;
          }
        } catch {
          needsInstall = true;
          this.warning('Python dependencies not installed');
        }

        if (needsInstall) {
          const shouldInstall = await this.prompt('Install Python sidecar dependencies? (Required for embeddings)');

          if (shouldInstall || this.autoInstall) {
            const spinner = ora('Installing Python dependencies (this may take a while)...').start();

            try {
              // Upgrade pip first
              runVenvPython(venvPath, ['-m', 'pip', 'install', '--upgrade', 'pip'], { cwd: sidecarDir });

              // Detect GPU and install appropriate PyTorch
              spinner.text = 'Detecting GPU support...';
              let torchIndex = 'https://download.pytorch.org/whl/cpu'; // default to CPU

              // Check for NVIDIA GPU on Windows/Linux
              if (process.platform === 'win32' || process.platform === 'linux') {
                try {
                  execSync('nvidia-smi', { encoding: 'utf8', stdio: 'ignore' });
                  torchIndex = 'https://download.pytorch.org/whl/cu124'; // CUDA 12.4 (supports Python 3.13)
                  this.info('✨ NVIDIA GPU detected! Installing CUDA-enabled PyTorch...');
                } catch {
                  this.info('No NVIDIA GPU detected, installing CPU-only PyTorch');
                }
              }
              // Check for Apple Silicon on macOS
              else if (process.platform === 'darwin') {
                try {
                  const arch = execSync('uname -m', { encoding: 'utf8' }).trim();
                  if (arch === 'arm64') {
                    this.info('✨ Apple Silicon detected! PyTorch will use Metal (MPS)...');
                  }
                } catch {}
                torchIndex = 'https://download.pytorch.org/whl/cpu'; // macOS uses same index
              }

              // Install PyTorch with appropriate index
              spinner.text = 'Installing PyTorch...';
              runVenvPython(venvPath, [
                '-m', 'pip', 'install',
                'torch>=2.3.0',
                '--index-url', torchIndex
              ], { cwd: sidecarDir });

              // Install other requirements
              spinner.text = 'Installing other Python dependencies...';
              runVenvPython(venvPath, ['-m', 'pip', 'install', '-r', 'requirements.txt'], { cwd: sidecarDir });

              spinner.succeed('Python dependencies installed successfully');
              this.successes.push('Installed Python sidecar dependencies');
            } catch (error) {
              spinner.fail('Failed to install Python dependencies');
              this.warning('Embeddings will not work without Python dependencies');
              this.info(`  Manual install: cd ${sidecarDir} && source .venv/bin/activate && pip install -r requirements.txt`);
            }
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

    // Check if TypeORM entities are built
    if (existsSync('apps/server/dist')) {
      this.success('Backend compiled (apps/server/dist exists)');
    } else {
      this.error('Backend not compiled. Run: npm run build');
    }
  }

  async printSummary() {
    console.log('\n' + chalk.bold('═══════════════════════════════════════════════════'));
    console.log(chalk.bold.cyan('SETUP SUMMARY'));
    console.log(chalk.bold('═══════════════════════════════════════════════════'));

    if (this.successes.length > 0) {
      console.log(chalk.green(`\n✅ Successful checks: ${this.successes.length}`));
    }

    if (this.warnings.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Warnings: ${this.warnings.length}`));
      this.warnings.forEach(w => console.log(chalk.yellow(`   - ${w}`)));
    }

    if (this.issues.length > 0) {
      console.log(chalk.red(`\n❌ Issues found: ${this.issues.length}`));
      this.issues.forEach(i => console.log(chalk.red(`   - ${i}`)));

      console.log(chalk.yellow('\n📝 Next Steps:'));
      console.log('1. Fix the issues listed above');
      console.log('2. Run: npm install');
      console.log('3. Run: npm run build');
      console.log('4. Run this setup script again to verify');
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
validator.run().catch(error => {
  console.error(chalk.red('Setup script failed:'), error);
  process.exit(1);
});
