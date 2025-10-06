#!/usr/bin/env node
import { readFileSync, unlinkSync } from 'fs';
import { existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const pidFile = join(repoRoot, '.sidecar-dev.pid');
const isWindows = process.platform === 'win32';

function log(msg) {
  console.log(msg);
}

function warn(msg) {
  console.warn(msg);
}

function fail(msg) {
  console.error(msg);
  process.exitCode = 1;
}

async function stopProcess(pid) {
  try {
    if (isWindows) {
      process.kill(pid, 'SIGTERM');
    } else {
      process.kill(pid, 'SIGTERM');
    }
    return true;
  } catch (error) {
    warn(`Failed to send SIGTERM to PID ${pid}: ${error.message}`);
    try {
      process.kill(pid, 'SIGKILL');
      return true;
    } catch (innerError) {
      warn(`Failed to force kill PID ${pid}: ${innerError.message}`);
      return false;
    }
  }
}

async function main() {
  if (!existsSync(pidFile)) {
    warn(`No PID file found at ${pidFile}. Sidecar may not be running.`);
    return;
  }

  let content;
  try {
    content = readFileSync(pidFile, 'utf8').trim();
  } catch (error) {
    fail(`Unable to read ${pidFile}: ${error.message}`);
    return;
  }

  if (!content) {
    warn(`PID file ${pidFile} is empty. Removing it.`);
    unlinkSync(pidFile);
    return;
  }

  const pids = content
    .split(/\s+/)
    .map((value) => parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (pids.length === 0) {
    warn(`No valid PIDs found in ${pidFile}. Removing file.`);
    unlinkSync(pidFile);
    return;
  }

  let stopped = 0;
  for (const pid of pids) {
    const success = await stopProcess(pid);
    if (success) {
      log(`Stopped sidecar process PID ${pid}`);
      stopped += 1;
    }
  }

  try {
    unlinkSync(pidFile);
  } catch (error) {
    warn(`Failed to remove PID file: ${error.message}`);
  }

  if (stopped === 0) {
    fail('No sidecar processes were terminated.');
  }
}

main().catch((error) => {
  fail(`Failed to stop sidecar: ${error.message}`);
});
