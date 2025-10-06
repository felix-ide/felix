import { spawn, ChildProcessWithoutNullStreams, spawnSync } from 'child_process';
import { createInterface, Interface as ReadLineInterface } from 'readline';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

interface ServerRequestPayload {
  id: string;
  command: 'parse_content' | 'parse_file' | 'extract_imports' | 'resolve_module' | 'shutdown';
  file_path?: string;
  content?: string;
  module_name?: string;
}

interface BaseResponse {
  id?: string;
  success: boolean;
  error?: string;
  message?: string;
  traceback?: string;
}

export interface ParseResponse extends BaseResponse {
  ast?: unknown;
  content?: string;
  lineno?: number;
  offset?: number;
}

export interface ImportResponse extends BaseResponse {
  imports?: unknown[];
}

export interface ModuleResolutionResponse extends BaseResponse {
  resolved_path?: string;
}

type PendingResolver = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeout: NodeJS.Timeout;
};

const REQUEST_TIMEOUT_MS = 15000;

export interface PythonAstProvider {
  parseContent(filePath: string, content: string): Promise<ParseResponse>;
  parseFile(filePath: string): Promise<ParseResponse>;
  extractImports(filePath: string, content?: string): Promise<ImportResponse>;
  resolveModule(moduleName: string): Promise<ModuleResolutionResponse>;
  shutdown(): Promise<void>;
}

export class PythonAstBridge implements PythonAstProvider {
  private static instance: PythonAstBridge | null = null;

  static getInstance(): PythonAstBridge {
    if (!PythonAstBridge.instance) {
      PythonAstBridge.instance = new PythonAstBridge();
    }
    return PythonAstBridge.instance;
  }

  private helperPath: string;
  private process: ChildProcessWithoutNullStreams | null = null;
  private readline?: ReadLineInterface;
  private pending = new Map<string, PendingResolver>();
  private requestCounter = 0;
  private pythonExecutable: { command: string; args: string[] };

  private constructor() {
    this.helperPath = this.ensureHelperScript();
    this.pythonExecutable = this.resolvePythonInterpreter();
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

  async extractImports(filePath: string, content?: string): Promise<ImportResponse> {
    return await this.sendRequest<ImportResponse>({
      id: this.nextId(),
      command: 'extract_imports',
      file_path: filePath,
      content
    });
  }

  async resolveModule(moduleName: string): Promise<ModuleResolutionResponse> {
    return await this.sendRequest<ModuleResolutionResponse>({
      id: this.nextId(),
      command: 'resolve_module',
      module_name: moduleName
    });
  }

  async shutdown(): Promise<void> {
    if (!this.process) return;
    try {
      await this.sendRequest<BaseResponse>({ id: this.nextId(), command: 'shutdown' }, 2000);
    } catch {
      // ignore shutdown failures
    } finally {
      this.cleanupProcess();
    }
  }

  private nextId(): string {
    this.requestCounter = (this.requestCounter + 1) % Number.MAX_SAFE_INTEGER;
    return `req-${Date.now()}-${this.requestCounter}`;
  }

  private resolvePythonInterpreter(): { command: string; args: string[] } {
    const candidates: Array<{ command: string; args: string[] }> = [];
    if (process.platform === 'win32') {
      candidates.push({ command: 'py', args: ['-3'] });
    }
    candidates.push({ command: 'python3', args: [] }, { command: 'python', args: [] });

    for (const candidate of candidates) {
      const result = spawnSync(candidate.command, [...candidate.args, '--version'], { stdio: 'ignore' });
      if (!result.error && result.status === 0) {
        return candidate;
      }
    }

    throw new Error('Python 3 interpreter not found. Install Python 3 to enable AST parsing.');
  }

  private ensureHelperScript(): string {
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    const packageRoot = resolve(moduleDir, '..', '..');

    const searchPaths = [
      join(packageRoot, 'parsers', 'python_ast_helper.py'),
      join(packageRoot, '..', '..', 'dist', 'code-parser', 'parsers', 'python_ast_helper.py'),
      join(packageRoot, '..', '..', 'src', 'code-parser', 'parsers', 'python_ast_helper.py'),
      join(process.cwd(), 'packages', 'code-intelligence', 'src', 'code-parser', 'parsers', 'python_ast_helper.py'),
      join(process.cwd(), 'packages', 'code-intelligence', 'dist', 'code-parser', 'parsers', 'python_ast_helper.py'),
      join(process.cwd(), 'python_ast_helper.py')
    ];

    const existingPath = searchPaths.find(candidate => existsSync(candidate));
    const helperPath = existingPath ?? searchPaths[0];

    if (!existsSync(helperPath)) {
      const helperDir = dirname(helperPath);
      mkdirSync(helperDir, { recursive: true });
      writeFileSync(helperPath, this.buildHelperScript(helperDir));
    }

    return helperPath;
  }

  private buildHelperScript(helperDir: string): string {
    void helperDir;
    const lines = [
      `#!/usr/bin/env python3`,
      `"""`,
      `Felix Python AST Helper`,
      `Provides AST parsing, import extraction, and module resolution via CLI or persistent server mode.`,
      `"""`,
      ``,
      `import ast`,
      `import importlib`,
      `import json`,
      `import sys`,
      `import traceback`,
      ``,
      ``,
      `def node_to_dict(node):`,
      `    if not isinstance(node, ast.AST):`,
      `        return node`,
      ``,
      `    result = {"_type": node.__class__.__name__}`,
      ``,
      `    if hasattr(node, "lineno"):`,
      `        result["lineno"] = node.lineno`,
      `    if hasattr(node, "col_offset"):`,
      `        result["col_offset"] = node.col_offset`,
      `    if hasattr(node, "end_lineno"):`,
      `        result["end_lineno"] = node.end_lineno`,
      `    if hasattr(node, "end_col_offset"):`,
      `        result["end_col_offset"] = node.end_col_offset`,
      ``,
      `    for field, value in ast.iter_fields(node):`,
      `        if isinstance(value, list):`,
      `            result[field] = [node_to_dict(item) for item in value]`,
      `        elif isinstance(value, ast.AST):`,
      `            result[field] = node_to_dict(value)`,
      `        else:`,
      `            result[field] = value`,
      ``,
      `    return result`,
      ``,
      ``,
      `def extract_imports_from_ast(node):`,
      `    imports = []`,
      ``,
      `    class ImportVisitor(ast.NodeVisitor):`,
      `        def visit_Import(self, n):`,
      `            names = [{"name": alias.name, "asname": alias.asname} for alias in n.names]`,
      `            imports.append({`,
      `                "type": "Import",`,
      `                "line": getattr(n, "lineno", 0),`,
      `                "column": getattr(n, "col_offset", 0),`,
      `                "names": names`,
      `            })`,
      ``,
      `        def visit_ImportFrom(self, n):`,
      `            names = [{"name": alias.name, "asname": alias.asname} for alias in n.names]`,
      `            imports.append({`,
      `                "type": "ImportFrom",`,
      `                "module": getattr(n, "module", None),`,
      `                "level": getattr(n, "level", 0),`,
      `                "line": getattr(n, "lineno", 0),`,
      `                "column": getattr(n, "col_offset", 0),`,
      `                "names": names`,
      `            })`,
      ``,
      `    ImportVisitor().visit(node)`,
      `    return imports`,
      ``,
      ``,
      `def parse_content(content, file_path):`,
      `    try:`,
      `        tree = ast.parse(content, filename=file_path)`,
      `        return {`,
      `            "success": True,`,
      `            "ast": node_to_dict(tree)`,
      `        }`,
      `    except SyntaxError as e:`,
      `        return {`,
      `            "success": False,`,
      `            "error": "SyntaxError",`,
      `            "message": str(e),`,
      `            "lineno": e.lineno,`,
      `            "offset": e.offset`,
      `        }`,
      `    except Exception as e:`,
      `        return {`,
      `            "success": False,`,
      `            "error": type(e).__name__,`,
      `            "message": str(e),`,
      `            "traceback": traceback.format_exc()`,
      `        }`,
      ``,
      ``,
      `def parse_file(file_path):`,
      `    try:`,
      `        with open(file_path, 'r', encoding="utf-8") as handle:`,
      `            content = handle.read()`,
      `        result = parse_content(content, file_path)`,
      `        if result.get("success"):`,
      `            result["content"] = content`,
      `        return result`,
      `    except OSError as e:`,
      `        return {`,
      `            "success": False,`,
      `            "error": type(e).__name__,`,
      `            "message": str(e)`,
      `        }`,
      ``,
      ``,
      `def extract_imports(file_path, content=None):`,
      `    try:`,
      `        if content is None:`,
      `            with open(file_path, 'r', encoding="utf-8") as handle:`,
      `                content = handle.read()`,
      `        tree = ast.parse(content, filename=file_path)`,
      `        imports = extract_imports_from_ast(tree)`,
      `        return {`,
      `            "success": True,`,
      `            "imports": imports`,
      `        }`,
      `    except SyntaxError as e:`,
      `        return {`,
      `            "success": False,`,
      `            "error": "SyntaxError",`,
      `            "message": str(e),`,
      `            "lineno": e.lineno,`,
      `            "offset": e.offset`,
      `        }`,
      `    except Exception as e:`,
      `        return {`,
      `            "success": False,`,
      `            "error": type(e).__name__,`,
      `            "message": str(e),`,
      `            "traceback": traceback.format_exc()`,
      `        }`,
      ``,
      ``,
      `def resolve_module(module_name):`,
      `    try:`,
      `        module = importlib.import_module(module_name)`,
      `        module_file = getattr(module, "__file__", None)`,
      `        if module_file is None:`,
      `            return {"success": True, "resolved_path": "builtin"}`,
      `        return {"success": True, "resolved_path": module_file}`,
      `    except ModuleNotFoundError as e:`,
      `        return {"success": False, "error": "ModuleNotFound", "message": str(e)}`,
      `    except Exception as e:`,
      `        return {`,
      `            "success": False,`,
      `            "error": type(e).__name__,`,
      `            "message": str(e),`,
      `            "traceback": traceback.format_exc()`,
      `        }`,
      ``,
      ``,
      `def run_server():`,
      `    for line in sys.stdin:`,
      `        if not line.strip():`,
      `            continue`,
      `        try:`,
      `            message = json.loads(line)`,
      `        except json.JSONDecodeError:`,
      `            sys.stdout.write(json.dumps({"success": False, "error": "InvalidJSON"}) + "\\n")`,
      `            sys.stdout.flush()`,
      `            continue`,
      ``,
      `        request_id = message.get("id")`,
      `        command = message.get("command")`,
      `        file_path = message.get("file_path", "<memory>")`,
      `        content = message.get("content")`,
      `        module_name = message.get("module_name")`,
      ``,
      `        if command == "parse_content":`,
      `            response = parse_content(content or "", file_path)`,
      `        elif command == "parse_file":`,
      `            response = parse_file(file_path)`,
      `        elif command == "extract_imports":`,
      `            response = extract_imports(file_path, content)`,
      `        elif command == "resolve_module":`,
      `            if not module_name:`,
      `                response = {"success": False, "error": "MissingModule", "message": "module_name required"}`,
      `            else:`,
      `                response = resolve_module(module_name)`,
      `        elif command == "shutdown":`,
      `            response = {"success": True, "shutdown": True}`,
      `            if request_id is not None:`,
      `                response["id"] = request_id`,
      `            sys.stdout.write(json.dumps(response) + "\\n")`,
      `            sys.stdout.flush()`,
      `            break`,
      `        else:`,
      `            response = {"success": False, "error": "UnknownCommand", "message": command}`,
      ``,
      `        if request_id is not None:`,
      `            response["id"] = request_id`,
      ``,
      `        sys.stdout.write(json.dumps(response) + "\\n")`,
      `        sys.stdout.flush()`,
      ``,
      ``,
      `def main():`,
      `    if '--server' in sys.argv:`,
      `        run_server()`,
      `        return`,
      ``,
      `    if len(sys.argv) == 2:`,
      `        result = parse_file(sys.argv[1])`,
      `        print(json.dumps(result))`,
      `        return`,
      ``,
      `    if len(sys.argv) == 3 and sys.argv[1] == 'extract_imports':`,
      `        result = extract_imports(sys.argv[2])`,
      `        print(json.dumps(result))`,
      `        return`,
      ``,
      `    if len(sys.argv) == 3 and sys.argv[1] == 'resolve_module':`,
      `        result = resolve_module(sys.argv[2])`,
      `        print(json.dumps(result))`,
      `        return`,
      ``,
      `    print(json.dumps({`,
      `        "success": False,`,
      `        "error": "Usage",`,
      `        "message": "python_ast_helper.py --server | <file> | extract_imports <file> | resolve_module <name>"`,
      `    }))`,
      ``,
      ``,
      `if __name__ == '__main__':`,
      `    main()`,
    ];
    return lines.join('\n') + '\n';
  }

  private startProcess(): void {
    try {
    this.process = spawn(this.pythonExecutable.command, [...this.pythonExecutable.args, this.helperPath, '--server'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (error) {
    throw new Error(`Failed to spawn python helper process: ${error}`);
  }

    this.process.stdin?.on('error', (error: NodeJS.ErrnoException) => {
      if (error && (error.code === 'EPIPE' || error.code === 'ERR_STREAM_DESTROYED')) {
        // helper exited before we finished writing; the exit handler will restart it on demand
        return;
      }
      console.warn('[python-ast-helper] stdin error:', error);
    });

    this.readline = createInterface({ input: this.process.stdout });
    this.readline.on('line', (line) => this.handleLine(line));

    this.process.stderr.on('data', (data: Buffer) => {
      const message = data.toString();
      console.warn(`[python-ast-helper] ${message.trim()}`);
    });

    this.process.on('exit', (code, signal) => {
      const reason = code !== null ? `code ${code}` : `signal ${signal}`;
      console.warn(`[python-ast-helper] exited with ${reason}`);
      this.rejectAllPending(new Error(`Python AST helper exited with ${reason}`));
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
      console.warn(`[python-ast-helper] Invalid JSON response: ${line}`);
      return;
    }

    if (!response || !response.id) {
      console.warn('[python-ast-helper] Response missing id');
      return;
    }

    const pending = this.pending.get(response.id);
    if (!pending) {
      console.warn(`[python-ast-helper] No pending request for id ${response.id}`);
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
        return reject(new Error('Python AST helper process is not available'));
      }

      const timeout = setTimeout(() => {
        this.pending.delete(payload.id);
        reject(new Error(`Python AST helper request timed out after ${timeoutMs}ms`));
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
}

export const pythonAstBridge: PythonAstProvider = PythonAstBridge.getInstance();
