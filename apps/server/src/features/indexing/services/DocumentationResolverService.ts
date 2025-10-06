import { DatabaseManager } from '../../storage/DatabaseManager.js';
import type { IComponent, IRelationship } from '@felix/code-intelligence';
import path from 'path';

type LinkReason = 'explicit_id' | 'file_path' | 'file_match' | 'index_entry' | 'symbol_proximity' | 'markdown_link' | 'markdown_anchor';

export class DocumentationResolverService {
  private db: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager;
  }

  async resolveAll(options: { limitPerKind?: number } = {}): Promise<{ created: number; inspected: number }> {
    const limit = options.limitPerKind ?? 10000;
    let created = 0; let inspected = 0;

    const relationshipIds = new Set<string>();
    const pendingRelationships: IRelationship[] = [];

    const enqueue = async (relationship: IRelationship): Promise<void> => {
      if (relationshipIds.has(relationship.id)) return;
      relationshipIds.add(relationship.id);
      pendingRelationships.push(relationship);
      if (pendingRelationships.length >= 500) {
        await flushBatch();
      }
    };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const flushBatch = async (): Promise<void> => {
      if (pendingRelationships.length === 0) return;
      const batch = pendingRelationships.splice(0, pendingRelationships.length);
      const maxAttempts = Number(process.env.DOC_LINK_DB_RETRIES || '10');
      let attempt = 0;
      while (attempt < maxAttempts) {
        try {
          await this.db.runWrite(async () => {
          await this.db.getRelationshipRepository().storeRelationships(batch);
          });
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes('SQLITE_BUSY') && attempt < maxAttempts - 1) {
            const delay = Math.min(1000, 100 * Math.pow(2, attempt));
            await sleep(delay);
            attempt++;
            continue;
          }
          throw error;
        }
      }
    };

    // Collect candidate doc-like components
    const compRepo = this.db.getComponentRepository();
    const docs: IComponent[] = [];
    try {
      const md = await compRepo.searchComponents({ language: 'markdown', limit });
      const doc = await compRepo.searchComponents({ language: 'documentation', limit });
      const idx = await compRepo.searchComponents({ language: 'index', limit });
      docs.push(...md.items, ...doc.items, ...idx.items);
    } catch {}

    const docLanguages = new Set(['markdown', 'documentation', 'index']);

    const cache = new Map<string, { withDocs: IComponent[]; codeOnly: IComponent[]; docOnly: IComponent[] }>();
    const getByFile = async (filePath: string): Promise<{ withDocs: IComponent[]; codeOnly: IComponent[]; docOnly: IComponent[] }> => {
      if (!filePath) {
        return { withDocs: [], codeOnly: [], docOnly: [] };
      }

      const cached = cache.get(filePath);
      if (cached) {
        return cached;
      }

      const items = (await compRepo.getComponentsByFile(filePath)) || [];
      const docOnly = items.filter(item => docLanguages.has((item.language || '').toLowerCase()));
      const codeOnly = items.filter(item => !docLanguages.has((item.language || '').toLowerCase()));
      const entry = { withDocs: items, codeOnly, docOnly };
      cache.set(filePath, entry);
      return entry;
    };

    const getDocComponentsForFile = async (filePath: string): Promise<IComponent[]> => {
      return (await getByFile(filePath)).docOnly;
    };

    for (const d of docs) {
      inspected++;
      try {
        const md = this.parseMetadata(d);
        // 1) explicit id reference from markdown [[id:...]]/@component
        const explicitId = md.refComponentId as string | undefined;
        if (explicitId) {
          const target = await compRepo.getComponent(explicitId);
          if (target) {
            await enqueue(this.buildRelationship(d, target, 'documents', 0.95, 'explicit_id'));
            created++;
          }
        }

        // 2) index entry file paths
        if (md.isIndexEntry && (md.entryType === 'file_path' || md.entryType === 'docs_section')) {
          const path = (d.name || '').split(':').slice(1).join(':');
          if (path) {
            const cands = (await getByFile(path)).codeOnly;
            for (const c of cands) {
              await enqueue(this.buildRelationship(d, c, 'resolves_to', 0.8, 'index_entry', { path }));
              created++;
            }
          }
        }

        const indexEntries = Array.isArray(md.indexEntries) ? md.indexEntries as Array<any> : null;
        if (indexEntries) {
          for (const entry of indexEntries) {
            const entryType = typeof entry?.type === 'string' ? entry.type : undefined;
            if (entryType !== 'file_path' && entryType !== 'docs_section') {
              continue;
            }

            const entryPath = typeof entry?.name === 'string' ? entry.name.trim() : '';
            if (!entryPath) {
              continue;
            }

            const candidates = (await getByFile(entryPath)).codeOnly;
            for (const candidate of candidates) {
              await enqueue(this.buildRelationship(d, candidate, 'resolves_to', 0.8, 'index_entry', { path: entryPath }));
              created++;
            }
          }
        }

        // 3) markdown links (inline/link reference)
        if (md.isLink && typeof md.linkUrl === 'string' && md.linkUrl.trim()) {
          created += await this.handleLinkComponent(
            d,
            md.linkUrl.trim(),
            md,
            getByFile,
            getDocComponentsForFile,
            enqueue
          );
        }
      } catch {}
    }

    await flushBatch();

    return { created, inspected };
  }

  private parseMetadata(component: IComponent): any {
    const raw = (component as any).metadata;
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw as string);
    } catch {
      return {};
    }
  }

  private async handleLinkComponent(
    component: IComponent,
    rawUrl: string,
    metadata: any,
    getByFile: (filePath: string) => Promise<{ withDocs: IComponent[]; codeOnly: IComponent[]; docOnly: IComponent[] }>,
    getDocComponentsForFile: (filePath: string) => Promise<IComponent[]>,
    enqueue: (relationship: IRelationship) => Promise<void>
  ): Promise<number> {
    let created = 0;
    let url = rawUrl;

    // Ignore external links (http, https, mailto, etc.)
    if (/^[a-zA-Z]+:/.test(url) && !url.startsWith('file:')) {
      return created;
    }

    // Anchors within the same document
    if (url.startsWith('#')) {
      const anchor = url.slice(1);
      if (!anchor || !component.filePath) return created;
      const docComponents = await getDocComponentsForFile(component.filePath);
      const target = docComponents.find(c => this.parseMetadata(c).headingId === anchor);
      if (target) {
        await enqueue(this.buildRelationship(component, target, 'references', 0.8, 'markdown_anchor', { anchor }));
        created++;
      }
      return created;
    }

    if (!component.filePath) {
      return created;
    }

    const resolved = this.resolveLinkPath(component.filePath, url);
    if (!resolved) {
      return created;
    }

    const { filePath, anchor } = resolved;
    const targets = await getByFile(filePath);

    const docTargets = targets.docOnly;
    if (anchor) {
      const anchorTarget = docTargets.find(c => this.parseMetadata(c).headingId === anchor);
      if (anchorTarget) {
        await enqueue(this.buildRelationship(component, anchorTarget, 'references', 0.8, 'markdown_link', { path: filePath, anchor }));
        created++;
      }
    }

    // Target code components
    for (const target of targets.codeOnly) {
      await enqueue(this.buildRelationship(component, target, 'documents', 0.8, 'markdown_link', { path: filePath }));
      created++;
    }

    return created;
  }

  private resolveLinkPath(docFilePath: string, url: string): { filePath: string; anchor?: string } | null {
    if (!url) return null;

    let anchor: string | undefined;
    const hashIndex = url.indexOf('#');
    if (hashIndex >= 0) {
      anchor = url.slice(hashIndex + 1);
      url = url.slice(0, hashIndex);
    }

    const docDir = path.posix.dirname(docFilePath);
    let targetPath: string;

    if (!url || url === '.') {
      targetPath = docFilePath;
    } else if (url.startsWith('/')) {
      targetPath = url.slice(1);
    } else {
      targetPath = path.posix.normalize(path.posix.join(docDir, url));
    }

    return { filePath: targetPath, anchor };
  }

  private buildRelationship(source: IComponent, target: IComponent, type: string, confidence: number, reason: LinkReason, extra: any = {}): IRelationship {
    return {
      id: `${source.id}-${type}-${target.id}`,
      type,
      sourceId: source.id,
      targetId: target.id,
      metadata: { reason, confidence, ...extra }
    } as IRelationship;
  }
}
