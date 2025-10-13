import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { createInterface, Interface as ReadLineInterface } from 'readline';
import { existsSync, copyFileSync, mkdirSync, cpSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

interface ServerRequestPayload {
  id: string;
  command: 'parse_content' | 'parse_file' | 'shutdown';
  file_path?: string;
  content?: string;
}

interface BaseResponse {
  id?: string;
  success: boolean;
  error?: string;
  message?: string;
  traceback?: string;
}

interface ParseResponse extends BaseResponse {
  ast?: unknown;
  content?: string;
  line?: number;
}

type PendingResolver = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeout: NodeJS.Timeout;
};

const REQUEST_TIMEOUT_MS = 15000;

export class PhpAstBridge {
  private static instance: PhpAstBridge | null = null;

  static getInstance(): PhpAstBridge {
    if (!PhpAstBridge.instance) {
      PhpAstBridge.instance = new PhpAstBridge();
    }
    return PhpAstBridge.instance;
  }

  private helperPath: string;
  private process: ChildProcessWithoutNullStreams | null = null;
  private readline?: ReadLineInterface;
  private pending = new Map<string, PendingResolver>();
  private requestCounter = 0;

  private constructor() {
    this.helperPath = this.resolveHelperPath();
    if (!existsSync(this.helperPath)) {
      throw new Error(`PHP parser helper not found at ${this.helperPath}`);
    }
    this.startProcess();
  }

  async parseContent(filePath: string, content: string): Promise<ParseResponse> {
    return await this.sendRequest<ParseResponse>({
      id: this.nextId(),
      command: 'parse_content',
      file_path: filePath,
      content
    });
  }

  async parseFile(filePath: string): Promise<ParseResponse> {
    return await this.sendRequest<ParseResponse>({
      id: this.nextId(),
      command: 'parse_file',
      file_path: filePath
    });
  }

  async shutdown(): Promise<void> {
    if (!this.process) return;
    try {
      await this.sendRequest<BaseResponse>({ id: this.nextId(), command: 'shutdown' }, 2000);
    } catch {
      // ignore shutdown errors
    } finally {
      this.cleanupProcess();
    }
  }

  private resolveHelperPath(): string {
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    const distCandidate = resolve(moduleDir, '..', 'parsers', 'php', 'parser.php');

    const packageRoot = resolve(moduleDir, '..', '..', '..');
    const srcDir = join(packageRoot, 'src', 'code-parser', 'parsers', 'php');
    const srcCandidate = join(srcDir, 'parser.php');
    if (existsSync(srcCandidate)) {
      const distDir = dirname(distCandidate);
      mkdirSync(distDir, { recursive: true });
      copyFileSync(srcCandidate, distCandidate);

      const srcVendor = join(srcDir, 'vendor');
      if (existsSync(srcVendor)) {
        const distVendor = join(distDir, 'vendor');
        cpSync(srcVendor, distVendor, { recursive: true, force: true });
      }

      const srcComposerJson = join(srcDir, 'composer.json');
      if (existsSync(srcComposerJson)) {
        copyFileSync(srcComposerJson, join(distDir, 'composer.json'));
      }
      const srcComposerLock = join(srcDir, 'composer.lock');
      if (existsSync(srcComposerLock)) {
        copyFileSync(srcComposerLock, join(distDir, 'composer.lock'));
      }
    }

    if (existsSync(distCandidate)) {
      return distCandidate;
    }

    throw new Error(`PHP parser helper not found at ${distCandidate}`);
  }

  private startProcess(): void {
    try {
      this.process = spawn('php', [this.helperPath, '--server'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (error) {
      throw new Error(`Failed to spawn PHP helper process. Is PHP installed? ${error}`);
    }

    this.process.stdin?.on('error', (error: NodeJS.ErrnoException) => {
      if (error && (error.code === 'EPIPE' || error.code === 'ERR_STREAM_DESTROYED')) {
        return;
      }
      console.warn('[php-parser] stdin error:', error);
    });

    this.readline = createInterface({ input: this.process.stdout });
    this.readline.on('line', (line) => this.handleLine(line));

    this.process.stderr.on('data', (buffer: Buffer) => {
      const message = buffer.toString().trim();
      if (message) {
        console.warn(`[php-parser] ${message}`);
      }
    });

    this.process.on('exit', (code, signal) => {
      const reason = code !== null ? `code ${code}` : `signal ${signal}`;
      console.warn(`[php-parser] exited with ${reason}`);
      this.rejectAllPending(new Error(`PHP parser helper exited with ${reason}`));
      this.cleanupProcess();
    });
  }

  private cleanupProcess(): void {
    if (this.readline) {
      this.readline.removeAllListeners();
      this.readline.close();
      this.readline = undefined;
    }
    if (this.process) {
      this.process.removeAllListeners();
      this.process = null;
    }
  }

  private rejectAllPending(error: Error): void {
    for (const [, resolver] of this.pending) {
      clearTimeout(resolver.timeout);
      resolver.reject(error);
    }
    this.pending.clear();
  }

  private handleLine(line: string): void {
    let response: BaseResponse | undefined;
    try {
      response = JSON.parse(line);
    } catch (error) {
      console.warn(`[php-parser] Invalid JSON response: ${line}`);
      return;
    }

    if (!response || !response.id) {
      console.warn('[php-parser] Response missing id');
      return;
    }

    const pending = this.pending.get(response.id);
    if (!pending) {
      console.warn(`[php-parser] No pending request for id ${response.id}`);
      return;
    }

    clearTimeout(pending.timeout);
    this.pending.delete(response.id);
    pending.resolve(response);
  }

  private async sendRequest<T extends BaseResponse>(payload: ServerRequestPayload, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
    if (!this.process || !this.process.stdin.writable) {
      this.cleanupProcess();
      this.startProcess();
    }

    return await new Promise<T>((resolve, reject) => {
      if (!this.process || !this.process.stdin.writable) {
        return reject(new Error('PHP parser helper process is not available'));
      }

      const timeout = setTimeout(() => {
        this.pending.delete(payload.id);
        reject(new Error(`PHP parser helper request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending.set(payload.id, { resolve: resolve as (value: any) => void, reject, timeout });

      try {
        this.process.stdin.write(`${JSON.stringify(payload)}\n`);
      } catch (error) {
        clearTimeout(timeout);
        this.pending.delete(payload.id);
        reject(error);
      }
    });
  }

  private nextId(): string {
    this.requestCounter = (this.requestCounter + 1) % Number.MAX_SAFE_INTEGER;
    return `php-${Date.now()}-${this.requestCounter}`;
  }
}

// Don't create instance on module load - let PhpParser create it lazily when needed
