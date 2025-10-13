#!/usr/bin/env node

/**
 * Post-install script for @felix/code-intelligence
 *
 * Attempts to build platform-specific sidecar executables automatically.
 * If build fails, that's OK - the code will fall back to system Python/dotnet.
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');

// ANSI color codes for better UX
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, colors.blue);
  log(`  ${title}`, colors.bright);
  log(`${'='.repeat(60)}`, colors.blue);
}

function checkBundledExecutables() {
  const platform = process.platform;
  const pythonExe = platform === 'win32' ? 'python_ast_helper.exe' : 'python_ast_helper';

  let rid = 'linux-x64';
  if (platform === 'win32') rid = 'win-x64';
  else if (platform === 'darwin') rid = 'osx-x64';

  const roslynExe = platform === 'win32' ? 'RoslynSidecar.exe' : 'RoslynSidecar';

  const pythonPath = join(packageRoot, 'dist', 'sidecars', 'python', pythonExe);
  const roslynPath = join(packageRoot, 'dist', 'sidecars', 'roslyn', rid, roslynExe);

  const hasPython = existsSync(pythonPath);
  const hasRoslyn = existsSync(roslynPath);

  return { hasPython, hasRoslyn, pythonPath, roslynPath };
}

async function checkCommand(command, args = ['--version']) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { stdio: 'ignore' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

async function buildPythonExecutable() {
  log('\n📦 Building Python AST Helper...', colors.blue);

  // Check if PyInstaller is available
  const hasPyInstaller = await checkCommand('pyinstaller', ['--version']);

  if (!hasPyInstaller) {
    log('  ⚠️  PyInstaller not found, attempting to install...', colors.yellow);

    // Try to install PyInstaller
    const installProc = spawn('pip', ['install', 'pyinstaller'], { stdio: 'inherit' });
    const installSuccess = await new Promise((resolve) => {
      installProc.on('close', (code) => resolve(code === 0));
      installProc.on('error', () => resolve(false));
    });

    if (!installSuccess) {
      log('  ❌ Failed to install PyInstaller', colors.red);
      log('  💡 To enable Python parsing, install PyInstaller: pip install pyinstaller', colors.yellow);
      return false;
    }
  }

  // Run the build script
  const scriptPath = join(packageRoot, 'scripts', 'build-python-executable.sh');

  if (!existsSync(scriptPath)) {
    log('  ⚠️  Build script not found, skipping...', colors.yellow);
    return false;
  }

  log('  🔨 Building executable (this may take 1-2 minutes)...', colors.blue);

  const buildProc = spawn('bash', [scriptPath], {
    stdio: 'inherit',
    cwd: packageRoot
  });

  const success = await new Promise((resolve) => {
    buildProc.on('close', (code) => resolve(code === 0));
    buildProc.on('error', () => resolve(false));
  });

  if (success) {
    log('  ✅ Python executable built successfully!', colors.green);
  } else {
    log('  ❌ Build failed', colors.red);
    log('  💡 Python parsing will use system Python as fallback', colors.yellow);
  }

  return success;
}

async function buildRoslynExecutable() {
  log('\n📦 Building Roslyn Sidecar...', colors.blue);

  // Check if dotnet is available
  const hasDotnet = await checkCommand('dotnet', ['--version']);

  if (!hasDotnet) {
    log('  ❌ .NET SDK not found', colors.red);
    log('  💡 To enable C# parsing, install .NET 8.0 SDK: https://dotnet.microsoft.com/download', colors.yellow);
    return false;
  }

  // Run the build script
  const scriptPath = join(packageRoot, 'src', 'code-parser', 'sidecars', 'roslyn', 'build-standalone.sh');

  if (!existsSync(scriptPath)) {
    log('  ⚠️  Build script not found, skipping...', colors.yellow);
    return false;
  }

  log('  🔨 Building self-contained executable (this may take 2-3 minutes)...', colors.blue);

  const buildProc = spawn('bash', [scriptPath], {
    stdio: 'inherit',
    cwd: packageRoot
  });

  const success = await new Promise((resolve) => {
    buildProc.on('close', (code) => resolve(code === 0));
    buildProc.on('error', () => resolve(false));
  });

  if (success) {
    log('  ✅ Roslyn executable built successfully!', colors.green);
  } else {
    log('  ❌ Build failed', colors.red);
    log('  💡 C# parsing will use dotnet fallback', colors.yellow);
  }

  return success;
}

async function main() {
  logSection('Felix Code Intelligence - Post Install');

  // Skip in CI environments
  if (process.env.CI || process.env.SKIP_SIDECAR_BUILD) {
    log('\n⏭️  Skipping sidecar builds (CI environment)', colors.yellow);
    log('💡 Sidecars will be built separately or use system fallbacks', colors.blue);
    return;
  }

  // Check if bundled executables already exist
  const bundled = checkBundledExecutables();

  if (bundled.hasPython && bundled.hasRoslyn) {
    log('\n✅ Bundled executables found! No build needed.', colors.green);
    log(`  Python: ${bundled.pythonPath}`, colors.blue);
    log(`  Roslyn: ${bundled.roslynPath}`, colors.blue);
    log('\n💡 Felix will use these bundled executables (no Python/dotnet required)', colors.green);
    return;
  }

  log('\n🔍 Bundled executables not found. Attempting to build for your platform...', colors.yellow);
  log('   (This is optional - builds will be skipped if tools are missing)', colors.blue);

  const results = {
    python: false,
    roslyn: false
  };

  // Try to build Python executable
  if (!bundled.hasPython) {
    const hasPython = await checkCommand('python3', ['--version']) ||
                      await checkCommand('python', ['--version']) ||
                      await checkCommand('py', ['-3', '--version']);

    if (hasPython) {
      results.python = await buildPythonExecutable();
    } else {
      log('\n❌ Python not found - skipping Python executable build', colors.red);
      log('💡 Install Python 3.11+ to enable Python parsing', colors.yellow);
    }
  } else {
    log('\n✅ Python executable already exists', colors.green);
    results.python = true;
  }

  // Try to build Roslyn executable
  if (!bundled.hasRoslyn) {
    const hasDotnet = await checkCommand('dotnet', ['--version']);

    if (hasDotnet) {
      results.roslyn = await buildRoslynExecutable();
    } else {
      log('\n❌ .NET SDK not found - skipping Roslyn executable build', colors.red);
      log('💡 Install .NET 8.0 SDK to enable C# parsing', colors.yellow);
    }
  } else {
    log('\n✅ Roslyn executable already exists', colors.green);
    results.roslyn = true;
  }

  // Summary
  logSection('Installation Summary');

  if (results.python && results.roslyn) {
    log('✅ All sidecars built successfully!', colors.green);
    log('✅ Felix will use bundled executables (no runtime dependencies)', colors.green);
  } else if (results.python || results.roslyn) {
    log('⚠️  Partial success:', colors.yellow);
    if (results.python) {
      log('  ✅ Python parsing: Using bundled executable', colors.green);
    } else {
      log('  ⚠️  Python parsing: Will use system Python', colors.yellow);
    }
    if (results.roslyn) {
      log('  ✅ C# parsing: Using bundled executable', colors.green);
    } else {
      log('  ⚠️  C# parsing: Will use system dotnet', colors.yellow);
    }
  } else {
    log('⚠️  No executables built - using system fallbacks', colors.yellow);
    log('\nFelix will work but requires:', colors.blue);
    log('  • Python 3.11+ for Python file parsing', colors.blue);
    log('  • .NET 8.0 SDK for C# file parsing', colors.blue);
  }

  log('\n💡 To manually build sidecars later:', colors.blue);
  log('   npm run build:sidecars', colors.blue);

  log(''); // Empty line for spacing
}

// Run but don't fail the install if something goes wrong
main().catch((error) => {
  log('\n⚠️  Post-install script encountered an error:', colors.yellow);
  log(`   ${error.message}`, colors.red);
  log('💡 Felix installation will continue with system fallbacks', colors.blue);
  process.exit(0); // Exit with success to not block npm install
});
