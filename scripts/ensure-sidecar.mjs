#!/usr/bin/env node
import { spawn } from 'child_process';
import { constants, existsSync, mkdirSync, openSync, writeFileSync } from 'fs';
import { access } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const sidecarDir = join(repoRoot, 'python-sidecar');
const venvDir = join(sidecarDir, '.venv');
const isWindows = process.platform === 'win32';
const host = process.env.SIDECAR_BIND_HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.SIDECAR_BIND_PORT ?? '8088', 10);
const baseUrl = `http://${host}:${port}`;
const pidFile = join(repoRoot, '.sidecar-dev.pid');
const logFile = join(os.tmpdir(), 'felix-sidecar.log');

function log(message) {
  console.log(message);
}

async function isUp() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // Increased from 1s to 5s for Windows
    const response = await fetch(`${baseUrl}/v1/health`, {
      method: 'POST',
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

function runCommand(command, args, { cwd, stdio = 'inherit', env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio,
      env,
      windowsHide: true,
      shell: false
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function findPython() {
  const candidates = [];
  if (isWindows) {
    candidates.push({ command: 'py', args: ['-3'] });
  }
  candidates.push({ command: 'python3', args: [] }, { command: 'python', args: [] });

  for (const candidate of candidates) {
    try {
      await runCommand(candidate.command, [...candidate.args, '--version'], { stdio: 'ignore' });
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error('Python interpreter not found. Install Python 3 and try again.');
}

function resolveVenvPython() {
  const binFolder = isWindows ? 'Scripts' : 'bin';
  const executable = isWindows ? 'python.exe' : 'python';
  return join(venvDir, binFolder, executable);
}

async function ensureVenv(python) {
  if (!existsSync(venvDir)) {
    log('Virtual environment not found. Creating...');
    mkdirSync(venvDir, { recursive: true });
    await runCommand(python.command, [...python.args, '-m', 'venv', venvDir], { cwd: sidecarDir });
  }
}

async function ensureRequirements(venvPython) {
  const modulesProbe = 'import importlib, sys;\nmods = ["fastapi", "uvicorn", "numpy"];\nmissing = [m for m in mods if importlib.util.find_spec(m) is None];\nsys.exit(1 if missing else 0)';
  try {
    await runCommand(venvPython, ['-c', modulesProbe], { cwd: sidecarDir, stdio: 'ignore' });

    // Check sentence-transformers version
    const versionCheck = 'import importlib.metadata, sys;\nversion = importlib.metadata.version("sentence-transformers");\nmajor = int(version.split(".")[0]);\nsys.exit(0 if major >= 5 else 1)';
    try {
      await runCommand(venvPython, ['-c', versionCheck], { cwd: sidecarDir, stdio: 'ignore' });
    } catch {
      log('⚠️  sentence-transformers is outdated (need 5.x). Reinstalling...');
      if (process.env.SKIP_PIP_INSTALL !== '1') {
        await runCommand(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'], { cwd: sidecarDir });
        await runCommand(venvPython, ['-m', 'pip', 'install', '-r', 'requirements.txt', '--upgrade'], { cwd: sidecarDir });
      }
    }
  } catch {
    if (process.env.SKIP_PIP_INSTALL === '1') {
      log('Skipping dependency install because SKIP_PIP_INSTALL=1');
      return;
    }
    log('Installing Python sidecar requirements...');
    await runCommand(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'], { cwd: sidecarDir });
    await runCommand(venvPython, ['-m', 'pip', 'install', '-r', 'requirements.txt'], { cwd: sidecarDir });
  }
}

const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.SIDECAR_STARTUP_TIMEOUT_MS ?? '90000', 10); // Increased from 45s to 90s for first-time model load

async function waitForHealth(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const start = Date.now();
  let attempts = 0;
  log(`Waiting for sidecar health check (timeout: ${timeoutMs}ms)...`);
  while (Date.now() - start < timeoutMs) {
    attempts++;
    if (await isUp()) {
      log(`✅ Sidecar healthy after ${attempts} attempts (${Date.now() - start}ms)`);
      return true;
    }
    if (attempts % 10 === 0) {
      log(`Still waiting for sidecar... (${attempts} attempts, ${Math.round((Date.now() - start) / 1000)}s elapsed)`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  log(`❌ Sidecar failed health check after ${attempts} attempts and ${Math.round((Date.now() - start) / 1000)}s`);
  return false;
}

async function startSidecar(venvPython) {
  // Clear Python bytecode cache to ensure fresh code is loaded
  try {
    const { execSync } = await import('child_process');
    if (isWindows) {
      execSync('for /d /r . %d in (__pycache__) do @if exist "%d" rd /s /q "%d"', { cwd: sidecarDir, shell: true, stdio: 'ignore' });
      execSync('del /s /q *.pyc', { cwd: sidecarDir, shell: true, stdio: 'ignore' });
    } else {
      execSync('find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true', { cwd: sidecarDir, stdio: 'ignore' });
      execSync('find . -name "*.pyc" -delete 2>/dev/null || true', { cwd: sidecarDir, stdio: 'ignore' });
    }
    log('Cleared Python bytecode cache');
  } catch {
    // Cache clearing is best-effort, don't fail if it errors
  }

  const env = {
    ...process.env,
    SIDECAR_ALLOW_MOCK: process.env.SIDECAR_ALLOW_MOCK ?? 'false',
    SIDECAR_DEVICE: process.env.SIDECAR_DEVICE ?? 'auto',
    SIDECAR_BIND_HOST: host,
    SIDECAR_BIND_PORT: String(port)
  };

  const outFd = openSync(logFile, 'a');
  const errFd = openSync(logFile, 'a');

  const child = spawn(venvPython, ['-m', 'uvicorn', 'app:app', '--host', host, '--port', String(port)], {
    cwd: sidecarDir,
    env,
    stdio: ['ignore', outFd, errFd],
    detached: true,
    windowsHide: true
  });

  child.unref();
  writeFileSync(pidFile, String(child.pid));
  log(`Sidecar process started (PID ${child.pid}). Logs: ${logFile}`);

  const healthy = await waitForHealth();
  if (!healthy) {
    throw new Error(`Sidecar failed to become healthy at ${baseUrl}`);
  }
  log(`Sidecar is healthy at ${baseUrl}`);
}

async function main() {
  if (await isUp()) {
    log(`Sidecar already running at ${baseUrl}`);
    return;
  }

  try {
    await access(sidecarDir, constants.R_OK | constants.W_OK);
  } catch {
    throw new Error(`Cannot access sidecar directory: ${sidecarDir}`);
  }

  const python = await findPython();
  await ensureVenv(python);
  const venvPython = resolveVenvPython();
  await ensureRequirements(venvPython);
  await startSidecar(venvPython);
}

main().catch((error) => {
  console.error(`Failed to ensure sidecar: ${error.message}`);
  process.exit(1);
});
