/**
 * ComposerNamespaceResolver
 * Simple PSR-4/PSR-0 mapper for PHP namespaces to project file paths.
 * Reads composer.json at the project root and maps namespaces to directories.
 */

import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

type PsrMap = Record<string, string[]>; // prefix -> [dirs]

export class ComposerNamespaceResolver {
  private root: string;
  private psr4: PsrMap = {};
  private psr0: PsrMap = {};
  private loaded = false;

  constructor(projectRoot: string) {
    this.root = projectRoot;
  }

  private load(): void {
    if (this.loaded) return;
    const composerPath = join(this.root, 'composer.json');
    if (!existsSync(composerPath)) {
      this.loaded = true;
      return;
    }
    try {
      const content = JSON.parse(readFileSync(composerPath, 'utf-8'));
      const autoload = content?.autoload || {};
      const psr4 = (autoload['psr-4'] || {}) as Record<string, string | string[]>;
      const psr0 = (autoload['psr-0'] || {}) as Record<string, string | string[]>;
      this.psr4 = this.normalize(psr4);
      this.psr0 = this.normalize(psr0);
    } catch {
      // ignore
    } finally {
      this.loaded = true;
    }
  }

  private normalize(input: Record<string, string | string[]>): PsrMap {
    const out: PsrMap = {};
    for (const [prefix, dir] of Object.entries(input)) {
      out[prefix] = Array.isArray(dir) ? dir : [dir];
    }
    return out;
  }

  /**
   * Resolve a PHP namespace (e.g., Vendor\\Ns\\Class) to an absolute file path within the workspace, if any.
   */
  resolveNamespace(ns: string): string | null {
    this.load();
    // Try PSR-4: longest prefix match
    const candidates = this.matchPrefixes(ns, this.psr4);
    for (const { prefix, dirs } of candidates) {
      const remainder = ns.substring(prefix.length).replace(/\\/g, '/');
      for (const d of dirs) {
        const full = resolve(this.root, d, `${remainder}.php`);
        if (existsSync(full)) return full;
      }
    }
    // Try PSR-0: convert underscores in class name to directory separators (not implemented deeply; basic)
    const candidates0 = this.matchPrefixes(ns, this.psr0);
    for (const { prefix, dirs } of candidates0) {
      const remainder = ns.substring(prefix.length).replace(/\\/g, '/');
      const remFixed = remainder.replace(/_/g, '/');
      for (const d of dirs) {
        const full = resolve(this.root, d, `${remFixed}.php`);
        if (existsSync(full)) return full;
      }
    }
    return null;
  }

  private matchPrefixes(ns: string, map: PsrMap): { prefix: string; dirs: string[] }[] {
    const entries = Object.entries(map);
    // longest prefix first
    entries.sort((a,b) => b[0].length - a[0].length);
    const matches: { prefix: string; dirs: string[] }[] = [];
    for (const [prefix, dirs] of entries) {
      if (ns.startsWith(prefix)) {
        matches.push({ prefix, dirs });
      }
    }
    return matches;
  }
}

