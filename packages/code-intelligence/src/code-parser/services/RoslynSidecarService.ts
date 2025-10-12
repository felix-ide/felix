/**
 * Roslyn Sidecar Service
 * Manages the C# Roslyn sidecar process for advanced semantic analysis
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * JSON-RPC request/response interfaces
 */
interface JsonRpcRequest {
  jsonrpc: string;
  id?: string | number | null;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id?: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface JsonRpcNotification {
  jsonrpc: string;
  method: string;
  params?: any;
}

/**
 * Semantic analysis models (matching C# models)
 */
export interface CodeLocation {
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  filePath: string;
}

export interface CodeSymbol {
  id: string;
  name: string;
  kind: string;
  type?: string;
  location?: CodeLocation;
  accessibility?: string;
  isStatic: boolean;
  isAbstract: boolean;
  isVirtual: boolean;
  isOverride: boolean;
  isSealed: boolean;
  isPartial: boolean;
  isAsync: boolean;
  isGeneric: boolean;
  genericParameters: string[];
  parameters: ParameterInfo[];
  returnType?: string;
  namespace?: string;
  containingType?: string;
  documentation?: string;
  attributes: AttributeInfo[];
  metadata: Record<string, any>;
}

export interface ParameterInfo {
  name: string;
  type: string;
  hasDefaultValue: boolean;
  defaultValue?: string;
  isParams: boolean;
  isOptional: boolean;
  refKind?: string;
}

export interface AttributeInfo {
  name: string;
  arguments: string[];
}

export interface TypeHierarchy {
  symbolId: string;
  baseType?: string;
  interfaces: string[];
  derivedTypes: string[];
  members: string[];
}

export interface ControlFlowNode {
  id: string;
  kind: string;
  location?: CodeLocation;
  predecessors: string[];
  successors: string[];
  statements: string[];
  isReachable: boolean;
}

export interface DataFlowAnalysis {
  variablesRead: string[];
  variablesWritten: string[];
  definitelyAssigned: string[];
  alwaysAssigned: string[];
  dataFlowsIn: string[];
  dataFlowsOut: string[];
}

export interface DiagnosticInfo {
  id: string;
  severity: string;
  message: string;
  location?: CodeLocation;
  category: string;
  warningLevel: number;
}

export interface SemanticAnalysisResult {
  symbols: CodeSymbol[];
  diagnostics: DiagnosticInfo[];
  typeHierarchies: TypeHierarchy[];
  controlFlowGraph: ControlFlowNode[];
  dataFlow?: DataFlowAnalysis;
  filePath: string;
  processingTimeMs: number;
}

export interface WorkspaceInfo {
  projectPath: string;
  projectName: string;
  targetFramework: string;
  assemblyName: string;
  documentCount: number;
  isLoaded: boolean;
  loadErrors: string[];
}

/**
 * Configuration for the Roslyn sidecar service
 */
export interface RoslynSidecarConfig {
  /** Path to the C# sidecar executable */
  executablePath?: string;
  /** Additional command line arguments */
  args?: string[];
  /** Request timeout in milliseconds */
  requestTimeout?: number;
  /** Enable debug logging */
  enableLogging?: boolean;
  /** Working directory for the sidecar process */
  workingDirectory?: string;
  /** Auto-restart the sidecar on crash */
  autoRestart?: boolean;
  /** Maximum number of restart attempts */
  maxRestartAttempts?: number;
}

/**
 * Roslyn Sidecar Service for advanced C# semantic analysis
 */
export class RoslynSidecarService extends EventEmitter {
  private process: ChildProcess | null = null;
  private isInitialized = false;
  private isStarting = false;
  private requestCounter = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private messageBuffer = '';
  private config: Required<RoslynSidecarConfig>;
  private restartAttempts = 0;

  constructor(config: RoslynSidecarConfig = {}) {
    super();

    this.config = {
      executablePath: this.getDefaultExecutablePath(),
      args: ['stdio'],
      requestTimeout: 30000,
      enableLogging: false,
      workingDirectory: process.cwd(),
      autoRestart: true,
      maxRestartAttempts: 3,
      ...config
    };
  }

  /**
   * Get the default path to the Roslyn sidecar executable
   * Priority:
   * 1. Bundled self-contained executable (no .NET required)
   * 2. Development build executables
   * 3. dotnet run fallback
   */
  private getDefaultExecutablePath(): string {
    const platform = process.platform;
    const arch = process.arch;
    const executableName = platform === 'win32' ? 'RoslynSidecar.exe' : 'RoslynSidecar';

    // Calculate path relative to the current service location
    const sidecarDir = join(__dirname, '..', 'sidecars', 'roslyn');
    const packageRoot = join(__dirname, '..', '..');

    // Platform-specific RID
    let rid = 'linux-x64';
    if (platform === 'win32') {
      rid = 'win-x64';
    } else if (platform === 'darwin') {
      rid = 'osx-x64';
    }

    // Check for bundled self-contained executables first
    const bundledPaths = [
      // Installed package location
      join(packageRoot, 'dist', 'sidecars', 'roslyn', rid, executableName),
      join(packageRoot, '..', '..', 'dist', 'sidecars', 'roslyn', rid, executableName),
      // Development location
      join(process.cwd(), 'packages', 'code-intelligence', 'dist', 'sidecars', 'roslyn', rid, executableName)
    ];

    for (const path of bundledPaths) {
      if (existsSync(path)) {
        console.log(`[roslyn-sidecar] Using bundled executable: ${path}`);
        return path;
      }
    }

    console.log('[roslyn-sidecar] Bundled executable not found, checking development builds');

    // Check for development build executables
    const possiblePaths = [
      join(sidecarDir, 'bin', 'Release', 'net9.0', executableName),
      join(sidecarDir, 'bin', 'Debug', 'net9.0', executableName),
      join(sidecarDir, 'bin', 'Release', 'net8.0', executableName),
      join(sidecarDir, 'bin', 'Debug', 'net8.0', executableName)
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        console.log(`[roslyn-sidecar] Using development build: ${path}`);
        return path;
      }
    }

    // If no built executable found, use dotnet run
    console.log('[roslyn-sidecar] No executable found, falling back to dotnet run');
    return 'dotnet';
  }

  /**
   * Start the Roslyn sidecar process
   */
  async start(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.isStarting) {
      // Wait for the current startup to complete
      return new Promise((resolve, reject) => {
        const checkStarted = () => {
          if (this.isInitialized) {
            resolve();
          } else if (!this.isStarting) {
            reject(new Error('Startup failed'));
          } else {
            setTimeout(checkStarted, 100);
          }
        };
        checkStarted();
      });
    }

    this.isStarting = true;

    try {
      await this.startProcess();
      await this.initialize();
      this.isInitialized = true;
      this.restartAttempts = 0;
      this.emit('started');
    } catch (error) {
      this.isStarting = false;
      throw error;
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * Start the sidecar process
   */
  private async startProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        let command = this.config.executablePath;
        let args = [...this.config.args];

        // If using dotnet, need to add the project path
        if (command === 'dotnet') {
          const projectPath = join(__dirname, '..', 'sidecars', 'roslyn', 'RoslynSidecar.csproj');
          args = ['run', '--project', projectPath, '--', ...args];
        }

        if (this.config.enableLogging) {
          console.log(`Starting Roslyn sidecar: ${command} ${args.join(' ')}`);
        }

        this.process = spawn(command, args, {
          cwd: this.config.workingDirectory,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env }
        });

        // Set up event handlers
        this.process.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });

        this.process.on('exit', (code, signal) => {
          this.handleProcessExit(code, signal);
        });

        // Set up stdio handling
        if (this.process.stdout) {
          this.process.stdout.on('data', (data) => {
            this.handleStdoutData(data);
          });
        }

        if (this.process.stderr) {
          this.process.stderr.on('data', (data) => {
            this.handleStderrData(data);
          });
        }

        // Wait a bit for the process to start
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            resolve();
          } else {
            reject(new Error('Process failed to start'));
          }
        }, 1000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Initialize the sidecar with handshake
   */
  private async initialize(): Promise<void> {
    try {
      const result = await this.sendRequest('initialize', {
        processId: process.pid,
        capabilities: {
          textDocument: { synchronization: { dynamicRegistration: true } }
        }
      });

      if (this.config.enableLogging) {
        console.log('Roslyn sidecar initialized:', result);
      }
    } catch (error) {
      throw new Error(`Failed to initialize sidecar: ${error}`);
    }
  }

  /**
   * Handle stdout data from the sidecar process
   */
  private handleStdoutData(data: Buffer): void {
    this.messageBuffer += data.toString();

    // Process complete messages
    while (true) {
      const match = this.messageBuffer.match(/^Content-Length: (\d+)\r?\n\r?\n/);
      if (!match) {
        // Check for raw JSON messages (for testing)
        const newlineIndex = this.messageBuffer.indexOf('\n');
        if (newlineIndex > 0) {
          const line = this.messageBuffer.substring(0, newlineIndex);
          this.messageBuffer = this.messageBuffer.substring(newlineIndex + 1);

          if (line.trim().startsWith('{')) {
            try {
              const message = JSON.parse(line.trim());
              this.handleMessage(message);
              continue;
            } catch {
              // Not valid JSON, ignore
            }
          }
        }
        break;
      }

      const contentLength = parseInt(match[1], 10);
      const headerLength = match[0].length;
      const totalLength = headerLength + contentLength;

      if (this.messageBuffer.length < totalLength) {
        break; // Not enough data yet
      }

      const messageContent = this.messageBuffer.substring(headerLength, totalLength);
      this.messageBuffer = this.messageBuffer.substring(totalLength);

      try {
        const message = JSON.parse(messageContent);
        this.handleMessage(message);
      } catch (error) {
        if (this.config.enableLogging) {
          console.error('Failed to parse message:', error, messageContent);
        }
      }
    }
  }

  /**
   * Handle stderr data from the sidecar process
   */
  private handleStderrData(data: Buffer): void {
    const errorText = data.toString();
    if (this.config.enableLogging) {
      console.error('Sidecar stderr:', errorText);
    }
    this.emit('stderr', errorText);
  }

  /**
   * Handle incoming messages from the sidecar
   */
  private handleMessage(message: JsonRpcResponse | JsonRpcNotification): void {
    if ('id' in message && message.id !== undefined) {
      // This is a response to a request
      this.handleResponse(message as JsonRpcResponse);
    } else {
      // This is a notification
      this.handleNotification(message as JsonRpcNotification);
    }
  }

  /**
   * Handle JSON-RPC responses
   */
  private handleResponse(response: JsonRpcResponse): void {
    const id = response.id;
    if (id === undefined || id === null) return;

    const pending = this.pendingRequests.get(id);
    if (!pending) return;

    this.pendingRequests.delete(id);
    clearTimeout(pending.timeout);

    if (response.error) {
      pending.reject(new Error(`RPC Error ${response.error.code}: ${response.error.message}`));
    } else {
      pending.resolve(response.result);
    }
  }

  /**
   * Handle JSON-RPC notifications
   */
  private handleNotification(notification: JsonRpcNotification): void {
    if (this.config.enableLogging) {
      console.log('Received notification:', notification.method, notification.params);
    }

    this.emit('notification', notification.method, notification.params);

    // Handle specific notifications
    switch (notification.method) {
      case 'initialized':
        this.emit('initialized');
        break;
      case 'diagnostics':
        this.emit('diagnostics', notification.params);
        break;
    }
  }

  /**
   * Handle process exit
   */
  private handleProcessExit(code: number | null, signal: string | null): void {
    this.isInitialized = false;
    this.process = null;

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error('Sidecar process exited'));
    }
    this.pendingRequests.clear();

    if (this.config.enableLogging) {
      console.log(`Sidecar process exited with code ${code}, signal ${signal}`);
    }

    this.emit('exit', code, signal);

    // Auto-restart if enabled and not too many attempts
    if (this.config.autoRestart && this.restartAttempts < this.config.maxRestartAttempts) {
      this.restartAttempts++;
      setTimeout(() => {
        if (this.config.enableLogging) {
          console.log(`Attempting to restart sidecar (attempt ${this.restartAttempts})`);
        }
        this.start().catch(error => {
          this.emit('error', error);
        });
      }, 1000 * this.restartAttempts);
    }
  }

  /**
   * Send a JSON-RPC request to the sidecar
   */
  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Sidecar process not available');
    }

    const id = ++this.requestCounter;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.config.requestTimeout);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      const message = JSON.stringify(request);
      const contentLength = Buffer.byteLength(message, 'utf8');
      const header = `Content-Length: ${contentLength}\r\n\r\n`;

      if (this.config.enableLogging) {
        console.log('Sending request:', method, params);
      }

      this.process!.stdin!.write(header + message);
    });
  }

  /**
   * Send a notification to the sidecar
   */
  private async sendNotification(method: string, params?: any): Promise<void> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Sidecar process not available');
    }

    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params
    };

    const message = JSON.stringify(notification);
    const contentLength = Buffer.byteLength(message, 'utf8');
    const header = `Content-Length: ${contentLength}\r\n\r\n`;

    this.process.stdin.write(header + message);
  }

  /**
   * Public API methods
   */

  /**
   * Load a workspace (solution or project)
   */
  async loadWorkspace(path: string): Promise<WorkspaceInfo> {
    if (!this.isInitialized) {
      await this.start();
    }

    return this.sendRequest('workspace/load', { path });
  }

  /**
   * Analyze a C# file
   */
  async analyzeFile(filePath: string, content?: string): Promise<SemanticAnalysisResult> {
    if (!this.isInitialized) {
      await this.start();
    }

    const params = content
      ? { filePath, content }
      : { filePath };

    return this.sendRequest('textDocument/analyze', params);
  }

  /**
   * Get document symbols
   */
  async getDocumentSymbols(filePath: string): Promise<CodeSymbol[]> {
    if (!this.isInitialized) {
      await this.start();
    }

    return this.sendRequest('textDocument/documentSymbol', {
      textDocument: { uri: filePath }
    });
  }

  /**
   * Get workspace symbols
   */
  async getWorkspaceSymbols(query = ''): Promise<any[]> {
    if (!this.isInitialized) {
      await this.start();
    }

    return this.sendRequest('workspace/symbol', { query });
  }

  /**
   * Get control flow graph
   */
  async getControlFlow(filePath: string): Promise<ControlFlowNode[]> {
    if (!this.isInitialized) {
      await this.start();
    }

    return this.sendRequest('textDocument/controlFlow', {
      textDocument: { uri: filePath }
    });
  }

  /**
   * Get data flow analysis
   */
  async getDataFlow(filePath: string): Promise<DataFlowAnalysis | null> {
    if (!this.isInitialized) {
      await this.start();
    }

    return this.sendRequest('textDocument/dataFlow', {
      textDocument: { uri: filePath }
    });
  }

  /**
   * Get type hierarchy
   */
  async getTypeHierarchy(filePath: string): Promise<TypeHierarchy[]> {
    if (!this.isInitialized) {
      await this.start();
    }

    return this.sendRequest('textDocument/typeHierarchy', {
      textDocument: { uri: filePath }
    });
  }

  /**
   * Get diagnostics for a file
   */
  async getDiagnostics(filePath: string): Promise<DiagnosticInfo[]> {
    if (!this.isInitialized) {
      await this.start();
    }

    return this.sendRequest('textDocument/diagnostics', {
      textDocument: { uri: filePath }
    });
  }

  /**
   * Get workspace diagnostics
   */
  async getWorkspaceDiagnostics(): Promise<DiagnosticInfo[]> {
    if (!this.isInitialized) {
      await this.start();
    }

    return this.sendRequest('workspace/diagnostics', {});
  }

  /**
   * Notify about document changes
   */
  async didOpenDocument(filePath: string, content: string): Promise<void> {
    if (!this.isInitialized) {
      await this.start();
    }

    await this.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri: filePath,
        languageId: 'csharp',
        version: 1,
        text: content
      }
    });
  }

  /**
   * Notify about document changes
   */
  async didChangeDocument(filePath: string, content: string): Promise<void> {
    if (!this.isInitialized) {
      await this.start();
    }

    await this.sendNotification('textDocument/didChange', {
      textDocument: { uri: filePath, version: Date.now() },
      contentChanges: [{ text: content }]
    });
  }

  /**
   * Check if the sidecar is available and working
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.start();
      }
      await this.sendRequest('workspace/info', {});
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Stop the sidecar service
   */
  async stop(): Promise<void> {
    if (this.process) {
      try {
        await this.sendRequest('shutdown', {});
        await this.sendNotification('exit', {});
      } catch {
        // Ignore errors during shutdown
      }

      if (this.process && !this.process.killed) {
        this.process.kill();
      }
    }

    this.isInitialized = false;
    this.process = null;

    // Clear pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error('Service stopped'));
    }
    this.pendingRequests.clear();

    this.emit('stopped');
  }

  /**
   * Get service status
   */
  getStatus(): { isInitialized: boolean; isStarting: boolean; processId?: number } {
    return {
      isInitialized: this.isInitialized,
      isStarting: this.isStarting,
      processId: this.process?.pid
    };
  }
}