/**
 * UniversalScopeScanner - TextMate-based scope scanner for embedded languages
 *
 * Uses vscode-textmate + vscode-oniguruma to tokenize files and discover
 * embedded language scopes (e.g., JS in HTML <script>, CSS in <style>,
 * fenced code blocks in Markdown, PHP blocks in HTML, etc.).
 *
 * This service emits CodeBlock ranges that BlockScanner can return directly
 * as segmentation, enabling downstream parsers (Tree-sitter/AST/LSP) to parse
 * per-language blocks accurately without external binaries.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import tm from 'vscode-textmate';
const { Registry, INITIAL } = tm as any;
import onig from 'vscode-oniguruma';
const { loadWASM } = onig as any;
import type { CodeBlock } from './BlockScanner.js';

// Simple language id mapping by file extension for selecting a root grammar
const EXT_TO_SCOPE: Record<string, string> = {
  '.html': 'text.html.basic',
  '.htm': 'text.html.basic',
  '.md': 'text.html.markdown',
  '.markdown': 'text.html.markdown',
  '.js': 'source.js',
  '.mjs': 'source.js',
  '.cjs': 'source.js',
  '.ts': 'source.ts',
  '.tsx': 'source.tsx',
  '.jsx': 'source.jsx',
  '.css': 'source.css',
  '.scss': 'source.css.scss',
  '.php': 'text.html.php',
  '.py': 'source.python',
  '.json': 'source.json',
  '.go': 'source.go',
  '.rb': 'source.ruby',
  '.graphql': 'source.graphql',
  '.gql': 'source.graphql',
  '.c': 'source.c',
  '.h': 'source.c',
  '.cpp': 'source.cpp',
  '.cxx': 'source.cpp',
  '.cc': 'source.cpp',
  '.hpp': 'source.cpp',
  '.hh': 'source.cpp',
  '.ps1': 'source.powershell',
  '.yml': 'source.yaml',
  '.yaml': 'source.yaml',
  '.sh': 'source.shell'
};

export interface ScopeScannerOptions {
  grammarDir?: string;
  onigPath?: string;
  maxBytes?: number; // safety limit
  enabled?: boolean; // allow disabling globally
}

export class UniversalScopeScanner {
  private static instance: UniversalScopeScanner | null = null;
  private registry: any | null = null;
  private grammars: Record<string, string> = {};
  private initialized = false;
  private options: Required<ScopeScannerOptions>;

  private constructor(opts: ScopeScannerOptions = {}) {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkgDistRoot = join(__dirname, '..', '..'); // .../dist
    const distGrammarDir = join(pkgDistRoot, 'code-parser', 'grammars');
    const srcGrammarDir = join(pkgDistRoot, '..', 'src', 'code-parser', 'grammars');
    const defaultOnig = join(process.cwd(), 'node_modules', 'vscode-oniguruma', 'release', 'onig.wasm');

    this.options = {
      grammarDir: process.env.FELIX_GRAMMAR_DIR || opts.grammarDir || (existsSync(distGrammarDir) ? distGrammarDir : srcGrammarDir),
      onigPath: process.env.FELIX_ONIG_PATH || opts.onigPath || defaultOnig,
      maxBytes: Number(process.env.FELIX_MAX_SCAN_BYTES || 1_500_000),
      enabled: process.env.FELIX_SCOPE_SCANNER !== '0'
    };
  }

  static getInstance(): UniversalScopeScanner {
    if (!this.instance) this.instance = new UniversalScopeScanner();
    return this.instance;
  }

  /**
   * Initialize Oniguruma + TextMate registry and load grammar registry.json
   */
  private async init(): Promise<boolean> {
    if (this.initialized) return true;
    if (!this.options.enabled) return false;

    try {
      if (!existsSync(this.options.onigPath)) {
        // onig.wasm missing → disable gracefully
        return false;
      }
      const wasmBin = readFileSync(this.options.onigPath);
      await loadWASM(wasmBin.buffer);

      // Load grammar registry mapping
      let regPath = join(this.options.grammarDir, 'registry.json');
      if (!existsSync(regPath)) {
        // try src fallback
        const alt = join(process.cwd(), 'packages', 'code-intelligence', 'src', 'code-parser', 'grammars', 'registry.json');
        if (!existsSync(alt)) return false;
        regPath = alt;
      }
      this.grammars = JSON.parse(readFileSync(regPath, 'utf-8'));

      this.registry = new Registry({
        loadGrammar: async (scopeName: string): Promise<any> => {
          const rel = this.grammars[scopeName];
          if (!rel) return null as any;
          const full = join(this.options.grammarDir, rel);
          if (!existsSync(full)) return null as any;
          const content = readFileSync(full, 'utf-8');
          return JSON.parse(content);
        }
      });

      this.initialized = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Scan file content and emit embedded language blocks. Returns null if
   * the scanner is disabled or grammars are unavailable.
   */
  async scanFile(filePath: string, content: string): Promise<{
    blocks: CodeBlock[];
    languagesDetected: string[];
  } | null> {
    if (!this.options.enabled) return null;
    if (Buffer.byteLength(content, 'utf-8') > this.options.maxBytes) return null;
    if (!(await this.init())) return null;
    if (!this.registry) return null;

    const ext = extname(filePath).toLowerCase();
    let rootScope = EXT_TO_SCOPE[ext];
    if (!rootScope) {
      const base = basename(filePath).toLowerCase();
      if (base === 'dockerfile') rootScope = 'source.dockerfile';
    }
    if (!rootScope) return null;

    let grammar: any | null = null;
    try {
      grammar = await this.registry.loadGrammar(rootScope);
    } catch {
      return null;
    }
    if (!grammar) return null;

    const lines = content.split('\n');
    const blocks: CodeBlock[] = [];
    const languages = new Set<string>();

    // Track simple block state by looking for scope segments containing 'embedded'
    // This is a pragmatic first pass; real injection scopes can be refined with more rules.
    let ruleStack: any = INITIAL;
    let currentBlock: { lang: string; startLine: number; startByte: number } | null = null;
    let bytesSoFar = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const r = grammar.tokenizeLine2(line, ruleStack);
      ruleStack = r.ruleStack;

      // Inspect scopes via metadata array (tokenizeLine2) is compact; we rely on tokenizeLine for readability where needed.
      // Fallback to tokenizeLine (less efficient) when we need human-readable scopes for boundary detection.
      const tokens = grammar.tokenizeLine(line, ruleStack);
      const scopes = tokens.tokens.flatMap((t: any) => t.scopes as string[]);
      const embedded = scopes.find((s: string) => s.includes('.embedded'));

      // Language inference from scope prefix: 'source.<lang>.embedded.*' or 'text.<lang>.embedded.*'
      let inferredLang = '';
      if (embedded) {
        const m = embedded.match(/\b(?:source|text)\.([\w\-]+)\.embedded/);
        if (m) inferredLang = m[1];
      }

      // Enter block
      if (!currentBlock && inferredLang) {
        currentBlock = { lang: inferredLang, startLine: i + 1, startByte: bytesSoFar };
        languages.add(inferredLang);
      }

      // Exit block when embedded scope disappears
      if (currentBlock && !inferredLang) {
        const endLine = i; // previous line
        const blockText = lines.slice(currentBlock.startLine - 1, endLine).join('\n');
        const endByte = currentBlock.startByte + Buffer.byteLength(blockText, 'utf-8');
        if (endLine >= currentBlock.startLine) {
          blocks.push({
            language: currentBlock.lang,
            startLine: currentBlock.startLine,
            startColumn: 1,
            endLine,
            endColumn: 1,
            startByte: currentBlock.startByte,
            endByte,
            confidence: 0.8,
            source: 'textmate',
            metadata: { kind: 'embedded', name: currentBlock.lang }
          });
        }
        currentBlock = null;
      }

      bytesSoFar += Buffer.byteLength(line, 'utf-8') + 1; // + newline
    }

    return { blocks, languagesDetected: Array.from(languages) };
  }
}
