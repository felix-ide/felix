/**
 * StdLibCatalog
 * Lightweight, runtime-discovered (or heuristically seeded) catalogs of standard library
 * and well-known vendor namespaces per language. Used to pre-filter resolution attempts.
 *
 * NOTE: Keep this fast and side-effect free. We can add persistence under
 * .felix/.stdlib-catalog.json later; for now, simple in-memory sets
 * cover most noise sources (Node builtins, common Python stdlib, PHP internals,
 * Java/C# framework prefixes).
 */

import { builtinModules } from 'module';

export type StdlibInfo = {
  symbols: Set<string>;
  /** Optional namespace/prefix patterns (e.g., 'java.', 'System.') */
  patterns?: string[];
};

export class StdLibCatalog {
  private static cache = new Map<string, StdlibInfo>();

  static get(language: string): StdlibInfo {
    const lang = (language || '').toLowerCase();
    if (this.cache.has(lang)) return this.cache.get(lang)!;

    let info: StdlibInfo = { symbols: new Set<string>(), patterns: [] };

    switch (lang) {
      case 'typescript':
      case 'javascript':
        info = this.buildNodeJsStdlib();
        break;
      case 'python':
        info = this.buildPythonStdlib();
        break;
      case 'php':
        info = this.buildPhpStdlib();
        break;
      case 'java':
        info = { symbols: new Set(), patterns: ['java.', 'javax.', 'jakarta.'] };
        break;
      case 'csharp':
      case 'c#':
      case 'cs':
        info = { symbols: new Set(), patterns: ['System.'] };
        break;
      default:
        info = { symbols: new Set(), patterns: [] };
    }

    this.cache.set(lang, info);
    return info;
  }

  static isStdlib(language: string, specifier: string): boolean {
    const info = this.get(language);
    const spec = specifier.replace(/^node:/, '');
    if (info.symbols.has(spec)) return true;
    if (info.patterns && info.patterns.some(p => specifier.startsWith(p))) return true;
    return false;
  }

  private static buildNodeJsStdlib(): StdlibInfo {
    // Node builtins + node: scheme
    const syms = new Set<string>([...builtinModules, ...builtinModules.map(m => `node:${m}`)]);
    // Common ESM builtin aliases sometimes seen as bare imports
    const extras = [
      'fs', 'path', 'events', 'http', 'https', 'url', 'util', 'stream', 'buffer', 'querystring', 'crypto',
      'timers', 'zlib', 'os', 'readline', 'tty', 'dns', 'net', 'child_process', 'cluster', 'module'
    ];
    extras.forEach(e => syms.add(e));
    return { symbols: syms, patterns: [] };
  }

  private static buildPythonStdlib(): StdlibInfo {
    // Heuristic seed; a sidecar can refine later
    const std = [
      'sys','os','re','json','typing','asyncio','functools','collections','dataclasses','enum','abc','logging',
      'pathlib','itertools','subprocess','threading','http','urllib','datetime','inspect','types','math','random'
    ];
    return { symbols: new Set(std), patterns: [] };
  }

  private static buildPhpStdlib(): StdlibInfo {
    // Treat core interfaces/exceptions as stdlib; vendor namespaces handled elsewhere
    const syms = new Set<string>();
    const core = ['\\JsonSerializable', '\\Throwable', '\\Exception', '\\RuntimeException'];
    core.forEach(c => syms.add(c));
    // Common vendor noise to skip via patterns (do not attempt to resolve into project)
    const patterns = ['PhpParser\\'];
    return { symbols: syms, patterns };
  }
}

